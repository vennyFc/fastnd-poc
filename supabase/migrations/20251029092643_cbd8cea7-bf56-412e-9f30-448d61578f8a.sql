-- Add similarity column to product_alternatives table
ALTER TABLE public.product_alternatives
ADD COLUMN similarity numeric CHECK (similarity >= 0 AND similarity <= 100);