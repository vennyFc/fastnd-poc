import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Filter, Plus, X, ArrowLeft, Package, TrendingUp, Star, GitBranch, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useTableColumns } from '@/hooks/useTableColumns';
import { ColumnVisibilityToggle } from '@/components/ColumnVisibilityToggle';
import { ResizableTableHeader } from '@/components/ResizableTableHeader';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useFavorites } from '@/hooks/useFavorites';
import { useProjectHistory } from '@/hooks/useProjectHistory';

type SortField = 'project_name' | 'customer' | 'applications' | 'products' | 'created_at';
type SortDirection = 'asc' | 'desc' | null;

export default function Projects() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [quickFilter, setQuickFilter] = useState<'all' | 'favorites' | 'recent'>('all');
  const [expandedAlternatives, setExpandedAlternatives] = useState<Record<string, boolean>>({});
  const [draggedProductIndex, setDraggedProductIndex] = useState<number | null>(null);
  const [productQuickViewOpen, setProductQuickViewOpen] = useState(false);
  const [selectedProductForQuickView, setSelectedProductForQuickView] = useState<any>(null);

  const { isFavorite, toggleFavorite } = useFavorites('project');
  const { addToHistory } = useProjectHistory();

  

  // Initialize customer filter from URL params
  useEffect(() => {
    const customerParam = searchParams.get('customer');
    if (customerParam) {
      handleCustomerClick(customerParam);
    }
  }, [searchParams]);

  // Load recently viewed projects from database
  const { data: recentHistory = [] } = useQuery({
    queryKey: ['user-project-history'],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_project_history')
        .select('project_id, viewed_at')
        .order('viewed_at', { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const getRecentlyViewed = (): string[] => {
    return recentHistory.map(rh => rh.project_id);
  };

  const { columns, toggleColumn, updateColumnWidth, reorderColumns, resetColumns } = useTableColumns(
    'projects-columns',
    [
      { key: 'project_name', label: 'Projektname', visible: true, width: 200, order: 0 },
      { key: 'customer', label: 'Kunde', visible: true, width: 180, order: 1 },
      { key: 'applications', label: 'Applikation', visible: true, width: 200, order: 2 },
      { key: 'products', label: 'Produkt', visible: true, width: 200, order: 3 },
      { key: 'created_at', label: 'Erstellt', visible: true, width: 120, order: 4 },
    ]
  );

  // Product columns for detail view
  const { 
    columns: productColumns, 
    toggleColumn: toggleProductColumn, 
    updateColumnWidth: updateProductColumnWidth, 
    reorderColumns: reorderProductColumns, 
    resetColumns: resetProductColumns 
  } = useTableColumns(
    'project-detail-product-columns',
    [
      { key: 'product', label: 'Produkt', visible: true, width: 250, order: 0 },
      { key: 'manufacturer', label: 'Hersteller', visible: true, width: 180, order: 1 },
      { key: 'product_family', label: 'Produktfamilie', visible: true, width: 180, order: 2 },
      { key: 'description', label: 'Beschreibung', visible: false, width: 300, order: 3 },
    ]
  );

  // Cross-sell columns for detail view
  const { 
    columns: crossSellColumns, 
    toggleColumn: toggleCrossSellColumn, 
    updateColumnWidth: updateCrossSellColumnWidth, 
    reorderColumns: reorderCrossSellColumns, 
    resetColumns: resetCrossSellColumns 
  } = useTableColumns(
    'project-detail-crosssell-columns',
    [
      { key: 'product', label: 'Produkt', visible: true, width: 250, order: 0 },
      { key: 'manufacturer', label: 'Hersteller', visible: true, width: 180, order: 1 },
      { key: 'product_family', label: 'Produktfamilie', visible: true, width: 180, order: 2 },
      { key: 'description', label: 'Beschreibung', visible: false, width: 300, order: 3 },
    ]
  );

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [draggedCrossSellIndex, setDraggedCrossSellIndex] = useState<number | null>(null);

  useEffect(() => {
    const search = searchParams.get('search');
    if (search) {
      setSearchQuery(search);
    }
  }, [searchParams]);

  const { data: projects, isLoading } = useQuery({
    queryKey: ['customer_projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_projects')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as any[];
    },
  });

  // Fetch cross-sells
  const { data: crossSells = [] } = useQuery({
    queryKey: ['cross_sells'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cross_sells')
        .select('*');
      
      if (error) throw error;
      return data as any[];
    },
  });

  // Fetch product details
  const { data: productDetails = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*');
      
      if (error) throw error;
      return data as any[];
    },
  });

  // Fetch product alternatives
  const { data: productAlternatives = [] } = useQuery({
    queryKey: ['product_alternatives'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_alternatives')
        .select('*');
      
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

  // Group projects by customer and project_name
  const groupedProjects = projects?.reduce((acc: any[], project: any) => {
    const key = `${project.customer}-${project.project_name}`;
    const existing = acc.find(
      (p) => p.customer === project.customer && p.project_name === project.project_name
    );

    if (existing) {
      // Add application and product if not already included
      if (project.application && !existing.applications.includes(project.application)) {
        existing.applications.push(project.application);
      }
      if (project.product && !existing.products.includes(project.product)) {
        existing.products.push(project.product);
      }
      // Keep the earliest created_at date
      if (new Date(project.created_at) < new Date(existing.created_at)) {
        existing.created_at = project.created_at;
      }
    } else {
      acc.push({
        id: project.id,
        customer: project.customer,
        project_name: project.project_name,
        applications: project.application ? [project.application] : [],
        products: project.product ? [project.product] : [],
        created_at: project.created_at,
      });
    }
    return acc;
  }, []);


  const filteredProjects = groupedProjects?.filter((project: any) => {
    // Quick filter
    if (quickFilter === 'favorites' && !isFavorite(project.id)) {
      return false;
    }
    
    if (quickFilter === 'recent') {
      const recentlyViewed = getRecentlyViewed();
      if (!recentlyViewed.includes(project.id)) return false;
    }

    // Search filter
    const matchesSearch = searchQuery.length < 2 ? true :
      project.project_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.customer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.applications?.some((app: string) => app?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      project.products?.some((prod: string) => prod?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!matchesSearch) return false;

    // Preferences filter
    if (userPreferences) {
      const selectedApps = userPreferences.target_applications || [];
      const selectedFamilies = userPreferences.product_families || [];
      
      // If no preferences are selected, show nothing (unless both are empty arrays meaning show all)
      const hasAppPreference = selectedApps.length === 0;
      const matchesApp = hasAppPreference || project.applications?.some((app: string) => selectedApps.includes(app));
      
      if (!matchesApp) return false;
    }

    return true;
  });

  const sortedProjects = filteredProjects?.sort((a: any, b: any) => {
    if (!sortField || !sortDirection) return 0;

    let aValue = a[sortField];
    let bValue = b[sortField];

    // Handle array fields
    if (sortField === 'applications' || sortField === 'products') {
      aValue = aValue?.join(', ') || '';
      bValue = bValue?.join(', ') || '';
    }

    // Handle date fields
    if (sortField === 'created_at') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }

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

  // Get projects for selected customer or single project
  const getDetailProjects = () => {
    if (!projects) return [];
    
    if (selectedCustomer) {
      // Return all projects for this customer, grouped by project_name
      const customerProjects = projects.filter(p => p.customer === selectedCustomer);
      const grouped = customerProjects.reduce((acc: any[], project: any) => {
        const existing = acc.find(p => p.project_name === project.project_name);
        
        if (existing) {
          if (project.application && !existing.applications.includes(project.application)) {
            existing.applications.push(project.application);
          }
          if (project.product && !existing.products.includes(project.product)) {
            existing.products.push(project.product);
          }
        } else {
          acc.push({
            id: project.id,
            customer: project.customer,
            project_name: project.project_name,
            applications: project.application ? [project.application] : [],
            products: project.product ? [project.product] : [],
            created_at: project.created_at,
          });
        }
        return acc;
      }, []);
      return grouped;
    } else if (selectedProject) {
      // Return single project
      const projectData = projects.filter(
        p => p.customer === selectedProject.customer && p.project_name === selectedProject.project_name
      );
      return [{
        id: selectedProject.id,
        customer: selectedProject.customer,
        project_name: selectedProject.project_name,
        applications: projectData.map(p => p.application).filter(Boolean),
        products: projectData.map(p => p.product).filter(Boolean),
        created_at: selectedProject.created_at,
      }];
    }
    return [];
  };

  const getCrossSells = (products: string[]) => {
    if (!products || products.length === 0) return [];
    
    return crossSells.filter((cs: any) => 
      products.includes(cs.base_product) && !products.includes(cs.cross_sell_product)
    );
  };

  const getProductDetails = (productName: string) => {
    return productDetails.find((p: any) => p.product === productName);
  };

  const getProductAlternatives = (productName: string) => {
    return productAlternatives.filter((pa: any) => pa.base_product === productName);
  };

  const toggleAlternatives = (productName: string) => {
    setExpandedAlternatives(prev => ({
      ...prev,
      [productName]: !prev[productName]
    }));
  };

  const handleRowClick = (project: any) => {
    addToHistory(project.id);
    setSelectedProject(project);
    setSelectedCustomer(null);
    setViewMode('detail');
  };

  const handleCustomerClick = (customer: string) => {
    setSelectedCustomer(customer);
    setSelectedProject(null);
    setViewMode('detail');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedProject(null);
    setSelectedCustomer(null);
  };

  // Ensure URL has protocol
  const ensureUrlProtocol = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `https://${url}`;
  };

  if (viewMode === 'detail') {
    const detailProjects = getDetailProjects();
    const visibleProductColumns = productColumns.filter(col => col.visible);
    const visibleCrossSellColumns = crossSellColumns.filter(col => col.visible);
    
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={handleBackToList}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {selectedCustomer ? `Kunde: ${selectedCustomer}` : `Projekt: ${selectedProject?.project_name}`}
              </h1>
              <p className="text-muted-foreground">
                {detailProjects.length} {detailProjects.length === 1 ? 'Projekt' : 'Projekte'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <ColumnVisibilityToggle
              columns={productColumns}
              onToggle={toggleProductColumn}
              onReset={resetProductColumns}
            />
            <ColumnVisibilityToggle
              columns={crossSellColumns}
              onToggle={toggleCrossSellColumn}
              onReset={resetCrossSellColumns}
            />
          </div>
        </div>

        <div className="space-y-6">
          {detailProjects.map((project: any) => (
            <Card key={project.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{project.project_name}</CardTitle>
                    <CardDescription className="mt-1">
                      <span className="font-medium">{project.customer}</span>
                      {project.applications.length > 0 && (
                        <span className="ml-2">• {project.applications.join(', ')}</span>
                      )}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(project.id);
                    }}
                  >
                    <Star
                      className={`h-5 w-5 ${
                        isFavorite(project.id)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-muted-foreground'
                      }`}
                    />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Products Table */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Package className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">Produkte im Projekt</h3>
                    </div>
                    <Separator className="mb-4" />
                    {project.products.length > 0 ? (
                      <div className="rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <th className="w-12"></th>
                              {visibleProductColumns.map((column, index) => (
                                <ResizableTableHeader
                                  key={column.key}
                                  label={column.label}
                                  width={column.width}
                                  onResize={(width) => updateProductColumnWidth(column.key, width)}
                                  sortable={false}
                                  draggable={true}
                                  onDragStart={() => setDraggedProductIndex(index)}
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = 'move';
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    if (draggedProductIndex !== null && draggedProductIndex !== index) {
                                      reorderProductColumns(draggedProductIndex, index);
                                    }
                                    setDraggedProductIndex(null);
                                  }}
                                  onDragEnd={() => setDraggedProductIndex(null)}
                                />
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {project.products.map((productName: string, idx: number) => {
                              const details = getProductDetails(productName);
                              const alternatives = getProductAlternatives(productName);
                              const hasAlternatives = alternatives.length > 0;
                              const isExpanded = expandedAlternatives[productName];

                                return (
                                <React.Fragment key={`prod-${productName}-${idx}`}>
                                  <TableRow key={idx} className={hasAlternatives && isExpanded ? 'bg-muted/50' : ''}>
                                    <TableCell className="w-12">
                                      {hasAlternatives && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0"
                                          onClick={() => toggleAlternatives(productName)}
                                        >
                                          <GitBranch className="h-4 w-4 text-primary" />
                                        </Button>
                                      )}
                                    </TableCell>
                                     {visibleProductColumns.map((column) => {
                                       let value = '-';
                                       if (column.key === 'product') {
                                         value = productName;
                                       } else if (details) {
                                         if (column.key === 'manufacturer') value = details.manufacturer || '-';
                                         if (column.key === 'product_family') value = details.product_family || '-';
                                         if (column.key === 'description') value = details.product_description || '-';
                                       }

                                       return (
                                         <TableCell 
                                           key={column.key}
                                           className={column.key === 'product' ? 'font-medium cursor-pointer text-primary hover:underline' : ''}
                                           style={{ width: `${column.width}px` }}
                                           onClick={(e) => {
                                             if (column.key === 'product') {
                                               e.stopPropagation();
                                               setSelectedProductForQuickView(details || { product: productName });
                                               setProductQuickViewOpen(true);
                                             }
                                           }}
                                         >
                                           {value}
                                         </TableCell>
                                       );
                                     })}
                                  </TableRow>
                                  
                                   {/* Alternative Products - Expandable */}
                                   {hasAlternatives && isExpanded && alternatives.map((alt: any, altIdx: number) => {
                                     const altDetails = getProductDetails(alt.alternative_product);
                                     return (
                                       <TableRow key={`alt-${idx}-${altIdx}`} className="bg-muted/70">
                                        <TableCell className="w-12 pl-8">
                                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                        </TableCell>
                                         {visibleProductColumns.map((column) => {
                                           let value = '-';
                                           if (column.key === 'product') {
                                             return (
                                               <TableCell 
                                                 key={column.key}
                                                 className="font-medium cursor-pointer text-primary hover:underline"
                                                 style={{ width: `${column.width}px` }}
                                                 onClick={(e) => {
                                                   e.stopPropagation();
                                                   setSelectedProductForQuickView(altDetails || { product: alt.alternative_product });
                                                   setProductQuickViewOpen(true);
                                                 }}
                                               >
                                                 <div className="flex items-center gap-2">
                                                   <span>{alt.alternative_product}</span>
                                                   {alt.similarity && (
                                                     <Badge variant="secondary" className="text-xs">
                                                       {alt.similarity}% ähnlich
                                                     </Badge>
                                                   )}
                                                 </div>
                                               </TableCell>
                                             );
                                           } else if (altDetails) {
                                             if (column.key === 'manufacturer') value = altDetails.manufacturer || '-';
                                             if (column.key === 'product_family') value = altDetails.product_family || '-';
                                             if (column.key === 'description') value = altDetails.product_description || '-';
                                           }

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
                                    );
                                  })}
                                </React.Fragment>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Keine Produkte vorhanden</p>
                    )}
                  </div>

                  {/* Cross-Sells Section */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">Cross-Sell Opportunities</h3>
                    </div>
                    <Separator className="mb-4" />
                    {(() => {
                      const projectCrossSells = getCrossSells(project.products);
                      return projectCrossSells.length > 0 ? (
                        <div className="rounded-lg border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                {visibleCrossSellColumns.map((column, index) => (
                                  <ResizableTableHeader
                                    key={column.key}
                                    label={column.label}
                                    width={column.width}
                                    onResize={(width) => updateCrossSellColumnWidth(column.key, width)}
                                    sortable={false}
                                    draggable={true}
                                    onDragStart={() => setDraggedCrossSellIndex(index)}
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                      e.dataTransfer.dropEffect = 'move';
                                    }}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      if (draggedCrossSellIndex !== null && draggedCrossSellIndex !== index) {
                                        reorderCrossSellColumns(draggedCrossSellIndex, index);
                                      }
                                      setDraggedCrossSellIndex(null);
                                    }}
                                    onDragEnd={() => setDraggedCrossSellIndex(null)}
                                  />
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {projectCrossSells.map((cs: any, idx: number) => {
                                const details = getProductDetails(cs.cross_sell_product);
                                
                                return (
                                  <TableRow key={idx}>
                                     {visibleCrossSellColumns.map((column) => {
                                       let value = '-';
                                       const isProductColumn = column.key === 'product';
                                      if (column.key === 'product') {
                                        value = cs.cross_sell_product;
                                      } else if (details) {
                                        if (column.key === 'manufacturer') value = details.manufacturer || '-';
                                        if (column.key === 'product_family') value = details.product_family || '-';
                                        if (column.key === 'description') value = details.product_description || '-';
                                      }

                                       return (
                                         <TableCell 
                                           key={column.key}
                                           className={isProductColumn ? 'font-medium cursor-pointer text-primary hover:underline' : ''}
                                           style={{ width: `${column.width}px` }}
                                           onClick={(e) => {
                                             if (isProductColumn) {
                                               e.stopPropagation();
                                               setSelectedProductForQuickView(details || { product: cs.cross_sell_product });
                                               setProductQuickViewOpen(true);
                                             }
                                           }}
                                         >
                                           {value}
                                         </TableCell>
                                       );
                                    })}
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Keine Cross-Sells verfügbar</p>
                      );
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Product Quick View Sheet */}
        <Sheet open={productQuickViewOpen} onOpenChange={setProductQuickViewOpen}>
          <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{selectedProductForQuickView?.product}</SheetTitle>
              <SheetDescription>Produktdetails und Spezifikationen</SheetDescription>
            </SheetHeader>
            {selectedProductForQuickView && (
              <div className="mt-6 space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Produktfamilie</h3>
                  <Badge variant="secondary">
                    {selectedProductForQuickView.product_family || 'Nicht zugeordnet'}
                  </Badge>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Hersteller</h3>
                  <p className="text-base font-semibold">{selectedProductForQuickView.manufacturer || '-'}</p>
                </div>
                {selectedProductForQuickView.manufacturer_link && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Hersteller-Link</h3>
                    <a
                      href={ensureUrlProtocol(selectedProductForQuickView.manufacturer_link)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-primary hover:underline"
                    >
                      <Package className="h-4 w-4" />
                      Zur Website
                    </a>
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Beschreibung</h3>
                  <p className="text-base leading-relaxed">
                    {selectedProductForQuickView.product_description || 'Keine Beschreibung verfügbar'}
                  </p>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Projekte</h1>
          <p className="text-muted-foreground">
            Übersicht aller Kundenprojekte mit Opportunity-Scores
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Hinzufügen
        </Button>
      </div>

      {/* Search and Filter Bar */}
      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Projektname, Kunde, Applikation oder Produkt suchen..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <ColumnVisibilityToggle
              columns={columns}
              onToggle={toggleColumn}
              onReset={resetColumns}
            />
          </div>
        </CardContent>
      </Card>

      {/* Quick Filter Chips */}
      <div className="flex gap-2">
        <Badge
          variant={quickFilter === 'favorites' ? 'default' : 'outline'}
          className="cursor-pointer px-3 py-1.5 text-sm hover:bg-accent transition-colors"
          onClick={() => setQuickFilter(quickFilter === 'favorites' ? 'all' : 'favorites')}
        >
          <Star className={`mr-1.5 h-3.5 w-3.5 ${quickFilter === 'favorites' ? 'fill-current' : ''}`} />
          Favoriten
        </Badge>
        <Badge
          variant={quickFilter === 'recent' ? 'default' : 'outline'}
          className="cursor-pointer px-3 py-1.5 text-sm hover:bg-accent transition-colors"
          onClick={() => setQuickFilter(quickFilter === 'recent' ? 'all' : 'recent')}
        >
          Zuletzt angesehen
        </Badge>
      </div>

      {/* Projects Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Alle Projekte</CardTitle>
          <CardDescription>
            {filteredProjects?.length || 0} Kundenprojekte
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : sortedProjects && sortedProjects.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <th className="w-12"></th>
                  {visibleColumns.map((column, index) => (
                    <ResizableTableHeader
                      key={column.key}
                      label={column.label}
                      width={column.width}
                      onResize={(width) => updateColumnWidth(column.key, width)}
                      sortable={true}
                      sortDirection={sortField === column.key ? sortDirection : null}
                      onSort={() => handleSort(column.key as SortField)}
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
                {sortedProjects.map((project: any) => (
                  <TableRow 
                    key={project.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(project)}
                  >
                    <TableCell className="w-12">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(project.id);
                        }}
                      >
                        <Star
                          className={`h-4 w-4 ${
                            isFavorite(project.id)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-muted-foreground'
                          }`}
                        />
                      </Button>
                    </TableCell>
                    {visibleColumns.map((column) => {
                      let value;
                      
                      if (column.key === 'applications') {
                        value = project.applications.length > 0 ? project.applications.join(', ') : '-';
                      } else if (column.key === 'products') {
                        value = null; // Will be handled separately
                      } else if (column.key === 'created_at') {
                        value = project.created_at ? format(new Date(project.created_at), 'dd.MM.yyyy') : '-';
                      } else {
                        value = project[column.key];
                      }
                      
                      return (
                        <TableCell 
                          key={column.key}
                          className={column.key === 'project_name' ? 'font-medium' : ''}
                          style={{ width: `${column.width}px` }}
                          onClick={(e) => {
                            if (column.key === 'customer') {
                              e.stopPropagation();
                              handleCustomerClick(project.customer);
                            }
                          }}
                        >
                          {column.key === 'customer' ? (
                            <span className="text-primary hover:underline cursor-pointer">
                              {value}
                            </span>
                          ) : column.key === 'products' ? (
                            <div className="flex flex-wrap gap-1">
                              {project.products.length > 0 ? (
                                project.products.map((productName: string, idx: number) => (
                                  <span
                                    key={idx}
                                    className="text-primary hover:underline cursor-pointer text-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const details = getProductDetails(productName);
                                      setSelectedProductForQuickView(details || { product: productName });
                                      setProductQuickViewOpen(true);
                                    }}
                                  >
                                    {productName}
                                    {idx < project.products.length - 1 && ', '}
                                  </span>
                                ))
                              ) : (
                                '-'
                              )}
                            </div>
                          ) : (
                            value
                          )}
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
                ? 'Keine Projekte gefunden.'
                : 'Keine Projekte vorhanden. Laden Sie Projektdaten im Datenhub hoch.'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Project Details Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedProject?.project_name}</SheetTitle>
            <SheetDescription>Projektdetails und Informationen</SheetDescription>
          </SheetHeader>
          
          {selectedProject && (
            <div className="mt-6 space-y-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Kunde</h3>
                <p className="text-base font-semibold">{selectedProject.customer}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Applikationen</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedProject.applications && selectedProject.applications.length > 0 ? (
                    selectedProject.applications.map((app: string, index: number) => (
                      <Badge key={index} variant="secondary">{app}</Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">Keine Applikationen</span>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Produkte</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedProject.products && selectedProject.products.length > 0 ? (
                    selectedProject.products.map((prod: string, index: number) => (
                      <Badge key={index} variant="outline">{prod}</Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">Keine Produkte</span>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Erstellt am</h3>
                <p className="text-base">
                  {selectedProject.created_at 
                    ? format(new Date(selectedProject.created_at), 'dd.MM.yyyy') 
                    : '-'}
                </p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Product Quick View Sheet */}
      <Sheet open={productQuickViewOpen} onOpenChange={setProductQuickViewOpen}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedProductForQuickView?.product}</SheetTitle>
            <SheetDescription>Produktdetails und Spezifikationen</SheetDescription>
          </SheetHeader>
          
          {selectedProductForQuickView && (
            <div className="mt-6 space-y-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Produktfamilie</h3>
                <Badge variant="secondary">
                  {selectedProductForQuickView.product_family || 'Nicht zugeordnet'}
                </Badge>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Hersteller</h3>
                <p className="text-base font-semibold">{selectedProductForQuickView.manufacturer || '-'}</p>
              </div>

              {selectedProductForQuickView.manufacturer_link && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Hersteller-Link</h3>
                  <a
                    href={selectedProductForQuickView.manufacturer_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary hover:underline"
                  >
                    <Package className="h-4 w-4" />
                    Zur Website
                  </a>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Beschreibung</h3>
                <p className="text-base leading-relaxed">
                  {selectedProductForQuickView.product_description || 'Keine Beschreibung verfügbar'}
                </p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
