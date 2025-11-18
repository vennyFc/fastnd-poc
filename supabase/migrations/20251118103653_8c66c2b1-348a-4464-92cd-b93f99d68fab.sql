-- Enable Super Admin access to all tenant data
-- This migration updates all RLS policies to allow super_admin role full access to all tenant data

-- ========================================
-- CUSTOMER_PROJECTS
-- ========================================
DROP POLICY IF EXISTS "Tenants can view their own projects" ON public.customer_projects;
CREATE POLICY "Tenants can view their own projects"
ON public.customer_projects
FOR SELECT
USING (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Tenants can insert their own projects" ON public.customer_projects;
CREATE POLICY "Tenants can insert their own projects"
ON public.customer_projects
FOR INSERT
WITH CHECK (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Tenants can delete their own projects" ON public.customer_projects;
CREATE POLICY "Tenants can delete their own projects"
ON public.customer_projects
FOR DELETE
USING (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

-- ========================================
-- APPLICATIONS
-- ========================================
DROP POLICY IF EXISTS "Tenants can view their own applications" ON public.applications;
CREATE POLICY "Tenants can view their own applications"
ON public.applications
FOR SELECT
USING (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Tenants can insert their own applications" ON public.applications;
CREATE POLICY "Tenants can insert their own applications"
ON public.applications
FOR INSERT
WITH CHECK (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Tenants can delete their own applications" ON public.applications;
CREATE POLICY "Tenants can delete their own applications"
ON public.applications
FOR DELETE
USING (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

-- ========================================
-- PRODUCTS
-- ========================================
DROP POLICY IF EXISTS "Tenants can view their own products" ON public.products;
CREATE POLICY "Tenants can view their own products"
ON public.products
FOR SELECT
USING (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Tenants can insert their own products" ON public.products;
CREATE POLICY "Tenants can insert their own products"
ON public.products
FOR INSERT
WITH CHECK (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Tenants can update their own products" ON public.products;
CREATE POLICY "Tenants can update their own products"
ON public.products
FOR UPDATE
USING (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Tenants can delete their own products" ON public.products;
CREATE POLICY "Tenants can delete their own products"
ON public.products
FOR DELETE
USING (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

-- ========================================
-- CROSS_SELLS
-- ========================================
DROP POLICY IF EXISTS "Tenants can view their own cross sells" ON public.cross_sells;
CREATE POLICY "Tenants can view their own cross sells"
ON public.cross_sells
FOR SELECT
USING (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Tenants can insert their own cross sells" ON public.cross_sells;
CREATE POLICY "Tenants can insert their own cross sells"
ON public.cross_sells
FOR INSERT
WITH CHECK (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Tenants can delete their own cross sells" ON public.cross_sells;
CREATE POLICY "Tenants can delete their own cross sells"
ON public.cross_sells
FOR DELETE
USING (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

-- ========================================
-- PRODUCT_ALTERNATIVES
-- ========================================
DROP POLICY IF EXISTS "Tenants can view their own product alternatives" ON public.product_alternatives;
CREATE POLICY "Tenants can view their own product alternatives"
ON public.product_alternatives
FOR SELECT
USING (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Tenants can insert their own product alternatives" ON public.product_alternatives;
CREATE POLICY "Tenants can insert their own product alternatives"
ON public.product_alternatives
FOR INSERT
WITH CHECK (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Tenants can delete their own product alternatives" ON public.product_alternatives;
CREATE POLICY "Tenants can delete their own product alternatives"
ON public.product_alternatives
FOR DELETE
USING (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

-- ========================================
-- CUSTOMERS
-- ========================================
DROP POLICY IF EXISTS "Tenants can view their own customers" ON public.customers;
CREATE POLICY "Tenants can view their own customers"
ON public.customers
FOR SELECT
USING (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Tenants can insert their own customers" ON public.customers;
CREATE POLICY "Tenants can insert their own customers"
ON public.customers
FOR INSERT
WITH CHECK (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Tenants can delete their own customers" ON public.customers;
CREATE POLICY "Tenants can delete their own customers"
ON public.customers
FOR DELETE
USING (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

-- ========================================
-- APP_INSIGHTS
-- ========================================
DROP POLICY IF EXISTS "Tenants can view their own app insights" ON public.app_insights;
CREATE POLICY "Tenants can view their own app insights"
ON public.app_insights
FOR SELECT
USING (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Tenants can insert their own app insights" ON public.app_insights;
CREATE POLICY "Tenants can insert their own app insights"
ON public.app_insights
FOR INSERT
WITH CHECK (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Tenants can update their own app insights" ON public.app_insights;
CREATE POLICY "Tenants can update their own app insights"
ON public.app_insights
FOR UPDATE
USING (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Tenants can delete their own app insights" ON public.app_insights;
CREATE POLICY "Tenants can delete their own app insights"
ON public.app_insights
FOR DELETE
USING (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

-- ========================================
-- COLLECTIONS
-- ========================================
DROP POLICY IF EXISTS "Tenants can view their own collections" ON public.collections;
CREATE POLICY "Tenants can view their own collections"
ON public.collections
FOR SELECT
USING (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Tenants can view organization collections in their tenant" ON public.collections;
CREATE POLICY "Tenants can view organization collections in their tenant"
ON public.collections
FOR SELECT
USING (
  (visibility = 'organization' AND public.get_my_tenant_id() = tenant_id) 
  OR public.has_role(auth.uid(), 'super_admin')
);

DROP POLICY IF EXISTS "Tenants can view collections shared with them in their tenant" ON public.collections;
CREATE POLICY "Tenants can view collections shared with them in their tenant"
ON public.collections
FOR SELECT
USING (
  (visibility = 'selected' AND public.get_my_tenant_id() = tenant_id AND user_can_view_collection(id, auth.uid()))
  OR public.has_role(auth.uid(), 'super_admin')
);

DROP POLICY IF EXISTS "Tenants can insert their own collections" ON public.collections;
CREATE POLICY "Tenants can insert their own collections"
ON public.collections
FOR INSERT
WITH CHECK (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Tenants can update their own collections" ON public.collections;
CREATE POLICY "Tenants can update their own collections"
ON public.collections
FOR UPDATE
USING (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Tenants can delete their own collections" ON public.collections;
CREATE POLICY "Tenants can delete their own collections"
ON public.collections
FOR DELETE
USING (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

-- ========================================
-- COLLECTION_PRODUCTS
-- ========================================
DROP POLICY IF EXISTS "Tenants can view products in their collections" ON public.collection_products;
CREATE POLICY "Tenants can view products in their collections"
ON public.collection_products
FOR SELECT
USING (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Tenants can insert products to their collections" ON public.collection_products;
CREATE POLICY "Tenants can insert products to their collections"
ON public.collection_products
FOR INSERT
WITH CHECK (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Tenants can delete products from their collections" ON public.collection_products;
CREATE POLICY "Tenants can delete products from their collections"
ON public.collection_products
FOR DELETE
USING (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

-- ========================================
-- COLLECTION_SHARES
-- ========================================
DROP POLICY IF EXISTS "Tenants can view shares for their collections" ON public.collection_shares;
CREATE POLICY "Tenants can view shares for their collections"
ON public.collection_shares
FOR SELECT
USING (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Tenants can insert shares for their collections" ON public.collection_shares;
CREATE POLICY "Tenants can insert shares for their collections"
ON public.collection_shares
FOR INSERT
WITH CHECK (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Tenants can delete shares from their collections" ON public.collection_shares;
CREATE POLICY "Tenants can delete shares from their collections"
ON public.collection_shares
FOR DELETE
USING (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

-- ========================================
-- ACTION_ITEMS
-- ========================================
DROP POLICY IF EXISTS "Tenants can view action items in their tenant" ON public.action_items;
CREATE POLICY "Tenants can view action items in their tenant"
ON public.action_items
FOR SELECT
USING (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Tenants can insert action items in their tenant" ON public.action_items;
CREATE POLICY "Tenants can insert action items in their tenant"
ON public.action_items
FOR INSERT
WITH CHECK (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Tenants can update action items in their tenant" ON public.action_items;
CREATE POLICY "Tenants can update action items in their tenant"
ON public.action_items
FOR UPDATE
USING (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Tenants can delete action items in their tenant" ON public.action_items;
CREATE POLICY "Tenants can delete action items in their tenant"
ON public.action_items
FOR DELETE
USING (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

-- ========================================
-- UPLOAD_HISTORY
-- ========================================
DROP POLICY IF EXISTS "Tenants can view their upload history" ON public.upload_history;
CREATE POLICY "Tenants can view their upload history"
ON public.upload_history
FOR SELECT
USING (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Tenants can insert their upload history" ON public.upload_history;
CREATE POLICY "Tenants can insert their upload history"
ON public.upload_history
FOR INSERT
WITH CHECK (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Tenants can delete their upload history" ON public.upload_history;
CREATE POLICY "Tenants can delete their upload history"
ON public.upload_history
FOR DELETE
USING (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

-- ========================================
-- USER_FAVORITES
-- ========================================
DROP POLICY IF EXISTS "Tenants can view favorites in their tenant" ON public.user_favorites;
CREATE POLICY "Tenants can view favorites in their tenant"
ON public.user_favorites
FOR SELECT
USING (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Tenants can insert favorites in their tenant" ON public.user_favorites;
CREATE POLICY "Tenants can insert favorites in their tenant"
ON public.user_favorites
FOR INSERT
WITH CHECK (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Tenants can delete favorites in their tenant" ON public.user_favorites;
CREATE POLICY "Tenants can delete favorites in their tenant"
ON public.user_favorites
FOR DELETE
USING (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

-- ========================================
-- USER_NOTIFICATIONS
-- ========================================
DROP POLICY IF EXISTS "Tenants can view notification states in their tenant" ON public.user_notifications;
CREATE POLICY "Tenants can view notification states in their tenant"
ON public.user_notifications
FOR SELECT
USING (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Tenants can insert notification states in their tenant" ON public.user_notifications;
CREATE POLICY "Tenants can insert notification states in their tenant"
ON public.user_notifications
FOR INSERT
WITH CHECK (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Tenants can update notification states in their tenant" ON public.user_notifications;
CREATE POLICY "Tenants can update notification states in their tenant"
ON public.user_notifications
FOR UPDATE
USING (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Tenants can delete notification states in their tenant" ON public.user_notifications;
CREATE POLICY "Tenants can delete notification states in their tenant"
ON public.user_notifications
FOR DELETE
USING (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

-- ========================================
-- USER_DASHBOARD_SETTINGS
-- ========================================
DROP POLICY IF EXISTS "Tenants can view dashboard settings in their tenant" ON public.user_dashboard_settings;
CREATE POLICY "Tenants can view dashboard settings in their tenant"
ON public.user_dashboard_settings
FOR SELECT
USING (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Tenants can insert dashboard settings in their tenant" ON public.user_dashboard_settings;
CREATE POLICY "Tenants can insert dashboard settings in their tenant"
ON public.user_dashboard_settings
FOR INSERT
WITH CHECK (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Tenants can update dashboard settings in their tenant" ON public.user_dashboard_settings;
CREATE POLICY "Tenants can update dashboard settings in their tenant"
ON public.user_dashboard_settings
FOR UPDATE
USING (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Tenants can delete dashboard settings in their tenant" ON public.user_dashboard_settings;
CREATE POLICY "Tenants can delete dashboard settings in their tenant"
ON public.user_dashboard_settings
FOR DELETE
USING (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

-- ========================================
-- USER_COLUMN_SETTINGS
-- ========================================
DROP POLICY IF EXISTS "Tenants can view column settings in their tenant" ON public.user_column_settings;
CREATE POLICY "Tenants can view column settings in their tenant"
ON public.user_column_settings
FOR SELECT
USING (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Tenants can insert column settings in their tenant" ON public.user_column_settings;
CREATE POLICY "Tenants can insert column settings in their tenant"
ON public.user_column_settings
FOR INSERT
WITH CHECK (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Tenants can update column settings in their tenant" ON public.user_column_settings;
CREATE POLICY "Tenants can update column settings in their tenant"
ON public.user_column_settings
FOR UPDATE
USING (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Tenants can delete column settings in their tenant" ON public.user_column_settings;
CREATE POLICY "Tenants can delete column settings in their tenant"
ON public.user_column_settings
FOR DELETE
USING (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

-- ========================================
-- USER_PREFERENCES
-- ========================================
DROP POLICY IF EXISTS "Tenants can view preferences in their tenant" ON public.user_preferences;
CREATE POLICY "Tenants can view preferences in their tenant"
ON public.user_preferences
FOR SELECT
USING (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Tenants can insert preferences in their tenant" ON public.user_preferences;
CREATE POLICY "Tenants can insert preferences in their tenant"
ON public.user_preferences
FOR INSERT
WITH CHECK (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Tenants can update preferences in their tenant" ON public.user_preferences;
CREATE POLICY "Tenants can update preferences in their tenant"
ON public.user_preferences
FOR UPDATE
USING (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

-- ========================================
-- USER_PROJECT_HISTORY
-- ========================================
DROP POLICY IF EXISTS "Tenants can view project history in their tenant" ON public.user_project_history;
CREATE POLICY "Tenants can view project history in their tenant"
ON public.user_project_history
FOR SELECT
USING (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Tenants can insert project history in their tenant" ON public.user_project_history;
CREATE POLICY "Tenants can insert project history in their tenant"
ON public.user_project_history
FOR INSERT
WITH CHECK (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Tenants can update project history in their tenant" ON public.user_project_history;
CREATE POLICY "Tenants can update project history in their tenant"
ON public.user_project_history
FOR UPDATE
USING (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Tenants can delete project history in their tenant" ON public.user_project_history;
CREATE POLICY "Tenants can delete project history in their tenant"
ON public.user_project_history
FOR DELETE
USING (public.get_my_tenant_id() = tenant_id OR public.has_role(auth.uid(), 'super_admin'));