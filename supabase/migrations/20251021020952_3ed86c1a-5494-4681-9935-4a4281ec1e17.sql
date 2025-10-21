-- Add user_id column to ai_cache table to enforce user isolation
ALTER TABLE public.ai_cache 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid();

-- Remove the default after adding the column to ensure future inserts must explicitly set user_id
ALTER TABLE public.ai_cache 
ALTER COLUMN user_id DROP DEFAULT;

-- Drop existing permissive RLS policies
DROP POLICY IF EXISTS "All authenticated users can view ai cache" ON public.ai_cache;
DROP POLICY IF EXISTS "All authenticated users can insert ai cache" ON public.ai_cache;

-- Create user-scoped RLS policies for SELECT
CREATE POLICY "Users can view their own ai cache" 
ON public.ai_cache 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Create user-scoped RLS policies for INSERT
CREATE POLICY "Users can insert their own ai cache" 
ON public.ai_cache 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create user-scoped RLS policies for DELETE (cleanup own cache)
CREATE POLICY "Users can delete their own ai cache" 
ON public.ai_cache 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);