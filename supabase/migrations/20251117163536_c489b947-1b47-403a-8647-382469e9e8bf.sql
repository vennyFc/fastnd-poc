-- ============================================
-- Update RLS Policies for Remaining Tables - Multi-Tenant Architecture
-- ============================================

-- 1. COLLECTIONS - Switch from user_id to tenant_id
DROP POLICY IF EXISTS "Users can view their own collections" ON public.collections;
DROP POLICY IF EXISTS "Users can insert their own collections" ON public.collections;
DROP POLICY IF EXISTS "Users can update their own collections" ON public.collections;
DROP POLICY IF EXISTS "Users can delete their own collections" ON public.collections;
DROP POLICY IF EXISTS "Users can view organization collections" ON public.collections;
DROP POLICY IF EXISTS "Users can view collections shared with them" ON public.collections;

CREATE POLICY "Tenants can view their own collections"
  ON public.collections FOR SELECT
  USING (public.get_my_tenant_id() = tenant_id);

CREATE POLICY "Tenants can insert their own collections"
  ON public.collections FOR INSERT
  WITH CHECK (public.get_my_tenant_id() = tenant_id);

CREATE POLICY "Tenants can update their own collections"
  ON public.collections FOR UPDATE
  USING (public.get_my_tenant_id() = tenant_id)
  WITH CHECK (public.get_my_tenant_id() = tenant_id);

CREATE POLICY "Tenants can delete their own collections"
  ON public.collections FOR DELETE
  USING (public.get_my_tenant_id() = tenant_id);

-- Keep organization visibility logic but with tenant isolation
CREATE POLICY "Tenants can view organization collections in their tenant"
  ON public.collections FOR SELECT
  USING (
    visibility = 'organization'
    AND public.get_my_tenant_id() = tenant_id
  );

-- Keep shared collections logic but with tenant isolation
CREATE POLICY "Tenants can view collections shared with them in their tenant"
  ON public.collections FOR SELECT
  USING (
    visibility = 'selected'
    AND public.get_my_tenant_id() = tenant_id
    AND user_can_view_collection(id, auth.uid())
  );

-- 2. COLLECTION_PRODUCTS - Switch from collection ownership to tenant_id
DROP POLICY IF EXISTS "Users can view products in accessible collections" ON public.collection_products;
DROP POLICY IF EXISTS "Users can insert products to their own collections" ON public.collection_products;
DROP POLICY IF EXISTS "Users can delete products from their own collections" ON public.collection_products;

CREATE POLICY "Tenants can view products in their collections"
  ON public.collection_products FOR SELECT
  USING (public.get_my_tenant_id() = tenant_id);

CREATE POLICY "Tenants can insert products to their collections"
  ON public.collection_products FOR INSERT
  WITH CHECK (public.get_my_tenant_id() = tenant_id);

CREATE POLICY "Tenants can delete products from their collections"
  ON public.collection_products FOR DELETE
  USING (public.get_my_tenant_id() = tenant_id);

-- 3. COLLECTION_SHARES - Switch from collection ownership to tenant_id
DROP POLICY IF EXISTS "Users can view shares for their collections" ON public.collection_shares;
DROP POLICY IF EXISTS "Users can insert shares for their collections" ON public.collection_shares;
DROP POLICY IF EXISTS "Users can delete shares from their collections" ON public.collection_shares;

CREATE POLICY "Tenants can view shares for their collections"
  ON public.collection_shares FOR SELECT
  USING (public.get_my_tenant_id() = tenant_id);

CREATE POLICY "Tenants can insert shares for their collections"
  ON public.collection_shares FOR INSERT
  WITH CHECK (public.get_my_tenant_id() = tenant_id);

CREATE POLICY "Tenants can delete shares from their collections"
  ON public.collection_shares FOR DELETE
  USING (public.get_my_tenant_id() = tenant_id);

-- 4. ACTION_ITEMS - Switch from user_id to tenant_id
DROP POLICY IF EXISTS "Users can view their own created action items" ON public.action_items;
DROP POLICY IF EXISTS "Users can view action items assigned to them" ON public.action_items;
DROP POLICY IF EXISTS "Users can insert their own action items" ON public.action_items;
DROP POLICY IF EXISTS "Users can update action items they created" ON public.action_items;
DROP POLICY IF EXISTS "Users can update action items assigned to them" ON public.action_items;
DROP POLICY IF EXISTS "Users can delete action items they created" ON public.action_items;

CREATE POLICY "Tenants can view action items in their tenant"
  ON public.action_items FOR SELECT
  USING (public.get_my_tenant_id() = tenant_id);

