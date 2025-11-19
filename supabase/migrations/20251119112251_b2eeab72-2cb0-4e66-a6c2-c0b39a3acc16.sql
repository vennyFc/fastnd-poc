-- Enable Super Admin global access to all data
-- This migration adds RLS policies that allow super_admin users to bypass tenant restrictions

-- 1. Create helper function to check if current user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'::app_role
  )
$$;

-- 2. Add Super Admin policies for all main data tables

-- customer_projects
CREATE POLICY "Super Admins can do everything on customer_projects"
ON public.customer_projects
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- products
CREATE POLICY "Super Admins can do everything on products"
ON public.products
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- customers
CREATE POLICY "Super Admins can do everything on customers"
ON public.customers
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- applications
CREATE POLICY "Super Admins can do everything on applications"
ON public.applications
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- collections
CREATE POLICY "Super Admins can do everything on collections"
ON public.collections
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- cross_sells
CREATE POLICY "Super Admins can do everything on cross_sells"
ON public.cross_sells
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- product_alternatives
CREATE POLICY "Super Admins can do everything on product_alternatives"
ON public.product_alternatives
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- app_insights
CREATE POLICY "Super Admins can do everything on app_insights"
ON public.app_insights
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- upload_history
CREATE POLICY "Super Admins can do everything on upload_history"
ON public.upload_history
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- collection_products
CREATE POLICY "Super Admins can do everything on collection_products"
ON public.collection_products
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- collection_shares
CREATE POLICY "Super Admins can do everything on collection_shares"
ON public.collection_shares
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- user_notifications
CREATE POLICY "Super Admins can do everything on user_notifications"
ON public.user_notifications
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- user_favorites
CREATE POLICY "Super Admins can do everything on user_favorites"
ON public.user_favorites
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- user_project_history
CREATE POLICY "Super Admins can do everything on user_project_history"
ON public.user_project_history
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- user_dashboard_settings
CREATE POLICY "Super Admins can do everything on user_dashboard_settings"
ON public.user_dashboard_settings
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- user_column_settings
CREATE POLICY "Super Admins can do everything on user_column_settings"
ON public.user_column_settings
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- action_items
CREATE POLICY "Super Admins can do everything on action_items"
ON public.action_items
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- user_preferences
CREATE POLICY "Super Admins can do everything on user_preferences"
ON public.user_preferences
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- Note: user_access_logs, user_roles, profiles, tenants, and global tables already have proper super_admin policies
-- or don't need additional ones because they follow different access patterns