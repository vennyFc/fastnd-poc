import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
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

type SortField = 'application' | 'related_product' | 'industry' | 'product_family';
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
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedApplicationsFilter, setSelectedApplicationsFilter] = useState<string[]>([]);
  const [applicationFilterOpen, setApplicationFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const { columns, toggleColumn, updateColumnWidth, reorderColumns, resetColumns } = useTableColumns(
    'applications-columns',
    [
      { key: 'application', label: t('table.application'), visible: true, width: 300, order: 0 },
      { key: 'related_product', label: t('applications.relatedProduct'), visible: true, width: 200, order: 1 },
      { key: 'manufacturer', label: t('table.manufacturer'), visible: true, width: 150, order: 2 },
      { key: 'product_family', label: t('table.productFamily'), visible: true, width: 150, order: 3 },
      { key: 'product_description', label: t('table.description'), visible: true, width: 250, order: 4 },
      { key: 'industry', label: t('applications.industry'), visible: true, width: 150, order: 5 },
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

  // Fetch products to get product details for related_products
  const { data: products = [] } = useQuery({
    queryKey: ['products-for-applications', activeTenant?.id],
    queryFn: async () => {
      if (!activeTenant) return [];
      
      const { data, error } = await supabase
        .from('products')
        .select('product, product_family, manufacturer, product_description')
        .eq('tenant_id', activeTenant.id);
      
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeTenant,
  });

  // Create maps of product -> product details
  const productDetailsMap = new Map<string, { product_family: string | null; manufacturer: string | null; product_description: string | null }>();
  products.forEach((p: any) => {
    if (p.product) {
      productDetailsMap.set(p.product.toLowerCase(), {
        product_family: p.product_family || null,
        manufacturer: p.manufacturer || null,
        product_description: p.product_description || null,
      });
    }
  });

  // Get unique industries from applications
  const uniqueIndustries = useMemo(() => 
    Array.from(new Set(allApplications.map((app: any) => app.industry).filter(Boolean))).sort()
  , [allApplications]);

  // Group applications by industry
  const applicationsByIndustry = useMemo(() => {
    const grouped: Record<string, string[]> = {};
    allApplications.forEach((app: any) => {
      const industry = app.industry || t('common.other');
      if (!grouped[industry]) {
        grouped[industry] = [];
      }
      if (app.application && !grouped[industry].includes(app.application)) {
        grouped[industry].push(app.application);
      }
    });
    Object.keys(grouped).forEach(key => {
      grouped[key].sort();
    });
    return grouped;
  }, [allApplications, t]);

  // Get applications filtered by selected industries
  const filteredApplicationsByIndustry = useMemo(() => {
    if (selectedIndustries.length === 0) {
      return applicationsByIndustry;
    }
    const filtered: Record<string, string[]> = {};
    selectedIndustries.forEach(industry => {
      if (applicationsByIndustry[industry]) {
        filtered[industry] = applicationsByIndustry[industry];
      }
    });
    return filtered;
  }, [applicationsByIndustry, selectedIndustries]);

  // Clear applications when industries change
  useEffect(() => {
    if (selectedIndustries.length > 0) {
      const validApps = Object.values(filteredApplicationsByIndustry).flat();
      setSelectedApplicationsFilter(prev => prev.filter(app => validApps.includes(app)));
    }
  }, [selectedIndustries, filteredApplicationsByIndustry]);

  const filteredApplications = allApplications?.filter((app: any) => {
    // Search filter
    const matchesSearch = searchQuery.length < 2 ? true :
      app.application?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.related_product?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.industry?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    // Industry filter
    if (selectedIndustries.length > 0 && !selectedIndustries.includes(app.industry)) {
      return false;
    }

    // Application filter
    if (selectedApplicationsFilter.length > 0 && !selectedApplicationsFilter.includes(app.application)) {
      return false;
    }

    return true;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedIndustries, selectedApplicationsFilter]);

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
    if (key === 'product_family') return t('table.productFamily');
    if (key === 'manufacturer') return t('table.manufacturer');
    if (key === 'product_description') return t('table.description');
    if (key === 'industry') return t('applications.industry');
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
            <div className="flex items-center gap-2">
              <Popover open={applicationFilterOpen} onOpenChange={setApplicationFilterOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[320px] justify-between">
                    {selectedIndustries.length === 0 && selectedApplicationsFilter.length === 0
                      ? t('filter.allApplications')
                      : selectedIndustries.length > 0 && selectedApplicationsFilter.length === 0
                        ? `${selectedIndustries.length} ${t('filter.industriesSelected')}`
                        : selectedApplicationsFilter.length > 0
                          ? `${selectedApplicationsFilter.length} ${t('filter.applicationsSelected')}`
                          : t('filter.allApplications')
                    }
                    <Filter className="ml-2 h-4 w-4 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[360px] p-0 bg-background" align="start">
                  <div className="p-3 border-b">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{t('filter.industryApplication')}</span>
                      {(selectedIndustries.length > 0 || selectedApplicationsFilter.length > 0) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            setSelectedIndustries([]);
                            setSelectedApplicationsFilter([]);
                          }}
                        >
                          {t('common.reset')}
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* Industries Section */}
                  <div className="border-b">
                    <div className="px-3 py-2 bg-muted/30">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {t('filter.industries')}
                      </span>
                    </div>
                    <ScrollArea className="h-[120px]">
                      <div className="p-2 space-y-1">
                        {uniqueIndustries.map((industry: string) => (
                          <div key={industry} className="flex items-center space-x-2 px-2 py-1 hover:bg-muted/50 rounded-sm">
                            <Checkbox
                              id={`industry-${industry}`}
                              checked={selectedIndustries.includes(industry)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedIndustries(prev => [...prev, industry]);
                                } else {
                                  setSelectedIndustries(prev => prev.filter(i => i !== industry));
                                }
                              }}
                            />
                            <label
                              htmlFor={`industry-${industry}`}
                              className="text-sm cursor-pointer flex-1 truncate"
                            >
                              {industry}
                            </label>
                            <span className="text-xs text-muted-foreground">
                              ({applicationsByIndustry[industry]?.length || 0})
                            </span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Applications Section */}
                  <div>
                    <div className="px-3 py-2 bg-muted/30">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {t('filter.applications')}
                      </span>
                      {selectedIndustries.length > 0 && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({t('filter.filteredByIndustry')})
                        </span>
                      )}
                    </div>
                    <ScrollArea className="h-[200px]">
                      <div className="p-2">
                        {Object.keys(filteredApplicationsByIndustry).sort().map((industry) => {
                          const industryApps = filteredApplicationsByIndustry[industry];
                          const allSelected = industryApps.every(app => selectedApplicationsFilter.includes(app));
                          
                          return (
                            <div key={industry} className="mb-3">
                              <div className="flex items-center justify-between px-2 py-1">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                  {industry}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-xs px-2"
                                  onClick={() => {
                                    if (allSelected) {
                                      setSelectedApplicationsFilter(prev => 
                                        prev.filter(app => !industryApps.includes(app))
                                      );
                                    } else {
                                      setSelectedApplicationsFilter(prev => {
                                        const newApps = industryApps.filter(app => !prev.includes(app));
                                        return [...prev, ...newApps];
                                      });
                                    }
                                  }}
                                >
                                  {allSelected ? t('filter.deselectAll') : t('filter.selectAll')}
                                </Button>
                              </div>
                              <div className="space-y-1">
                                {industryApps.map((appName: string) => (
                                  <div key={appName} className="flex items-center space-x-2 px-2 py-1 hover:bg-muted/50 rounded-sm">
                                    <Checkbox
                                      id={`app-filter-${appName}`}
                                      checked={selectedApplicationsFilter.includes(appName)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setSelectedApplicationsFilter(prev => [...prev, appName]);
                                        } else {
                                          setSelectedApplicationsFilter(prev => prev.filter(a => a !== appName));
                                        }
                                      }}
                                    />
                                    <label
                                      htmlFor={`app-filter-${appName}`}
                                      className="text-sm cursor-pointer flex-1 truncate"
                                    >
                                      {appName}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                        {Object.keys(filteredApplicationsByIndustry).length === 0 && (
                          <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                            {t('filter.noApplicationsForIndustry')}
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </PopoverContent>
              </Popover>
              <ColumnVisibilityToggle
                columns={columns}
                onToggle={toggleColumn}
                onReset={resetColumns}
              />
            </div>
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
                            let rawValue = app[column.key];
                            
                            // For product-related columns, look up from products map
                            if (app.related_product) {
                              const productDetails = productDetailsMap.get(app.related_product.toLowerCase());
                              if (productDetails) {
                                if (column.key === 'product_family') {
                                  rawValue = productDetails.product_family;
                                } else if (column.key === 'manufacturer') {
                                  rawValue = productDetails.manufacturer;
                                } else if (column.key === 'product_description') {
                                  rawValue = productDetails.product_description;
                                }
                              }
                            }
                            
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