-- Step 1: Rename old enum type
ALTER TYPE public.app_role RENAME TO app_role_old;

-- Step 2: Remove old default value
ALTER TABLE public.user_roles 
  ALTER COLUMN role DROP DEFAULT;

-- Step 3: Create new enum with updated values
CREATE TYPE public.app_role AS ENUM ('super_admin', 'tenant_admin', 'user');

-- Step 4: Drop policies that depend on has_role function
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all access logs" ON public.user_access_logs;

-- Step 5: Drop has_role function
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role_old) CASCADE;

-- Step 6: Update the role column in user_roles table to use new type
ALTER TABLE public.user_roles 
  ALTER COLUMN role TYPE public.app_role 
  USING (
    CASE role::text
      WHEN 'admin' THEN 'super_admin'::public.app_role
      WHEN 'moderator' THEN 'user'::public.app_role
      WHEN 'user' THEN 'user'::public.app_role
    END
  );

-- Step 7: Set new default value for role column
ALTER TABLE public.user_roles 
  ALTER COLUMN role SET DEFAULT 'user'::public.app_role;

-- Step 8: Drop old enum type
DROP TYPE public.app_role_old;

-- Step 9: Recreate has_role function with new type
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Step 10: Recreate RLS policies with new enum type
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can view all access logs"
ON public.user_access_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'::app_role));