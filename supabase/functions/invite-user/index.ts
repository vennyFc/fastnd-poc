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

    // Handle super_admin invites
    if (adminInfo.role === 'super_admin') {
      let effectiveTenantId = tenantId
      const inviteRole = userRole

      // If inviting a super_admin, tenant_id must be null
      if (inviteRole === 'super_admin') {
        effectiveTenantId = null
        console.log(`Super admin inviting super_admin: setting tenant_id to null`)
        
        // Check if user already exists
        const { data: existingUserData, error: userError } = await supabaseAdmin.auth.admin.listUsers()
        
        let existingUser = null
        if (!userError && existingUserData) {
          existingUser = existingUserData.users.find(u => u.email === email)
        }

        if (!existingUser) {
          // Case A: User does not exist - send invite
          const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            data: { 
              tenant_id: null,
              role: 'super_admin' 
            }
          })

          if (error) {
            console.error('Error inviting new super admin:', error)
            return new Response(
              JSON.stringify({ error: error.message }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            )
          }

          // Assign role to the new user
          if (data.user) {
            const { error: roleError } = await supabaseAdmin
              .from('user_roles')
              .insert({
                user_id: data.user.id,
                role: 'super_admin'
              })

            if (roleError) {
              console.error('Error assigning super_admin role:', roleError)
            }
          }

          return new Response(
            JSON.stringify({ 
              data,
              message: 'Einladung für neuen Super Admin gesendet'
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        } else {
          // Case B: User exists - promote to super_admin
          const userId = existingUser.id

          // Check if user already has super_admin role
          const { data: roleData, error: roleCheckError } = await supabaseAdmin
            .from('user_roles')
            .select('*')
            .eq('user_id', userId)
            .eq('role', 'super_admin')
            .maybeSingle()

          if (roleCheckError) {
            console.error('Error checking existing role:', roleCheckError)
            return new Response(
              JSON.stringify({ error: 'Fehler beim Prüfen der Benutzerrolle' }),
              { 
                status: 500, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            )
          }

          if (roleData) {
            return new Response(
              JSON.stringify({ 
                message: 'Benutzer ist bereits Super Admin',
                userExists: true
              }),
              { 
                status: 409,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            )
          }

          // Add super_admin role
          const { error: insertRoleError } = await supabaseAdmin
            .from('user_roles')
            .insert({
              user_id: userId,
              role: 'super_admin'
            })

          if (insertRoleError) {
            console.error('Error adding super_admin role:', insertRoleError)
            return new Response(
              JSON.stringify({ error: 'Fehler beim Hinzufügen der Super Admin-Rolle' }),
              { 
                status: 500, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            )
          }

          // Set tenant_id to null in profiles
          const { error: updateProfileError } = await supabaseAdmin
            .from('profiles')
            .update({ tenant_id: null })
            .eq('id', userId)

          if (updateProfileError) {
            console.error('Error updating profile tenant_id:', updateProfileError)
            // Continue anyway, role was added successfully
          }

          return new Response(
            JSON.stringify({ 
              message: 'Bestehender Benutzer zu Super Admin befördert',
              userId: userId
            }),
            { 
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }
      } else if (!effectiveTenantId) {
        // Non-super_admin invites require a tenant_id
        return new Response(
          JSON.stringify({ error: 'Tenant ID required for non-superadmin invite' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // First, check if user already exists (for non-super_admin invites)
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

      // Invite the user
      const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: { 
          tenant_id: effectiveTenantId,
          role: inviteRole 
        }
      })

      if (error) {
        console.error('Error inviting user:', error)
        
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

      console.log('User invited successfully by super_admin:', email)

      // Assign role to the new user
      if (data.user) {
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .insert({
            user_id: data.user.id,
            role: inviteRole
          })

        if (roleError) {
          console.error('Error assigning user role:', roleError)
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
    }

    // Handle tenant_admin invites (only if NOT super_admin)
    if (adminInfo.role === 'tenant_admin') {
      if (!tenantId) {
        return new Response(
          JSON.stringify({ error: 'Tenant ID required' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      if (adminInfo.tenantId !== tenantId) {
        return new Response(
          JSON.stringify({ error: 'Forbidden: Cannot invite users to other tenants' }),
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Tenant admins can only invite regular users
      if (userRole !== 'user') {
        return new Response(
          JSON.stringify({ error: 'Tenant admins can only invite regular users' }),
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

      // Invite the user
      const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: { 
          tenant_id: tenantId,
          role: 'user' 
        }
      })

      if (error) {
        console.error('Error inviting user:', error)
        
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

      console.log('User invited successfully by tenant_admin:', email)

      // Assign 'user' role to the new user
      if (data.user) {
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .insert({
            user_id: data.user.id,
            role: 'user'
          })

        if (roleError) {
          console.error('Error assigning user role:', roleError)
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
    }

    // If not super_admin or tenant_admin, deny access
    return new Response(
      JSON.stringify({ error: 'Forbidden: Insufficient permissions' }),
      { 
        status: 403, 
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
