-- Create enum for collection visibility
CREATE TYPE public.collection_visibility AS ENUM ('private', 'selected', 'organization');

-- Create collections table
CREATE TABLE public.collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  visibility collection_visibility NOT NULL DEFAULT 'private',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create collection_products junction table
CREATE TABLE public.collection_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(collection_id, product_id)
);

-- Create collection_shares for selected users
CREATE TABLE public.collection_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(collection_id, shared_with_user_id)
);

-- Enable RLS
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for collections
CREATE POLICY "Users can view their own collections"
ON public.collections
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view collections shared with them"
ON public.collections
FOR SELECT
USING (
  visibility = 'selected' AND 
  EXISTS (
    SELECT 1 FROM public.collection_shares 
    WHERE collection_id = collections.id 
    AND shared_with_user_id = auth.uid()
  )
);

CREATE POLICY "Users can view organization collections"
ON public.collections
FOR SELECT
USING (visibility = 'organization');

CREATE POLICY "Users can insert their own collections"
ON public.collections
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collections"
ON public.collections
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collections"
ON public.collections
FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for collection_products
CREATE POLICY "Users can view products in accessible collections"
ON public.collection_products
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.collections 
    WHERE id = collection_products.collection_id 
    AND (
      user_id = auth.uid() OR
      visibility = 'organization' OR
      (visibility = 'selected' AND EXISTS (
        SELECT 1 FROM public.collection_shares 
        WHERE collection_id = collections.id 
        AND shared_with_user_id = auth.uid()
      ))
    )
  )
);

CREATE POLICY "Users can insert products to their own collections"
ON public.collection_products
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.collections 
    WHERE id = collection_products.collection_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete products from their own collections"
ON public.collection_products
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.collections 
    WHERE id = collection_products.collection_id 
    AND user_id = auth.uid()
  )
);

-- RLS Policies for collection_shares
CREATE POLICY "Users can view shares for their collections"
ON public.collection_shares
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.collections 
    WHERE id = collection_shares.collection_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert shares for their collections"
ON public.collection_shares
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.collections 
    WHERE id = collection_shares.collection_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete shares from their collections"
ON public.collection_shares
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.collections 
    WHERE id = collection_shares.collection_id 
    AND user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_collections_updated_at
BEFORE UPDATE ON public.collections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for better performance
CREATE INDEX idx_collections_user_id ON public.collections(user_id);
CREATE INDEX idx_collections_visibility ON public.collections(visibility);
CREATE INDEX idx_collection_products_collection_id ON public.collection_products(collection_id);
CREATE INDEX idx_collection_products_product_id ON public.collection_products(product_id);
CREATE INDEX idx_collection_shares_collection_id ON public.collection_shares(collection_id);
CREATE INDEX idx_collection_shares_user_id ON public.collection_shares(shared_with_user_id);