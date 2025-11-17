-- Create global_products table (similar to products but without user_id and tenant_id)
CREATE TABLE public.global_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product TEXT NOT NULL,
  product_family TEXT,
  product_description TEXT,
  product_price NUMERIC,
  product_lead_time INTEGER,
  product_inventory INTEGER,
  product_lifecycle product_lifecycle_status,
  manufacturer TEXT,
  manufacturer_link TEXT,
  product_new TEXT,
  product_top TEXT,
  upload_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.global_products ENABLE ROW LEVEL SECURITY;

-- Create trigger for automatic updated_at timestamp updates
CREATE TRIGGER update_global_products_updated_at
  BEFORE UPDATE ON public.global_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();