-- Create global_applications table
CREATE TABLE public.global_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application TEXT NOT NULL,
  related_product TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  upload_id UUID REFERENCES public.upload_history(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.global_applications ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view global applications
CREATE POLICY "All users can view global applications"
ON public.global_applications
FOR SELECT
TO authenticated
USING (true);

-- Allow super_admins to insert global applications
CREATE POLICY "Super admins can insert global applications"
ON public.global_applications
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Allow super_admins to update global applications
CREATE POLICY "Super admins can update global applications"
ON public.global_applications
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Allow super_admins to delete global applications
CREATE POLICY "Super admins can delete global applications"
ON public.global_applications
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));