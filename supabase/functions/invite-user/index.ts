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
    const { email, tenantId, role, fullName } = await req.json()
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
        
        // --- START: Invite-or-Promote Logic ---
        // Prüfen, ob der Benutzer bereits existiert
        const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers()
        
        if (listError) {
          console.error('Error listing users:', listError)
          return new Response(
            JSON.stringify({ error: 'Fehler beim Prüfen bestehender Benutzer' }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }

        const existingUser = usersData.users.find(u => u.email === email)

        if (!existingUser) {
          // Fall A: Benutzer existiert NICHT -> Einladen (Standard-Flow)
          console.log(`Neuer Super Admin wird eingeladen: ${email}`)
          const inviteMetadata: Record<string, any> = { role: 'super_admin' };
          if (fullName) {
            inviteMetadata.full_name = fullName;
          }
          const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            data: inviteMetadata,
          })
          if (inviteError) {
            console.error('Error inviting new super admin:', inviteError)
            return new Response(
              JSON.stringify({ error: inviteError.message }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            )
          }
          return new Response(
            JSON.stringify({ 
              data: inviteData,
              message: 'Einladung für neuen Super Admin gesendet'
            }),
            { 
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )

        } else {
          // Fall B: Benutzer EXISTIERT -> Befördern
          const userId = existingUser.id
          console.log(`Bestehender Benutzer ${userId} wird zum Super Admin befördert`)

          // 1. Prüfen, ob er die Rolle schon hat
          const { data: existingRole, error: roleError } = await supabaseAdmin
            .from('user_roles')
            .select()
            .eq('user_id', userId)
            .eq('role', 'super_admin')
            .maybeSingle()

          if (roleError) {
            console.error('Error checking existing role:', roleError)
            return new Response(
              JSON.stringify({ error: 'Fehler beim Prüfen der Benutzerrolle' }),
              { 
                status: 500, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            )
          }
          
          if (existingRole) {
            return new Response(
              JSON.stringify({ 
                error: 'Benutzer ist bereits Super Admin',
                userExists: true
              }), 
              { 
                status: 409,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            )
          }

          // 2. Profil aktualisieren (tenant_id auf null setzen, da Super Admins global sind)
          const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({ tenant_id: null })
            .eq('id', userId)
          
          if (profileError) {
            console.error('Error updating profile:', profileError)
            return new Response(
              JSON.stringify({ error: 'Fehler beim Aktualisieren des Profils' }),
              { 
                status: 500, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            )
          }

          // 3. Neue Rolle hinzufügen
          const { error: insertRoleError } = await supabaseAdmin
            .from('user_roles')
            .insert({ user_id: userId, role: 'super_admin' })
          
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

          return new Response(
            JSON.stringify({ 
              message: 'Bestehender Benutzer erfolgreich zum Super Admin befördert',
              userId: userId
            }), 
            { 
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }
        // --- END: Invite-or-Promote Logic ---
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
      const inviteMetadata: Record<string, any> = { role: inviteRole };
      if (effectiveTenantId !== null) {
        inviteMetadata.tenant_id = effectiveTenantId;
      }
      if (fullName) {
        inviteMetadata.full_name = fullName;
      }
      const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: inviteMetadata
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

      // Tenant admins can invite regular users or tenant_admins
      if (userRole !== 'user' && userRole !== 'tenant_admin') {
        return new Response(
          JSON.stringify({ error: 'Tenant admins can only invite regular users or tenant admins' }),
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
      const inviteMetadata: Record<string, any> = { 
        tenant_id: tenantId,
        role: userRole 
      };
      if (fullName) {
        inviteMetadata.full_name = fullName;
      }
      const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: inviteMetadata
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

      // Assign role to the new user
      if (data.user) {
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .insert({
            user_id: data.user.id,
            role: userRole
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
