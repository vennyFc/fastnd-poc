-- Create enum for access event types
CREATE TYPE public.access_event_type AS ENUM (
  'login',
  'logout',
  'page_view',
  'action'
);

-- Create user access logs table
CREATE TABLE public.user_access_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type access_event_type NOT NULL,
  event_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  page_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_access_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all access logs
CREATE POLICY "Admins can view all access logs"
ON public.user_access_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Users can view their own access logs
CREATE POLICY "Users can view their own access logs"
ON public.user_access_logs
FOR SELECT
USING (auth.uid() = user_id);

-- System can insert access logs (service role)
CREATE POLICY "System can insert access logs"
ON public.user_access_logs
FOR INSERT
WITH CHECK (true);

-- Create index for better query performance
CREATE INDEX idx_user_access_logs_user_id ON public.user_access_logs(user_id);
CREATE INDEX idx_user_access_logs_created_at ON public.user_access_logs(created_at DESC);
CREATE INDEX idx_user_access_logs_event_type ON public.user_access_logs(event_type);