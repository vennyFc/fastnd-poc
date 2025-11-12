-- Add product family columns to app_insights table
ALTER TABLE public.app_insights
ADD COLUMN product_family_1 TEXT,
ADD COLUMN product_family_2 TEXT,
ADD COLUMN product_family_3 TEXT,
ADD COLUMN product_family_4 TEXT,
ADD COLUMN product_family_5 TEXT;