-- Add customer_id column to action_items table
ALTER TABLE public.action_items 
ADD COLUMN customer_id UUID REFERENCES public.customer_projects(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_action_items_customer_id ON public.action_items(customer_id);
CREATE INDEX idx_action_items_assigned_to ON public.action_items(assigned_to);