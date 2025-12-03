import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useTableColumns } from '@/hooks/useTableColumns';
import { ColumnVisibilityToggle } from '@/components/ColumnVisibilityToggle';
import { ResizableTableHeader } from '@/components/ResizableTableHeader';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { BlockDiagramViewer } from '@/components/BlockDiagramViewer';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

type SortField = 'application' | 'related_product';
type SortDirection = 'asc' | 'desc' | null;

export default function Applications() {
  const { user, isSuperAdmin, activeTenant } = useAuth();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [applicationQuickViewOpen, setApplicationQuickViewOpen] = useState(false);
  const [selectedApplicationForQuickView, setSelectedApplicationForQuickView] = useState<string | null>(null);

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

  const { data: tenantApplications, isLoading } = useQuery({
    queryKey: ['applications', activeTenant?.id],
    queryFn: async () => {
      if (!activeTenant) return [];
      
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('tenant_id', activeTenant.id)
        .order('application', { ascending: true });
      
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeTenant,
  });

  const allApplications = tenantApplications || [];

  // Fetch application insights
  const { data: appInsights = [] } = useQuery({
    queryKey: ['app_insights', activeTenant?.id],
    queryFn: async () => {
      if (!activeTenant) return [];
      
      const { data, error } = await supabase
        .from('app_insights')
        .select('*')
        .eq('tenant_id', activeTenant.id);
      
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeTenant,
  });

  const filteredApplications = allApplications?.filter((app: any) => {
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
        <h1 className="text-3xl font-semibold text-foreground mb-2 font-clash">Applikationen</h1>
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
                          const isApplicationColumn = column.key === 'application';
                          
                          return (
                            <TableCell 
                              key={column.key}
                              style={{ width: `${column.width}px` }}
                              className={isApplicationColumn ? 'font-medium cursor-pointer text-primary hover:underline' : ''}
                              onClick={() => {
                                if (isApplicationColumn && app.application) {
                                  setSelectedApplicationForQuickView(app.application);
                                  setApplicationQuickViewOpen(true);
                                }
                              }}
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

      {/* Application Quick View Sheet */}
      <Sheet open={applicationQuickViewOpen} onOpenChange={setApplicationQuickViewOpen}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <Breadcrumb className="mb-4">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink 
                    className="cursor-pointer"
                    onClick={() => setApplicationQuickViewOpen(false)}
                  >
                    Applikationen
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{selectedApplicationForQuickView}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <SheetTitle>{selectedApplicationForQuickView}</SheetTitle>
            <SheetDescription>Applikationsdetails und Informationen</SheetDescription>
          </SheetHeader>
          {selectedApplicationForQuickView && (() => {
            const appData = appInsights.find(
              (app: any) => app.application === selectedApplicationForQuickView
            );
            
            return appData ? (
              <div className="mt-6 space-y-6">
                {appData.industry && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Industrie</h3>
                    <Badge variant="secondary">{appData.industry}</Badge>
                  </div>
                )}

                {appData.application_description && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Beschreibung</h3>
                    <p className="text-base leading-relaxed">
                      {appData.application_description}
                    </p>
                  </div>
                )}

                {appData.application_trends && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Trends</h3>
                    <p className="text-base leading-relaxed">
                      {appData.application_trends}
                    </p>
                  </div>
                )}

                {(appData.product_family_1 || appData.product_family_2 || appData.product_family_3 || 
                  appData.product_family_4 || appData.product_family_5) && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Product Families</h3>
                    <div className="flex flex-wrap gap-2">
                      {appData.product_family_1 && <Badge variant="outline">#{1} {appData.product_family_1}</Badge>}
                      {appData.product_family_2 && <Badge variant="outline">#{2} {appData.product_family_2}</Badge>}
                      {appData.product_family_3 && <Badge variant="outline">#{3} {appData.product_family_3}</Badge>}
                      {appData.product_family_4 && <Badge variant="outline">#{4} {appData.product_family_4}</Badge>}
                      {appData.product_family_5 && <Badge variant="outline">#{5} {appData.product_family_5}</Badge>}
                    </div>
                  </div>
                )}

                {appData.application_block_diagram && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Blockdiagramm</h3>
                    <BlockDiagramViewer content={appData.application_block_diagram} />
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-6">
                <p className="text-sm text-muted-foreground">
                  Keine detaillierten Informationen für diese Applikation verfügbar.
                </p>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
