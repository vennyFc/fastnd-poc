-- Add auto_logoff_minutes column to user_preferences table
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS auto_logoff_minutes integer NOT NULL DEFAULT 30;