import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Filter, Plus, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

export default function Products() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      // @ts-ignore - Supabase types not yet updated
      const { data, error } = await supabase
        // @ts-ignore
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as any[];
    },
  });

  const filteredProducts = products?.filter((product: any) =>
    searchQuery.length < 2 ? true :
    product.product?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.product_family?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Produkte</h1>
          <p className="text-muted-foreground">
            Produktkatalog und Halbleiter-Komponenten
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Hinzufügen
        </Button>
      </div>

      {/* Search and Filter */}
      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Produktname, Hersteller oder Produktfamilie suchen..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Alle Produkte</CardTitle>
          <CardDescription>
            {filteredProducts?.length || 0} Halbleiter-Komponenten und Spezifikationen
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : filteredProducts && filteredProducts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produkt</TableHead>
                  <TableHead>Produktfamilie</TableHead>
                  <TableHead>Hersteller</TableHead>
                  <TableHead>Beschreibung</TableHead>
                  <TableHead>Link</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product: any) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.product}</TableCell>
                    <TableCell>{product.product_family || '-'}</TableCell>
                    <TableCell>{product.manufacturer || '-'}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {product.product_description || '-'}
                    </TableCell>
                    <TableCell>
                      {product.manufacturer_link ? (
                        <a
                          href={product.manufacturer_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-primary hover:underline"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              {searchQuery.length >= 2
                ? 'Keine Produkte gefunden.'
                : 'Keine Produkte vorhanden. Laden Sie Produktdaten im Datenhub hoch.'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
