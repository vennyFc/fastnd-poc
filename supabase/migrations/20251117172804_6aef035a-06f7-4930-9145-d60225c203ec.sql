-- Update handle_new_user function to support role from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_first_user BOOLEAN;
  assigned_role app_role;
  metadata_role TEXT;
BEGIN
  -- Check if this is the first user
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles LIMIT 1) INTO is_first_user;
  
  -- Get role from metadata if present
  metadata_role := NEW.raw_user_meta_data->>'role';
  
  -- Determine the role to assign
  IF is_first_user THEN
    -- First user always becomes super_admin
    assigned_role := 'super_admin'::app_role;
  ELSIF metadata_role IS NOT NULL AND metadata_role IN ('user', 'tenant_admin', 'super_admin') THEN
    -- Use the role from metadata if it's valid
    assigned_role := metadata_role::app_role;
  ELSE
    -- Default to 'user' role
    assigned_role := 'user'::app_role;
  END IF;
  
  -- Get tenant_id from metadata
  DECLARE
    metadata_tenant_id UUID;
  BEGIN
    metadata_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::UUID;
  EXCEPTION WHEN OTHERS THEN
    metadata_tenant_id := NULL;
  END;
  
  -- Insert profile with tenant_id from metadata
  INSERT INTO public.profiles (id, email, full_name, tenant_id)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', metadata_tenant_id);
  
  -- Assign role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role);
  
  RETURN NEW;
END;
$$;