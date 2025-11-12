-- Add new product fields to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS product_price NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS product_lead_time INTEGER,
ADD COLUMN IF NOT EXISTS product_inventory INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN public.products.product_price IS 'Product price in currency units';
COMMENT ON COLUMN public.products.product_lead_time IS 'Lead time in days';
COMMENT ON COLUMN public.products.product_inventory IS 'Available inventory quantity';