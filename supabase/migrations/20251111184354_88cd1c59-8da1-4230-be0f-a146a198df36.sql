-- Remove FK dependency and fix the unique constraint properly
-- Step 1: Drop the foreign key completely (it's not strictly necessary)
ALTER TABLE public.opps_optimization
  DROP CONSTRAINT IF EXISTS fk_project_number;

-- Step 2: Drop the old unique constraint on project_number
ALTER TABLE public.customer_projects
  DROP CONSTRAINT IF EXISTS customer_projects_project_number_unique;

-- Step 3: Add composite unique constraint: same user can't have duplicate products in same project
ALTER TABLE public.customer_projects
  ADD CONSTRAINT customer_projects_unique_user_project_product
  UNIQUE (user_id, project_number, product);

-- Step 4: Add helpful indexes for query performance
CREATE INDEX IF NOT EXISTS idx_customer_projects_project_number
  ON public.customer_projects (project_number);

CREATE INDEX IF NOT EXISTS idx_customer_projects_user_project
  ON public.customer_projects (user_id, project_number);
