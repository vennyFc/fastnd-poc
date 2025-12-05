-- Add opportunity_creation_date field to customer_projects table
ALTER TABLE public.customer_projects 
ADD COLUMN opportunity_creation_date timestamp with time zone;