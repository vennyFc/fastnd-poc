-- Add manufacturers column to user_preferences table
ALTER TABLE public.user_preferences 
ADD COLUMN manufacturers text[] DEFAULT '{}'::text[];