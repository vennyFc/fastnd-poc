-- Add tenant_id column to opps_optimization table
ALTER TABLE public.opps_optimization 
ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Create index for tenant_id
CREATE INDEX idx_opps_optimization_tenant_id ON public.opps_optimization(tenant_id);

-- Drop old RLS policies
DROP POLICY IF EXISTS "Users can delete their own optimization records" ON public.opps_optimization;
DROP POLICY IF EXISTS "Users can insert their own optimization records" ON public.opps_optimization;
DROP POLICY IF EXISTS "Users can update their own optimization records" ON public.opps_optimization;
DROP POLICY IF EXISTS "Users can view their own optimization records" ON public.opps_optimization;

-- Create new tenant-aware RLS policies
CREATE POLICY "Tenants can view optimization records in their tenant"
ON public.opps_optimization
FOR SELECT
USING (
  (get_my_tenant_id() = tenant_id) OR is_super_admin()
);

CREATE POLICY "Tenants can insert optimization records in their tenant"
ON public.opps_optimization
FOR INSERT
WITH CHECK (
  (get_my_tenant_id() = tenant_id) OR is_super_admin()
);

CREATE POLICY "Tenants can update optimization records in their tenant"
ON public.opps_optimization
FOR UPDATE
USING (
  (get_my_tenant_id() = tenant_id) OR is_super_admin()
)
WITH CHECK (
  (get_my_tenant_id() = tenant_id) OR is_super_admin()
);

CREATE POLICY "Tenants can delete optimization records in their tenant"
ON public.opps_optimization
FOR DELETE
USING (
  (get_my_tenant_id() = tenant_id) OR is_super_admin()
);

-- Super Admin policy for all operations
CREATE POLICY "Super Admins can do everything on opps_optimization"
ON public.opps_optimization
FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());