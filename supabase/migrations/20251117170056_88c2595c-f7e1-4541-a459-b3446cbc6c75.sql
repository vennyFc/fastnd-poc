-- Enable RLS on tenants table if not already enabled
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Allow super_admins to view all tenants
CREATE POLICY "Super admins can view all tenants"
ON public.tenants
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Allow super_admins to insert new tenants
CREATE POLICY "Super admins can insert tenants"
ON public.tenants
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Allow super_admins to update tenants
CREATE POLICY "Super admins can update tenants"
ON public.tenants
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Allow super_admins to delete tenants
CREATE POLICY "Super admins can delete tenants"
ON public.tenants
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));