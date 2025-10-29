-- Add column for recent projects limit to user_preferences
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS recent_projects_limit integer NOT NULL DEFAULT 10;