import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Filter, Plus, ExternalLink, Layers, Replace } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useTableColumns } from '@/hooks/useTableColumns';
import { ColumnVisibilityToggle } from '@/components/ColumnVisibilityToggle';
import { ResizableTableHeader } from '@/components/ResizableTableHeader';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

type SortField = 'product' | 'product_family' | 'manufacturer' | 'product_description';
type SortDirection = 'asc' | 'desc' | null;

export default function Products() {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [addToCollectionOpen, setAddToCollectionOpen] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  const queryClient = useQueryClient();

  const { columns, toggleColumn, updateColumnWidth, reorderColumns, resetColumns } = useTableColumns(
    'products-columns',
    [
      { key: 'product', label: 'Produkt', visible: true, width: 200, order: 0 },
      { key: 'product_family', label: 'Produktfamilie', visible: true, width: 180, order: 1 },
      { key: 'manufacturer', label: 'Hersteller', visible: true, width: 150, order: 2 },
      { key: 'product_description', label: 'Beschreibung', visible: true, width: 300, order: 3 },
      { key: 'manufacturer_link', label: 'Link', visible: true, width: 100, order: 4 },
    ]
  );

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    const search = searchParams.get('search');
    if (search) {
      setSearchQuery(search);
    }
  }, [searchParams]);

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

  // Fetch user preferences
  const { data: userPreferences } = useQuery({
    queryKey: ['user_preferences'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      return data;
    },
  });

  // Fetch product alternatives
  const { data: productAlternatives = [] } = useQuery({
    queryKey: ['product_alternatives'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_alternatives')
        .select('base_product, alternative_product, similarity');

      if (error) throw error;
      return data || [];
    },
  });

  // Create a Set of products that have alternatives
  const productsWithAlternatives = new Set(
    productAlternatives.map((alt: any) => alt.base_product)
  );

  // Function to get alternative products for a given product
  const getAlternativeProducts = (productName: string) => {
    const alternatives = productAlternatives
      .filter((alt: any) => alt.base_product === productName);
    
    return alternatives.map((alt: any) => {
      const product = products?.find((p: any) => p.product === alt.alternative_product);
      return product ? { ...product, similarity: alt.similarity } : null;
    }).filter(Boolean);
  };

  // Toggle expanded state
  const toggleExpanded = (productName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productName)) {
        newSet.delete(productName);
      } else {
        newSet.add(productName);
      }
      return newSet;
    });
  };

  // Fetch collections for adding products
  const { data: collections = [] } = useQuery({
    queryKey: ['collections'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('collections')
        .select('id, name, visibility')
        .order('name');

      if (error) throw error;
      return data || [];
    },
  });

  // Create new collection mutation
  const createCollectionMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('collections')
        .insert({
          user_id: user.id,
          name: name,
          visibility: 'private',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (newCollection) => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      setSelectedCollectionId(newCollection.id);
      setNewCollectionName('');
      toast.success('Sammlung erstellt');
    },
    onError: (error: Error) => {
      toast.error('Fehler beim Erstellen: ' + error.message);
    },
  });

  // Add product to collection mutation
  const addToCollectionMutation = useMutation({
    mutationFn: async ({ collectionId, productId }: { collectionId: string; productId: string }) => {
      const { error } = await supabase
        .from('collection_products')
        .insert({
          collection_id: collectionId,
          product_id: productId,
        });
      if (error) {
        if (error.code === '23505') {
          throw new Error('Produkt ist bereits in dieser Sammlung');
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection_products'] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      setAddToCollectionOpen(false);
      setSelectedCollectionId('');
      toast.success('Produkt zur Sammlung hinzugefügt');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const filteredProducts = products?.filter((product: any) => {
    // Search filter
    const matchesSearch = searchQuery.length < 2 ? true :
      product.product?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.product_family?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    // Preferences filter
    if (userPreferences) {
      // Filter by product families
      if (product.product_family) {
        const selectedFamilies = userPreferences.product_families || [];
        if (selectedFamilies.length > 0 && !selectedFamilies.includes(product.product_family)) {
          return false;
        }
      }
      
      // Filter by manufacturers
      if (product.manufacturer) {
        const selectedManufacturers = userPreferences.manufacturers || [];
        if (selectedManufacturers.length > 0 && !selectedManufacturers.includes(product.manufacturer)) {
          return false;
        }
      }
    }

    return true;
  });

  const sortedProducts = filteredProducts?.sort((a: any, b: any) => {
    if (!sortField || !sortDirection) return 0;

    let aValue = a[sortField] || '';
    let bValue = b[sortField] || '';

    // Handle string fields
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const visibleColumns = columns.filter(col => col.visible);

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
            <ColumnVisibilityToggle
              columns={columns}
              onToggle={toggleColumn}
              onReset={resetColumns}
            />
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
          ) : sortedProducts && sortedProducts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  {visibleColumns.map((column, index) => (
                    <ResizableTableHeader
                      key={column.key}
                      label={column.label}
                      width={column.width}
                      onResize={(width) => updateColumnWidth(column.key, width)}
                      sortable={column.key !== 'manufacturer_link'}
                      sortDirection={sortField === column.key ? sortDirection : null}
                      onSort={column.key !== 'manufacturer_link' ? () => handleSort(column.key as SortField) : undefined}
                      draggable={true}
                      onDragStart={() => setDraggedIndex(index)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedIndex !== null && draggedIndex !== index) {
                          reorderColumns(draggedIndex, index);
                        }
                        setDraggedIndex(null);
                      }}
                      onDragEnd={() => setDraggedIndex(null)}
                    />
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedProducts.map((product: any) => {
                  const alternativeProducts = getAlternativeProducts(product.product);
                  const isExpanded = expandedProducts.has(product.product);
                  
                  return (
                    <>
                      <TableRow 
                        key={product.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => {
                          setSelectedProduct(product);
                          setIsSheetOpen(true);
                        }}
                      >
                        {visibleColumns.map((column) => {
                          let value: any;
                          
                          if (column.key === 'manufacturer_link') {
                            value = product.manufacturer_link ? (
                              <a
                                href={product.manufacturer_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-primary hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            ) : '-';
                          } else if (column.key === 'product') {
                            const hasAlternative = productsWithAlternatives.has(product.product);
                            value = (
                              <div className="flex items-center gap-2">
                                <span>{product[column.key] || '-'}</span>
                                {hasAlternative && (
                                  <Replace 
                                    className={`h-4 w-4 text-primary cursor-pointer transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                    aria-label="Alternative verfügbar" 
                                    onClick={(e) => toggleExpanded(product.product, e)}
                                  />
                                )}
                              </div>
                            );
                          } else {
                            value = product[column.key] || '-';
                          }
                          
                          return (
                            <TableCell 
                              key={column.key}
                              className={column.key === 'product' ? 'font-medium' : column.key === 'product_description' ? 'max-w-xs truncate' : ''}
                              style={{ width: `${column.width}px` }}
                            >
                              {value}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                      
                      {/* Alternative Products */}
                      {isExpanded && alternativeProducts.map((altProduct: any) => (
                        <TableRow 
                          key={`alt-${altProduct.id}`}
                          className="cursor-pointer hover:bg-muted/50 bg-muted/30"
                          onClick={() => {
                            setSelectedProduct(altProduct);
                            setIsSheetOpen(true);
                          }}
                        >
                          {visibleColumns.map((column) => {
                            let value: any;
                            
                            if (column.key === 'manufacturer_link') {
                              value = altProduct.manufacturer_link ? (
                                <a
                                  href={altProduct.manufacturer_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center text-primary hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              ) : '-';
                            } else if (column.key === 'product') {
                              value = (
                                <div className="flex items-center gap-2 pl-6">
                                  <span className="text-muted-foreground text-sm">↳</span>
                                  <span>{altProduct[column.key] || '-'}</span>
                                  {altProduct.similarity !== null && altProduct.similarity !== undefined && (
                                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                      {altProduct.similarity}% Ähnlichkeit
                                    </span>
                                  )}
                                </div>
                              );
                            } else {
                              value = altProduct[column.key] || '-';
                            }
                            
                            return (
                              <TableCell 
                                key={column.key}
                                className={column.key === 'product' ? 'font-medium' : column.key === 'product_description' ? 'max-w-xs truncate' : ''}
                                style={{ width: `${column.width}px` }}
                              >
                                {value}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </>
                  );
                })}
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

      {/* Product Details Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedProduct?.product}</SheetTitle>
            <SheetDescription>Produktdetails und Spezifikationen</SheetDescription>
          </SheetHeader>
          
          {selectedProduct && (
            <div className="mt-6 space-y-6">
              <div className="flex gap-2">
                <Dialog open={addToCollectionOpen} onOpenChange={setAddToCollectionOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2 flex-1">
                      <Layers className="h-4 w-4" />
                      Zu Sammlung hinzufügen
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Zu Sammlung hinzufügen</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Neue Sammlung erstellen</label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            placeholder="Name der neuen Sammlung"
                            value={newCollectionName}
                            onChange={(e) => setNewCollectionName(e.target.value)}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              if (newCollectionName.trim()) {
                                createCollectionMutation.mutate(newCollectionName.trim());
                              }
                            }}
                            disabled={!newCollectionName.trim() || createCollectionMutation.isPending}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">
                            Oder existierende wählen
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium">Sammlung auswählen</label>
                        <Select
                          value={selectedCollectionId}
                          onValueChange={setSelectedCollectionId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sammlung auswählen..." />
                          </SelectTrigger>
                          <SelectContent>
                            {collections.map((collection: any) => (
                              <SelectItem key={collection.id} value={collection.id}>
                                {collection.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {collections.length === 0 && (
                          <p className="text-sm text-muted-foreground mt-2">
                            Noch keine Sammlungen vorhanden
                          </p>
                        )}
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setAddToCollectionOpen(false)}
                        >
                          Abbrechen
                        </Button>
                        <Button
                          onClick={() => {
                            if (selectedCollectionId && selectedProduct) {
                              addToCollectionMutation.mutate({
                                collectionId: selectedCollectionId,
                                productId: selectedProduct.id,
                              });
                            }
                          }}
                          disabled={!selectedCollectionId || addToCollectionMutation.isPending}
                        >
                          {addToCollectionMutation.isPending ? 'Hinzufügen...' : 'Hinzufügen'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Produktfamilie</h3>
                <Badge variant="secondary">
                  {selectedProduct.product_family || 'Nicht zugeordnet'}
                </Badge>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Hersteller</h3>
                <p className="text-base font-semibold">{selectedProduct.manufacturer || '-'}</p>
              </div>

              {selectedProduct.manufacturer_link && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Hersteller-Link</h3>
                  <a
                    href={selectedProduct.manufacturer_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Zur Website
                  </a>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Beschreibung</h3>
                <p className="text-base leading-relaxed">
                  {selectedProduct.product_description || 'Keine Beschreibung verfügbar'}
                </p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
