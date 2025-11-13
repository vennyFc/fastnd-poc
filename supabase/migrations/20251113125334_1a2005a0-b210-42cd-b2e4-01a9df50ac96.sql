-- Create enum type for product lifecycle status
CREATE TYPE product_lifecycle_status AS ENUM ('Coming Soon', 'Active', 'NFND', 'Discontinued');

-- Add new columns to products table
ALTER TABLE public.products
ADD COLUMN product_lifecycle product_lifecycle_status,
ADD COLUMN product_new text,
ADD COLUMN product_top text;

-- Add check constraints for Y or empty values
ALTER TABLE public.products
ADD CONSTRAINT product_new_check CHECK (product_new IN ('Y', '') OR product_new IS NULL),
ADD CONSTRAINT product_top_check CHECK (product_top IN ('Y', '') OR product_top IS NULL);