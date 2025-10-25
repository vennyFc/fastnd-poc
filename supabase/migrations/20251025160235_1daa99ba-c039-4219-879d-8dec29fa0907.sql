-- Create enum for action item status
CREATE TYPE public.action_item_status AS ENUM ('open', 'in_progress', 'completed');

-- Create enum for action item priority
CREATE TYPE public.action_item_priority AS ENUM ('low', 'medium', 'high');

-- Create action_items table
CREATE TABLE public.action_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.customer_projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status action_item_status NOT NULL DEFAULT 'open',
  priority action_item_priority NOT NULL DEFAULT 'medium',
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own created action items"
ON public.action_items
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view action items assigned to them"
ON public.action_items
FOR SELECT
USING (auth.uid() = assigned_to);

CREATE POLICY "Users can insert their own action items"
ON public.action_items
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update action items they created"
ON public.action_items
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can update action items assigned to them"
ON public.action_items
FOR UPDATE
USING (auth.uid() = assigned_to);

CREATE POLICY "Users can delete action items they created"
ON public.action_items
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_action_items_updated_at
BEFORE UPDATE ON public.action_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();