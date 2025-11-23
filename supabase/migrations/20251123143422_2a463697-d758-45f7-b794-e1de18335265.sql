-- ==========================================
-- ENTFERNUNG: Super-Admin globale Daten-Bereitstellung
-- Super-Admins können keine Daten mehr mit tenant_id = NULL erstellen
-- ==========================================

-- 1. TRIGGER ANPASSEN: Auch Super-Admins müssen tenant_id setzen
CREATE OR REPLACE FUNCTION public.validate_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- ALLE User (inkl. Super Admins) müssen tenant_id setzen
  IF NEW.tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id darf nicht NULL sein. Globale Daten sind nicht mehr erlaubt.';
  END IF;
  
  -- Super Admins dürfen beliebige tenant_id setzen
  IF has_role(auth.uid(), 'super_admin'::app_role) THEN
    RETURN NEW;
  END IF;
  
  -- Normale User: tenant_id muss mit eigenem Tenant übereinstimmen
  IF NEW.tenant_id != get_my_tenant_id() THEN
    RAISE EXCEPTION 'tenant_id muss mit dem Tenant des Users übereinstimmen';
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. RLS POLICIES: Super-Admin Policies auf tenant-spezifische Daten beschränken

-- PRODUCTS
DROP POLICY IF EXISTS "Super Admins can do everything on products" ON public.products;
CREATE POLICY "Super Admins can access all tenant products"
ON public.products
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) AND tenant_id IS NOT NULL
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) AND tenant_id IS NOT NULL
);

-- APPLICATIONS
DROP POLICY IF EXISTS "Super Admins can do everything on applications" ON public.applications;
CREATE POLICY "Super Admins can access all tenant applications"
ON public.applications
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) AND tenant_id IS NOT NULL
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) AND tenant_id IS NOT NULL
);

-- CROSS_SELLS
DROP POLICY IF EXISTS "Super Admins can do everything on cross_sells" ON public.cross_sells;
CREATE POLICY "Super Admins can access all tenant cross_sells"
ON public.cross_sells
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) AND tenant_id IS NOT NULL
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) AND tenant_id IS NOT NULL
);

-- PRODUCT_ALTERNATIVES
DROP POLICY IF EXISTS "Super Admins can do everything on product_alternatives" ON public.product_alternatives;
CREATE POLICY "Super Admins can access all tenant product_alternatives"
ON public.product_alternatives
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) AND tenant_id IS NOT NULL
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) AND tenant_id IS NOT NULL
);

-- APP_INSIGHTS
DROP POLICY IF EXISTS "Super Admins can do everything on app_insights" ON public.app_insights;
CREATE POLICY "Super Admins can access all tenant app_insights"
ON public.app_insights
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) AND tenant_id IS NOT NULL
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) AND tenant_id IS NOT NULL
);

-- CUSTOMERS
DROP POLICY IF EXISTS "Super Admins can do everything on customers" ON public.customers;
CREATE POLICY "Super Admins can access all tenant customers"
ON public.customers
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) AND tenant_id IS NOT NULL
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) AND tenant_id IS NOT NULL
);

-- CUSTOMER_PROJECTS
DROP POLICY IF EXISTS "Super Admins can do everything on customer_projects" ON public.customer_projects;
CREATE POLICY "Super Admins can access all tenant projects"
ON public.customer_projects
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) AND tenant_id IS NOT NULL
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) AND tenant_id IS NOT NULL
);

-- COLLECTIONS
DROP POLICY IF EXISTS "Super Admins can do everything on collections" ON public.collections;
CREATE POLICY "Super Admins can access all tenant collections"
ON public.collections
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) AND tenant_id IS NOT NULL
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) AND tenant_id IS NOT NULL
);

-- COLLECTION_PRODUCTS
DROP POLICY IF EXISTS "Super Admins can do everything on collection_products" ON public.collection_products;
CREATE POLICY "Super Admins can access all tenant collection_products"
ON public.collection_products
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) AND tenant_id IS NOT NULL
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) AND tenant_id IS NOT NULL
);

