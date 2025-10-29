-- Add Industry column to app_insights table
ALTER TABLE public.app_insights
ADD COLUMN industry TEXT;