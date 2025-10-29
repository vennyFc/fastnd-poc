-- Migrate existing project favorites to the new user_favorites table
INSERT INTO public.user_favorites (user_id, entity_type, entity_id, created_at)
SELECT 
  pf.user_id,
  'project' as entity_type,
  cp.id as entity_id,
  pf.created_at
FROM public.project_favorites pf
INNER JOIN public.customer_projects cp 
  ON pf.project_name = cp.project_name 
  AND pf.customer = cp.customer
ON CONFLICT (user_id, entity_type, entity_id) DO NOTHING;

-- Drop the old project_favorites table as it's no longer needed
DROP TABLE IF EXISTS public.project_favorites;