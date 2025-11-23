-- Drop existing policies for user_dashboard_settings
DROP POLICY IF EXISTS "Super Admins can access all tenant dashboard_settings" ON public.user_dashboard_settings;
DROP POLICY IF EXISTS "Tenants can delete dashboard settings in their tenant" ON public.user_dashboard_settings;
DROP POLICY IF EXISTS "Tenants can insert dashboard settings in their tenant" ON public.user_dashboard_settings;
DROP POLICY IF EXISTS "Tenants can update dashboard settings in their tenant" ON public.user_dashboard_settings;
DROP POLICY IF EXISTS "Tenants can view dashboard settings in their tenant" ON public.user_dashboard_settings;

-- Create new policies for user_dashboard_settings that are user-specific
CREATE POLICY "Users can view their own dashboard settings"
ON public.user_dashboard_settings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own dashboard settings"
ON public.user_dashboard_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own dashboard settings"
ON public.user_dashboard_settings
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own dashboard settings"
ON public.user_dashboard_settings
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Tenant admins can view dashboard settings in their tenant"
ON public.user_dashboard_settings
FOR SELECT
USING (
  has_role(auth.uid(), 'tenant_admin'::app_role) 
  AND get_my_tenant_id() = tenant_id
);

CREATE POLICY "Super admins can view all dashboard settings"
ON public.user_dashboard_settings
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Drop existing policies for user_column_settings
DROP POLICY IF EXISTS "Super Admins can access all tenant column_settings" ON public.user_column_settings;
DROP POLICY IF EXISTS "Tenants can delete column settings in their tenant" ON public.user_column_settings;
DROP POLICY IF EXISTS "Tenants can insert column settings in their tenant" ON public.user_column_settings;
DROP POLICY IF EXISTS "Tenants can update column settings in their tenant" ON public.user_column_settings;
DROP POLICY IF EXISTS "Tenants can view column settings in their tenant" ON public.user_column_settings;

-- Create new policies for user_column_settings that are user-specific
CREATE POLICY "Users can view their own column settings"
ON public.user_column_settings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own column settings"
ON public.user_column_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own column settings"
ON public.user_column_settings
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own column settings"
ON public.user_column_settings
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Tenant admins can view column settings in their tenant"
ON public.user_column_settings
FOR SELECT
USING (
  has_role(auth.uid(), 'tenant_admin'::app_role) 
  AND get_my_tenant_id() = tenant_id
);

CREATE POLICY "Super admins can view all column settings"
ON public.user_column_settings
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));