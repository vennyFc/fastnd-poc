import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0';

export interface AdminInfo {
  userId: string;
  role: 'super_admin' | 'tenant_admin' | 'user' | null;
  tenantId: string | null;
}

/**
 * Get admin role and tenant information for the authenticated user
 */
export async function getAdminRoleAndTenant(
  supabaseAdmin: SupabaseClient,
  userId: string
): Promise<AdminInfo> {
  // Fetch user roles
  const { data: roles, error: rolesError } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  if (rolesError) {
    console.error('Error fetching user roles:', rolesError);
    throw new Error('Could not fetch user roles');
  }

  // Determine the highest role - prioritize super_admin
  let role: 'super_admin' | 'tenant_admin' | 'user' | null = null;
  if (roles && roles.length > 0) {
    // Always prioritize super_admin if present
    const isSuperAdmin = roles.some(r => r.role === 'super_admin');
    if (isSuperAdmin) {
      role = 'super_admin';
    } else if (roles.some(r => r.role === 'tenant_admin')) {
      role = 'tenant_admin';
    } else if (roles.some(r => r.role === 'user')) {
      role = 'user';
    }
  }

  // Fetch user's tenant
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('tenant_id')
    .eq('id', userId)
    .single();

  if (profileError) {
    console.error('Error fetching user profile:', profileError);
    throw new Error('Could not fetch user profile');
  }

  return {
    userId,
    role,
    tenantId: profile?.tenant_id || null,
  };
}

/**
 * Check if user has permission to manage users in a specific tenant
 */
export function hasPermissionForTenant(
  adminInfo: AdminInfo,
  targetTenantId: string
): boolean {
  // Super admins can manage all tenants
  if (adminInfo.role === 'super_admin') {
    return true;
  }

  // Tenant admins can only manage their own tenant
  if (adminInfo.role === 'tenant_admin' && adminInfo.tenantId === targetTenantId) {
    return true;
  }

  return false;
}

/**
 * Verify that a user belongs to a specific tenant
 */
export async function verifyUserBelongsToTenant(
  supabaseAdmin: SupabaseClient,
  userId: string,
  tenantId: string
): Promise<boolean> {
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('tenant_id')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    return false;
  }

  return profile.tenant_id === tenantId;
}
