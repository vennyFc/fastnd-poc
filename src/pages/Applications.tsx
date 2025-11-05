import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useTableColumns } from '@/hooks/useTableColumns';
import { ColumnVisibilityToggle } from '@/components/ColumnVisibilityToggle';
import { ResizableTableHeader } from '@/components/ResizableTableHeader';

type SortField = 'application' | 'related_product';
type SortDirection = 'asc' | 'desc' | null;

export default function Applications() {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const { columns, toggleColumn, updateColumnWidth, reorderColumns, resetColumns } = useTableColumns(
    'applications-columns',
    [
      { key: 'application', label: 'Applikation', visible: true, width: 300, order: 0 },
      { key: 'related_product', label: 'Zugehöriges Produkt', visible: true, width: 300, order: 1 },
    ]
  );

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    const search = searchParams.get('search');
    if (search) {
      setSearchQuery(search);
    }
  }, [searchParams]);

  const { data: applications, isLoading } = useQuery({
    queryKey: ['applications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .order('application', { ascending: true });
      
      if (error) throw error;
      return data as any[];
    },
  });

  const filteredApplications = applications?.filter((app: any) => {
    if (searchQuery.length < 2) return true;
    return (
      app.application?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.related_product?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const sortedApplications = filteredApplications?.sort((a: any, b: any) => {
    if (!sortField || !sortDirection) return 0;

    let aValue = a[sortField];
    let bValue = b[sortField];

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
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Applikationen</h1>
        <p className="text-muted-foreground">
          Übersicht aller Applikationen und zugehörigen Produkte
        </p>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Alle Applikationen</CardTitle>
            <div className="flex gap-2">
              <ColumnVisibilityToggle
                columns={columns}
                onToggle={toggleColumn}
                onReset={resetColumns}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Applikationen durchsuchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {visibleColumns.map((column, index) => (
                      <ResizableTableHeader
                        key={column.key}
                        label={column.label}
                        width={column.width}
                        sortable={true}
                        sortDirection={sortField === column.key ? sortDirection : null}
                        onSort={() => handleSort(column.key as SortField)}
                        onResize={(newWidth) => updateColumnWidth(column.key, newWidth)}
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
                  {sortedApplications?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={visibleColumns.length} className="text-center py-8 text-muted-foreground">
                        Keine Applikationen gefunden
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedApplications?.map((app: any) => (
                      <TableRow key={app.id}>
                        {visibleColumns.map((column) => {
                          const rawValue = app[column.key];
                          const value = typeof rawValue === 'object' ? '-' : (rawValue || '-');
                          return (
                            <TableCell 
                              key={column.key}
                              style={{ width: `${column.width}px` }}
                            >
                              {value}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {!isLoading && sortedApplications && sortedApplications.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              {sortedApplications.length} {sortedApplications.length === 1 ? 'Applikation' : 'Applikationen'} gefunden
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
