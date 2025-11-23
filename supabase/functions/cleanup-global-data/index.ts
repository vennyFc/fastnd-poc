import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0';
import { corsHeaders } from '../_shared/cors.ts';

interface CleanupResult {
  table: string;
  deletedCount: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role for elevated permissions
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get the authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Keine Authentifizierung' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Ungültige Authentifizierung' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is super admin
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (rolesError) {
      console.error('Error fetching roles:', rolesError);
      return new Response(
        JSON.stringify({ error: 'Fehler beim Prüfen der Berechtigungen' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isSuperAdmin = roles?.some(r => r.role === 'super_admin');
    if (!isSuperAdmin) {
      return new Response(
        JSON.stringify({ error: 'Keine Berechtigung. Nur Super Admins können diese Funktion ausführen.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting cleanup of global data (tenant_id = NULL) by user:', user.id);

    // Tables to clean up - all tables that have tenant_id column
    const tablesToCleanup = [
      'products',
      'applications',
      'cross_sells',
      'product_alternatives',
      'app_insights',
      'customer_projects',
      'customers',
      'collections',
      'collection_products',
      'collection_shares',
      'user_favorites',
      'user_notifications',
      'user_dashboard_settings',
      'user_column_settings',
      'action_items',
      'user_project_history',
      'upload_history',
      'admin_audit_log',
      'user_access_logs',
    ];

    const results: CleanupResult[] = [];
    let totalDeleted = 0;

    // Clean up each table
    for (const table of tablesToCleanup) {
      try {
        console.log(`Cleaning up table: ${table}`);
        
        // First, count how many records will be deleted
        const { count: countBefore } = await supabaseAdmin
          .from(table)
          .select('*', { count: 'exact', head: true })
          .is('tenant_id', null);

        if (countBefore && countBefore > 0) {
          // Delete records with tenant_id = NULL
          const { error: deleteError } = await supabaseAdmin
            .from(table)
            .delete()
            .is('tenant_id', null);

          if (deleteError) {
            console.error(`Error deleting from ${table}:`, deleteError);
            results.push({
              table,
              deletedCount: 0,
            });
          } else {
            console.log(`Deleted ${countBefore} records from ${table}`);
            results.push({
              table,
              deletedCount: countBefore,
            });
            totalDeleted += countBefore;
          }
        } else {
          console.log(`No global data found in ${table}`);
          results.push({
            table,
            deletedCount: 0,
          });
        }
      } catch (error) {
        console.error(`Error processing table ${table}:`, error);
        results.push({
          table,
          deletedCount: 0,
        });
      }
    }

    // Log the cleanup action in audit log
    await supabaseAdmin.from('admin_audit_log').insert({
      admin_user_id: user.id,
      action: 'CLEANUP_GLOBAL_DATA',
      table_name: 'multiple',
      new_values: { 
        totalDeleted,
        results: results.filter(r => r.deletedCount > 0),
      },
    });

    console.log('Cleanup completed. Total deleted:', totalDeleted);

    return new Response(
      JSON.stringify({
        success: true,
        totalDeleted,
        results: results.filter(r => r.deletedCount > 0), // Only show tables where data was deleted
        message: totalDeleted > 0 
          ? `Erfolgreich ${totalDeleted} globale Datensätze bereinigt`
          : 'Keine globalen Daten gefunden',
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: 'Ein unerwarteter Fehler ist aufgetreten',
        details: errorMessage,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
