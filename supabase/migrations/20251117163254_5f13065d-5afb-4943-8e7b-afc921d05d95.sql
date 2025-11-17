-- ============================================
-- Update RLS Policies for Multi-Tenant Architecture
-- ============================================

-- 1. PROFILES TABLE - Update to role-based access
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Super admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Tenant admins can view profiles in their tenant"
  ON public.profiles FOR SELECT
  USING (
    public.has_role(auth.uid(), 'tenant_admin') 
    AND tenant_id = public.get_my_tenant_id()
  );

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- 2. USER_ROLES TABLE - Add tenant-admin policies
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Tenant admins can view roles in their tenant"
  ON public.user_roles FOR SELECT
  USING (
    public.has_role(auth.uid(), 'tenant_admin')
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = user_roles.user_id
      AND profiles.tenant_id = public.get_my_tenant_id()
    )
  );

CREATE POLICY "Super admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Tenant admins can insert roles in their tenant"
  ON public.user_roles FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'tenant_admin')
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = user_roles.user_id
      AND profiles.tenant_id = public.get_my_tenant_id()
    )
  );

-- 3. CUSTOMER_PROJECTS - Switch from user_id to tenant_id
DROP POLICY IF EXISTS "Users can view their own projects" ON public.customer_projects;
DROP POLICY IF EXISTS "Users can insert their own projects" ON public.customer_projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.customer_projects;

CREATE POLICY "Tenants can view their own projects"
  ON public.customer_projects FOR SELECT
  USING (public.get_my_tenant_id() = tenant_id);

CREATE POLICY "Tenants can insert their own projects"
  ON public.customer_projects FOR INSERT
  WITH CHECK (public.get_my_tenant_id() = tenant_id);

CREATE POLICY "Tenants can delete their own projects"
  ON public.customer_projects FOR DELETE
  USING (public.get_my_tenant_id() = tenant_id);

-- 4. APPLICATIONS - Switch from user_id to tenant_id
DROP POLICY IF EXISTS "Users can view their own applications" ON public.applications;
DROP POLICY IF EXISTS "Users can insert their own applications" ON public.applications;
DROP POLICY IF EXISTS "Users can delete their own applications" ON public.applications;

CREATE POLICY "Tenants can view their own applications"
  ON public.applications FOR SELECT
  USING (public.get_my_tenant_id() = tenant_id);

CREATE POLICY "Tenants can insert their own applications"
  ON public.applications FOR INSERT
  WITH CHECK (public.get_my_tenant_id() = tenant_id);

CREATE POLICY "Tenants can delete their own applications"
  ON public.applications FOR DELETE
  USING (public.get_my_tenant_id() = tenant_id);

-- 5. PRODUCTS - Switch from user_id to tenant_id
DROP POLICY IF EXISTS "Users can view their own products" ON public.products;
DROP POLICY IF EXISTS "Users can insert their own products" ON public.products;
DROP POLICY IF EXISTS "Users can update their own products" ON public.products;
DROP POLICY IF EXISTS "Users can delete their own products" ON public.products;

CREATE POLICY "Tenants can view their own products"
  ON public.products FOR SELECT
  USING (public.get_my_tenant_id() = tenant_id);

CREATE POLICY "Tenants can insert their own products"
  ON public.products FOR INSERT
  WITH CHECK (public.get_my_tenant_id() = tenant_id);

CREATE POLICY "Tenants can update their own products"
  ON public.products FOR UPDATE
  USING (public.get_my_tenant_id() = tenant_id)
  WITH CHECK (public.get_my_tenant_id() = tenant_id);

CREATE POLICY "Tenants can delete their own products"
  ON public.products FOR DELETE
  USING (public.get_my_tenant_id() = tenant_id);

-- 6. CROSS_SELLS - Switch from user_id to tenant_id
DROP POLICY IF EXISTS "Users can view their own cross sells" ON public.cross_sells;
DROP POLICY IF EXISTS "Users can insert their own cross sells" ON public.cross_sells;
DROP POLICY IF EXISTS "Users can delete their own cross sells" ON public.cross_sells;

CREATE POLICY "Tenants can view their own cross sells"
  ON public.cross_sells FOR SELECT
  USING (public.get_my_tenant_id() = tenant_id);

CREATE POLICY "Tenants can insert their own cross sells"
  ON public.cross_sells FOR INSERT
  WITH CHECK (public.get_my_tenant_id() = tenant_id);

CREATE POLICY "Tenants can delete their own cross sells"
  ON public.cross_sells FOR DELETE
  USING (public.get_my_tenant_id() = tenant_id);

-- 7. PRODUCT_ALTERNATIVES - Switch from user_id to tenant_id
DROP POLICY IF EXISTS "Users can view their own product alternatives" ON public.product_alternatives;
DROP POLICY IF EXISTS "Users can insert their own product alternatives" ON public.product_alternatives;
DROP POLICY IF EXISTS "Users can delete their own product alternatives" ON public.product_alternatives;

CREATE POLICY "Tenants can view their own product alternatives"
  ON public.product_alternatives FOR SELECT
  USING (public.get_my_tenant_id() = tenant_id);

CREATE POLICY "Tenants can insert their own product alternatives"
  ON public.product_alternatives FOR INSERT
  WITH CHECK (public.get_my_tenant_id() = tenant_id);

CREATE POLICY "Tenants can delete their own product alternatives"
  ON public.product_alternatives FOR DELETE
  USING (public.get_my_tenant_id() = tenant_id);

-- 8. CUSTOMERS - Switch from user_id to tenant_id (if exists)
DROP POLICY IF EXISTS "Users can view their own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can insert their own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can delete their own customers" ON public.customers;

CREATE POLICY "Tenants can view their own customers"
  ON public.customers FOR SELECT
  USING (public.get_my_tenant_id() = tenant_id);

CREATE POLICY "Tenants can insert their own customers"
  ON public.customers FOR INSERT
  WITH CHECK (public.get_my_tenant_id() = tenant_id);

CREATE POLICY "Tenants can delete their own customers"
  ON public.customers FOR DELETE
  USING (public.get_my_tenant_id() = tenant_id);

-- 9. APP_INSIGHTS - Switch from user_id to tenant_id (if exists)
DROP POLICY IF EXISTS "Users can view their own app insights" ON public.app_insights;
DROP POLICY IF EXISTS "Users can insert their own app insights" ON public.app_insights;
DROP POLICY IF EXISTS "Users can update their own app insights" ON public.app_insights;
DROP POLICY IF EXISTS "Users can delete their own app insights" ON public.app_insights;

CREATE POLICY "Tenants can view their own app insights"
  ON public.app_insights FOR SELECT
  USING (public.get_my_tenant_id() = tenant_id);

CREATE POLICY "Tenants can insert their own app insights"
  ON public.app_insights FOR INSERT
  WITH CHECK (public.get_my_tenant_id() = tenant_id);

CREATE POLICY "Tenants can update their own app insights"
  ON public.app_insights FOR UPDATE
  USING (public.get_my_tenant_id() = tenant_id)
  WITH CHECK (public.get_my_tenant_id() = tenant_id);

CREATE POLICY "Tenants can delete their own app insights"
  ON public.app_insights FOR DELETE
  USING (public.get_my_tenant_id() = tenant_id);