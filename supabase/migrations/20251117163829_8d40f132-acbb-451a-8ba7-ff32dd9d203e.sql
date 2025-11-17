-- Add RLS Policies for global_products table

-- All authenticated users can view global products
CREATE POLICY "All tenants can view global products"
  ON public.global_products FOR SELECT
  TO authenticated
  USING (true);

-- Only Super Admins can add global products
CREATE POLICY "Super Admins can add global products"
  ON public.global_products FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Only Super Admins can update global products
CREATE POLICY "Super Admins can update global products"
  ON public.global_products FOR UPDATE
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Only Super Admins can delete global products
CREATE POLICY "Super Admins can delete global products"
  ON public.global_products FOR DELETE
  USING (public.has_role(auth.uid(), 'super_admin'));