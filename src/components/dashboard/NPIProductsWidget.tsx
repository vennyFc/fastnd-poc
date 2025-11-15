import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useEmblaCarousel from 'embla-carousel-react';
import { useCallback } from 'react';

export function NPIProductsWidget() {
  const navigate = useNavigate();
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: true,
    align: 'start',
    slidesToScroll: 1,
  });

  const { data: npiProducts = [], isLoading } = useQuery({
    queryKey: ['npi-products'],
    queryFn: async () => {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('product_new', 'yes')
        .limit(10);

      return data || [];
    },
  });

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const handleProductClick = (productName: string) => {
    navigate(`/products?search=${encodeURIComponent(productName)}`);
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
            <CardTitle>NPI Produkte</CardTitle>
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>NPI Produkte</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={scrollPrev}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={scrollNext}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-4">
            {npiProducts.map((product) => (
              <div
                key={product.id}
                className="flex-[0_0_100%] min-w-0 sm:flex-[0_0_50%] lg:flex-[0_0_33.333%]"
              >
                <div
                  onClick={() => handleProductClick(product.product)}
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
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
