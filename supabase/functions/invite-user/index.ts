import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0'
import { corsHeaders } from '../_shared/cors.ts'
import { getAdminRoleAndTenant, hasPermissionForTenant } from '../_shared/admin.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the auth header from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create a Supabase client with the user's auth token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Verify the user is authenticated
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get the email, tenantId, and optional role from the request body
    const { email, tenantId, role } = await req.json()
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return new Response(
        JSON.stringify({ error: 'Valid email required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: 'Tenant ID required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate role if provided
    const allowedRoles = ['user', 'tenant_admin', 'super_admin']
    const userRole = role && allowedRoles.includes(role) ? role : 'user'

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get admin role and tenant information
    const adminInfo = await getAdminRoleAndTenant(supabaseAdmin, user.id)

    // Check if admin has permission for this tenant
    if (!hasPermissionForTenant(adminInfo, tenantId)) {
      console.error(`User ${user.id} with role ${adminInfo.role} attempted to invite user to tenant ${tenantId}, but has no permission`)
      return new Response(
        JSON.stringify({ error: 'Not authorized to invite users for this tenant' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if admin can set the requested role
    // Only super_admins can set roles other than 'user'
    if (userRole !== 'user' && adminInfo.role !== 'super_admin') {
      console.error(`User ${user.id} with role ${adminInfo.role} attempted to set role ${userRole}`)
      return new Response(
        JSON.stringify({ error: 'Not authorized to assign this role' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // First, check if user already exists
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (!listError && existingUsers) {
      const existingUser = existingUsers.users.find(u => u.email === email)
      
      if (existingUser) {
        return new Response(
          JSON.stringify({ 
            message: 'Benutzer mit dieser E-Mail ist bereits registriert',
            userExists: true,
            userId: existingUser.id
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }

    // Invite the user using admin client with tenant metadata and role
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { 
        tenant_id: tenantId,
        role: userRole 
      }
    })

    if (error) {
      console.error('Error inviting user:', error)
      
      // Handle specific error cases
      if (error.message.includes('already been registered')) {
        return new Response(
          JSON.stringify({ 
            message: 'Benutzer mit dieser E-Mail ist bereits registriert',
            userExists: true
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('User invited successfully:', email)

    // Assign 'user' role to the new user (not admin)
    if (data.user) {
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: data.user.id,
          role: 'user'
        })

      if (roleError) {
        console.error('Error assigning user role:', roleError)
        // Don't fail the invitation, but log the error
      }
    }

    return new Response(
      JSON.stringify({ 
        data,
        message: 'Einladung erfolgreich versendet'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
