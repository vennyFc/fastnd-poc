import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Filter, Plus, X, ArrowLeft, Package, TrendingUp, Star, GitBranch, ChevronDown, ChevronUp, ThumbsDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useTableColumns } from '@/hooks/useTableColumns';
import { ColumnVisibilityToggle, MultiColumnVisibilityToggle } from '@/components/ColumnVisibilityToggle';
import { ResizableTableHeader } from '@/components/ResizableTableHeader';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useFavorites } from '@/hooks/useFavorites';
import { useProjectHistory } from '@/hooks/useProjectHistory';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { BlockDiagramViewer } from '@/components/BlockDiagramViewer';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

type SortField = 'project_name' | 'customer' | 'applications' | 'products' | 'optimization_status' | 'created_at';
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
  const [quickFilter, setQuickFilter] = useState<'all' | 'favorites' | 'recent' | 'open'>('all');
  const [expandedAlternatives, setExpandedAlternatives] = useState<Record<string, boolean>>({});
  const [draggedProductIndex, setDraggedProductIndex] = useState<number | null>(null);
  const [productQuickViewOpen, setProductQuickViewOpen] = useState(false);
  const [selectedProductForQuickView, setSelectedProductForQuickView] = useState<any>(null);
  const [applicationQuickViewOpen, setApplicationQuickViewOpen] = useState(false);
  const [selectedApplicationForQuickView, setSelectedApplicationForQuickView] = useState<string | null>(null);
  const [removalDialogOpen, setRemovalDialogOpen] = useState(false);
  const [selectedCrossSellForRemoval, setSelectedCrossSellForRemoval] = useState<any>(null);
  const [undoModalOpen, setUndoModalOpen] = useState(false);
  const [lastRemovedId, setLastRemovedId] = useState<string | null>(null);
  const [lastRemovedProduct, setLastRemovedProduct] = useState<string | null>(null);

  const { isFavorite, toggleFavorite } = useFavorites('project');
  const { addToHistory } = useProjectHistory();

  const queryClient = useQueryClient();

  

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

  const defaultProjectColumns = React.useMemo(() => ([
    { key: 'project_name', label: 'Projektname', visible: true, width: 200, order: 0 },
    { key: 'customer', label: 'Kunde', visible: true, width: 180, order: 1 },
    { key: 'applications', label: 'Applikation', visible: true, width: 200, order: 2 },
    { key: 'products', label: 'Produkt', visible: true, width: 200, order: 3 },
    { key: 'optimization_status', label: 'Optimierungsstatus', visible: true, width: 160, order: 4 },
    { key: 'created_at', label: 'Erstellt', visible: true, width: 120, order: 5 },
  ]), []);

  const { columns, toggleColumn, updateColumnWidth, reorderColumns, resetColumns } = useTableColumns(
    'projects-columns',
    defaultProjectColumns
  );

  const defaultProductColumns = React.useMemo(() => ([
    { key: 'product', label: 'Produkt', visible: true, width: 250, order: 0 },
    { key: 'manufacturer', label: 'Hersteller', visible: true, width: 160, order: 1 },
    { key: 'product_family', label: 'Produktfamilie', visible: true, width: 160, order: 2 },
    { key: 'product_price', label: (<>Preis<br /><span className="text-xs font-normal">(in €/pcs)</span></>), visible: true, width: 120, order: 3 },
    { key: 'product_lead_time', label: (<>Lieferzeit<br /><span className="text-xs font-normal">(in Wochen)</span></>), visible: true, width: 150, order: 4 },
    { key: 'product_inventory', label: (<>Lagerbestand<br /><span className="text-xs font-normal">(in pcs)</span></>), visible: true, width: 130, order: 5 },
    { key: 'product_tags', label: 'Tags', visible: true, width: 200, order: 6 },
    { key: 'status', label: 'Status', visible: true, width: 150, order: 7 },
    { key: 'description', label: 'Beschreibung', visible: false, width: 300, order: 8 },
  ]), []);

  const { 
    columns: productColumns, 
    toggleColumn: toggleProductColumn, 
    updateColumnWidth: updateProductColumnWidth, 
    reorderColumns: reorderProductColumns, 
    resetColumns: resetProductColumns 
  } = useTableColumns(
    'project-detail-product-columns',
    defaultProductColumns
  );

  // Cross-sell columns for detail view
  const defaultCrossSellColumns = React.useMemo(() => ([
    { key: 'product', label: 'Produkt', visible: true, width: 200, order: 0 },
    { key: 'manufacturer', label: 'Hersteller', visible: true, width: 150, order: 1 },
    { key: 'product_family', label: 'Produktfamilie', visible: true, width: 150, order: 2 },
    { key: 'product_price', label: (<>Preis<br /><span className="text-xs font-normal">(in €/pcs)</span></>), visible: true, width: 120, order: 3 },
    { key: 'product_lead_time', label: (<>Lieferzeit<br /><span className="text-xs font-normal">(in Wochen)</span></>), visible: true, width: 150, order: 4 },
    { key: 'product_inventory', label: (<>Lagerbestand<br /><span className="text-xs font-normal">(in pcs)</span></>), visible: true, width: 130, order: 5 },
    { key: 'product_tags', label: 'Tags', visible: true, width: 200, order: 6 },
    { key: 'action', label: 'Aktion', visible: true, width: 120, order: 7 },
    { key: 'description', label: 'Beschreibung', visible: false, width: 300, order: 8 },
    { key: 'remove', label: 'Entfernen', visible: true, width: 70, order: 9 },
  ]), []);

  const { 
    columns: crossSellColumns, 
    toggleColumn: toggleCrossSellColumn, 
    updateColumnWidth: updateCrossSellColumnWidth, 
    reorderColumns: reorderCrossSellColumns, 
    resetColumns: resetCrossSellColumns 
  } = useTableColumns(
    'project-detail-crosssell-columns',
    defaultCrossSellColumns
  );

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [draggedCrossSellIndex, setDraggedCrossSellIndex] = useState<number | null>(null);

  useEffect(() => {
    const search = searchParams.get('search');
    if (search) {
      setSearchQuery(search);
    }
  }, [searchParams]);

  const { data: projects, isLoading, refetch: refetchProjects } = useQuery({
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

  // Fetch application insights
  const { data: appInsights = [], isLoading: appInsightsLoading } = useQuery({
    queryKey: ['app_insights'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_insights')
        .select('*');
      
      if (error) throw error;
      return data as any[];
    },
  });

  // Fetch optimization records
  const { data: optimizationRecords = [], refetch: refetchOptimization } = useQuery({
    queryKey: ['opps_optimization'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('opps_optimization')
        .select('*');
      
      if (error) throw error;
      return data as any[];
    },
  });

  // Fetch removed cross-sells
  const { data: removedCrossSells = [] } = useQuery({
    queryKey: ['removed_cross_sells'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('removed_cross_sells')
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

  // Collect all project_numbers that belong to the logical group (customer + project_name)
  const getProjectNumbersForGroup = (customer: string, projectName: string): string[] => {
    if (!projects) return [];
    const nums = projects
      .filter((p: any) => p.customer === customer && p.project_name === projectName)
      .map((p: any) => p.project_number)
      .filter(Boolean);
    return Array.from(new Set(nums));
  };

  // Calculate automatic project status based on business rules
  const calculateProjectStatus = (project: any): string => {
    const groupNumbers = getProjectNumbersForGroup(project.customer, project.project_name);
    if (groupNumbers.length === 0) return 'Neu';
    
    // Read all optimization records for the grouped project numbers
    const projectOptRecords = optimizationRecords.filter((rec: any) => 
      groupNumbers.includes(rec.project_number)
    );
    
    // If there is any manually set optimization_status, choose the highest in the workflow
    const order = ['Neu', 'Offen', 'Prüfung', 'Validierung', 'Abgeschlossen'] as const;
    const manualStatuses = projectOptRecords
      .map((rec: any) => rec.optimization_status)
      .filter(Boolean) as typeof order[number][];
    if (manualStatuses.length > 0) {
      const highest = manualStatuses.reduce((acc, cur) => 
        order.indexOf(cur) > order.indexOf(acc) ? cur : acc, 'Neu' as typeof order[number]
      );
      return highest;
    }
    
    // Check if products were added to project (from optimization)
    const hasAddedProducts = projectOptRecords.some((rec: any) => 
      rec.cross_sell_product_name || rec.alternative_product_name
    );
    if (hasAddedProducts) return 'Validierung';
    
    // Check if project was viewed (from history)
    const wasViewed = recentHistory.some((rh: any) => rh.project_id === project.id);
    if (!wasViewed) return 'Offen';
    
    // Check if opportunity was added within last week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const newestRecord = projectOptRecords
      .filter((rec: any) => rec.cross_sell_date_added || rec.alternative_date_added)
      .sort((a: any, b: any) => {
        const dateA = new Date(a.cross_sell_date_added || a.alternative_date_added);
        const dateB = new Date(b.cross_sell_date_added || b.alternative_date_added);
        return dateB.getTime() - dateA.getTime();
      })[0];
    
    if (newestRecord) {
      const addedDate = new Date(newestRecord.cross_sell_date_added || newestRecord.alternative_date_added);
      if (addedDate > oneWeekAgo) {
        return 'Neu';
      }
    }
    
    // Default: Prüfung
    return 'Prüfung';
  };


  const filteredProjects = groupedProjects?.filter((project: any) => {
    // Quick filter
    if (quickFilter === 'favorites' && !isFavorite(project.id)) {
      return false;
    }
    
    if (quickFilter === 'recent') {
      const recentlyViewed = getRecentlyViewed();
      if (!recentlyViewed.includes(project.id)) return false;
    }
    
    if (quickFilter === 'open') {
      const status = calculateProjectStatus(project);
      if (status !== 'Offen') return false;
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

    // Handle optimization_status (computed field)
    if (sortField === 'optimization_status') {
      aValue = calculateProjectStatus(a);
      bValue = calculateProjectStatus(b);
    }

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
          // Store project_number if available
          if (project.project_number && !existing.project_number) {
            existing.project_number = project.project_number;
          }
        } else {
          acc.push({
            id: project.id,
            customer: project.customer,
            project_name: project.project_name,
            project_number: project.project_number,
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
        project_number: projectData[0]?.project_number || null,
        applications: projectData.map(p => p.application).filter(Boolean),
        products: projectData.map(p => p.product).filter(Boolean),
        created_at: selectedProject.created_at,
      }];
    }
    return [];
  };

  const getCrossSells = (products: string[], customer: string, projectName: string) => {
    if (!products || products.length === 0) return [];
    
    // Filter out products that are already in the project
    const availableCrossSells = crossSells.filter((cs: any) => 
      products.includes(cs.base_product) && !products.includes(cs.cross_sell_product)
    );

    // Get project numbers for this group
    const groupNumbers = getProjectNumbersForGroup(customer, projectName);
    
    // Filter out products that have been removed
    const removedProducts = removedCrossSells
      .filter((rc: any) => groupNumbers.includes(rc.project_number))
      .map((rc: any) => rc.cross_sell_product);

    // Further filter out products that have been added via optimization for ANY row in this project group
    let filteredCrossSells;
    if (groupNumbers.length > 0) {
      const addedProducts = optimizationRecords
        .filter((rec: any) => groupNumbers.includes(rec.project_number) && rec.cross_sell_product_name)
        .map((rec: any) => rec.cross_sell_product_name);
      
      filteredCrossSells = availableCrossSells.filter((cs: any) => 
        !addedProducts.includes(cs.cross_sell_product) && !removedProducts.includes(cs.cross_sell_product)
      );
    } else {
      filteredCrossSells = availableCrossSells.filter((cs: any) => !removedProducts.includes(cs.cross_sell_product));
    }
    
    // Remove duplicates: keep only one entry per unique cross_sell_product
    const uniqueCrossSells = new Map<string, any>();
    filteredCrossSells.forEach((cs: any) => {
      if (!uniqueCrossSells.has(cs.cross_sell_product)) {
        uniqueCrossSells.set(cs.cross_sell_product, cs);
      }
    });
    
    return Array.from(uniqueCrossSells.values());
  };

  const getProductDetails = (productName: string) => {
    return productDetails.find((p: any) => p.product === productName);
  };

  const getProductAlternatives = (productName: string) => {
    return productAlternatives.filter((pa: any) => pa.base_product === productName);
  };

  const hasAddedAlternatives = (customer: string, projectName: string, productName: string) => {
    const alternatives = getProductAlternatives(productName);
    if (alternatives.length === 0) return false;
    
    const groupNumbers = getProjectNumbersForGroup(customer, projectName);
    if (groupNumbers.length === 0) return false;
    
    // Check if any alternative has been added to optimization records
    return optimizationRecords.some((rec: any) =>
      groupNumbers.includes(rec.project_number) &&
      rec.alternative_product_name &&
      alternatives.some((alt: any) => alt.alternative_product === rec.alternative_product_name)
    );
  };

  const toggleAlternatives = (productName: string) => {
    setExpandedAlternatives(prev => ({
      ...prev,
      [productName]: !prev[productName]
    }));
  };

  const getOptimizationStatus = (
    customer: string,
    projectName: string,
    productName: string,
    type: 'cross_sell' | 'alternative'
  ) => {
    // First check if product exists in optimization records
    const groupNumbers = getProjectNumbersForGroup(customer, projectName);
    if (groupNumbers.length > 0) {
      const record = optimizationRecords.find((rec: any) =>
        groupNumbers.includes(rec.project_number) &&
        (type === 'cross_sell' ? rec.cross_sell_product_name === productName : rec.alternative_product_name === productName)
      );
      
      // If found in optimization records, return that status
      if (record) {
        return type === 'cross_sell' ? record.cross_sell_status : record.alternative_status;
      }
    }
    
    // If not in optimization records, check if it's an original project product
    const isInProjects = projects?.some((p: any) => 
      p.customer === customer && 
      p.project_name === projectName && 
      p.product === productName
    );
    
    // Original project products without optimization record are "Registriert"
    if (isInProjects) {
      return 'Registriert';
    }
    
    return null;
  };

  const getOptimizationRecordId = (
    customer: string,
    projectName: string,
    productName: string,
    type: 'cross_sell' | 'alternative'
  ) => {
    const groupNumbers = getProjectNumbersForGroup(customer, projectName);
    if (groupNumbers.length === 0) return null;
    const record = optimizationRecords.find((rec: any) =>
      groupNumbers.includes(rec.project_number) &&
      (type === 'cross_sell' ? rec.cross_sell_product_name === productName : rec.alternative_product_name === productName)
    );
    return record?.id || null;
  };

  const handleUpdateCrossSellStatus = async (
    customer: string,
    projectName: string,
    productName: string,
    newStatus: string,
    type: 'cross_sell' | 'alternative' = 'cross_sell'
  ) => {
    try {
      const recordId = getOptimizationRecordId(customer, projectName, productName, type);
      if (!recordId) {
        toast.error('Optimierungsdatensatz nicht gefunden');
        return;
      }

      const updateField = type === 'cross_sell' ? 'cross_sell_status' : 'alternative_status';
      
      const { error } = await supabase
        .from('opps_optimization')
        .update({ [updateField]: newStatus })
        .eq('id', recordId);

      if (error) throw error;

      // Invalidate all related queries to refresh data immediately
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['opps_optimization'] }),
        queryClient.invalidateQueries({ queryKey: ['customer_projects'] })
      ]);
      
      toast.success('Status aktualisiert');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Fehler beim Aktualisieren des Status');
    }
  };

  const handleAddCrossSell = async (project: any, crossSellProduct: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Nicht authentifiziert');
        return;
      }

      // Get project_number and application from customer_projects
      const { data: projectData, error: projectError } = await supabase
        .from('customer_projects')
        .select('project_number, application')
        .eq('customer', project.customer)
        .eq('project_name', project.project_name)
        .limit(1)
        .maybeSingle();

      if (projectError) {
        console.error('Project lookup error:', projectError);
        throw projectError;
      }
      
      if (!projectData) {
        toast.error('Projekt nicht gefunden');
        return;
      }

      console.log('Adding product to project:', {
        customer: project.customer,
        project_name: project.project_name,
        product: crossSellProduct,
        project_number: projectData.project_number
      });

      // Insert into customer_projects to add product to project
      const { data: insertedProject, error: projectInsertError } = await supabase
        .from('customer_projects')
        .insert({
          user_id: user.id,
          customer: project.customer,
          project_name: project.project_name,
          application: projectData.application,
          product: crossSellProduct,
          project_number: projectData.project_number
        })
        .select();

      if (projectInsertError) {
        console.error('Project insert error:', projectInsertError);
        throw projectInsertError;
      }

      console.log('Product added to project:', insertedProject);

      // Insert into opps_optimization
      const { data: insertedOpp, error: insertError } = await supabase
        .from('opps_optimization')
        .insert({
          user_id: user.id,
          project_number: projectData.project_number,
          cross_sell_product_name: crossSellProduct,
          cross_sell_date_added: new Date().toISOString(),
          cross_sell_status: 'Identifiziert'
        })
        .select();

      if (insertError) {
        console.error('Optimization insert error:', insertError);
        throw insertError;
      }

      console.log('Optimization record created:', insertedOpp);

      // Invalidate and refetch data instead of reloading page
      await queryClient.invalidateQueries({ queryKey: ['customer_projects'] });
      await queryClient.invalidateQueries({ queryKey: ['opps_optimization'] });
      await Promise.all([
        refetchProjects(),
        refetchOptimization()
      ]);

      toast.success(`${crossSellProduct} zum Projekt hinzugefügt`);
    } catch (error: any) {
      console.error('Error adding cross-sell:', error);
      toast.error(`Fehler: ${error.message || 'Unbekannter Fehler'}`);
    }
  };

  const handleRemoveCrossSell = (project: any, crossSellProduct: string, application: string) => {
    console.log('Remove clicked', { project, crossSellProduct, application });
    setSelectedCrossSellForRemoval({ project, crossSellProduct, application });
    setRemovalDialogOpen(true);
  };

  const handleConfirmRemoval = async (reason: string, ctx?: { project: any; crossSellProduct: string }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Nicht authentifiziert');
        return;
      }

      const project = ctx?.project ?? selectedCrossSellForRemoval?.project;
      const crossSellProduct = ctx?.crossSellProduct ?? selectedCrossSellForRemoval?.crossSellProduct;
      if (!project || !crossSellProduct) {
        toast.error('Kontext fehlt für das Entfernen');
        return;
      }

      // Get project_number and application
      const { data: projectData } = await supabase
        .from('customer_projects')
        .select('project_number, application')
        .eq('customer', project.customer)
        .eq('project_name', project.project_name)
        .limit(1)
        .maybeSingle();

      if (!projectData) {
        toast.error('Projekt nicht gefunden');
        return;
      }

      // Insert into removed_cross_sells and get inserted row
      const { data: inserted, error } = await supabase
        .from('removed_cross_sells')
        .insert([{
          user_id: user.id,
          project_number: projectData.project_number,
          application: projectData.application,
          cross_sell_product: crossSellProduct,
          removal_reason: reason as any
        }])
        .select()
        .single();

      if (error) throw error;

      // Store removed ID for undo
      console.log('Setting undo modal visible with ID:', inserted.id);
      setLastRemovedId(inserted.id);
      setLastRemovedProduct(crossSellProduct);

      // Sofort Toast mit Undo-Action anzeigen (Fallback zum Modal)
      toast.success(`"${crossSellProduct}" entfernt`, {
        action: {
          label: 'Rückgängig',
          onClick: () => handleUndoRemovalById(inserted.id),
        },
        duration: 4000,
      });

      // Optimistisch in Cache aufnehmen, damit die Liste sofort filtert
      queryClient.setQueryData(['removed_cross_sells'], (old: any) => {
        const prev = Array.isArray(old) ? old : [];
        return inserted ? [...prev, inserted] : prev;
      });

      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['removed_cross_sells'] });

      // Show undo modal for 4 seconds
      setUndoModalOpen(true);
      console.log('Undo modal should now be visible');
      setTimeout(() => {
        setUndoModalOpen(false);
        setLastRemovedId(null);
        setLastRemovedProduct(null);
      }, 4000);

      setRemovalDialogOpen(false);
      setSelectedCrossSellForRemoval(null);
    } catch (error: any) {
      console.error('Error removing cross-sell:', error);
      toast.error(`Fehler beim Entfernen des Cross-Sells: ${error?.message || JSON.stringify(error)}`);
    }
  };

  async function handleUndoRemovalById(id: string) {
    try {
      const { error } = await supabase
        .from('removed_cross_sells')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['removed_cross_sells'] });

      toast.success('Entfernung rückgängig gemacht');
      setUndoModalOpen(false);
      setLastRemovedId(null);
      setLastRemovedProduct(null);
    } catch (error) {
      console.error('Error undoing removal:', error);
      toast.error('Fehler beim Rückgängigmachen');
    }
  }

  const handleUndoRemoval = async () => {
    if (!lastRemovedId) return;
    await handleUndoRemovalById(lastRemovedId);
  };

  const handleAddAlternative = async (project: any, alternativeProduct: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Nicht authentifiziert');
        return;
      }

      // Get project_number and application from customer_projects
      const { data: projectData, error: projectError } = await supabase
        .from('customer_projects')
        .select('project_number, application')
        .eq('customer', project.customer)
        .eq('project_name', project.project_name)
        .limit(1)
        .maybeSingle();

      if (projectError) {
        console.error('Project lookup error:', projectError);
        throw projectError;
      }
      
      if (!projectData) {
        toast.error('Projekt nicht gefunden');
        return;
      }

      // Insert into customer_projects to add product to project
      const { data: insertedProject, error: projectInsertError } = await supabase
        .from('customer_projects')
        .insert({
          user_id: user.id,
          customer: project.customer,
          project_name: project.project_name,
          application: projectData.application,
          product: alternativeProduct,
          project_number: projectData.project_number
        })
        .select();

      if (projectInsertError) {
        console.error('Project insert error:', projectInsertError);
        throw projectInsertError;
      }

      // Insert into opps_optimization
      const { data: insertedOpp, error: insertError } = await supabase
        .from('opps_optimization')
        .insert({
          user_id: user.id,
          project_number: projectData.project_number,
          alternative_product_name: alternativeProduct,
          alternative_date_added: new Date().toISOString(),
          alternative_status: 'Identifiziert'
        })
        .select();

      if (insertError) {
        console.error('Optimization insert error:', insertError);
        throw insertError;
      }

      // Invalidate and refetch data
      await queryClient.invalidateQueries({ queryKey: ['customer_projects'] });
      await queryClient.invalidateQueries({ queryKey: ['opps_optimization'] });
      await Promise.all([
        refetchProjects(),
        refetchOptimization()
      ]);

      toast.success(`${alternativeProduct} als Alternative zum Projekt hinzugefügt`);
    } catch (error: any) {
      console.error('Error adding alternative:', error);
      toast.error(`Fehler: ${error.message || 'Unbekannter Fehler'}`);
    }
  };

  const handleProjectStatusChange = async (project: any, newStatus: string) => {
    console.log('🔄 handleProjectStatusChange called:', { project: project.project_name, newStatus });
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('❌ User not authenticated');
        toast.error('Nicht authentifiziert');
        return;
      }

      console.log('👤 User authenticated:', user.id);

      const groupNumbers = getProjectNumbersForGroup(project.customer, project.project_name);
      console.log('📋 Group numbers:', groupNumbers);
      
      if (groupNumbers.length === 0) {
        console.warn('⚠️ No group numbers found');
        return;
      }

      // Map German status to database enum value
      const statusMap: Record<string, 'Neu' | 'Offen' | 'Prüfung' | 'Validierung' | 'Abgeschlossen'> = {
        'neu': 'Neu',
        'offen': 'Offen',
        'prüfung': 'Prüfung',
        'validierung': 'Validierung',
        'abgeschlossen': 'Abgeschlossen'
      };
      
      const dbStatus = statusMap[newStatus.toLowerCase()] || 'Neu';
      console.log('📊 Database status:', dbStatus);

      // Optimistic UI update: update React Query cache so the Progress Bar updates instantly
      const prevData = queryClient.getQueryData<any[]>(['opps_optimization']) || [];
      queryClient.setQueryData<any[]>(['opps_optimization'], (old: any[] = []) => {
        const groupSet = new Set(groupNumbers);
        let matched = false;
        const updated = old.map((r: any) => {
          if (groupSet.has(r.project_number)) {
            matched = true;
            return { ...r, optimization_status: dbStatus, updated_at: new Date().toISOString() };
          }
          return r;
        });
        if (!matched && groupNumbers.length > 0) {
          updated.push({
            id: `temp-${Date.now()}`,
            user_id: user.id,
            project_number: groupNumbers[0],
            optimization_status: dbStatus,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
        return updated;
      });

      // Persist: Update optimization records with new status on the backend
      for (const projectNumber of groupNumbers) {
        console.log(`🔄 Processing project number: ${projectNumber}`);

        // Try to update ALL existing rows for this project number
        const { data: updatedRows, error: updateError } = await supabase
          .from('opps_optimization')
          .update({ optimization_status: dbStatus })
          .eq('project_number', projectNumber)
          .select('id');

        if (updateError) {
          console.error('❌ Update error:', updateError);
          // rollback optimistic cache
          queryClient.setQueryData(['opps_optimization'], prevData);
          throw updateError;
        }

        const updatedCount = updatedRows?.length ?? 0;
        console.log(`🛠️ Updated ${updatedCount} rows for ${projectNumber}`);

        // If no rows were updated, insert a new canonical row carrying the status
        if (updatedCount === 0) {
          const { error: insertError } = await supabase
            .from('opps_optimization')
            .insert({
              user_id: user.id,
              project_number: projectNumber,
              optimization_status: dbStatus,
            });

          if (insertError) {
            console.error('❌ Insert error:', insertError);
            // rollback optimistic cache
            queryClient.setQueryData(['opps_optimization'], prevData);
            throw insertError;
          }
          console.log(`✅ Inserted new status row for ${projectNumber}`);
        }
      }

      console.log('🔄 Invalidating queries...');
      // Invalidate and refetch data to update the UI immediately
      await queryClient.invalidateQueries({ queryKey: ['opps_optimization'] });
      await refetchOptimization();
      console.log('✅ Queries invalidated and refetched');
      
      toast.success(`Projekt-Status auf "${newStatus}" gesetzt`);
    } catch (error) {
      console.error('❌ Error updating project status:', error);
      toast.error('Fehler beim Aktualisieren des Projekt-Status');
    }
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
          <MultiColumnVisibilityToggle
            groups={[
              {
                label: 'Produkte',
                columns: productColumns,
                onToggle: toggleProductColumn,
                onReset: resetProductColumns,
              },
              {
                label: 'Cross-Sells',
                columns: crossSellColumns,
                onToggle: toggleCrossSellColumn,
                onReset: resetCrossSellColumns,
              },
            ]}
          />
        </div>

        <div className="space-y-6">
          {/* Application Quick View Sheet (Detail-Ansicht) */}
          <Sheet 
            open={applicationQuickViewOpen} 
            onOpenChange={(open) => {
              console.log('📝 Sheet onOpenChange (detail):', open);
              setApplicationQuickViewOpen(open);
            }}
          >
            <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto z-[2000]">
              <SheetHeader>
                <Breadcrumb className="mb-4">
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink 
                        className="cursor-pointer"
                        onClick={() => {
                          setApplicationQuickViewOpen(false);
                        }}
                      >
                        Projekte
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{selectedApplicationForQuickView}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
                <SheetTitle className="text-2xl">{selectedApplicationForQuickView}</SheetTitle>
                <SheetDescription>Applikationsdetails und Informationen</SheetDescription>
              </SheetHeader>
              {appInsightsLoading ? (
                <div className="mt-6 space-y-6">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : selectedApplicationForQuickView ? (() => {
                const appData = appInsights.find(
                  (app: any) => 
                    app.application === selectedApplicationForQuickView ||
                    app.application?.toLowerCase() === selectedApplicationForQuickView?.toLowerCase() ||
                    app.application?.toLowerCase().includes(selectedApplicationForQuickView?.toLowerCase()) ||
                    selectedApplicationForQuickView?.toLowerCase().includes(app.application?.toLowerCase())
                );
                console.log('🔍 Searching for application (detail):', selectedApplicationForQuickView);
                console.log('📊 Available applications:', appInsights.map((a: any) => a.application));
                console.log('✅ Found app data:', appData);
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
                    {(appData.product_family_1 || appData.product_family_2 || appData.product_family_3 || appData.product_family_4 || appData.product_family_5) && (
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
                  <div className="mt-6 space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Keine detaillierten Informationen für diese Applikation verfügbar.
                    </p>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-xs text-muted-foreground">
                        <strong>Gesuchte Applikation:</strong> {selectedApplicationForQuickView}
                      </p>
                      {appInsights.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          <strong>Verfügbare Applikationen:</strong> {appInsights.length}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })() : (
                <div className="mt-6">
                  <p className="text-sm text-muted-foreground">
                    Keine Applikation ausgewählt.
                  </p>
                </div>
              )}
            </SheetContent>
          </Sheet>

          {detailProjects.map((project: any) => (
            <Card key={project.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl">{project.project_name}</CardTitle>
                    <CardDescription className="mt-1">
                      <span className="font-medium">{project.customer}</span>
                      {project.applications.length > 0 && (
                        <span 
                          className="ml-2 text-primary hover:underline cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            const appName = typeof project.applications[0] === 'string' 
                              ? project.applications[0] 
                              : project.applications[0]?.application || '';
                            
                            console.log('🔍 Application Quick View clicked:', appName);
                            console.log('📊 Current project:', project.project_name);
                            
                            // Ensure selectedProject is set for the breadcrumb
                            if (!selectedProject || selectedProject.id !== project.id) {
                              setSelectedProject(project);
                            }
                            
                            setSelectedApplicationForQuickView(appName);
                            setApplicationQuickViewOpen(true);
                            
                            console.log('✅ Application Quick View state updated');
                          }}
                        >
                          • {typeof project.applications[0] === 'string' ? project.applications[0] : project.applications[0]?.application || ''}
                        </span>
                      )}
                    </CardDescription>
                    
                    {/* Optimization Status Progress Bar */}
                    <div className="mt-4 flex items-center gap-4">
                      {(() => {
                        const currentStatus = calculateProjectStatus(project);
                        const statusIndex = ['Neu', 'Offen', 'Prüfung', 'Validierung', 'Abgeschlossen'].indexOf(currentStatus);
                        
                        return (
                          <>
                            <div className="flex-1 grid grid-cols-5 gap-0">
                              {/* Step: Neu */}
                              <div className={`flex items-center justify-center px-2 py-1.5 rounded-l-lg border border-r-0 text-xs font-medium ${
                                statusIndex >= 0 ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground'
                              }`}>
                                {statusIndex >= 0 && '✓ '}NEU
                              </div>
                              
                              {/* Step: Offen */}
                              <div className={`flex items-center justify-center px-2 py-1.5 border border-r-0 text-xs font-medium ${
                                statusIndex >= 1 ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground'
                              }`}>
                                {statusIndex >= 1 && '✓ '}OFFEN
                              </div>
                              
                              {/* Step: Prüfung */}
                              <div className={`flex items-center justify-center px-2 py-1.5 border border-r-0 text-xs font-medium ${
                                statusIndex >= 2 ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground'
                              }`}>
                                {statusIndex >= 2 && '✓ '}PRÜFUNG
                              </div>
                              
                              {/* Step: Validierung */}
                              <div className={`flex items-center justify-center px-2 py-1.5 border border-r-0 text-xs font-medium ${
                                statusIndex >= 3 ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground'
                              }`}>
                                {statusIndex >= 3 && '✓ '}VALIDIERUNG
                              </div>
                              
                              {/* Step: Abgeschlossen */}
                              <div className={`flex items-center justify-center px-2 py-1.5 rounded-r-lg border text-xs font-medium ${
                                statusIndex >= 4 ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground'
                              }`}>
                                {statusIndex >= 4 && '✓ '}ABGESCHLOSSEN
                              </div>
                            </div>
                            
                            {/* Status Dropdown */}
                            <Select 
                              value={currentStatus.toLowerCase()} 
                              onValueChange={(value) => {
                                console.log('📋 Select onValueChange triggered:', value);
                                handleProjectStatusChange(project, value);
                              }}
                            >
                              <SelectTrigger className="w-[180px] bg-background">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="z-[9999] bg-popover">
                                <SelectItem value="neu">Neu</SelectItem>
                                <SelectItem value="offen">Offen</SelectItem>
                                <SelectItem value="prüfung">Prüfung</SelectItem>
                                <SelectItem value="validierung">Validierung</SelectItem>
                                <SelectItem value="abgeschlossen">Abgeschlossen</SelectItem>
                              </SelectContent>
                            </Select>
                          </>
                        );
                      })()}
                    </div>
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
                                  className={['product_price', 'product_lead_time', 'product_inventory'].includes(column.key) ? 'text-right' : ''}
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
                             {project.products
                              .sort((a: string, b: string) => {
                                // Define status priority (lower number = higher priority)
                                const statusPriority: Record<string, number> = {
                                  'Registriert': 1,
                                  'Akzeptiert': 2,
                                  'Vorgeschlagen': 3,
                                  'Identifiziert': 4
                                };
                                
                                const statusA = getOptimizationStatus(project.customer, project.project_name, a, 'cross_sell') || '';
                                const statusB = getOptimizationStatus(project.customer, project.project_name, b, 'cross_sell') || '';
                                
                                const priorityA = statusPriority[statusA] || 999;
                                const priorityB = statusPriority[statusB] || 999;
                                
                                return priorityA - priorityB;
                              })
                              .map((productName: string, idx: number) => {
                              const details = getProductDetails(productName);
                              const alternatives = getProductAlternatives(productName);
                              const hasAlternatives = alternatives.length > 0;
                              const showAlternativesBadge = hasAddedAlternatives(project.customer, project.project_name, productName);
                              const isExpanded = expandedAlternatives[productName];
                              const productStatus = getOptimizationStatus(project.customer, project.project_name, productName, 'cross_sell');

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
                                       let value: any = '-';
                                       if (column.key === 'product') {
                                         value = (
                                           <div className="flex items-center gap-2">
                                             <span>{productName}</span>
                                             {showAlternativesBadge && (
                                               <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/20">
                                                 A
                                               </Badge>
                                             )}
                                           </div>
                                         );
                                       } else if (column.key === 'status') {
                                         const isRegistered = productStatus === 'Registriert';
                                         value = productStatus ? (
                                           <Select
                                             value={productStatus}
                                             disabled={isRegistered}
                                             onValueChange={(newStatus) => 
                                               handleUpdateCrossSellStatus(
                                                 project.customer, 
                                                 project.project_name, 
                                                 productName, 
                                                 newStatus,
                                                 'cross_sell'
                                               )
                                             }
                                           >
                                             <SelectTrigger className="w-[180px]" onClick={(e) => e.stopPropagation()}>
                                               <SelectValue />
                                             </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="Identifiziert">Identifiziert</SelectItem>
                                                <SelectItem value="Vorgeschlagen">Vorgeschlagen</SelectItem>
                                                <SelectItem value="Akzeptiert">Akzeptiert</SelectItem>
                                                <SelectItem value="Registriert">Registriert</SelectItem>
                                                <SelectItem value="Abgelehnt">Abgelehnt</SelectItem>
                                              </SelectContent>
                                           </Select>
                                         ) : '-';
                                         } else if (details) {
                                          if (column.key === 'manufacturer') value = details.manufacturer || '-';
                                          if (column.key === 'product_family') value = details.product_family || '-';
                                          if (column.key === 'product_price') value = details.product_price ? `€ ${Number(details.product_price).toFixed(2)}` : '-';
                                          if (column.key === 'product_lead_time') value = details.product_lead_time ? String(Math.ceil(details.product_lead_time / 7)) : '-';
                                          if (column.key === 'product_inventory') value = (details.product_inventory !== null && details.product_inventory !== undefined) ? String(details.product_inventory) : '-';
                                          if (column.key === 'description') value = details.product_description || '-';
                                          if (column.key === 'product_tags') {
                                            const badges = [];
                                            if (details.product_lifecycle) {
                                              badges.push(
                                                <Badge 
                                                  key="lifecycle"
                                                  variant={
                                                    details.product_lifecycle === 'Active' ? 'default' :
                                                    details.product_lifecycle === 'Coming Soon' ? 'secondary' :
                                                    details.product_lifecycle === 'NFND' ? 'outline' :
                                                    'destructive'
                                                  }
                                                >
                                                  {details.product_lifecycle}
                                                </Badge>
                                              );
                                            }
                                            if (details.product_new === 'Y') {
                                              badges.push(
                                                <Badge key="new" variant="default" className="bg-green-600">Neu</Badge>
                                              );
                                            }
                                            if (details.product_top === 'Y') {
                                              badges.push(
                                                <Badge key="top" variant="default" className="bg-amber-600">Top Seller</Badge>
                                              );
                                            }
                                            value = badges.length > 0 ? (
                                              <div className="flex flex-col gap-1">{badges}</div>
                                            ) : '-';
                                          }
                                        }

                                        return (
                                          <TableCell 
                                            key={column.key}
                                            className={
                                              column.key === 'product' ? 'font-medium cursor-pointer text-primary hover:underline' :
                                              ['product_price', 'product_lead_time', 'product_inventory'].includes(column.key) ? 'text-right' :
                                              ''
                                            }
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
                                      const altStatus = getOptimizationStatus(project.customer, project.project_name, alt.alternative_product, 'alternative');
                                      const isAlreadyInProject = project.products.includes(alt.alternative_product);
                                      
                                      return (
                                        <TableRow key={`alt-${idx}-${altIdx}`} className="bg-muted/70">
                                         <TableCell className="w-12 pl-8">
                                           <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                         </TableCell>
                                          {visibleProductColumns.map((column) => {
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
                                            } else if (column.key === 'status') {
                                              const isRegistered = altStatus === 'Registriert';
                                              return (
                                                <TableCell key={column.key} style={{ width: `${column.width}px` }}>
                                                  {altStatus ? (
                                                    <Select
                                                      value={altStatus}
                                                      disabled={isRegistered}
                                                      onValueChange={(newStatus) => 
                                                        handleUpdateCrossSellStatus(
                                                          project.customer, 
                                                          project.project_name, 
                                                          alt.alternative_product, 
                                                          newStatus,
                                                          'alternative'
                                                        )
                                                      }
                                                    >
                                                      <SelectTrigger className="w-[180px]" onClick={(e) => e.stopPropagation()}>
                                                        <SelectValue />
                                                      </SelectTrigger>
                                                       <SelectContent>
                                                         <SelectItem value="Identifiziert">Identifiziert</SelectItem>
                                                         <SelectItem value="Vorgeschlagen">Vorgeschlagen</SelectItem>
                                                         <SelectItem value="Akzeptiert">Akzeptiert</SelectItem>
                                                         <SelectItem value="Registriert">Registriert</SelectItem>
                                                         <SelectItem value="Abgelehnt">Abgelehnt</SelectItem>
                                                       </SelectContent>
                                                    </Select>
                                                  ) : (
                                                    !isAlreadyInProject && (
                                                      <Button
                                                        size="sm"
                                                        variant="default"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          handleAddAlternative(project, alt.alternative_product);
                                                        }}
                                                      >
                                                        <Plus className="h-4 w-4 mr-1" />
                                                        Hinzufügen
                                                      </Button>
                                                    )
                                                  )}
                                                </TableCell>
                                              );
                                            } else {
                                              let value = '-';
                                              if (altDetails) {
                                                if (column.key === 'manufacturer') value = altDetails.manufacturer || '-';
                                                if (column.key === 'product_family') value = altDetails.product_family || '-';
                                                if (column.key === 'product_price') value = altDetails.product_price ? `€ ${Number(altDetails.product_price).toFixed(2)}` : '-';
                                                if (column.key === 'product_lead_time') value = altDetails.product_lead_time ? String(Math.ceil(altDetails.product_lead_time / 7)) : '-';
                                                if (column.key === 'product_inventory') value = (altDetails.product_inventory !== null && altDetails.product_inventory !== undefined) ? String(altDetails.product_inventory) : '-';
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
                                            }
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
                      const projectCrossSells = getCrossSells(project.products, project.customer, project.project_name);
                      return projectCrossSells.length > 0 ? (
                        <div className="rounded-lg border">
                          <Table>
                              <TableHeader>
                                <TableRow>
                                  <th className="w-12"></th>
                                  {visibleCrossSellColumns.map((column, index) => (
                                    <ResizableTableHeader
                                      key={column.key}
                                      label={column.label}
                                      width={column.width}
                                      onResize={(width) => updateCrossSellColumnWidth(column.key, width)}
                                      sortable={false}
                                      draggable={true}
                                      className={['product_price', 'product_lead_time', 'product_inventory'].includes(column.key) ? 'text-right' : ''}
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
                                 const alternatives = getProductAlternatives(cs.cross_sell_product);
                                 const hasAlternatives = alternatives.length > 0;
                                 const showAlternativesBadge = hasAddedAlternatives(project.customer, project.project_name, cs.cross_sell_product);
                                 const isExpanded = expandedAlternatives[cs.cross_sell_product];
                                 
                                 return (
                                   <React.Fragment key={`cs-${cs.cross_sell_product}-${idx}`}>
                                     <TableRow key={idx}>
                                       <TableCell className="w-12">
                                         {hasAlternatives && (
                                           <Button
                                             variant="ghost"
                                             size="sm"
                                             className="h-8 w-8 p-0"
                                             onClick={() => toggleAlternatives(cs.cross_sell_product)}
                                           >
                                             <GitBranch className="h-4 w-4 text-primary" />
                                           </Button>
                                         )}
                                        </TableCell>
                                         {visibleCrossSellColumns.map((column) => {
                                          const isProductColumn = column.key === 'product';

                                          if (column.key === 'product') {
                                            return (
                                              <TableCell 
                                                key={column.key}
                                                className="font-medium cursor-pointer text-primary hover:underline"
                                                style={{ width: `${column.width}px` }}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setSelectedProductForQuickView(details || { product: cs.cross_sell_product });
                                                  setProductQuickViewOpen(true);
                                                }}
                                              >
                                                <div className="flex items-center gap-2">
                                                  <span>{cs.cross_sell_product}</span>
                                                  {showAlternativesBadge && (
                                                    <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/20">
                                                      A
                                                    </Badge>
                                                  )}
                                                </div>
                                              </TableCell>
                                            );
                                          }

                                          if (column.key === 'action') {
                                            return (
                                              <TableCell key={column.key} style={{ width: `${column.width}px` }}>
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAddCrossSell(project, cs.cross_sell_product);
                                                  }}
                                                >
                                                  <Plus className="h-3.5 w-3.5 mr-1" />
                                                  Hinzufügen
                                                </Button>
                                              </TableCell>
                                            );
                                          }

                                          if (column.key === 'remove') {
                                            return (
                                              <TableCell key={column.key} className="text-right w-16 pr-4" style={{ width: `${column.width}px` }} onClick={(e) => e.stopPropagation()}>
                                                <DropdownMenu>
                                                  <DropdownMenuTrigger asChild>
                                                    <Button
                                                      size="sm"
                                                      variant="ghost"
                                                      className="h-8 w-8 p-0"
                                                      onClick={() => setSelectedCrossSellForRemoval({ project, crossSellProduct: cs.cross_sell_product })}
                                                    >
                                                      <ThumbsDown className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                  </DropdownMenuTrigger>
                                                  <DropdownMenuContent side="left" align="end" sideOffset={6} onClick={(e) => e.stopPropagation()}>
                                                    <DropdownMenuItem onSelect={() => handleConfirmRemoval('technischer_fit', { project, crossSellProduct: cs.cross_sell_product })}>Technischer Fit</DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={() => handleConfirmRemoval('commercial_fit', { project, crossSellProduct: cs.cross_sell_product })}>Commercial Fit</DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={() => handleConfirmRemoval('anderer_lieferant', { project, crossSellProduct: cs.cross_sell_product })}>Anderer Lieferant</DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={() => handleConfirmRemoval('kein_bedarf', { project, crossSellProduct: cs.cross_sell_product })}>Kein Bedarf</DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={() => handleConfirmRemoval('sonstige', { project, crossSellProduct: cs.cross_sell_product })}>Sonstige</DropdownMenuItem>
                                                  </DropdownMenuContent>
                                                </DropdownMenu>
                                              </TableCell>
                                            );
                                          }

                                          // Default details columns
                                          let value: any = '-';
                                          if (details) {
                                            if (column.key === 'manufacturer') value = details.manufacturer || '-';
                                            if (column.key === 'product_family') value = details.product_family || '-';
                                            if (column.key === 'product_price') value = details.product_price ? `€ ${Number(details.product_price).toFixed(2)}` : '-';
                                            if (column.key === 'product_lead_time') value = details.product_lead_time ? String(Math.ceil(details.product_lead_time / 7)) : '-';
                                            if (column.key === 'product_inventory') value = (details.product_inventory !== null && details.product_inventory !== undefined) ? String(details.product_inventory) : '-';
                                            if (column.key === 'description') value = details.product_description || '-';
                                            if (column.key === 'product_tags') {
                                              const badges = [];
                                              if (details.product_lifecycle) {
                                                badges.push(
                                                  <Badge 
                                                    key="lifecycle"
                                                    variant={
                                                      details.product_lifecycle === 'Active' ? 'default' :
                                                      details.product_lifecycle === 'Coming Soon' ? 'secondary' :
                                                      details.product_lifecycle === 'NFND' ? 'outline' :
                                                      'destructive'
                                                    }
                                                  >
                                                    {details.product_lifecycle}
                                                  </Badge>
                                                );
                                              }
                                              if (details.product_new === 'Y') {
                                                badges.push(
                                                  <Badge key="new" variant="default" className="bg-green-600">Neu</Badge>
                                                );
                                              }
                                              if (details.product_top === 'Y') {
                                                badges.push(
                                                  <Badge key="top" variant="default" className="bg-amber-600">Top Seller</Badge>
                                                );
                                              }
                                              value = badges.length > 0 ? (
                                                <div className="flex flex-col gap-1">{badges}</div>
                                              ) : '-';
                                            }
                                          }

                                           return (
                                             <TableCell 
                                               key={column.key}
                                               className={
                                                 isProductColumn ? 'font-medium cursor-pointer text-primary hover:underline' :
                                                 ['product_price', 'product_lead_time', 'product_inventory'].includes(column.key) ? 'text-right' :
                                                 ''
                                               }
                                               style={{ width: `${column.width}px` }}
                                             >
                                               {value}
                                             </TableCell>
                                           );
                                        })}
                                     </TableRow>
                                     
                                     {/* Alternative Products for Cross-Sells - Expandable */}
                                     {hasAlternatives && isExpanded && alternatives.map((alt: any, altIdx: number) => {
                                       const altDetails = getProductDetails(alt.alternative_product);
                                       const altStatus = getOptimizationStatus(project.customer, project.project_name, alt.alternative_product, 'alternative');
                                       const isAlreadyInProject = project.products.includes(alt.alternative_product);
                                       
                                       return (
                                         <TableRow key={`cs-alt-${idx}-${altIdx}`} className="bg-muted/70">
                                           <TableCell className="w-12 pl-8">
                                             <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                           </TableCell>
                                           {visibleCrossSellColumns.map((column) => {
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
                                             } else if (column.key === 'action') {
                                               return (
                                                 <TableCell key={column.key} style={{ width: `${column.width}px` }}>
                                                   {altStatus ? (
                                                     <Select
                                                       value={altStatus}
                                                       disabled={altStatus === 'Registriert'}
                                                       onValueChange={(newStatus) => 
                                                         handleUpdateCrossSellStatus(
                                                           project.customer, 
                                                           project.project_name, 
                                                           alt.alternative_product, 
                                                           newStatus,
                                                           'alternative'
                                                         )
                                                       }
                                                     >
                                                       <SelectTrigger className="w-[150px]" onClick={(e) => e.stopPropagation()}>
                                                         <SelectValue />
                                                       </SelectTrigger>
                                                        <SelectContent>
                                                          <SelectItem value="Identifiziert">Identifiziert</SelectItem>
                                                          <SelectItem value="Vorgeschlagen">Vorgeschlagen</SelectItem>
                                                          <SelectItem value="Akzeptiert">Akzeptiert</SelectItem>
                                                          <SelectItem value="Registriert">Registriert</SelectItem>
                                                          <SelectItem value="Abgelehnt">Abgelehnt</SelectItem>
                                                        </SelectContent>
                                                     </Select>
                                                   ) : (
                                                     !isAlreadyInProject && (
                                                       <Button
                                                         size="sm"
                                                         variant="default"
                                                         onClick={(e) => {
                                                           e.stopPropagation();
                                                           handleAddAlternative(project, alt.alternative_product);
                                                         }}
                                                       >
                                                         <Plus className="h-4 w-4 mr-1" />
                                                         Hinzufügen
                                                       </Button>
                                                     )
                                                   )}
                                                 </TableCell>
                                               );
                                              } else {
                                                let value = '-';
                                                if (altDetails) {
                                                  if (column.key === 'manufacturer') value = altDetails.manufacturer || '-';
                                                  if (column.key === 'product_family') value = altDetails.product_family || '-';
                                                  if (column.key === 'product_price') value = altDetails.product_price ? `€ ${Number(altDetails.product_price).toFixed(2)}` : '-';
                                                  if (column.key === 'product_lead_time') value = altDetails.product_lead_time ? String(Math.ceil(altDetails.product_lead_time / 7)) : '-';
                                                  if (column.key === 'product_inventory') value = (altDetails.product_inventory !== null && altDetails.product_inventory !== undefined) ? String(altDetails.product_inventory) : '-';
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
                                             }
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
              <Breadcrumb className="mb-4">
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink 
                      className="cursor-pointer"
                      onClick={() => setProductQuickViewOpen(false)}
                    >
                      Projekte
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{selectedProductForQuickView?.product}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
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

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Lifecycle Status</h3>
                  {selectedProductForQuickView.product_lifecycle ? (
                    <Badge 
                      variant={
                        selectedProductForQuickView.product_lifecycle === 'Active' ? 'default' :
                        selectedProductForQuickView.product_lifecycle === 'Coming Soon' ? 'secondary' :
                        selectedProductForQuickView.product_lifecycle === 'NFND' ? 'outline' :
                        'destructive'
                      }
                    >
                      {selectedProductForQuickView.product_lifecycle}
                    </Badge>
                  ) : (
                    <p className="text-base">-</p>
                  )}
                </div>

                {(selectedProductForQuickView.product_new === 'Y' || selectedProductForQuickView.product_top === 'Y') && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Produkt-Tags</h3>
                    <div className="flex gap-2">
                      {selectedProductForQuickView.product_new === 'Y' && (
                        <Badge variant="default" className="bg-green-600">Neu</Badge>
                      )}
                      {selectedProductForQuickView.product_top === 'Y' && (
                        <Badge variant="default" className="bg-amber-600">Top Seller</Badge>
                      )}
                    </div>
                  </div>
                )}

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
        <Badge
          variant={quickFilter === 'open' ? 'default' : 'outline'}
          className="cursor-pointer px-3 py-1.5 text-sm hover:bg-accent transition-colors"
          onClick={() => setQuickFilter(quickFilter === 'open' ? 'all' : 'open')}
        >
          Offen
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
                        value = null; // Will be handled separately
                      } else if (column.key === 'products') {
                        value = null; // Will be handled separately
                      } else if (column.key === 'optimization_status') {
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
                          ) : column.key === 'applications' ? (
                            <div className="flex flex-wrap gap-1">
                              {project.applications.length > 0 ? (
                                project.applications.map((appName: string, idx: number) => (
                                  <span
                                    key={idx}
                                    className="text-primary hover:underline cursor-pointer text-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedApplicationForQuickView(appName);
                                      setApplicationQuickViewOpen(true);
                                    }}
                                  >
                                    {appName}
                                    {idx < project.applications.length - 1 && ', '}
                                  </span>
                                ))
                              ) : (
                                '-'
                              )}
                            </div>
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
                          ) : column.key === 'optimization_status' ? (
                            <Badge variant={
                              calculateProjectStatus(project) === 'Offen' ? 'outline' :
                              calculateProjectStatus(project) === 'Neu' ? 'default' :
                              calculateProjectStatus(project) === 'Prüfung' ? 'secondary' :
                              calculateProjectStatus(project) === 'Validierung' ? 'default' :
                              'secondary'
                            }>
                              {calculateProjectStatus(project)}
                            </Badge>
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
                      <Badge 
                        key={index} 
                        variant="secondary"
                        className="cursor-pointer hover:bg-secondary/80"
                        onClick={() => {
                          setSelectedApplicationForQuickView(app);
                          setApplicationQuickViewOpen(true);
                        }}
                      >
                        {app}
                      </Badge>
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
            <Breadcrumb className="mb-4">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink 
                    className="cursor-pointer"
                    onClick={() => {
                      setProductQuickViewOpen(false);
                      // Optionally reopen project sheet if needed
                      if (selectedProject) {
                        setIsSheetOpen(true);
                      }
                    }}
                  >
                    Projekte
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {selectedProject && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbLink 
                        className="cursor-pointer"
                        onClick={() => {
                          setProductQuickViewOpen(false);
                          setIsSheetOpen(true);
                        }}
                      >
                        {selectedProject.project_name}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                  </>
                )}
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{selectedProductForQuickView?.product}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
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

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Lifecycle Status</h3>
                {selectedProductForQuickView.product_lifecycle ? (
                  <Badge 
                    variant={
                      selectedProductForQuickView.product_lifecycle === 'Active' ? 'default' :
                      selectedProductForQuickView.product_lifecycle === 'Coming Soon' ? 'secondary' :
                      selectedProductForQuickView.product_lifecycle === 'NFND' ? 'outline' :
                      'destructive'
                    }
                  >
                    {selectedProductForQuickView.product_lifecycle}
                  </Badge>
                ) : (
                  <p className="text-base">-</p>
                )}
              </div>

              {(selectedProductForQuickView.product_new === 'Y' || selectedProductForQuickView.product_top === 'Y') && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Produkt-Tags</h3>
                  <div className="flex gap-2">
                    {selectedProductForQuickView.product_new === 'Y' && (
                      <Badge variant="default" className="bg-green-600">Neu</Badge>
                    )}
                    {selectedProductForQuickView.product_top === 'Y' && (
                      <Badge variant="default" className="bg-amber-600">Top Seller</Badge>
                    )}
                  </div>
                </div>
              )}

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

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Preis
                    <br />
                    <span className="text-xs font-normal">(in €/pcs)</span>
                  </h3>
                  <p className="text-base font-semibold">
                    {selectedProductForQuickView.product_price 
                      ? `€ ${Number(selectedProductForQuickView.product_price).toFixed(2)}` 
                      : '-'}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Lieferzeit
                    <br />
                    <span className="text-xs font-normal">(in Wochen)</span>
                  </h3>
                  <p className="text-base font-semibold">
                    {selectedProductForQuickView.product_lead_time 
                      ? String(Math.ceil(selectedProductForQuickView.product_lead_time / 7))
                      : '-'}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Lagerbestand
                    <br />
                    <span className="text-xs font-normal">(in pcs)</span>
                  </h3>
                  <p className="text-base font-semibold">
                    {selectedProductForQuickView.product_inventory !== null && selectedProductForQuickView.product_inventory !== undefined
                      ? selectedProductForQuickView.product_inventory.toString()
                      : '-'}
                  </p>
                </div>
              </div>

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

      {/* Application Quick View Sheet */}
      <Sheet 
        open={applicationQuickViewOpen} 
        onOpenChange={(open) => {
          console.log('📝 Sheet onOpenChange:', open);
          setApplicationQuickViewOpen(open);
        }}
      >
        <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto z-[2000]">
          <SheetHeader>
            <Breadcrumb className="mb-4">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink 
                    className="cursor-pointer"
                    onClick={() => {
                      setApplicationQuickViewOpen(false);
                    }}
                  >
                    Projekte
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{selectedApplicationForQuickView}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <SheetTitle className="text-2xl">{selectedApplicationForQuickView}</SheetTitle>
            <SheetDescription>Applikationsdetails und Informationen</SheetDescription>
          </SheetHeader>
          {appInsightsLoading ? (
            <div className="mt-6 space-y-6">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : selectedApplicationForQuickView ? (() => {
            // Try exact match first, then case-insensitive match, then partial match
            const appData = appInsights.find(
              (app: any) => 
                app.application === selectedApplicationForQuickView ||
                app.application?.toLowerCase() === selectedApplicationForQuickView?.toLowerCase() ||
                app.application?.toLowerCase().includes(selectedApplicationForQuickView?.toLowerCase()) ||
                selectedApplicationForQuickView?.toLowerCase().includes(app.application?.toLowerCase())
            );
            
            console.log('🔍 Searching for application:', selectedApplicationForQuickView);
            console.log('📊 Available applications:', appInsights.map((a: any) => a.application));
            console.log('✅ Found app data:', appData);
            
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
              <div className="mt-6 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Keine detaillierten Informationen für diese Applikation verfügbar.
                </p>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    <strong>Gesuchte Applikation:</strong> {selectedApplicationForQuickView}
                  </p>
                  {appInsights.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      <strong>Verfügbare Applikationen:</strong> {appInsights.length}
                    </p>
                  )}
                </div>
              </div>
            );
          })() : (
            <div className="mt-6">
              <p className="text-sm text-muted-foreground">
                Keine Applikation ausgewählt.
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Removal Reason Modal (custom fallback to ensure visibility) */}
      {removalDialogOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Cross-Sell Opportunity entfernen</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Bitte wählen Sie einen Grund für das Entfernen von "{selectedCrossSellForRemoval?.crossSellProduct}" aus diesem Projekt.
              </p>
            </div>
            <div className="grid gap-3 py-2">
              <Button variant="outline" className="justify-start" onClick={() => handleConfirmRemoval('technischer_fit')}>
                Technischer Fit
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => handleConfirmRemoval('commercial_fit')}>
                Commercial Fit
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => handleConfirmRemoval('anderer_lieferant')}>
                Anderer Lieferant
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => handleConfirmRemoval('kein_bedarf')}>
                Kein Bedarf
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => handleConfirmRemoval('sonstige')}>
                Sonstige
              </Button>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRemovalDialogOpen(false)}>Abbrechen</Button>
            </div>
          </div>
        </div>
      )}

      {/* Undo Modal - 4 seconds */}
      {undoModalOpen && (
        <div 
          className="fixed bottom-6 right-6 z-[99999] animate-fade-in"
          style={{ position: 'fixed', bottom: '24px', right: '24px' }}
        >
          <div className="bg-primary text-primary-foreground border-2 border-primary-foreground rounded-lg shadow-2xl p-4 min-w-[320px]">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="font-bold text-sm">"{lastRemovedProduct}" entfernt</p>
                <p className="text-xs opacity-90 mt-1">Wird in 4 Sekunden ausgeblendet</p>
              </div>
              <Button size="sm" variant="secondary" onClick={handleUndoRemoval}>
                Rückgängig
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