-- COLLECTION_SHARES
DROP POLICY IF EXISTS "Super Admins can do everything on collection_shares" ON public.collection_shares;
CREATE POLICY "Super Admins can access all tenant collection_shares"
ON public.collection_shares
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) AND tenant_id IS NOT NULL
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) AND tenant_id IS NOT NULL
);

-- ACTION_ITEMS
DROP POLICY IF EXISTS "Super Admins can do everything on action_items" ON public.action_items;
CREATE POLICY "Super Admins can access all tenant action_items"
ON public.action_items
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) AND tenant_id IS NOT NULL
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) AND tenant_id IS NOT NULL
);

-- USER_FAVORITES
DROP POLICY IF EXISTS "Super Admins can do everything on user_favorites" ON public.user_favorites;
CREATE POLICY "Super Admins can access all tenant favorites"
ON public.user_favorites
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) AND tenant_id IS NOT NULL
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) AND tenant_id IS NOT NULL
);

-- USER_NOTIFICATIONS
DROP POLICY IF EXISTS "Super Admins can do everything on user_notifications" ON public.user_notifications;
CREATE POLICY "Super Admins can access all tenant notifications"
ON public.user_notifications
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) AND tenant_id IS NOT NULL
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) AND tenant_id IS NOT NULL
);

-- USER_PROJECT_HISTORY
DROP POLICY IF EXISTS "Super Admins can do everything on user_project_history" ON public.user_project_history;
CREATE POLICY "Super Admins can access all tenant project_history"
ON public.user_project_history
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) AND tenant_id IS NOT NULL
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) AND tenant_id IS NOT NULL
);

-- USER_DASHBOARD_SETTINGS
DROP POLICY IF EXISTS "Super Admins can do everything on user_dashboard_settings" ON public.user_dashboard_settings;
CREATE POLICY "Super Admins can access all tenant dashboard_settings"
ON public.user_dashboard_settings
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) AND tenant_id IS NOT NULL
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) AND tenant_id IS NOT NULL
);

-- USER_COLUMN_SETTINGS
DROP POLICY IF EXISTS "Super Admins can do everything on user_column_settings" ON public.user_column_settings;
CREATE POLICY "Super Admins can access all tenant column_settings"
ON public.user_column_settings
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) AND tenant_id IS NOT NULL
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) AND tenant_id IS NOT NULL
);

-- USER_PREFERENCES
DROP POLICY IF EXISTS "Super Admins can do everything on user_preferences" ON public.user_preferences;
CREATE POLICY "Super Admins can access all tenant preferences"
ON public.user_preferences
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) AND tenant_id IS NOT NULL
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) AND tenant_id IS NOT NULL
);

-- UPLOAD_HISTORY
DROP POLICY IF EXISTS "Super Admins can do everything on upload_history" ON public.upload_history;
CREATE POLICY "Super Admins can access all tenant upload_history"
ON public.upload_history
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) AND tenant_id IS NOT NULL
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) AND tenant_id IS NOT NULL
);

-- OPPS_OPTIMIZATION
DROP POLICY IF EXISTS "Super Admins can do everything on opps_optimization" ON public.opps_optimization;
CREATE POLICY "Super Admins can access all tenant opps_optimization"
ON public.opps_optimization
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) AND tenant_id IS NOT NULL
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) AND tenant_id IS NOT NULL
);

-- 3. DOKUMENTATION
COMMENT ON FUNCTION public.validate_tenant_id() IS 'Trigger-Funktion zur Validierung von tenant_id bei INSERT/UPDATE. Verhindert NULL-Werte für alle User inkl. Super-Admins.';

-- 4. HINWEIS: Globale Tabellen bleiben schreibgeschützt
-- global_products und global_applications können nur durch direkte Supabase-Zugriffe bearbeitet werden
-- Super-Admins können diese nur lesen, nicht mehr erstellen/bearbeiten