CREATE POLICY "Tenants can insert action items in their tenant"
  ON public.action_items FOR INSERT
  WITH CHECK (public.get_my_tenant_id() = tenant_id);

CREATE POLICY "Tenants can update action items in their tenant"
  ON public.action_items FOR UPDATE
  USING (public.get_my_tenant_id() = tenant_id)
  WITH CHECK (public.get_my_tenant_id() = tenant_id);

CREATE POLICY "Tenants can delete action items in their tenant"
  ON public.action_items FOR DELETE
  USING (public.get_my_tenant_id() = tenant_id);

-- 5. UPLOAD_HISTORY - Switch from user_id to tenant_id
DROP POLICY IF EXISTS "Users can view their own upload history" ON public.upload_history;
DROP POLICY IF EXISTS "Users can insert their own upload history" ON public.upload_history;
DROP POLICY IF EXISTS "Users can delete their own upload history" ON public.upload_history;

CREATE POLICY "Tenants can view their upload history"
  ON public.upload_history FOR SELECT
  USING (public.get_my_tenant_id() = tenant_id);

CREATE POLICY "Tenants can insert their upload history"
  ON public.upload_history FOR INSERT
  WITH CHECK (public.get_my_tenant_id() = tenant_id);

CREATE POLICY "Tenants can delete their upload history"
  ON public.upload_history FOR DELETE
  USING (public.get_my_tenant_id() = tenant_id);

-- 6. USER_ACCESS_LOGS - Keep user-specific and add admin access
DROP POLICY IF EXISTS "Users can view their own access logs" ON public.user_access_logs;
DROP POLICY IF EXISTS "System can insert access logs" ON public.user_access_logs;
DROP POLICY IF EXISTS "Admins can view all access logs" ON public.user_access_logs;

-- Users can view their own logs
CREATE POLICY "Users can view their own access logs"
  ON public.user_access_logs FOR SELECT
  USING (auth.uid() = user_id);

-- System can insert (keep tenant isolation)
CREATE POLICY "System can insert access logs"
  ON public.user_access_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Super admins can view all logs
CREATE POLICY "Super admins can view all access logs"
  ON public.user_access_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Tenant admins can view logs in their tenant
CREATE POLICY "Tenant admins can view access logs in their tenant"
  ON public.user_access_logs FOR SELECT
  USING (
    public.has_role(auth.uid(), 'tenant_admin')
    AND public.get_my_tenant_id() = tenant_id
  );

-- 7. USER_FAVORITES - Switch from user_id to tenant_id
DROP POLICY IF EXISTS "Users can view their own favorites" ON public.user_favorites;
DROP POLICY IF EXISTS "Users can insert their own favorites" ON public.user_favorites;
DROP POLICY IF EXISTS "Users can delete their own favorites" ON public.user_favorites;

CREATE POLICY "Tenants can view favorites in their tenant"
  ON public.user_favorites FOR SELECT
  USING (public.get_my_tenant_id() = tenant_id);

CREATE POLICY "Tenants can insert favorites in their tenant"
  ON public.user_favorites FOR INSERT
  WITH CHECK (public.get_my_tenant_id() = tenant_id);

CREATE POLICY "Tenants can delete favorites in their tenant"
  ON public.user_favorites FOR DELETE
  USING (public.get_my_tenant_id() = tenant_id);

-- 8. USER_PROJECT_HISTORY - Switch from user_id to tenant_id
DROP POLICY IF EXISTS "Users can view their own project history" ON public.user_project_history;
DROP POLICY IF EXISTS "Users can insert their own project history" ON public.user_project_history;
DROP POLICY IF EXISTS "Users can update their own project history" ON public.user_project_history;
DROP POLICY IF EXISTS "Users can delete their own project history" ON public.user_project_history;

CREATE POLICY "Tenants can view project history in their tenant"
  ON public.user_project_history FOR SELECT
  USING (public.get_my_tenant_id() = tenant_id);

CREATE POLICY "Tenants can insert project history in their tenant"
  ON public.user_project_history FOR INSERT
  WITH CHECK (public.get_my_tenant_id() = tenant_id);

CREATE POLICY "Tenants can update project history in their tenant"
  ON public.user_project_history FOR UPDATE
  USING (public.get_my_tenant_id() = tenant_id)
  WITH CHECK (public.get_my_tenant_id() = tenant_id);

CREATE POLICY "Tenants can delete project history in their tenant"
  ON public.user_project_history FOR DELETE
  USING (public.get_my_tenant_id() = tenant_id);

