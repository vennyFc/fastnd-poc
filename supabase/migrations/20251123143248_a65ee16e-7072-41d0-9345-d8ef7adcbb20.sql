-- ==========================================
-- RLS OPTIMIZATION MIGRATION
-- Verbessert Performance, Sicherheit und Konsistenz der Tenant-Isolation
-- ==========================================

-- 1. PERFORMANCE: Indizes für tenant_id auf allen relevanten Tabellen
CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON public.products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_projects_tenant_id ON public.customer_projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON public.customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_applications_tenant_id ON public.applications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cross_sells_tenant_id ON public.cross_sells(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_alternatives_tenant_id ON public.product_alternatives(tenant_id);
CREATE INDEX IF NOT EXISTS idx_app_insights_tenant_id ON public.app_insights(tenant_id);
CREATE INDEX IF NOT EXISTS idx_collections_tenant_id ON public.collections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_collection_products_tenant_id ON public.collection_products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_collection_shares_tenant_id ON public.collection_shares(tenant_id);
CREATE INDEX IF NOT EXISTS idx_action_items_tenant_id ON public.action_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_tenant_id ON public.user_favorites(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_project_history_tenant_id ON public.user_project_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_tenant_id ON public.user_notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_tenant_id ON public.user_preferences(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_column_settings_tenant_id ON public.user_column_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_dashboard_settings_tenant_id ON public.user_dashboard_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_access_logs_tenant_id ON public.user_access_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_upload_history_tenant_id ON public.upload_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_opps_optimization_tenant_id ON public.opps_optimization(tenant_id);

-- Indizes für user_id (häufige Joins/Filters)
CREATE INDEX IF NOT EXISTS idx_action_items_user_id ON public.action_items(user_id);
CREATE INDEX IF NOT EXISTS idx_action_items_assigned_to ON public.action_items(assigned_to);
CREATE INDEX IF NOT EXISTS idx_user_access_logs_user_id ON public.user_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON public.user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_project_history_user_id ON public.user_project_history(user_id);

-- Composite Indizes für häufige Queries
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role ON public.user_roles(user_id, role);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id_id ON public.profiles(tenant_id, id);

-- 2. SICHERHEIT: Fehlende RLS Policies hinzufügen

-- user_roles: DELETE Policy für Admins
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  (has_role(auth.uid(), 'tenant_admin'::app_role) AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_roles.user_id
    AND tenant_id = get_my_tenant_id()
  ))
);

-- user_roles: UPDATE Policy für Admins
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  (has_role(auth.uid(), 'tenant_admin'::app_role) AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_roles.user_id
    AND tenant_id = get_my_tenant_id()
  ))
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  (has_role(auth.uid(), 'tenant_admin'::app_role) AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_roles.user_id
    AND tenant_id = get_my_tenant_id()
  ))
);

