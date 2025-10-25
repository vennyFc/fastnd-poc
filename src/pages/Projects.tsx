import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Filter, Plus, X, ArrowLeft, Package, TrendingUp, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useTableColumns } from '@/hooks/useTableColumns';
import { ColumnVisibilityToggle } from '@/components/ColumnVisibilityToggle';
import { ResizableTableHeader } from '@/components/ResizableTableHeader';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

type SortField = 'project_name' | 'customer' | 'applications' | 'products' | 'created_at';
type SortDirection = 'asc' | 'desc' | null;

export default function Projects() {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [quickFilter, setQuickFilter] = useState<'all' | 'favorites' | 'recent'>('all');

  const queryClient = useQueryClient();

  // Load recently viewed projects from localStorage
  const getRecentlyViewed = (): Array<{ customer: string; project_name: string }> => {
    const stored = localStorage.getItem('recentlyViewedProjects');
    return stored ? JSON.parse(stored) : [];
  };

  const addToRecentlyViewed = (customer: string, project_name: string) => {
    const recent = getRecentlyViewed();
    const newEntry = { customer, project_name };
    
    // Remove if already exists
    const filtered = recent.filter(
      item => !(item.customer === customer && item.project_name === project_name)
    );
    
    // Add to beginning and keep only last 10
    const updated = [newEntry, ...filtered].slice(0, 10);
    localStorage.setItem('recentlyViewedProjects', JSON.stringify(updated));
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

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

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

  // Fetch favorites
  const { data: favorites = [] } = useQuery({
    queryKey: ['project_favorites'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('project_favorites')
        .select('*');
      
      if (error) throw error;
      return data as any[];
    },
  });

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ customer, project_name, isFavorite }: { customer: string; project_name: string; isFavorite: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (isFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from('project_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('customer', customer)
          .eq('project_name', project_name);
        if (error) throw error;
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('project_favorites')
          .insert({
            user_id: user.id,
            customer,
            project_name,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project_favorites'] });
      toast.success('Favorit aktualisiert');
    },
    onError: (error: Error) => {
      toast.error('Fehler: ' + error.message);
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

  const isFavorite = (customer: string, project_name: string) => {
    return favorites.some(
      (fav: any) => fav.customer === customer && fav.project_name === project_name
    );
  };

  const filteredProjects = groupedProjects?.filter((project: any) => {
    // Quick filter
    if (quickFilter === 'favorites' && !isFavorite(project.customer, project.project_name)) {
      return false;
    }
    
    if (quickFilter === 'recent') {
      const recentlyViewed = getRecentlyViewed();
      const isRecent = recentlyViewed.some(
        rv => rv.customer === project.customer && rv.project_name === project.project_name
      );
      if (!isRecent) return false;
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
      products.includes(cs.base_product)
    );
  };

  const handleRowClick = (project: any) => {
    addToRecentlyViewed(project.customer, project.project_name);
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

  if (viewMode === 'detail') {
    const detailProjects = getDetailProjects();
    
    return (
      <div className="p-6 space-y-6">
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
                      toggleFavoriteMutation.mutate({
                        customer: project.customer,
                        project_name: project.project_name,
                        isFavorite: isFavorite(project.customer, project.project_name),
                      });
                    }}
                  >
                    <Star
                      className={`h-5 w-5 ${
                        isFavorite(project.customer, project.project_name)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-muted-foreground'
                      }`}
                    />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Products Section */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Package className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">Produkte im Projekt</h3>
                    </div>
                    <Separator className="mb-4" />
                    {project.products.length > 0 ? (
                      <div className="space-y-2">
                        {project.products.map((product: string, idx: number) => (
                          <div key={idx} className="p-3 bg-muted rounded-lg">
                            <p className="font-medium">{product}</p>
                          </div>
                        ))}
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
                        <div className="space-y-2">
                          {projectCrossSells.map((cs: any, idx: number) => (
                            <div key={idx} className="p-3 bg-accent/50 rounded-lg">
                              <p className="font-medium text-sm">{cs.cross_sell_product}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Basis: {cs.base_product}
                              </p>
                              {cs.application && (
                                <Badge variant="outline" className="mt-2 text-xs">
                                  {cs.application}
                                </Badge>
                              )}
                            </div>
                          ))}
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
          
          {/* Quick Filter Chips */}
          <div className="flex gap-2 mt-4">
            <Badge
              variant={quickFilter === 'favorites' ? 'default' : 'outline'}
              className="cursor-pointer px-3 py-1.5 text-sm"
              onClick={() => setQuickFilter(quickFilter === 'favorites' ? 'all' : 'favorites')}
            >
              <Star className="mr-1.5 h-3.5 w-3.5" />
              Favoriten
            </Badge>
            <Badge
              variant={quickFilter === 'recent' ? 'default' : 'outline'}
              className="cursor-pointer px-3 py-1.5 text-sm"
              onClick={() => setQuickFilter(quickFilter === 'recent' ? 'all' : 'recent')}
            >
              Zuletzt angesehen
            </Badge>
          </div>
        </CardContent>
      </Card>

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
                          toggleFavoriteMutation.mutate({
                            customer: project.customer,
                            project_name: project.project_name,
                            isFavorite: isFavorite(project.customer, project.project_name),
                          });
                        }}
                      >
                        <Star
                          className={`h-4 w-4 ${
                            isFavorite(project.customer, project.project_name)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-muted-foreground'
                          }`}
                        />
                      </Button>
                    </TableCell>
                    {visibleColumns.map((column) => {
                      const value = column.key === 'applications' 
                        ? (project.applications.length > 0 ? project.applications.join(', ') : '-')
                        : column.key === 'products'
                        ? (project.products.length > 0 ? project.products.join(', ') : '-')
                        : column.key === 'created_at'
                        ? (project.created_at ? format(new Date(project.created_at), 'dd.MM.yyyy') : '-')
                        : project[column.key];
                      
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
    </div>
  );
}
