-- Add upload_id column to app_insights table
ALTER TABLE public.app_insights
ADD COLUMN upload_id UUID;