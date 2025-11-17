-- Add tenant_id column to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN tenant_id UUID;

-- Add foreign key constraint
ALTER TABLE public.profiles 
  ADD CONSTRAINT fk_profiles_tenant 
  FOREIGN KEY (tenant_id) 
  REFERENCES public.tenants(id) 
  ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_profiles_tenant_id 
  ON public.profiles(tenant_id);