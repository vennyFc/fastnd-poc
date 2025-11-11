-- Create enum for removal reasons
CREATE TYPE removal_reason AS ENUM (
  'technischer_fit',
  'commercial_fit', 
  'anderer_lieferant',
  'kein_bedarf',
  'sonstige'
);

-- Create table for removed cross-sells
CREATE TABLE public.removed_cross_sells (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_number TEXT NOT NULL,
  application TEXT NOT NULL,
  cross_sell_product TEXT NOT NULL,
  removal_reason removal_reason NOT NULL,
  removed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.removed_cross_sells ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own removed cross-sells" 
ON public.removed_cross_sells 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own removed cross-sells" 
ON public.removed_cross_sells 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own removed cross-sells" 
ON public.removed_cross_sells 
FOR DELETE 
USING (auth.uid() = user_id);