-- Fix RLS policies to ensure Tenant Admins only have access to their tenant data
-- and not all data like Super Admins

-- 1. Fix admin_audit_log - Add tenant_id column if not exists
ALTER TABLE public.admin_audit_log ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Update existing audit logs to set tenant_id based on the admin user's tenant
UPDATE public.admin_audit_log
SET tenant_id = (
  SELECT tenant_id 
  FROM public.profiles 
  WHERE id = admin_audit_log.admin_user_id
)
WHERE tenant_id IS NULL;

-- Drop and recreate admin_audit_log policies with proper tenant isolation
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_log;
DROP POLICY IF EXISTS "Super admins can view all audit logs" ON public.admin_audit_log;
DROP POLICY IF EXISTS "Tenant admins can view audit logs in their tenant" ON public.admin_audit_log;

CREATE POLICY "Super admins can view all audit logs"
ON public.admin_audit_log
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Tenant admins can view audit logs in their tenant"
ON public.admin_audit_log
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'tenant_admin'::app_role) 
  AND get_my_tenant_id() = tenant_id
);

-- Update the log_admin_action function to set tenant_id
CREATE OR REPLACE FUNCTION public.log_admin_action()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_tenant_id uuid;
BEGIN
  -- Nur für Admins loggen
  IF has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) THEN
    -- Get the admin's tenant_id
    SELECT tenant_id INTO admin_tenant_id
    FROM public.profiles
    WHERE id = auth.uid();
    
    INSERT INTO public.admin_audit_log (
      admin_user_id, 
      action, 
      table_name, 
      record_id, 
      old_values, 
      new_values,
      tenant_id
    )
    VALUES (
      auth.uid(),
      TG_OP,
      TG_TABLE_NAME,
      COALESCE(NEW.id, OLD.id),
      CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END,
      CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END,
      admin_tenant_id
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 2. Fix profiles table RLS for tenant admins
-- Drop all existing profiles policies to recreate them properly
DROP POLICY IF EXISTS "Tenant admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Tenant admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Tenant admins can view profiles in their tenant" ON public.profiles;
DROP POLICY IF EXISTS "Tenant admins can update profiles in their tenant" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Recreate policies with proper tenant isolation
CREATE POLICY "Super admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Tenant admins can view profiles in their tenant"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'tenant_admin'::app_role) 
  AND get_my_tenant_id() = tenant_id
);

CREATE POLICY "Tenant admins can update profiles in their tenant"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'tenant_admin'::app_role) 
  AND get_my_tenant_id() = tenant_id
)
WITH CHECK (
  has_role(auth.uid(), 'tenant_admin'::app_role) 
  AND get_my_tenant_id() = tenant_id
);

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id AND tenant_id = get_my_tenant_id());

-- Add helpful comments
COMMENT ON POLICY "Super admins can view all audit logs" ON public.admin_audit_log IS 
'Super Admins können alle Audit Logs über alle Tenants hinweg sehen';

COMMENT ON POLICY "Tenant admins can view audit logs in their tenant" ON public.admin_audit_log IS 
'Tenant Admins können nur Audit Logs ihres eigenen Tenants sehen';

COMMENT ON COLUMN public.admin_audit_log.tenant_id IS 
'Tenant ID des Admins, der die Aktion durchgeführt hat - für Tenant-Isolation';