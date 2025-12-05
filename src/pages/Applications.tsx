import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [applicationQuickViewOpen, setApplicationQuickViewOpen] = useState(false);
  const [selectedApplicationForQuickView, setSelectedApplicationForQuickView] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const { columns, toggleColumn, updateColumnWidth, reorderColumns, resetColumns } = useTableColumns(
    'applications-columns',
    [
      { key: 'application', label: t('table.application'), visible: true, width: 300, order: 0 },
      { key: 'related_product', label: t('applications.relatedProduct'), visible: true, width: 300, order: 1 },
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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const sortedApplications = [...(filteredApplications || [])].sort((a: any, b: any) => {
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

  // Pagination
  const totalItems = sortedApplications.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedApplications = sortedApplications.slice(startIndex, endIndex);

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

  const getColumnLabel = (key: string) => {
    if (key === 'application') return t('table.application');
    if (key === 'related_product') return t('applications.relatedProduct');
    return key;
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-medium text-foreground font-clash">{t('page.applications')}</h1>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder={t('search.searchApplications')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <ColumnVisibilityToggle
              columns={columns}
              onToggle={toggleColumn}
              onReset={resetColumns}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3 p-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : sortedApplications.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-semibold mb-2">{t('applications.noApplications')}</h3>
              <p className="text-muted-foreground">
                {searchQuery ? t('applications.tryDifferentSearch') : t('applications.startUpload')}
              </p>
            </div>
          ) : (
            <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      {visibleColumns.map((column, index) => (
                        <ResizableTableHeader
                          key={column.key}
                          label={getColumnLabel(column.key)}
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
                    {paginatedApplications.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={visibleColumns.length} className="text-center py-8 text-muted-foreground">
                          {t('applications.noApplications')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedApplications.map((app: any) => (
                        <TableRow key={app.id}>
                          {visibleColumns.map((column) => {
                            const rawValue = app[column.key];
                            const value = typeof rawValue === 'object' ? '-' : (rawValue || '-');
                            const isApplicationColumn = column.key === 'application';
                            
                            return (
                              <TableCell 
                                key={column.key}
                                style={{ width: `${column.width}px` }}
                                className={isApplicationColumn ? 'font-medium cursor-pointer text-foreground hover:underline' : ''}
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

              {/* Pagination Footer */}
              <div className="border-t pt-4 mt-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {totalItems > 0 ? `${startIndex + 1}-${Math.min(endIndex, totalItems)} ${t('pagination.of')} ${totalItems} ${t('pagination.results')}` : `0 ${t('pagination.results')}`}
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{t('pagination.resultsPerPage')}:</span>
                    <Select 
                      value={itemsPerPage.toString()} 
                      onValueChange={(val) => {
                        setItemsPerPage(Number(val));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[70px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="h-8 px-3"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      {t('pagination.previous')}
                    </Button>
                    <div className="flex items-center gap-1 mx-2">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="h-8 w-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages || totalPages === 0}
                      className="h-8 px-3"
                    >
                      {t('pagination.next')}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
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
                    {t('page.applications')}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{selectedApplicationForQuickView}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <SheetTitle>{selectedApplicationForQuickView}</SheetTitle>
            <SheetDescription>{t('applications.details')}</SheetDescription>
          </SheetHeader>
          {selectedApplicationForQuickView && (() => {
            const appData = appInsights.find(
              (app: any) => app.application === selectedApplicationForQuickView
            );
            
            return appData ? (
              <div className="mt-6 space-y-6">
                {appData.industry && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">{t('applications.industry')}</h3>
                    <Badge variant="secondary">{appData.industry}</Badge>
                  </div>
                )}

                {appData.application_description && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">{t('table.description')}</h3>
                    <p className="text-base leading-relaxed">
                      {appData.application_description}
                    </p>
                  </div>
                )}

                {appData.application_trends && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">{t('applications.trends')}</h3>
                    <p className="text-base leading-relaxed">
                      {appData.application_trends}
                    </p>
                  </div>
                )}

                {(appData.product_family_1 || appData.product_family_2 || appData.product_family_3 || 
                  appData.product_family_4 || appData.product_family_5) && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">{t('applications.productFamilies')}</h3>
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
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">{t('applications.blockDiagram')}</h3>
                    <BlockDiagramViewer content={appData.application_block_diagram} />
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-6">
                <p className="text-sm text-muted-foreground">
                  {t('applications.noDetails')}
                </p>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}