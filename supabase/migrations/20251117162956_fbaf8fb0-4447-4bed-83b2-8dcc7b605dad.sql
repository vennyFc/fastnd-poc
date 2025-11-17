-- Create function to get the current user's tenant_id
CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id
  FROM public.profiles
  WHERE id = auth.uid()
$$;