-- customers: UPDATE Policy hinzufügen (fehlte)
DROP POLICY IF EXISTS "Tenants can update their own customers" ON public.customers;
CREATE POLICY "Tenants can update their own customers"
ON public.customers
FOR UPDATE
TO authenticated
USING (get_my_tenant_id() = tenant_id OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (get_my_tenant_id() = tenant_id OR has_role(auth.uid(), 'super_admin'::app_role));

-- applications: UPDATE Policy hinzufügen (fehlte)
DROP POLICY IF EXISTS "Tenants can update their own applications" ON public.applications;
CREATE POLICY "Tenants can update their own applications"
ON public.applications
FOR UPDATE
TO authenticated
USING (get_my_tenant_id() = tenant_id OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (get_my_tenant_id() = tenant_id OR has_role(auth.uid(), 'super_admin'::app_role));

-- customer_projects: UPDATE Policy hinzufügen (fehlte)
DROP POLICY IF EXISTS "Tenants can update their own projects" ON public.customer_projects;
CREATE POLICY "Tenants can update their own projects"
ON public.customer_projects
FOR UPDATE
TO authenticated
USING (get_my_tenant_id() = tenant_id OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (get_my_tenant_id() = tenant_id OR has_role(auth.uid(), 'super_admin'::app_role));

-- cross_sells: UPDATE Policy hinzufügen (fehlte)
DROP POLICY IF EXISTS "Tenants can update their own cross sells" ON public.cross_sells;
CREATE POLICY "Tenants can update their own cross sells"
ON public.cross_sells
FOR UPDATE
TO authenticated
USING (get_my_tenant_id() = tenant_id OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (get_my_tenant_id() = tenant_id OR has_role(auth.uid(), 'super_admin'::app_role));

-- product_alternatives: UPDATE Policy hinzufügen (fehlte)
DROP POLICY IF EXISTS "Tenants can update their own product alternatives" ON public.product_alternatives;
CREATE POLICY "Tenants can update their own product alternatives"
ON public.product_alternatives
FOR UPDATE
TO authenticated
USING (get_my_tenant_id() = tenant_id OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (get_my_tenant_id() = tenant_id OR has_role(auth.uid(), 'super_admin'::app_role));

-- collection_products: UPDATE Policy hinzufügen (fehlte)
DROP POLICY IF EXISTS "Tenants can update products in their collections" ON public.collection_products;
CREATE POLICY "Tenants can update products in their collections"
ON public.collection_products
FOR UPDATE
TO authenticated
USING (get_my_tenant_id() = tenant_id OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (get_my_tenant_id() = tenant_id OR has_role(auth.uid(), 'super_admin'::app_role));

-- collection_shares: UPDATE Policy hinzufügen (fehlte)
DROP POLICY IF EXISTS "Tenants can update shares for their collections" ON public.collection_shares;
CREATE POLICY "Tenants can update shares for their collections"
ON public.collection_shares
FOR UPDATE
TO authenticated
USING (get_my_tenant_id() = tenant_id OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (get_my_tenant_id() = tenant_id OR has_role(auth.uid(), 'super_admin'::app_role));

-- user_favorites: UPDATE Policy hinzufügen (fehlte)
DROP POLICY IF EXISTS "Tenants can update favorites in their tenant" ON public.user_favorites;
CREATE POLICY "Tenants can update favorites in their tenant"
ON public.user_favorites
FOR UPDATE
TO authenticated
USING (get_my_tenant_id() = tenant_id OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (get_my_tenant_id() = tenant_id OR has_role(auth.uid(), 'super_admin'::app_role));

-- user_preferences: DELETE Policy hinzufügen (fehlte)
DROP POLICY IF EXISTS "Tenants can delete preferences in their tenant" ON public.user_preferences;
CREATE POLICY "Tenants can delete preferences in their tenant"
ON public.user_preferences
FOR DELETE
TO authenticated
USING (get_my_tenant_id() = tenant_id OR has_role(auth.uid(), 'super_admin'::app_role));

-- 3. KONSISTENZ: Tenant-ID Validierung verstärken
-- Trigger um sicherzustellen, dass tenant_id niemals manuell auf NULL gesetzt wird (außer für Super Admins)

CREATE OR REPLACE FUNCTION public.validate_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Super Admins dürfen tenant_id auf NULL setzen (für globale Daten)
  IF has_role(auth.uid(), 'super_admin'::app_role) THEN
    RETURN NEW;
  END IF;
  
  -- Für alle anderen: tenant_id muss gesetzt sein und muss mit User-Tenant übereinstimmen
  IF NEW.tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id darf nicht NULL sein';
  END IF;
  
  IF NEW.tenant_id != get_my_tenant_id() THEN
    RAISE EXCEPTION 'tenant_id muss mit dem Tenant des Users übereinstimmen';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger auf kritische Tabellen anwenden
DROP TRIGGER IF EXISTS validate_tenant_id_trigger ON public.products;
CREATE TRIGGER validate_tenant_id_trigger
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_tenant_id();

DROP TRIGGER IF EXISTS validate_tenant_id_trigger ON public.customer_projects;
CREATE TRIGGER validate_tenant_id_trigger
  BEFORE INSERT OR UPDATE ON public.customer_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_tenant_id();

DROP TRIGGER IF EXISTS validate_tenant_id_trigger ON public.customers;
CREATE TRIGGER validate_tenant_id_trigger
  BEFORE INSERT OR UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_tenant_id();

DROP TRIGGER IF EXISTS validate_tenant_id_trigger ON public.collections;
CREATE TRIGGER validate_tenant_id_trigger
  BEFORE INSERT OR UPDATE ON public.collections
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_tenant_id();

-- 4. AUDIT: Logging für kritische Admin-Aktionen
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index für Performance
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_user ON public.admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON public.admin_audit_log(created_at DESC);

-- RLS für audit_log
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_log;
CREATE POLICY "Admins can view audit logs"
ON public.admin_audit_log
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'tenant_admin'::app_role)
);

DROP POLICY IF EXISTS "System can insert audit logs" ON public.admin_audit_log;
CREATE POLICY "System can insert audit logs"
ON public.admin_audit_log
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = admin_user_id);

-- Audit-Trigger-Funktion
CREATE OR REPLACE FUNCTION public.log_admin_action()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Nur für Admins loggen
  IF has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'tenant_admin'::app_role) THEN
    INSERT INTO public.admin_audit_log (admin_user_id, action, table_name, record_id, old_values, new_values)
    VALUES (
      auth.uid(),
      TG_OP,
      TG_TABLE_NAME,
      COALESCE(NEW.id, OLD.id),
      CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END,
      CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Audit-Trigger auf kritische Tabellen
DROP TRIGGER IF EXISTS audit_tenants_trigger ON public.tenants;
CREATE TRIGGER audit_tenants_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.log_admin_action();

DROP TRIGGER IF EXISTS audit_user_roles_trigger ON public.user_roles;
CREATE TRIGGER audit_user_roles_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_admin_action();

DROP TRIGGER IF EXISTS audit_profiles_trigger ON public.profiles;
CREATE TRIGGER audit_profiles_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_admin_action();

-- 5. DOKUMENTATION: Kommentare für bessere Wartbarkeit
COMMENT ON FUNCTION public.get_my_tenant_id() IS 'Gibt die tenant_id des aktuell authentifizierten Users zurück';
COMMENT ON FUNCTION public.has_role(uuid, app_role) IS 'Prüft ob ein User eine bestimmte Rolle hat';
COMMENT ON FUNCTION public.is_super_admin() IS 'Prüft ob der aktuelle User Super Admin ist';
COMMENT ON FUNCTION public.validate_tenant_id() IS 'Trigger-Funktion zur Validierung von tenant_id bei INSERT/UPDATE';
COMMENT ON FUNCTION public.log_admin_action() IS 'Trigger-Funktion für Audit-Logging von Admin-Aktionen';
COMMENT ON TABLE public.admin_audit_log IS 'Audit-Log für alle Admin-Aktionen auf kritischen Tabellen';