-- 9. USER_COLUMN_SETTINGS - Switch from user_id to tenant_id
DROP POLICY IF EXISTS "Users can view their own column settings" ON public.user_column_settings;
DROP POLICY IF EXISTS "Users can insert their own column settings" ON public.user_column_settings;
DROP POLICY IF EXISTS "Users can update their own column settings" ON public.user_column_settings;
DROP POLICY IF EXISTS "Users can delete their own column settings" ON public.user_column_settings;

CREATE POLICY "Tenants can view column settings in their tenant"
  ON public.user_column_settings FOR SELECT
  USING (public.get_my_tenant_id() = tenant_id);

CREATE POLICY "Tenants can insert column settings in their tenant"
  ON public.user_column_settings FOR INSERT
  WITH CHECK (public.get_my_tenant_id() = tenant_id);

CREATE POLICY "Tenants can update column settings in their tenant"
  ON public.user_column_settings FOR UPDATE
  USING (public.get_my_tenant_id() = tenant_id)
  WITH CHECK (public.get_my_tenant_id() = tenant_id);

CREATE POLICY "Tenants can delete column settings in their tenant"
  ON public.user_column_settings FOR DELETE
  USING (public.get_my_tenant_id() = tenant_id);

-- 10. USER_DASHBOARD_SETTINGS - Switch from user_id to tenant_id
DROP POLICY IF EXISTS "Users can view their own dashboard settings" ON public.user_dashboard_settings;
DROP POLICY IF EXISTS "Users can insert their own dashboard settings" ON public.user_dashboard_settings;
DROP POLICY IF EXISTS "Users can update their own dashboard settings" ON public.user_dashboard_settings;
DROP POLICY IF EXISTS "Users can delete their own dashboard settings" ON public.user_dashboard_settings;

CREATE POLICY "Tenants can view dashboard settings in their tenant"
  ON public.user_dashboard_settings FOR SELECT
  USING (public.get_my_tenant_id() = tenant_id);

CREATE POLICY "Tenants can insert dashboard settings in their tenant"
  ON public.user_dashboard_settings FOR INSERT
  WITH CHECK (public.get_my_tenant_id() = tenant_id);

CREATE POLICY "Tenants can update dashboard settings in their tenant"
  ON public.user_dashboard_settings FOR UPDATE
  USING (public.get_my_tenant_id() = tenant_id)
  WITH CHECK (public.get_my_tenant_id() = tenant_id);

CREATE POLICY "Tenants can delete dashboard settings in their tenant"
  ON public.user_dashboard_settings FOR DELETE
  USING (public.get_my_tenant_id() = tenant_id);

-- 11. USER_NOTIFICATIONS - Switch from user_id to tenant_id
DROP POLICY IF EXISTS "Users can view their own notification states" ON public.user_notifications;
DROP POLICY IF EXISTS "Users can insert their own notification states" ON public.user_notifications;
DROP POLICY IF EXISTS "Users can update their own notification states" ON public.user_notifications;
DROP POLICY IF EXISTS "Users can delete their own notification states" ON public.user_notifications;

CREATE POLICY "Tenants can view notification states in their tenant"
  ON public.user_notifications FOR SELECT
  USING (public.get_my_tenant_id() = tenant_id);

CREATE POLICY "Tenants can insert notification states in their tenant"
  ON public.user_notifications FOR INSERT
  WITH CHECK (public.get_my_tenant_id() = tenant_id);

CREATE POLICY "Tenants can update notification states in their tenant"
  ON public.user_notifications FOR UPDATE
  USING (public.get_my_tenant_id() = tenant_id)
  WITH CHECK (public.get_my_tenant_id() = tenant_id);

CREATE POLICY "Tenants can delete notification states in their tenant"
  ON public.user_notifications FOR DELETE
  USING (public.get_my_tenant_id() = tenant_id);

-- 12. USER_PREFERENCES - Switch from user_id to tenant_id
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can insert their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON public.user_preferences;

CREATE POLICY "Tenants can view preferences in their tenant"
  ON public.user_preferences FOR SELECT
  USING (public.get_my_tenant_id() = tenant_id);

CREATE POLICY "Tenants can insert preferences in their tenant"
  ON public.user_preferences FOR INSERT
  WITH CHECK (public.get_my_tenant_id() = tenant_id);

CREATE POLICY "Tenants can update preferences in their tenant"
  ON public.user_preferences FOR UPDATE
  USING (public.get_my_tenant_id() = tenant_id)
  WITH CHECK (public.get_my_tenant_id() = tenant_id);