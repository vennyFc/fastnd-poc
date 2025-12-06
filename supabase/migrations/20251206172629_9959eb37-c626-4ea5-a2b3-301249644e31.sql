-- Add industry column to applications table
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS industry text;