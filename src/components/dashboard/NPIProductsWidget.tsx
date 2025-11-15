import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import AutoScroll from 'embla-carousel-auto-scroll';
import { useRef } from 'react';

export function NPIProductsWidget() {
  const navigate = useNavigate();
  const autoScrollPlugin = useRef(
    AutoScroll({ 
      speed: 1,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
      startDelay: 1000
    })
  );

  const { data: npiProducts = [], isLoading } = useQuery({
    queryKey: ['npi-products'],
    queryFn: async () => {
      const { data } = await supabase
        .from('products')
        .select('*')
        .ilike('product_new', 'Y')
        .order('created_at', { ascending: false });

      return data || [];
    },
  });

  // Get only first 10 for carousel
  const displayProducts = npiProducts.slice(0, 10);

  const handleProductClick = (productId: string, productName: string) => {
    navigate(`/products?id=${productId}&search=${encodeURIComponent(productName)}`);
  };

  if (isLoading) {
    return (
      <Card className="shadow-card h-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>NPI Produkte</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Laden...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (npiProducts.length === 0) {
    return (
      <Card className="shadow-card h-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>NPI Produkte (0)</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Keine NPI-Produkte vorhanden
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle>NPI Produkte ({npiProducts.length})</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <Carousel
          opts={{
            align: "start",
            loop: true,
            dragFree: true,
          }}
          plugins={[autoScrollPlugin.current]}
          className="w-full"
        >
          <CarouselContent>
            {displayProducts.map((product) => (
              <CarouselItem key={product.id} className="md:basis-1/2 lg:basis-1/3">
                <div
                  onClick={() => handleProductClick(product.id, product.product)}
                  className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer h-full flex flex-col"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground line-clamp-2 mb-1">
                        {product.product}
                      </h3>
                      {product.product_family && (
                        <p className="text-xs text-muted-foreground">
                          {product.product_family}
                        </p>
                      )}
                    </div>
                    <div className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-medium flex-shrink-0 ml-2">
                      NPI
                    </div>
                  </div>
                  
                  {product.product_description && (
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-3 flex-1">
                      {product.product_description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-3 border-t border-border">
                    {product.manufacturer && (
                      <span className="font-medium">{product.manufacturer}</span>
                    )}
                    {product.product_price && (
                      <span className="font-semibold text-foreground">
                        €{Number(product.product_price).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </CardContent>
    </Card>
  );
}
