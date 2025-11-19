-- Enable read access to global master data (tenant_id IS NULL) for all authenticated users
-- This allows all tenants to read shared/global data across the platform

-- Products
CREATE POLICY "Enable read access for global products"
ON public.products
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (tenant_id IS NULL);

-- Applications
CREATE POLICY "Enable read access for global applications"
ON public.applications
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (tenant_id IS NULL);

-- Cross-Sells
CREATE POLICY "Enable read access for global cross_sells"
ON public.cross_sells
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (tenant_id IS NULL);

-- Product Alternatives
CREATE POLICY "Enable read access for global product_alternatives"
ON public.product_alternatives
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (tenant_id IS NULL);

-- App Insights
CREATE POLICY "Enable read access for global app_insights"
ON public.app_insights
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (tenant_id IS NULL);