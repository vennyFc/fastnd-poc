-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view collections shared with them" ON public.collections;
DROP POLICY IF EXISTS "Users can view products in accessible collections" ON public.collection_products;

-- Create security definer functions to avoid recursion
CREATE OR REPLACE FUNCTION public.user_can_view_collection(_collection_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.collections
    WHERE id = _collection_id
    AND (
      user_id = _user_id
      OR visibility = 'organization'
      OR (
        visibility = 'selected'
        AND EXISTS (
          SELECT 1 FROM public.collection_shares
          WHERE collection_id = _collection_id
          AND shared_with_user_id = _user_id
        )
      )
    )
  );
$$;

-- Recreate the policy for viewing shared collections using the function
CREATE POLICY "Users can view collections shared with them"
ON public.collections
FOR SELECT
USING (
  visibility = 'selected' AND 
  public.user_can_view_collection(id, auth.uid())
);

-- Recreate the policy for collection_products using the function
CREATE POLICY "Users can view products in accessible collections"
ON public.collection_products
FOR SELECT
USING (
  public.user_can_view_collection(collection_id, auth.uid())
);