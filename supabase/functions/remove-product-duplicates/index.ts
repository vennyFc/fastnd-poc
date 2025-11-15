import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProductDuplicate {
  product: string;
  ids: string[];
  created_dates: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Get the user from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting duplicate removal for user: ${user.id}`);

    // Fetch all products for the user
    const { data: allProducts, error: fetchError } = await supabase
      .from('products')
      .select('id, product, created_at, user_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching products:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch products' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!allProducts || allProducts.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No products found', duplicatesRemoved: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${allProducts.length} total products`);

    // Group products by name
    const productGroups = new Map<string, typeof allProducts>();
    for (const product of allProducts) {
      const existing = productGroups.get(product.product) || [];
      existing.push(product);
      productGroups.set(product.product, existing);
    }

    // Find duplicates
    const duplicates: ProductDuplicate[] = [];
    const idsToDelete: string[] = [];

    for (const [productName, products] of productGroups) {
      if (products.length > 1) {
        // Sort by created_at descending (newest first)
        products.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        // Keep the first (newest), mark others for deletion
        const [keep, ...toDelete] = products;
        
        duplicates.push({
          product: productName,
          ids: products.map(p => p.id),
          created_dates: products.map(p => p.created_at),
        });

        idsToDelete.push(...toDelete.map(p => p.id));
        
        console.log(`Product "${productName}": ${products.length} duplicates found, keeping ${keep.id}, deleting ${toDelete.length}`);
      }
    }

    if (idsToDelete.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No duplicates found',
          duplicatesRemoved: 0 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Deleting ${idsToDelete.length} duplicate products...`);

    // Delete duplicates in batches of 100
    const batchSize = 100;
    let totalDeleted = 0;

    for (let i = 0; i < idsToDelete.length; i += batchSize) {
      const batch = idsToDelete.slice(i, i + batchSize);
      
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .in('id', batch);

      if (deleteError) {
        console.error('Error deleting batch:', deleteError);
        // Continue with other batches
      } else {
        totalDeleted += batch.length;
        console.log(`Deleted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} products`);
      }
    }

    console.log(`Successfully removed ${totalDeleted} duplicate products`);

    return new Response(
      JSON.stringify({ 
        message: 'Duplicates removed successfully',
        duplicatesRemoved: totalDeleted,
        duplicateGroups: duplicates.length,
        details: duplicates.map(d => ({
          product: d.product,
          count: d.ids.length,
          keptNewest: d.created_dates[0],
        }))
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
