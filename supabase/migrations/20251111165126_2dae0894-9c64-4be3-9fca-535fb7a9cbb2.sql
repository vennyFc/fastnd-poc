-- Add unique project_number column to customer_projects table
ALTER TABLE public.customer_projects 
ADD COLUMN project_number TEXT;

-- Create a sequence for project numbers
CREATE SEQUENCE IF NOT EXISTS project_number_seq START WITH 1000;

-- Update existing rows with unique project numbers
UPDATE public.customer_projects 
SET project_number = 'PRJ-' || LPAD(nextval('project_number_seq')::TEXT, 6, '0')
WHERE project_number IS NULL;

-- Make the column NOT NULL and UNIQUE
ALTER TABLE public.customer_projects 
ALTER COLUMN project_number SET NOT NULL,
ADD CONSTRAINT customer_projects_project_number_unique UNIQUE (project_number);

-- Create a function to auto-generate project numbers for new inserts
CREATE OR REPLACE FUNCTION generate_project_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.project_number IS NULL THEN
    NEW.project_number := 'PRJ-' || LPAD(nextval('project_number_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate project numbers
CREATE TRIGGER set_project_number
BEFORE INSERT ON public.customer_projects
FOR EACH ROW
EXECUTE FUNCTION generate_project_number();