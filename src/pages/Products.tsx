import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Filter, Plus, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useTableColumns } from '@/hooks/useTableColumns';
import { ColumnVisibilityToggle } from '@/components/ColumnVisibilityToggle';
import { ResizableTableHeader } from '@/components/ResizableTableHeader';

type SortField = 'product' | 'product_family' | 'manufacturer' | 'product_description';
type SortDirection = 'asc' | 'desc' | null;

export default function Products() {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

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
                {sortedProducts.map((product: any) => (
                  <TableRow key={product.id}>
                    {visibleColumns.map((column) => {
                      let value: any;
                      
                      if (column.key === 'manufacturer_link') {
                        value = product.manufacturer_link ? (
                          <a
                            href={product.manufacturer_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-primary hover:underline"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        ) : '-';
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
