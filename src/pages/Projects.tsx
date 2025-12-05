import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Filter, Plus, X, ArrowLeft, Package, TrendingUp, Star, Replace, ChevronDown, ChevronUp, ThumbsDown, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useTableColumns } from '@/hooks/useTableColumns';
import { ColumnVisibilityToggle, MultiColumnVisibilityToggle } from '@/components/ColumnVisibilityToggle';
import { ResizableTableHeader } from '@/components/ResizableTableHeader';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { renderLifecycleBadge, renderNeuBadge, renderTopBadge } from '@/lib/productBadgeConfig';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useFavorites } from '@/hooks/useFavorites';
import { useProjectHistory } from '@/hooks/useProjectHistory';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { BlockDiagramViewer } from '@/components/BlockDiagramViewer';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
type SortField = 'project_name' | 'customer' | 'applications' | 'products' | 'optimization_status' | 'created_at';
type SortDirection = 'asc' | 'desc' | null;

// Status Badge Configuration with Teal/Petrol Color Scheme
const getStatusConfig = (status: string) => {
  switch (status) {
    case 'Neu':
      return {
        dotColor: 'bg-blue-500',
        bgColor: 'bg-blue-50 dark:bg-blue-950/30',
        textColor: 'text-blue-700 dark:text-blue-300',
        borderColor: 'border-blue-200 dark:border-blue-800'
      };
    case 'Offen':
      return {
        dotColor: 'bg-orange-500',
        bgColor: 'bg-orange-50 dark:bg-orange-950/30',
        textColor: 'text-orange-700 dark:text-orange-300',
        borderColor: 'border-orange-200 dark:border-orange-800'
      };
    case 'Prüfung':
      return {
        dotColor: 'bg-teal-500',
        bgColor: 'bg-teal-50 dark:bg-teal-950/30',
        textColor: 'text-teal-700 dark:text-teal-300',
        borderColor: 'border-teal-200 dark:border-teal-800'
      };
    case 'Validierung':
      return {
        dotColor: 'bg-yellow-500',
        bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
        textColor: 'text-yellow-700 dark:text-yellow-300',
        borderColor: 'border-yellow-200 dark:border-yellow-800'
      };
    case 'Abgeschlossen':
      return {
        dotColor: 'bg-green-500',
        bgColor: 'bg-green-50 dark:bg-green-950/30',
        textColor: 'text-green-700 dark:text-green-300',
        borderColor: 'border-green-200 dark:border-green-800'
      };
    default:
      return {
        dotColor: 'bg-gray-500',
        bgColor: 'bg-gray-50 dark:bg-gray-950/30',
        textColor: 'text-gray-700 dark:text-gray-300',
        borderColor: 'border-gray-200 dark:border-gray-800'
      };
  }
};

// StatusBadge Component with Pulsing Dot
const StatusBadge = ({
  status
}: {
  status: string;
}) => {
  const config = getStatusConfig(status);
  return <div className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold", config.bgColor, config.textColor, config.borderColor)}>
      <div className={cn("h-2 w-2 rounded-full animate-pulse", config.dotColor)} />
      <span>{status}</span>
    </div>;
};
export default function Projects() {
  const {
    user,
    isSuperAdmin,
    activeTenant
  } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'detail' | 'crossSellsView'>('list');
  const [quickFilter, setQuickFilter] = useState<'all' | 'favorites' | 'recent' | 'open'>('all');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
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
  const [metadataExpanded, setMetadataExpanded] = useState(false);
  const [customerQuickViewOpen, setCustomerQuickViewOpen] = useState(false);
  const [selectedCustomerForQuickView, setSelectedCustomerForQuickView] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [filterOpen, setFilterOpen] = useState(false);

  // Cross-sells full view state
  const [crossSellsProject, setCrossSellsProject] = useState<any>(null);
  const [crossSellSearchQuery, setCrossSellSearchQuery] = useState('');
  const [crossSellsPage, setCrossSellsPage] = useState(1);
  const [crossSellsPerPage, setCrossSellsPerPage] = useState(25);
  const [crossSellViewSortField, setCrossSellViewSortField] = useState<string | null>(null);
  const [crossSellViewSortDirection, setCrossSellViewSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [crossSellViewDraggedIndex, setCrossSellViewDraggedIndex] = useState<number | null>(null);

  // Cross-sells VIEW columns configuration (like Products table) - separate from detail view columns
  const defaultCrossSellViewColumns = React.useMemo(() => [{
    key: 'product',
    label: 'Bauteil',
    visible: true,
    width: 280,
    order: 0
  }, {
    key: 'product_tags',
    label: 'Tags',
    visible: true,
    width: 100,
    order: 1
  }, {
    key: 'product_price',
    label: 'Preis',
    labelTooltip: 'in €/pcs',
    visible: true,
    width: 80,
    order: 2
  }, {
    key: 'product_lead_time',
    label: 'Lieferzeit',
    labelTooltip: 'in Wochen',
    visible: true,
    width: 90,
    order: 3
  }, {
    key: 'product_inventory',
    label: 'Lagerbestand',
    labelTooltip: 'in pcs',
    visible: true,
    width: 100,
    order: 4
  }, {
    key: 'rec_source',
    label: 'Grund',
    visible: true,
    width: 120,
    order: 5
  }, {
    key: 'rec_score',
    label: 'Score',
    visible: true,
    width: 150,
    order: 6
  }, {
    key: 'actions',
    label: 'Aktion',
    visible: true,
    width: 160,
    order: 7
  }], []);
  const {
    columns: crossSellViewColumns,
    toggleColumn: toggleCrossSellViewColumn,
    updateColumnWidth: updateCrossSellViewColumnWidth,
    reorderColumns: reorderCrossSellViewColumns,
    resetColumns: resetCrossSellViewColumns
  } = useTableColumns('cross-sells-view-columns', defaultCrossSellViewColumns);
  const {
    isFavorite,
    toggleFavorite
  } = useFavorites('project');
  const {
    addToHistory
  } = useProjectHistory();
  const queryClient = useQueryClient();

  // Initialize customer filter from URL params
  useEffect(() => {
    const customerParam = searchParams.get('customer');
    if (customerParam) {
      handleCustomerClick(customerParam);
    }
  }, [searchParams]);

  // Load recently viewed projects from database
  const {
    data: recentHistory = []
  } = useQuery({
    queryKey: ['user-project-history'],
    queryFn: async () => {
      const {
        data
      } = await supabase.from('user_project_history').select('project_id, viewed_at').order('viewed_at', {
        ascending: false
      }).limit(10);
      return data || [];
    }
  });
  const getRecentlyViewed = (): string[] => {
    return recentHistory.map(rh => rh.project_id);
  };
  const defaultProjectColumns = React.useMemo(() => [{
    key: 'project_name',
    label: 'Projektname',
    visible: true,
    width: 200,
    order: 0
  }, {
    key: 'customer',
    label: 'Kunde',
    visible: true,
    width: 180,
    order: 1
  }, {
    key: 'applications',
    label: 'Applikation',
    visible: true,
    width: 200,
    order: 2
  }, {
    key: 'products',
    label: 'Produkt',
    visible: false,
    width: 200,
    order: 3
  }, {
    key: 'optimization_status',
    label: 'Optimierungsstatus',
    visible: true,
    width: 160,
    order: 4
  }, {
    key: 'created_at',
    label: 'Erstellt',
    visible: true,
    width: 120,
    order: 5
  }, {
    key: 'updated_at',
    label: 'Zuletzt geändert',
    visible: true,
    width: 140,
    order: 6
  }], []);
  const {
    columns,
    toggleColumn,
    updateColumnWidth,
    reorderColumns,
    resetColumns
  } = useTableColumns('projects-columns', defaultProjectColumns);

  // Helper function to truncate text
  const truncateText = (text: string | null | undefined, maxLength: number) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };
  const defaultProductColumns = React.useMemo(() => [{
    key: 'product_info',
    label: 'Produkt',
    visible: true,
    width: 320,
    order: 0
  }, {
    key: 'product_price',
    label: 'Preis',
    labelTooltip: 'in €/pcs',
    visible: false,
    width: 80,
    order: 1
  }, {
    key: 'product_lead_time',
    label: 'Lieferzeit',
    labelTooltip: 'in Wochen',
    visible: false,
    width: 90,
    order: 2
  }, {
    key: 'product_inventory',
    label: 'Lagerbestand',
    labelTooltip: 'in pcs',
    visible: false,
    width: 100,
    order: 3
  }, {
    key: 'product_tags',
    label: 'Tags',
    visible: false,
    width: 140,
    order: 4
  }, {
    key: 'status',
    label: 'Status',
    visible: true,
    width: 150,
    order: 5
  }, {
    key: 'remove',
    label: '',
    visible: true,
    width: 50,
    order: 6
  }], []);
  const {
    columns: productColumns,
    toggleColumn: toggleProductColumn,
    updateColumnWidth: updateProductColumnWidth,
    reorderColumns: reorderProductColumns,
    resetColumns: resetProductColumns
  } = useTableColumns('project-detail-product-columns-v2', defaultProductColumns);

  // Recommendation Score Bar Component
  const RecommendationScoreBar = ({
    score
  }: {
    score: number | null;
  }) => {
    if (score === null || score === undefined) return <span className="text-muted-foreground text-center block">-</span>;
    const filledBlocks = Math.round(score / 10);
    return <div className="flex items-center justify-center gap-1 w-full">
        <span className="font-semibold text-xs">{score}%</span>
        <div className="flex gap-px">
          {Array.from({
          length: 10
        }).map((_, i) => <div key={i} className={cn("h-2 w-[3px] rounded-sm", i < filledBlocks ? "bg-emerald-500" : "bg-muted")} />)}
        </div>
      </div>;
  };

  // Cross-sell columns for detail view
  const defaultCrossSellColumns = React.useMemo(() => [{
    key: 'product_info',
    label: 'Produkt',
    visible: true,
    width: 320,
    order: 0
  }, {
    key: 'rec_score',
    label: 'Empfehlung',
    visible: true,
    width: 150,
    order: 1
  }, {
    key: 'product_price',
    label: 'Preis',
    labelTooltip: 'in €/pcs',
    visible: false,
    width: 80,
    order: 2
  }, {
    key: 'product_lead_time',
    label: 'Lieferzeit',
    labelTooltip: 'in Wochen',
    visible: false,
    width: 90,
    order: 3
  }, {
    key: 'product_inventory',
    label: 'Lagerbestand',
    labelTooltip: 'in pcs',
    visible: false,
    width: 100,
    order: 4
  }, {
    key: 'product_tags',
    label: 'Tags',
    visible: false,
    width: 140,
    order: 5
  }, {
    key: 'action',
    label: 'Aktion',
    visible: true,
    width: 150,
    order: 6
  }, {
    key: 'remove',
    label: '',
    visible: true,
    width: 50,
    order: 7
  }], []);
  const {
    columns: crossSellColumns,
    toggleColumn: toggleCrossSellColumn,
    updateColumnWidth: updateCrossSellColumnWidth,
    reorderColumns: reorderCrossSellColumns,
    resetColumns: resetCrossSellColumns
  } = useTableColumns('project-detail-crosssell-columns', defaultCrossSellColumns);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [draggedCrossSellIndex, setDraggedCrossSellIndex] = useState<number | null>(null);
  useEffect(() => {
    const search = searchParams.get('search');
    if (search) {
      setSearchQuery(search);
    }
  }, [searchParams]);

  // Invalidate cache on page mount to ensure fresh data
  useEffect(() => {
    const invalidateCache = async () => {
      console.log('🔄 Invalidating cache on page mount');
      await queryClient.invalidateQueries({
        queryKey: ['customer_projects', activeTenant?.id]
      });
      await queryClient.invalidateQueries({
        queryKey: ['opps_optimization', activeTenant?.id]
      });
      await queryClient.invalidateQueries({
        queryKey: ['cross_sells', activeTenant?.id]
      });
      await queryClient.invalidateQueries({
        queryKey: ['product_alternatives', activeTenant?.id]
      });
      await queryClient.invalidateQueries({
        queryKey: ['products', activeTenant?.id]
      });
    };
    invalidateCache();
  }, [queryClient, activeTenant?.id]);
  const {
    data: projects,
    isLoading,
    refetch: refetchProjects
  } = useQuery({
    queryKey: ['customer_projects', activeTenant?.id],
    queryFn: async () => {
      if (!activeTenant) return [];
      const {
        data,
        error
      } = await supabase.from('customer_projects').select('*').eq('tenant_id', activeTenant.id).order('created_at', {
        ascending: false
      });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeTenant,
    refetchOnMount: 'always',
    // Always refetch when component mounts
    refetchOnWindowFocus: true // Refetch when window regains focus
  });

  // Fetch cross-sells
  const {
    data: crossSells = []
  } = useQuery({
    queryKey: ['cross_sells', activeTenant?.id],
    queryFn: async () => {
      if (!activeTenant) return [];
      const {
        data,
        error
      } = await supabase.from('cross_sells').select('*').eq('tenant_id', activeTenant.id);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeTenant
  });

  // Fetch product details
  const {
    data: productDetails = []
  } = useQuery({
    queryKey: ['products', activeTenant?.id],
    queryFn: async () => {
      if (!activeTenant) return [];
      const {
        data,
        error
      } = await supabase.from('products').select('*').eq('tenant_id', activeTenant.id);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeTenant
  });

  // Fetch product alternatives
  const {
    data: productAlternatives = []
  } = useQuery({
    queryKey: ['product_alternatives', activeTenant?.id],
    queryFn: async () => {
      if (!activeTenant) return [];
      const {
        data,
        error
      } = await supabase.from('product_alternatives').select('*').eq('tenant_id', activeTenant.id);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeTenant
  });

  // Fetch application insights
  const {
    data: appInsights = [],
    isLoading: appInsightsLoading
  } = useQuery({
    queryKey: ['app_insights', activeTenant?.id],
    queryFn: async () => {
      if (!activeTenant) return [];
      const {
        data,
        error
      } = await supabase.from('app_insights').select('*').eq('tenant_id', activeTenant.id);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeTenant
  });

  // Fetch customers data for quick view
  const {
    data: customersData = [],
    isLoading: customersLoading
  } = useQuery({
    queryKey: ['customers', activeTenant?.id],
    queryFn: async () => {
      if (!activeTenant) return [];
      const {
        data,
        error
      } = await supabase.from('customers').select('*').eq('tenant_id', activeTenant.id);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeTenant
  });

  // Fetch optimization records
  const {
    data: optimizationRecords = [],
    refetch: refetchOptimization
  } = useQuery({
    queryKey: ['opps_optimization', activeTenant?.id],
    queryFn: async () => {
      if (!activeTenant) return [];
      const {
        data,
        error
      } = await supabase.from('opps_optimization').select('*').eq('tenant_id', activeTenant.id);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeTenant
  });

  // Helper: check if a product still has an active optimization entry
  const hasActiveOptimizationForProduct = (projectNumber: string, productName: string) => {
    return optimizationRecords.some((rec: any) => rec.project_number === projectNumber && (rec.cross_sell_product_name === productName || rec.alternative_product_name === productName));
  };

  // Fetch removed cross-sells
  const {
    data: removedCrossSells = []
  } = useQuery({
    queryKey: ['removed_cross_sells'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('removed_cross_sells').select('*');
      if (error) throw error;
      return data as any[];
    }
  });

  // Fetch user preferences
  const {
    data: userPreferences
  } = useQuery({
    queryKey: ['user_preferences'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('user_preferences').select('*').maybeSingle();
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      return data;
    }
  });

  // Group projects by customer and project_name
  const groupedProjects = projects?.reduce((acc: any[], project: any) => {
    const existing = acc.find(p => p.customer === project.customer && p.project_name === project.project_name);
    const isAddedRow = !project.upload_id; // Rows created by cross-sell/alternative add have no upload_id
    const includeProduct = (prod: string | null | undefined) => {
      if (!prod) return false;
      // Original uploaded products (with upload_id) are always shown.
      // Added products are only shown if there is still an active optimization record.
      if (!isAddedRow) return true;
      return hasActiveOptimizationForProduct(project.project_number, prod);
    };

    // Ensure we extract string value in case application is an object
    const appValue = typeof project.application === 'object' && project.application !== null ? project.application?.application : project.application;
    const safeAppValue = appValue ? String(appValue) : null;
    if (existing) {
      // Add application and product if not already included
      if (safeAppValue && !existing.applications.includes(safeAppValue)) {
        existing.applications.push(safeAppValue);
      }
      if (includeProduct(project.product) && !existing.products.includes(project.product)) {
        existing.products.push(project.product);
      }
      // Track all project ids that belong to this grouped project
      if (!existing.sourceIds?.includes(project.id)) {
        existing.sourceIds = [...(existing.sourceIds || []), project.id];
      }
      // Keep the earliest created_at date
      if (new Date(project.created_at) < new Date(existing.created_at)) {
        existing.created_at = project.created_at;
      }
      // Track the latest updated_at from optimization records for this project
      const projectNumbers = projects?.filter((p: any) => p.customer === project.customer && p.project_name === project.project_name).map((p: any) => p.project_number).filter(Boolean) || [];
      const relatedOptRecords = optimizationRecords.filter((rec: any) => projectNumbers.includes(rec.project_number));
      const latestOptUpdate = relatedOptRecords.length > 0 ? relatedOptRecords.reduce((latest: string, rec: any) => {
        return new Date(rec.updated_at) > new Date(latest) ? rec.updated_at : latest;
      }, relatedOptRecords[0].updated_at) : null;
      // Update existing project's updated_at if this one is newer
      if (latestOptUpdate && (!existing.updated_at || new Date(latestOptUpdate) > new Date(existing.updated_at))) {
        existing.updated_at = latestOptUpdate;
      }
    } else {
      // Calculate updated_at for new entry
      const projectNumbers = projects?.filter((p: any) => p.customer === project.customer && p.project_name === project.project_name).map((p: any) => p.project_number).filter(Boolean) || [];
      const relatedOptRecords = optimizationRecords.filter((rec: any) => projectNumbers.includes(rec.project_number));
      const latestOptUpdate = relatedOptRecords.length > 0 ? relatedOptRecords.reduce((latest: string, rec: any) => {
        return new Date(rec.updated_at) > new Date(latest) ? rec.updated_at : latest;
      }, relatedOptRecords[0].updated_at) : null;
      acc.push({
        id: project.id,
        customer: project.customer,
        project_name: project.project_name,
        applications: safeAppValue ? [safeAppValue] : [],
        products: includeProduct(project.product) ? [project.product] : [],
        sourceIds: [project.id],
        created_at: project.created_at,
        updated_at: latestOptUpdate || project.created_at
      });
    }
    return acc;
  }, []);

  // Collect all project_numbers that belong to the logical group (customer + project_name)
  const getProjectNumbersForGroup = (customer: string, projectName: string): string[] => {
    if (!projects) return [];
    const nums = projects.filter((p: any) => p.customer === customer && p.project_name === projectName).map((p: any) => p.project_number).filter(Boolean);
    return Array.from(new Set(nums));
  };

  // Calculate automatic project status based on business rules
  const calculateProjectStatus = (project: any, isInDetailView: boolean = false): string => {
    const groupNumbers = getProjectNumbersForGroup(project.customer, project.project_name);
    if (groupNumbers.length === 0) return 'Neu';

    // Read all optimization records for the grouped project numbers
    const projectOptRecords = optimizationRecords.filter((rec: any) => groupNumbers.includes(rec.project_number));

    // 1. Manuell gesetzter Status (höchste Priorität, aber NEU kann nicht manuell gesetzt werden)
    const order = ['Neu', 'Offen', 'Prüfung', 'Validierung', 'Abgeschlossen'] as const;
    const manualStatuses = projectOptRecords.map((rec: any) => rec.optimization_status).filter(status => status && status !== 'Neu') as typeof order[number][]; // Exclude 'Neu'
    if (manualStatuses.length > 0) {
      const highest = manualStatuses.reduce((acc, cur) => order.indexOf(cur) > order.indexOf(acc) ? cur : acc, 'Offen' as typeof order[number]);
      return highest;
    }

    // 2. Prüfe ob Projekt < 7 Tage alt UND noch nicht angeschaut → NEU
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const wasViewed = isInDetailView || recentHistory.some((rh: any) => project.sourceIds ? project.sourceIds.includes(rh.project_id) : rh.project_id === project.id);
    if (!wasViewed && project.created_at) {
      const createdDate = new Date(project.created_at);
      if (createdDate > oneWeekAgo) {
        return 'Neu';
      }
    }

    // 3. Prüfe ob Produkte hinzugefügt wurden
    const hasAddedProducts = projectOptRecords.some((rec: any) => rec.cross_sell_product_name || rec.alternative_product_name);
    if (!hasAddedProducts) {
      // 3a. Keine Produkte hinzugefügt → OFFEN
      return 'Offen';
    }

    // 4-6. Produkte wurden hinzugefügt, prüfe Produktstatus
    const allProductStatuses: string[] = [];
    projectOptRecords.forEach((rec: any) => {
      if (rec.cross_sell_product_name && rec.cross_sell_status) {
        allProductStatuses.push(rec.cross_sell_status);
      }
      if (rec.alternative_product_name && rec.alternative_status) {
        allProductStatuses.push(rec.alternative_status);
      }
    });
    if (allProductStatuses.length === 0) {
      // Produkte hinzugefügt aber keine Status gesetzt → PRÜFUNG
      return 'Prüfung';
    }

    // 4. Mindestens ein Produkt hat Status "Identifiziert" → PRÜFUNG
    if (allProductStatuses.some(status => status === 'Identifiziert')) {
      return 'Prüfung';
    }

    // 5. Mindestens ein Produkt hat Status "Vorgeschlagen" → VALIDIERUNG
    if (allProductStatuses.some(status => status === 'Vorgeschlagen')) {
      return 'Validierung';
    }

    // 6. Alle Produkte haben Status "Akzeptiert" oder "Registriert" → ABGESCHLOSSEN
    if (allProductStatuses.every(status => status === 'Akzeptiert' || status === 'Registriert')) {
      return 'Abgeschlossen';
    }

    // Default fallback
    return 'Offen';
  };
  const filteredProjects = groupedProjects?.filter((project: any) => {
    // Quick filter
    if (quickFilter === 'favorites') {
      const hasFavoriteId = project.sourceIds?.some((sourceId: string) => isFavorite(sourceId)) || isFavorite(project.id);
      if (!hasFavoriteId) return false;
    }
    if (quickFilter === 'recent') {
      const recentlyViewed = getRecentlyViewed();
      const hasRecentId = project.sourceIds?.some((sourceId: string) => recentlyViewed.includes(sourceId)) || recentlyViewed.includes(project.id);
      if (!hasRecentId) return false;
    }
    if (quickFilter === 'open') {
      const status = calculateProjectStatus(project, false);
      if (status !== 'Offen') return false;
    }

    // Status filter
    if (statusFilter) {
      const status = calculateProjectStatus(project, false);
      if (status !== statusFilter) return false;
    }

    // Search filter
    const matchesSearch = searchQuery.length < 2 ? true : project.project_name?.toLowerCase().includes(searchQuery.toLowerCase()) || project.customer?.toLowerCase().includes(searchQuery.toLowerCase()) || project.applications?.some((app: string) => app?.toLowerCase().includes(searchQuery.toLowerCase())) || project.products?.some((prod: string) => prod?.toLowerCase().includes(searchQuery.toLowerCase()));
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
      aValue = calculateProjectStatus(a, false);
      bValue = calculateProjectStatus(b, false);
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

  // Pagination logic
  const totalProjectItems = sortedProjects?.length || 0;
  const totalProjectPages = Math.ceil(totalProjectItems / itemsPerPage);
  const projectStartIndex = (currentPage - 1) * itemsPerPage;
  const projectEndIndex = projectStartIndex + itemsPerPage;
  const paginatedProjects = useMemo(() => {
    return sortedProjects?.slice(projectStartIndex, projectEndIndex) || [];
  }, [sortedProjects, projectStartIndex, projectEndIndex]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, quickFilter, statusFilter, selectedCustomer]);
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

        // Ensure we extract string value in case application is an object
        const appValue = typeof project.application === 'object' && project.application !== null ? project.application?.application : project.application;
        const safeAppValue = appValue ? String(appValue) : null;
        if (existing) {
          if (safeAppValue && !existing.applications.includes(safeAppValue)) {
            existing.applications.push(safeAppValue);
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
            applications: safeAppValue ? [safeAppValue] : [],
            products: project.product ? [project.product] : [],
            created_at: project.created_at
          });
        }
        return acc;
      }, []);
      return grouped;
    } else if (selectedProject) {
      // Return single project
      const projectData = projects.filter(p => p.customer === selectedProject.customer && p.project_name === selectedProject.project_name);
      return [{
        id: selectedProject.id,
        customer: selectedProject.customer,
        project_name: selectedProject.project_name,
        project_number: projectData[0]?.project_number || null,
        applications: projectData.map(p => {
          const appVal = typeof p.application === 'object' && p.application !== null ? p.application?.application : p.application;
          return appVal ? String(appVal) : null;
        }).filter(Boolean),
        products: projectData.map(p => p.product).filter(Boolean),
        created_at: selectedProject.created_at
      }];
    }
    return [];
  };
  const getCrossSells = (products: string[], customer: string, projectName: string) => {
    if (!products || products.length === 0) return [];

    // Filter out products that are already in the project
    const availableCrossSells = crossSells.filter((cs: any) => products.includes(cs.base_product) && !products.includes(cs.cross_sell_product));

    // Get project numbers for this group
    const groupNumbers = getProjectNumbersForGroup(customer, projectName);

    // Filter out products that have been removed
    const removedProducts = removedCrossSells.filter((rc: any) => groupNumbers.includes(rc.project_number)).map((rc: any) => rc.cross_sell_product);

    // Further filter out products that have been added via optimization for ANY row in this project group
    let filteredCrossSells;
    if (groupNumbers.length > 0) {
      const addedProducts = optimizationRecords.filter((rec: any) => groupNumbers.includes(rec.project_number) && rec.cross_sell_product_name).map((rec: any) => rec.cross_sell_product_name);
      filteredCrossSells = availableCrossSells.filter((cs: any) => !addedProducts.includes(cs.cross_sell_product) && !removedProducts.includes(cs.cross_sell_product));
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
    return optimizationRecords.some((rec: any) => groupNumbers.includes(rec.project_number) && rec.alternative_product_name && alternatives.some((alt: any) => alt.alternative_product === rec.alternative_product_name));
  };
  const toggleAlternatives = (productName: string) => {
    setExpandedAlternatives(prev => ({
      ...prev,
      [productName]: !prev[productName]
    }));
  };
  const getOptimizationStatus = (customer: string, projectName: string, productName: string, type: 'cross_sell' | 'alternative') => {
    // First check if product exists in optimization records
    const groupNumbers = getProjectNumbersForGroup(customer, projectName);
    if (groupNumbers.length > 0) {
      // Check both cross_sell and alternative records since a product could be added either way
      const record = optimizationRecords.find((rec: any) => groupNumbers.includes(rec.project_number) && (rec.cross_sell_product_name === productName || rec.alternative_product_name === productName));

      // If found in optimization records, return the appropriate status
      if (record) {
        // Return cross_sell_status if the product is in cross_sell_product_name, otherwise alternative_status
        if (record.cross_sell_product_name === productName && record.cross_sell_status) {
          return record.cross_sell_status;
        }
        if (record.alternative_product_name === productName && record.alternative_status) {
          return record.alternative_status;
        }
      }
    }

    // If not in optimization records, check if it's an original project product (with upload_id)
    const originalProduct = projects?.find((p: any) => p.customer === customer && p.project_name === projectName && p.product === productName && p.upload_id !== null // Original uploaded products have an upload_id
    );

    // Original project products without optimization record are "Registriert"
    if (originalProduct) {
      return 'Registriert';
    }

    // Products not in optimization and not original uploads have no status
    return null;
  };
  const getOptimizationRecordId = (customer: string, projectName: string, productName: string, type: 'cross_sell' | 'alternative') => {
    const groupNumbers = getProjectNumbersForGroup(customer, projectName);
    if (groupNumbers.length === 0) return null;
    // Check both cross_sell and alternative records since a product could be added either way
    const record = optimizationRecords.find((rec: any) => groupNumbers.includes(rec.project_number) && (rec.cross_sell_product_name === productName || rec.alternative_product_name === productName));
    return record?.id || null;
  };
  const handleUpdateCrossSellStatus = async (customer: string, projectName: string, productName: string, newStatus: string, type: 'cross_sell' | 'alternative' = 'cross_sell') => {
    try {
      // Find the optimization record - check both cross_sell and alternative
      const groupNumbers = getProjectNumbersForGroup(customer, projectName);
      if (groupNumbers.length === 0) {
        toast.error('Optimierungsdatensatz nicht gefunden');
        return;
      }
      const record = optimizationRecords.find((rec: any) => groupNumbers.includes(rec.project_number) && (rec.cross_sell_product_name === productName || rec.alternative_product_name === productName));
      if (!record) {
        toast.error('Optimierungsdatensatz nicht gefunden');
        return;
      }

      // Determine which field to update based on what was found
      const updateField = record.cross_sell_product_name === productName ? 'cross_sell_status' : 'alternative_status';
      const {
        error
      } = await supabase.from('opps_optimization').update({
        [updateField]: newStatus
      }).eq('id', record.id);
      if (error) throw error;

      // Invalidate all related queries to refresh data immediately
      await Promise.all([queryClient.invalidateQueries({
        queryKey: ['opps_optimization']
      }), queryClient.invalidateQueries({
        queryKey: ['customer_projects']
      })]);
      toast.success('Status aktualisiert');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Fehler beim Aktualisieren des Status');
    }
  };
  const handleAddCrossSell = async (project: any, crossSellProduct: string) => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Nicht authentifiziert');
        return;
      }

      // Get project_number and application from customer_projects
      let projectQuery = supabase.from('customer_projects').select('project_number, application').eq('customer', project.customer).eq('project_name', project.project_name);

      // Filter by tenant_id for non-super-admins
      if (!isSuperAdmin && activeTenant?.id) {
        projectQuery = projectQuery.eq('tenant_id', activeTenant.id);
      }
      const {
        data: projectData,
        error: projectError
      } = await projectQuery.limit(1).maybeSingle();
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
      const {
        data: insertedProject,
        error: projectInsertError
      } = await supabase.from('customer_projects').insert({
        user_id: user.id,
        tenant_id: activeTenant?.id || null,
        customer: project.customer,
        project_name: project.project_name,
        application: projectData.application,
        product: crossSellProduct,
        project_number: projectData.project_number
      }).select();
      if (projectInsertError) {
        console.error('Project insert error:', projectInsertError);
        throw projectInsertError;
      }
      console.log('Product added to project:', insertedProject);

      // Insert into opps_optimization
      const {
        data: insertedOpp,
        error: insertError
      } = await supabase.from('opps_optimization').insert({
        user_id: user.id,
        tenant_id: activeTenant?.id || null,
        project_number: projectData.project_number,
        cross_sell_product_name: crossSellProduct,
        cross_sell_date_added: new Date().toISOString(),
        cross_sell_status: 'Identifiziert'
      }).select();
      if (insertError) {
        console.error('Optimization insert error:', insertError);
        throw insertError;
      }
      console.log('Optimization record created:', insertedOpp);

      // Invalidate and refetch data with tenant context
      await queryClient.invalidateQueries({
        queryKey: ['customer_projects', activeTenant?.id]
      });
      await queryClient.invalidateQueries({
        queryKey: ['opps_optimization', activeTenant?.id]
      });
      await Promise.all([refetchProjects(), refetchOptimization()]);

      // Wait a moment for React Query to update the cache
      await new Promise(resolve => setTimeout(resolve, 100));
      toast.success(`${crossSellProduct} zum Projekt hinzugefügt`);
    } catch (error: any) {
      console.error('Error adding cross-sell:', error);
      toast.error(`Fehler: ${error.message || 'Unbekannter Fehler'}`);
    }
  };
  const handleRemoveCrossSell = (project: any, crossSellProduct: string, application: string) => {
    console.log('Remove clicked', {
      project,
      crossSellProduct,
      application
    });
    setSelectedCrossSellForRemoval({
      project,
      crossSellProduct,
      application
    });
    setRemovalDialogOpen(true);
  };
  const handleConfirmRemoval = async (reason: string, ctx?: {
    project: any;
    crossSellProduct: string;
  }) => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
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
      const {
        data: projectData
      } = await supabase.from('customer_projects').select('project_number, application').eq('customer', project.customer).eq('project_name', project.project_name).limit(1).maybeSingle();
      if (!projectData) {
        toast.error('Projekt nicht gefunden');
        return;
      }

      // Insert into removed_cross_sells and get inserted row
      const {
        data: inserted,
        error
      } = await supabase.from('removed_cross_sells').insert([{
        user_id: user.id,
        project_number: projectData.project_number,
        application: projectData.application,
        cross_sell_product: crossSellProduct,
        removal_reason: reason as any
      }]).select().single();
      if (error) throw error;

      // Store removed ID for undo
      console.log('Setting undo modal visible with ID:', inserted.id);
      setLastRemovedId(inserted.id);
      setLastRemovedProduct(crossSellProduct);

      // Sofort Toast mit Undo-Action anzeigen (Fallback zum Modal)
      toast.success(`"${crossSellProduct}" entfernt`, {
        action: {
          label: 'Rückgängig',
          onClick: () => handleUndoRemovalById(inserted.id)
        },
        duration: 4000
      });

      // Optimistisch in Cache aufnehmen, damit die Liste sofort filtert
      queryClient.setQueryData(['removed_cross_sells'], (old: any) => {
        const prev = Array.isArray(old) ? old : [];
        return inserted ? [...prev, inserted] : prev;
      });

      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({
        queryKey: ['removed_cross_sells']
      });

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
      const {
        error
      } = await supabase.from('removed_cross_sells').delete().eq('id', id);
      if (error) throw error;

      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({
        queryKey: ['removed_cross_sells']
      });
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
  const handleRemoveAddedProduct = async (customer: string, projectName: string, productName: string, type: 'cross_sell' | 'alternative') => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Nicht authentifiziert');
        return;
      }
      const groupNumbers = getProjectNumbersForGroup(customer, projectName);
      if (groupNumbers.length === 0) {
        toast.error('Projektnummer nicht gefunden');
        return;
      }

      // STEP 1: Try to delete from opps_optimization (if record exists)
      const optimizationRecord = optimizationRecords.find((rec: any) => groupNumbers.includes(rec.project_number) && (rec.cross_sell_product_name === productName || rec.alternative_product_name === productName));
      if (optimizationRecord) {
        console.log('Deleting optimization record:', optimizationRecord.id);
        const {
          error: oppError
        } = await supabase.from('opps_optimization').delete().eq('id', optimizationRecord.id);
        if (oppError) {
          console.error('Error deleting from opps_optimization:', oppError);
        } else {
          console.log('Successfully deleted from opps_optimization');
        }
      } else {
        console.log('No optimization record found - will only delete from customer_projects');
      }

      // STEP 2: ALWAYS delete from customer_projects (independent of step 1)
      let deleteProjectQuery = supabase.from('customer_projects').delete().eq('customer', customer).eq('project_name', projectName).eq('product', productName).in('project_number', groupNumbers);
      if (!isSuperAdmin && activeTenant?.id) {
        deleteProjectQuery = deleteProjectQuery.eq('tenant_id', activeTenant.id);
      }
      const {
        error: projectDeleteError
      } = await deleteProjectQuery;
      if (projectDeleteError) {
        console.error('Error deleting from customer_projects:', projectDeleteError);
        throw projectDeleteError;
      }
      console.log('Product removed successfully from customer_projects');

      // STEP 3: Invalidate ALL related queries with tenant context
      await queryClient.invalidateQueries({
        queryKey: ['opps_optimization', activeTenant?.id]
      });
      await queryClient.invalidateQueries({
        queryKey: ['customer_projects', activeTenant?.id]
      });

      // STEP 4: Force refetch to ensure fresh data
      await Promise.all([refetchProjects(), refetchOptimization()]);

      // STEP 5: Wait a moment for React Query to update the cache
      await new Promise(resolve => setTimeout(resolve, 100));
      toast.success(`${productName} entfernt`);
    } catch (error: any) {
      console.error('Error removing product:', error);
      toast.error('Fehler beim Entfernen des Produkts');
    }
  };
  const handleAddAlternative = async (project: any, alternativeProduct: string) => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Nicht authentifiziert');
        return;
      }

      // Get project_number and application from customer_projects
      let projectQuery = supabase.from('customer_projects').select('project_number, application').eq('customer', project.customer).eq('project_name', project.project_name);

      // Filter by tenant_id for non-super-admins
      if (!isSuperAdmin && activeTenant?.id) {
        projectQuery = projectQuery.eq('tenant_id', activeTenant.id);
      }
      const {
        data: projectData,
        error: projectError
      } = await projectQuery.limit(1).maybeSingle();
      if (projectError) {
        console.error('Project lookup error:', projectError);
        throw projectError;
      }
      if (!projectData) {
        toast.error('Projekt nicht gefunden');
        return;
      }

      // Insert into customer_projects to add product to project
      const {
        data: insertedProject,
        error: projectInsertError
      } = await supabase.from('customer_projects').insert({
        user_id: user.id,
        tenant_id: activeTenant?.id || null,
        customer: project.customer,
        project_name: project.project_name,
        application: projectData.application,
        product: alternativeProduct,
        project_number: projectData.project_number
      }).select();
      if (projectInsertError) {
        console.error('Project insert error:', projectInsertError);
        throw projectInsertError;
      }

      // Insert into opps_optimization
      const {
        data: insertedOpp,
        error: insertError
      } = await supabase.from('opps_optimization').insert({
        user_id: user.id,
        tenant_id: activeTenant?.id || null,
        project_number: projectData.project_number,
        alternative_product_name: alternativeProduct,
        alternative_date_added: new Date().toISOString(),
        alternative_status: 'Identifiziert'
      }).select();
      if (insertError) {
        console.error('Optimization insert error:', insertError);
        throw insertError;
      }

      // Invalidate and refetch data with tenant context
      await queryClient.invalidateQueries({
        queryKey: ['customer_projects', activeTenant?.id]
      });
      await queryClient.invalidateQueries({
        queryKey: ['opps_optimization', activeTenant?.id]
      });
      await Promise.all([refetchProjects(), refetchOptimization()]);

      // Wait a moment for React Query to update the cache
      await new Promise(resolve => setTimeout(resolve, 100));
      toast.success(`${alternativeProduct} als Alternative zum Projekt hinzugefügt`);
    } catch (error: any) {
      console.error('Error adding alternative:', error);
      toast.error(`Fehler: ${error.message || 'Unbekannter Fehler'}`);
    }
  };
  const handleProjectStatusChange = async (project: any, newStatus: string) => {
    console.log('🔄 handleProjectStatusChange called:', {
      project: project.project_name,
      newStatus
    });
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
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
            return {
              ...r,
              optimization_status: dbStatus,
              updated_at: new Date().toISOString()
            };
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
            updated_at: new Date().toISOString()
          });
        }
        return updated;
      });

      // Persist: Update optimization records with new status on the backend
      for (const projectNumber of groupNumbers) {
        console.log(`🔄 Processing project number: ${projectNumber}`);

        // Try to update ALL existing rows for this project number
        let updateQuery = supabase.from('opps_optimization').update({
          optimization_status: dbStatus
        }).eq('project_number', projectNumber);

        // Filter by tenant_id for non-super-admins
        if (!isSuperAdmin && activeTenant?.id) {
          updateQuery = updateQuery.eq('tenant_id', activeTenant.id);
        }
        const {
          data: updatedRows,
          error: updateError
        } = await updateQuery.select('id');
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
          const {
            error: insertError
          } = await supabase.from('opps_optimization').insert({
            user_id: user.id,
            tenant_id: activeTenant?.id || null,
            project_number: projectNumber,
            optimization_status: dbStatus
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
      await queryClient.invalidateQueries({
        queryKey: ['opps_optimization']
      });
      await refetchOptimization();
      console.log('✅ Queries invalidated and refetched');
      toast.success(`Projekt-Status auf "${newStatus}" gesetzt`);
    } catch (error) {
      console.error('❌ Error updating project status:', error);
      toast.error('Fehler beim Aktualisieren des Projekt-Status');
    }
  };
  const handleRowClick = async (project: any) => {
    try {
      // Add to history and wait for completion
      const targetId = project.sourceIds?.[0] || project.id;
      await addToHistory(targetId);

      // Wait for history query to refetch
      await queryClient.refetchQueries({
        queryKey: ['user-project-history'],
        type: 'active'
      });

      // Now set the view mode - status calculation will use updated history
      setSelectedProject(project);
      setSelectedCustomer(null);
      setViewMode('detail');
    } catch (error) {
      console.error('Error updating project history:', error);
      // Still show the detail view even if history update fails
      setSelectedProject(project);
      setSelectedCustomer(null);
      setViewMode('detail');
    }
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
    return <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={handleBackToList}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück
            </Button>
            <p className="text-muted-foreground">
              {detailProjects.length} {detailProjects.length === 1 ? 'Projekt' : 'Projekte'}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Application Quick View Sheet (Detail-Ansicht) */}
          <Sheet open={applicationQuickViewOpen} onOpenChange={open => {
          console.log('📝 Sheet onOpenChange (detail):', open);
          setApplicationQuickViewOpen(open);
        }}>
            <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto z-[2000]">
              <SheetHeader>
                <Breadcrumb className="mb-4">
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink className="cursor-pointer" onClick={() => {
                      setApplicationQuickViewOpen(false);
                    }}>
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
              {appInsightsLoading ? <div className="mt-6 space-y-6">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div> : selectedApplicationForQuickView ? (() => {
              const appData = appInsights.find((app: any) => app.application === selectedApplicationForQuickView || app.application?.toLowerCase() === selectedApplicationForQuickView?.toLowerCase() || app.application?.toLowerCase().includes(selectedApplicationForQuickView?.toLowerCase()) || selectedApplicationForQuickView?.toLowerCase().includes(app.application?.toLowerCase()));
              console.log('🔍 Searching for application (detail):', selectedApplicationForQuickView);
              console.log('📊 Available applications:', appInsights.map((a: any) => a.application));
              console.log('✅ Found app data:', appData);
              return appData ? <div className="mt-6 space-y-6">
                    {appData.industry && <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">Industrie</h3>
                        <Badge variant="secondary">{appData.industry}</Badge>
                      </div>}
                    {appData.application_description && <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">Beschreibung</h3>
                        <p className="text-base leading-relaxed">
                          {appData.application_description}
                        </p>
                      </div>}
                    {appData.application_trends && <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">Trends</h3>
                        <p className="text-base leading-relaxed">
                          {appData.application_trends}
                        </p>
                      </div>}
                    {(appData.product_family_1 || appData.product_family_2 || appData.product_family_3 || appData.product_family_4 || appData.product_family_5) && <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">Product Families</h3>
                        <div className="flex flex-wrap gap-2">
                          {appData.product_family_1 && <Badge variant="outline">#{1} {appData.product_family_1}</Badge>}
                          {appData.product_family_2 && <Badge variant="outline">#{2} {appData.product_family_2}</Badge>}
                          {appData.product_family_3 && <Badge variant="outline">#{3} {appData.product_family_3}</Badge>}
                          {appData.product_family_4 && <Badge variant="outline">#{4} {appData.product_family_4}</Badge>}
                          {appData.product_family_5 && <Badge variant="outline">#{5} {appData.product_family_5}</Badge>}
                        </div>
                      </div>}
                    {appData.application_block_diagram && <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">Blockdiagramm</h3>
                        <BlockDiagramViewer content={appData.application_block_diagram} />
                      </div>}
                  </div> : <div className="mt-6 space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Keine detaillierten Informationen für diese Applikation verfügbar.
                    </p>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-xs text-muted-foreground">
                        <strong>Gesuchte Applikation:</strong> {selectedApplicationForQuickView}
                      </p>
                      {appInsights.length > 0 && <p className="text-xs text-muted-foreground mt-2">
                          <strong>Verfügbare Applikationen:</strong> {appInsights.length}
                        </p>}
                    </div>
                  </div>;
            })() : <div className="mt-6">
                  <p className="text-sm text-muted-foreground">
                    Keine Applikation ausgewählt.
                  </p>
                </div>}
            </SheetContent>
          </Sheet>

          {/* Customer Quick View Sheet */}
          <Sheet open={customerQuickViewOpen} onOpenChange={setCustomerQuickViewOpen}>
            <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto z-[2000]">
              <SheetHeader>
                <Breadcrumb className="mb-4">
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink className="cursor-pointer" onClick={() => {
                      setCustomerQuickViewOpen(false);
                    }}>
                        Projekte
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{selectedCustomerForQuickView}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
                <SheetTitle className="text-2xl">{selectedCustomerForQuickView}</SheetTitle>
                <SheetDescription>Kundendetails und Informationen</SheetDescription>
              </SheetHeader>
              {customersLoading ? <div className="mt-6 space-y-6">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div> : selectedCustomerForQuickView ? (() => {
              const customerData = customersData.find((c: any) => c.customer_name === selectedCustomerForQuickView || c.customer_name?.toLowerCase() === selectedCustomerForQuickView?.toLowerCase());
              return customerData ? <div className="mt-6 space-y-6">
                    {customerData.industry && <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">Branche</h3>
                        <Badge variant="secondary">{customerData.industry}</Badge>
                      </div>}
                    {customerData.customer_category && <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">Kategorie</h3>
                        <Badge variant="outline">{customerData.customer_category}</Badge>
                      </div>}
                    {(customerData.country || customerData.city) && <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">Standort</h3>
                        <p className="text-base">
                          {[customerData.city, customerData.country].filter(Boolean).join(', ') || '-'}
                        </p>
                      </div>}
                    <div className="pt-4 border-t">
                      <Button variant="outline" className="w-full" onClick={() => {
                    setCustomerQuickViewOpen(false);
                    setSelectedCustomer(selectedCustomerForQuickView);
                    setSelectedProject(null);
                  }}>
                        Alle Projekte dieses Kunden anzeigen
                      </Button>
                    </div>
                  </div> : <div className="mt-6 space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Keine detaillierten Informationen für diesen Kunden verfügbar.
                    </p>
                    <div className="pt-4 border-t">
                      <Button variant="outline" className="w-full" onClick={() => {
                    setCustomerQuickViewOpen(false);
                    setSelectedCustomer(selectedCustomerForQuickView);
                    setSelectedProject(null);
                  }}>
                        Alle Projekte dieses Kunden anzeigen
                      </Button>
                    </div>
                  </div>;
            })() : <div className="mt-6">
                  <p className="text-sm text-muted-foreground">
                    Kein Kunde ausgewählt.
                  </p>
                </div>}
            </SheetContent>
          </Sheet>

          {detailProjects.map((project: any) => <Card key={project.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Collapsible open={metadataExpanded} onOpenChange={setMetadataExpanded}>
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center gap-2 cursor-pointer group">
                          <CardTitle className="text-xl">{project.project_name}</CardTitle>
                          <ChevronUp className={cn("h-5 w-5 text-muted-foreground transition-transform duration-200 group-hover:text-foreground", !metadataExpanded && "rotate-180")} />
                        </div>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <div className="flex flex-row flex-wrap gap-12 mt-4">
                          {/* Kunde */}
                          <div>
                            <span className="text-sm text-muted-foreground block">Kunde</span>
                            <span onClick={e => {
                          e.stopPropagation();
                          setSelectedCustomerForQuickView(project.customer);
                          setCustomerQuickViewOpen(true);
                        }} className="font-medium cursor-pointer hover:underline transition-colors text-foreground">
                              {project.customer}
                            </span>
                          </div>
                          
                          {/* Applikation */}
                          <div>
                            <span className="text-sm text-muted-foreground block">Applikation</span>
                            <span className="font-medium">
                              {[...new Set(project.applications.map((app: string) => typeof app === 'string' ? app : (app as any)?.application || ''))].map((appName: string, idx: number, arr: string[]) => <span key={idx}>
                                  <span className="cursor-pointer hover:underline transition-colors text-foreground" onClick={e => {
                              e.stopPropagation();
                              setSelectedApplicationForQuickView(appName);
                              setApplicationQuickViewOpen(true);
                            }}>
                                    {appName}
                                  </span>
                                  {idx < arr.length - 1 && ', '}
                                </span>)}
                              {project.applications.length === 0 && '-'}
                            </span>
                          </div>
                          
                          {/* Erstellt */}
                          <div>
                            <span className="text-sm text-muted-foreground block">Erstellt</span>
                            <span className="font-medium">
                              {project.created_at ? new Date(project.created_at).toLocaleDateString('de-DE') : '-'}
                            </span>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                    
                    {/* Optimization Status Progress Bar */}
                    <div className="mt-4 flex items-center gap-4">
                      {(() => {
                    const currentStatus = calculateProjectStatus(project, true);
                    const statusIndex = ['Neu', 'Offen', 'Prüfung', 'Validierung', 'Abgeschlossen'].indexOf(currentStatus);
                    return <>
                            <div className="flex-1 grid grid-cols-5 gap-0">
                              {/* Step: Neu */}
                              <div className={`flex items-center justify-center px-2 py-1.5 rounded-l-lg border border-r-0 text-xs font-medium ${statusIndex >= 0 ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                                {statusIndex >= 0 && '✓ '}NEU
                              </div>
                              
                              {/* Step: Offen */}
                              <div className={`flex items-center justify-center px-2 py-1.5 border border-r-0 text-xs font-medium ${statusIndex >= 1 ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                                {statusIndex >= 1 && '✓ '}OFFEN
                              </div>
                              
                              {/* Step: Prüfung */}
                              <div className={`flex items-center justify-center px-2 py-1.5 border border-r-0 text-xs font-medium ${statusIndex >= 2 ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                                {statusIndex >= 2 && '✓ '}PRÜFUNG
                              </div>
                              
                              {/* Step: Validierung */}
                              <div className={`flex items-center justify-center px-2 py-1.5 border border-r-0 text-xs font-medium ${statusIndex >= 3 ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                                {statusIndex >= 3 && '✓ '}VALIDIERUNG
                              </div>
                              
                              {/* Step: Abgeschlossen */}
                              <div className={`flex items-center justify-center px-2 py-1.5 rounded-r-lg border text-xs font-medium ${statusIndex >= 4 ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                                {statusIndex >= 4 && '✓ '}ABGESCHLOSSEN
                              </div>
                            </div>
                            
                            {/* Status Dropdown */}
                            <Select value={currentStatus.toLowerCase()} onValueChange={value => {
                        console.log('📋 Select onValueChange triggered:', value);
                        handleProjectStatusChange(project, value);
                      }}>
                              <SelectTrigger className="w-[180px] bg-background">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="z-[9999] bg-popover">
                                <SelectItem value="offen">Offen</SelectItem>
                                <SelectItem value="prüfung">Prüfung</SelectItem>
                                <SelectItem value="validierung">Validierung</SelectItem>
                                <SelectItem value="abgeschlossen">Abgeschlossen</SelectItem>
                              </SelectContent>
                            </Select>
                          </>;
                  })()}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={e => {
                e.stopPropagation();
                const targetId = project.sourceIds?.[0] || project.id;
                toggleFavorite(targetId);
              }}>
                    <Star className={`h-5 w-5 ${project.sourceIds?.some((sourceId: string) => isFavorite(sourceId)) || isFavorite(project.id) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Products Table */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold text-base">Enthaltene Produkte</h3>
                      </div>
                      <ColumnVisibilityToggle columns={productColumns} onToggle={toggleProductColumn} onReset={resetProductColumns} />
                    </div>
                    <Separator className="mb-4" />
                    {project.products.length > 0 ? <div className="rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {visibleProductColumns.map((column, index) => <ResizableTableHeader key={column.key} label={column.label} labelTooltip={column.labelTooltip} width={column.width} onResize={width => updateProductColumnWidth(column.key, width)} sortable={false} draggable={true} className={['product_price', 'product_lead_time', 'product_inventory'].includes(column.key) ? 'text-right' : ''} onDragStart={() => setDraggedProductIndex(index)} onDragOver={e => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                        }} onDrop={e => {
                          e.preventDefault();
                          if (draggedProductIndex !== null && draggedProductIndex !== index) {
                            reorderProductColumns(draggedProductIndex, index);
                          }
                          setDraggedProductIndex(null);
                        }} onDragEnd={() => setDraggedProductIndex(null)} />)}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                             {project.products.sort((a: string, b: string) => {
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
                      }).map((productName: string, idx: number) => {
                        const details = getProductDetails(productName);
                        const alternatives = getProductAlternatives(productName);
                        const hasAlternatives = alternatives.length > 0;
                        const showAlternativesBadge = hasAddedAlternatives(project.customer, project.project_name, productName);
                        const isExpanded = expandedAlternatives[productName];
                        const productStatus = getOptimizationStatus(project.customer, project.project_name, productName, 'cross_sell');
                        return <React.Fragment key={`prod-${productName}-${idx}`}>
                                  <TableRow key={idx} className={cn("align-top", hasAlternatives && isExpanded ? 'bg-muted/50' : '')}>
                                     {visibleProductColumns.map(column => {
                              let value: any = '-';
                              if (column.key === 'product_info') {
                                const detailParts = [details?.manufacturer, details?.product_family].filter(Boolean);
                                value = <div className="flex items-start py-2 pl-4">
                                             <div className="flex flex-col min-w-0 flex-1">
                                               <div className="flex items-center gap-2">
                                                 <span onClick={e => {
                                        e.stopPropagation();
                                        setSelectedProductForQuickView(details || {
                                          product: productName
                                        });
                                        setProductQuickViewOpen(true);
                                      }} className="text-xs font-semibold truncate cursor-pointer hover:underline text-foreground">
                                                   {productName}
                                                 </span>
                                                 {hasAlternatives && <Replace className={`h-4 w-4 text-primary cursor-pointer transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} onClick={e => {
                                        e.stopPropagation();
                                        toggleAlternatives(productName);
                                      }} />}
                                               </div>
                                               {detailParts.length > 0 && <span className="text-2xs text-muted-foreground truncate">
                                                   {detailParts.join(' • ')}
                                                 </span>}
                                               {details?.product_description && <span className="text-2xs text-muted-foreground truncate">
                                                   {truncateText(details.product_description, 60)}
                                                 </span>}
                                             </div>
                                           </div>;
                              } else if (column.key === 'status') {
                                const isRegistered = productStatus === 'Registriert';
                                value = productStatus ? <Select value={productStatus} disabled={isRegistered} onValueChange={newStatus => handleUpdateCrossSellStatus(project.customer, project.project_name, productName, newStatus, 'cross_sell')}>
                                               <SelectTrigger className="h-8 w-[120px] text-xs border border-input bg-background" onClick={e => e.stopPropagation()}>
                                                 <SelectValue />
                                               </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="Identifiziert">Identifiziert</SelectItem>
                                                  <SelectItem value="Vorgeschlagen">Vorgeschlagen</SelectItem>
                                                  <SelectItem value="Akzeptiert">Akzeptiert</SelectItem>
                                                  <SelectItem value="Registriert">Registriert</SelectItem>
                                                  <SelectItem value="Abgelehnt">Abgelehnt</SelectItem>
                                                </SelectContent>
                                             </Select> : '-';
                              } else if (column.key === 'remove') {
                                const isAddedProduct = productStatus && productStatus !== 'Registriert';
                                value = isAddedProduct ? <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={e => {
                                  e.stopPropagation();
                                  handleRemoveAddedProduct(project.customer, project.project_name, productName, 'cross_sell');
                                }}>
                                               <X className="h-4 w-4" />
                                             </Button> : null;
                              } else if (details) {
                                if (column.key === 'product_price') value = details.product_price ? `€ ${Number(details.product_price).toFixed(2)}` : '-';
                                if (column.key === 'product_lead_time') value = details.product_lead_time ? String(Math.ceil(details.product_lead_time / 7)) : '-';
                                if (column.key === 'product_inventory') value = details.product_inventory !== null && details.product_inventory !== undefined ? String(details.product_inventory) : '-';
                                if (column.key === 'product_tags') {
                                  const badges = [];
                                  if (details.product_lifecycle) {
                                    badges.push(<span key="lifecycle">{renderLifecycleBadge(details.product_lifecycle)}</span>);
                                  }
                                  if (details.product_new === 'Y') {
                                    badges.push(<span key="new">{renderNeuBadge()}</span>);
                                  }
                                  if (details.product_top === 'Y') {
                                    badges.push(<span key="top">{renderTopBadge()}</span>);
                                  }
                                  value = badges.length > 0 ? <div className="flex flex-wrap gap-0.5">{badges}</div> : '-';
                                }
                              }
                              return <TableCell key={column.key} className={cn("align-top", column.key === 'product_info' ? 'p-0' : 'py-3', ['product_price', 'product_lead_time', 'product_inventory'].includes(column.key) ? 'text-right' : '')} style={{
                                width: `${column.width}px`
                              }}>
                                             {value}
                                           </TableCell>;
                            })}
                                  </TableRow>
                                  
                                    {/* Alternative Products - Expandable - Only show alternatives that have NOT been added yet */}
                                    {hasAlternatives && isExpanded && alternatives.filter((alt: any) => {
                            // Only show alternatives that have NOT been added to the project yet
                            const altStatus = getOptimizationStatus(project.customer, project.project_name, alt.alternative_product, 'alternative');
                            return !altStatus; // If no status, it hasn't been added yet
                          }).map((alt: any, altIdx: number) => {
                            const altDetails = getProductDetails(alt.alternative_product);
                            const altStatus = getOptimizationStatus(project.customer, project.project_name, alt.alternative_product, 'alternative');
                            const isAlreadyInProject = project.products.includes(alt.alternative_product);
                            return <TableRow key={`alt-${idx}-${altIdx}`} className="bg-muted/70 align-top">
                                          {visibleProductColumns.map(column => {
                                if (column.key === 'product_info') {
                                  const altDetailParts = [altDetails?.manufacturer, altDetails?.product_family].filter(Boolean);
                                  return <TableCell key={column.key} className="p-0" style={{
                                    width: `${column.width}px`
                                  }}>
                                                  <div className="flex items-start py-2 pl-8">
                                                    <div className="flex flex-col min-w-0 flex-1">
                                                      <div className="flex items-center gap-2">
                                                        <span className="text-muted-foreground text-xs">↳</span>
                                                        <span onClick={e => {
                                            e.stopPropagation();
                                            setSelectedProductForQuickView(altDetails || {
                                              product: alt.alternative_product
                                            });
                                            setProductQuickViewOpen(true);
                                          }} className="text-xs font-semibold truncate cursor-pointer hover:underline text-foreground">
                                                          {alt.alternative_product}
                                                        </span>
                                                        {alt.similarity && <Badge variant="secondary" className="text-xs flex-shrink-0">
                                                            {alt.similarity}%
                                                          </Badge>}
                                                      </div>
                                                      {altDetailParts.length > 0 && <span className="text-2xs text-muted-foreground truncate">
                                                          {altDetailParts.join(' • ')}
                                                        </span>}
                                                      {altDetails?.product_description && <span className="text-2xs text-muted-foreground truncate">
                                                          {truncateText(altDetails.product_description, 60)}
                                                        </span>}
                                                    </div>
                                                  </div>
                                                </TableCell>;
                                } else if (column.key === 'status') {
                                  const isRegistered = altStatus === 'Registriert';
                                  return <TableCell key={column.key} className="align-top py-3" style={{
                                    width: `${column.width}px`
                                  }}>
                                                  {altStatus ? <Select value={altStatus} disabled={isRegistered} onValueChange={newStatus => handleUpdateCrossSellStatus(project.customer, project.project_name, alt.alternative_product, newStatus, 'alternative')}>
                                                      <SelectTrigger className="h-8 w-[120px] text-xs border border-input bg-background" onClick={e => e.stopPropagation()}>
                                                        <SelectValue />
                                                      </SelectTrigger>
                                                       <SelectContent>
                                                         <SelectItem value="Identifiziert">Identifiziert</SelectItem>
                                                         <SelectItem value="Vorgeschlagen">Vorgeschlagen</SelectItem>
                                                         <SelectItem value="Akzeptiert">Akzeptiert</SelectItem>
                                                         <SelectItem value="Registriert">Registriert</SelectItem>
                                                         <SelectItem value="Abgelehnt">Abgelehnt</SelectItem>
                                                       </SelectContent>
                                                    </Select> : !isAlreadyInProject && <Button size="sm" variant="outline" className="h-8 w-[120px] text-xs" onClick={e => {
                                      e.stopPropagation();
                                      handleAddAlternative(project, alt.alternative_product);
                                    }}>
                                                         <Plus className="h-3.5 w-3.5 mr-1" />
                                                         Hinzufügen
                                                       </Button>}
                                                </TableCell>;
                                } else if (column.key === 'remove') {
                                  const isAddedProduct = altStatus && altStatus !== 'Registriert';
                                  return <TableCell key={column.key} className="align-top py-3" style={{
                                    width: `${column.width}px`
                                  }}>
                                                   {isAddedProduct ? <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={e => {
                                      e.stopPropagation();
                                      handleRemoveAddedProduct(project.customer, project.project_name, alt.alternative_product, 'alternative');
                                    }}>
                                                       <X className="h-4 w-4" />
                                                     </Button> : null}
                                                 </TableCell>;
                                } else {
                                  let value: any = '-';
                                  if (altDetails) {
                                    if (column.key === 'product_price') value = altDetails.product_price ? `€ ${Number(altDetails.product_price).toFixed(2)}` : '-';
                                    if (column.key === 'product_lead_time') value = altDetails.product_lead_time ? String(Math.ceil(altDetails.product_lead_time / 7)) : '-';
                                    if (column.key === 'product_inventory') value = altDetails.product_inventory !== null && altDetails.product_inventory !== undefined ? String(altDetails.product_inventory) : '-';
                                    if (column.key === 'product_tags') {
                                      const badges = [];
                                      if (altDetails.product_lifecycle) {
                                        badges.push(<span key="lifecycle">{renderLifecycleBadge(altDetails.product_lifecycle)}</span>);
                                      }
                                      value = badges.length > 0 ? <div className="flex flex-wrap gap-0.5">{badges}</div> : '-';
                                    }
                                  }
                                  return <TableCell key={column.key} className={cn("align-top py-3", ['product_price', 'product_lead_time', 'product_inventory'].includes(column.key) ? 'text-right' : '')} style={{
                                    width: `${column.width}px`
                                  }}>
                                                   {value}
                                                 </TableCell>;
                                }
                              })}
                                       </TableRow>;
                          })}
                                </React.Fragment>;
                      })}
                          </TableBody>
                        </Table>
                      </div> : <p className="text-sm text-muted-foreground">Keine Produkte vorhanden</p>}
                  </div>

                  {/* Cross-Sells Section */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold text-base">Cross-Sell Opportunities</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={e => {
                      e.stopPropagation();
                      setCrossSellsProject(project);
                      setCrossSellSearchQuery('');
                      setCrossSellsPage(1);
                      setViewMode('crossSellsView');
                    }}>
                          <Maximize2 className="h-4 w-4 mr-2" />
                          Alles anzeigen
                        </Button>
                        <ColumnVisibilityToggle columns={crossSellColumns} onToggle={toggleCrossSellColumn} onReset={resetCrossSellColumns} />
                      </div>
                    </div>
                    <Separator className="mb-4" />
                    {(() => {
                  const projectCrossSells = getCrossSells(project.products, project.customer, project.project_name);
                  return projectCrossSells.length > 0 ? <div className="rounded-lg border">
                          <Table>
                              <TableHeader>
                                <TableRow>
                                  {visibleCrossSellColumns.map((column, index) => <ResizableTableHeader key={column.key} label={column.label} labelTooltip={column.labelTooltip} width={column.width} onResize={width => updateCrossSellColumnWidth(column.key, width)} sortable={false} draggable={true} className={['product_price', 'product_lead_time', 'product_inventory'].includes(column.key) ? 'text-right' : ''} onDragStart={() => setDraggedCrossSellIndex(index)} onDragOver={e => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                          }} onDrop={e => {
                            e.preventDefault();
                            if (draggedCrossSellIndex !== null && draggedCrossSellIndex !== index) {
                              reorderCrossSellColumns(draggedCrossSellIndex, index);
                            }
                            setDraggedCrossSellIndex(null);
                          }} onDragEnd={() => setDraggedCrossSellIndex(null)} />)}
                                  
                                </TableRow>
                              </TableHeader>
                             <TableBody>
                                 {projectCrossSells.map((cs: any, idx: number) => {
                          const details = getProductDetails(cs.cross_sell_product);
                          const alternatives = getProductAlternatives(cs.cross_sell_product);
                          const hasAlternatives = alternatives.length > 0;
                          const showAlternativesBadge = hasAddedAlternatives(project.customer, project.project_name, cs.cross_sell_product);
                          const isExpanded = expandedAlternatives[cs.cross_sell_product];
                          return <React.Fragment key={`cs-${cs.cross_sell_product}-${idx}`}>
                                      <TableRow key={idx} className="align-top">
                                          {visibleCrossSellColumns.map(column => {
                                if (column.key === 'product_info') {
                                  const detailParts = [details?.manufacturer, details?.product_family].filter(Boolean);
                                  return <TableCell key={column.key} className="p-0" style={{
                                    width: `${column.width}px`
                                  }}>
                                                 <div className="flex items-start py-2 pl-4">
                                                   <div className="flex flex-col min-w-0 flex-1">
                                                     <div className="flex items-center gap-2">
                                                      <span onClick={e => {
                                            e.stopPropagation();
                                            setSelectedProductForQuickView(details || {
                                              product: cs.cross_sell_product
                                            });
                                            setProductQuickViewOpen(true);
                                          }} className="text-xs font-semibold truncate cursor-pointer hover:underline text-foreground">
                                                         {cs.cross_sell_product}
                                                       </span>
                                                       {hasAlternatives && <Replace className={`h-4 w-4 text-primary cursor-pointer transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} onClick={e => {
                                            e.stopPropagation();
                                            toggleAlternatives(cs.cross_sell_product);
                                          }} />}
                                                     </div>
                                                     {detailParts.length > 0 && <span className="text-2xs text-muted-foreground truncate">
                                                         {detailParts.join(' • ')}
                                                       </span>}
                                                     {details?.product_description && <span className="text-2xs text-muted-foreground truncate">
                                                         {truncateText(details.product_description, 60)}
                                                       </span>}
                                                   </div>
                                                 </div>
                                               </TableCell>;
                                }
                                if (column.key === 'rec_score') {
                                  return <TableCell key={column.key} className="align-middle py-3 text-center" style={{
                                    width: `${column.width}px`
                                  }}>
                                    <RecommendationScoreBar score={cs.rec_score} />
                                  </TableCell>;
                                }
                                if (column.key === 'action') {
                                  return <TableCell key={column.key} className="align-top py-3" style={{
                                    width: `${column.width}px`
                                  }}>
                                                <Button size="sm" variant="outline" className="h-8 w-[120px] text-xs" onClick={e => {
                                      e.stopPropagation();
                                      handleAddCrossSell(project, cs.cross_sell_product);
                                    }}>
                                                  <Plus className="h-3.5 w-3.5 mr-1" />
                                                  Hinzufügen
                                                </Button>
                                              </TableCell>;
                                }
                                if (column.key === 'remove') {
                                  return <TableCell key={column.key} className="align-top py-3" style={{
                                    width: `${column.width}px`
                                  }} onClick={e => e.stopPropagation()}>
                                                <DropdownMenu>
                                                  <DropdownMenuTrigger asChild>
                                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setSelectedCrossSellForRemoval({
                                          project,
                                          crossSellProduct: cs.cross_sell_product
                                        })}>
                                                      <ThumbsDown className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                  </DropdownMenuTrigger>
                                                  <DropdownMenuContent side="left" align="end" sideOffset={6} onClick={e => e.stopPropagation()}>
                                                    <DropdownMenuItem onSelect={() => handleConfirmRemoval('technischer_fit', {
                                          project,
                                          crossSellProduct: cs.cross_sell_product
                                        })}>Technischer Fit</DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={() => handleConfirmRemoval('commercial_fit', {
                                          project,
                                          crossSellProduct: cs.cross_sell_product
                                        })}>Commercial Fit</DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={() => handleConfirmRemoval('anderer_lieferant', {
                                          project,
                                          crossSellProduct: cs.cross_sell_product
                                        })}>Anderer Lieferant</DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={() => handleConfirmRemoval('kein_bedarf', {
                                          project,
                                          crossSellProduct: cs.cross_sell_product
                                        })}>Kein Bedarf</DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={() => handleConfirmRemoval('sonstige', {
                                          project,
                                          crossSellProduct: cs.cross_sell_product
                                        })}>Sonstige</DropdownMenuItem>
                                                  </DropdownMenuContent>
                                                </DropdownMenu>
                                              </TableCell>;
                                }

                                // Default details columns
                                let value: any = '-';
                                if (details) {
                                  if (column.key === 'product_price') value = details.product_price ? `€ ${Number(details.product_price).toFixed(2)}` : '-';
                                  if (column.key === 'product_lead_time') value = details.product_lead_time ? String(Math.ceil(details.product_lead_time / 7)) : '-';
                                  if (column.key === 'product_inventory') value = details.product_inventory !== null && details.product_inventory !== undefined ? String(details.product_inventory) : '-';
                                  if (column.key === 'product_tags') {
                                    const badges = [];
                                    if (details.product_lifecycle) {
                                      badges.push(<span key="lifecycle">{renderLifecycleBadge(details.product_lifecycle)}</span>);
                                    }
                                    if (details.product_new === 'Y') {
                                      badges.push(<span key="new">{renderNeuBadge()}</span>);
                                    }
                                    if (details.product_top === 'Y') {
                                      badges.push(<span key="top">{renderTopBadge()}</span>);
                                    }
                                    value = badges.length > 0 ? <div className="flex flex-wrap gap-1">{badges}</div> : '-';
                                  }
                                }
                                return <TableCell key={column.key} className={cn("align-top py-3", ['product_price', 'product_lead_time', 'product_inventory'].includes(column.key) ? 'text-right' : '')} style={{
                                  width: `${column.width}px`
                                }}>
                                               {value}
                                             </TableCell>;
                              })}
                                     </TableRow>
                                     
                                     {/* Alternative Products for Cross-Sells - Expandable */}
                                     {hasAlternatives && isExpanded && alternatives.map((alt: any, altIdx: number) => {
                              const altDetails = getProductDetails(alt.alternative_product);
                              const altStatus = getOptimizationStatus(project.customer, project.project_name, alt.alternative_product, 'alternative');
                              const isAlreadyInProject = projects?.some((p: any) => p.customer === project.customer && p.project_name === project.project_name && p.product === alt.alternative_product) || false;
                              const altDetailParts = [altDetails?.manufacturer, altDetails?.product_family].filter(Boolean);
                              return <TableRow key={`cs-alt-${idx}-${altIdx}`} className="bg-muted/70 align-top">
                                           {visibleCrossSellColumns.map(column => {
                                  if (column.key === 'product_info') {
                                    return <TableCell key={column.key} className="p-0" style={{
                                      width: `${column.width}px`
                                    }}>
                                                   <div className="flex items-start py-2 pl-8">
                                                     <div className="flex flex-col min-w-0 flex-1">
                                                       <div className="flex items-center gap-2">
                                                         <span className="text-muted-foreground text-xs">↳</span>
                                                         <span onClick={e => {
                                              e.stopPropagation();
                                              setSelectedProductForQuickView(altDetails || {
                                                product: alt.alternative_product
                                              });
                                              setProductQuickViewOpen(true);
                                            }} className="text-xs font-semibold truncate cursor-pointer hover:underline text-foreground">
                                                           {alt.alternative_product}
                                                         </span>
                                                         {alt.similarity && <Badge variant="secondary" className="text-xs flex-shrink-0">
                                                             {alt.similarity}%
                                                           </Badge>}
                                                       </div>
                                                       {altDetailParts.length > 0 && <span className="text-2xs text-muted-foreground truncate">
                                                           {altDetailParts.join(' • ')}
                                                         </span>}
                                                       {altDetails?.product_description && <span className="text-2xs text-muted-foreground truncate">
                                                           {truncateText(altDetails.product_description, 60)}
                                                         </span>}
                                                     </div>
                                                   </div>
                                                 </TableCell>;
                                  } else if (column.key === 'action') {
                                    return <TableCell key={column.key} className="align-top py-3" style={{
                                      width: `${column.width}px`
                                    }}>
                                                   {isAlreadyInProject && altStatus ? <Select value={altStatus} disabled={altStatus === 'Registriert'} onValueChange={newStatus => handleUpdateCrossSellStatus(project.customer, project.project_name, alt.alternative_product, newStatus, 'alternative')}>
                                                       <SelectTrigger className="h-8 w-[120px] text-xs border border-input bg-background" onClick={e => e.stopPropagation()}>
                                                         <SelectValue />
                                                       </SelectTrigger>
                                                        <SelectContent>
                                                          <SelectItem value="Identifiziert">Identifiziert</SelectItem>
                                                          <SelectItem value="Vorgeschlagen">Vorgeschlagen</SelectItem>
                                                          <SelectItem value="Akzeptiert">Akzeptiert</SelectItem>
                                                          <SelectItem value="Registriert">Registriert</SelectItem>
                                                          <SelectItem value="Abgelehnt">Abgelehnt</SelectItem>
                                                        </SelectContent>
                                                     </Select> : <Button size="sm" variant="outline" className="h-8 w-[120px] text-xs" onClick={e => {
                                        e.stopPropagation();
                                        handleAddAlternative(project, alt.alternative_product);
                                      }}>
                                                        <Plus className="h-3.5 w-3.5 mr-1" />
                                                        Hinzufügen
                                                      </Button>}
                                                 </TableCell>;
                                  } else {
                                    let value: any = '-';
                                    if (altDetails) {
                                      if (column.key === 'product_price') value = altDetails.product_price ? `€ ${Number(altDetails.product_price).toFixed(2)}` : '-';
                                      if (column.key === 'product_lead_time') value = altDetails.product_lead_time ? String(Math.ceil(altDetails.product_lead_time / 7)) : '-';
                                      if (column.key === 'product_inventory') value = altDetails.product_inventory !== null && altDetails.product_inventory !== undefined ? String(altDetails.product_inventory) : '-';
                                      if (column.key === 'product_tags') {
                                        const badges = [];
                                        if (altDetails.product_lifecycle) {
                                          badges.push(<Badge key="lifecycle" variant={altDetails.product_lifecycle === 'Active' ? 'default' : altDetails.product_lifecycle === 'Coming Soon' ? 'secondary' : altDetails.product_lifecycle === 'NFND' ? 'outline' : 'destructive'} className="text-xs">
                                                          {altDetails.product_lifecycle}
                                                        </Badge>);
                                        }
                                        value = badges.length > 0 ? <div className="flex flex-wrap gap-1">{badges}</div> : '-';
                                      }
                                    }
                                    return <TableCell key={column.key} className={cn("align-top py-3", ['product_price', 'product_lead_time', 'product_inventory'].includes(column.key) ? 'text-right' : '')} style={{
                                      width: `${column.width}px`
                                    }}>
                                                   {value}
                                                 </TableCell>;
                                  }
                                })}
                                         </TableRow>;
                            })}
                                   </React.Fragment>;
                        })}
                             </TableBody>
                          </Table>
                        </div> : <p className="text-sm text-muted-foreground">Keine Cross-Sells verfügbar</p>;
                })()}
                  </div>
                </div>
              </CardContent>
            </Card>)}
        </div>

        {/* Product Quick View Sheet */}
        <Sheet open={productQuickViewOpen} onOpenChange={setProductQuickViewOpen}>
          <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto">
            <SheetHeader>
              <Breadcrumb className="mb-4">
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink className="cursor-pointer" onClick={() => setProductQuickViewOpen(false)}>
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
            {selectedProductForQuickView && <div className="mt-6 space-y-6">
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
                  {selectedProductForQuickView.product_lifecycle ? renderLifecycleBadge(selectedProductForQuickView.product_lifecycle) : <p className="text-base">-</p>}
                </div>

                {(selectedProductForQuickView.product_new === 'Y' || selectedProductForQuickView.product_top === 'Y') && <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Produkt-Tags</h3>
                    <div className="flex gap-2">
                      {selectedProductForQuickView.product_new === 'Y' && renderNeuBadge()}
                      {selectedProductForQuickView.product_top === 'Y' && renderTopBadge('Top Seller')}
                    </div>
                  </div>}

                {selectedProductForQuickView.manufacturer_link && <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Hersteller-Link</h3>
                    <a href={ensureUrlProtocol(selectedProductForQuickView.manufacturer_link)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline">
                      <Package className="h-4 w-4" />
                      Zur Website
                    </a>
                  </div>}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Beschreibung</h3>
                  <p className="text-base leading-relaxed">
                    {selectedProductForQuickView.product_description || 'Keine Beschreibung verfügbar'}
                  </p>
                </div>
              </div>}
          </SheetContent>
        </Sheet>
      </div>;
  }

  // Cross-Sells Full View as Page
  if (viewMode === 'crossSellsView' && crossSellsProject) {
    const allCrossSells = getCrossSells(crossSellsProject.products, crossSellsProject.customer, crossSellsProject.project_name);

    // Filter by search
    const filteredCrossSells = allCrossSells.filter((cs: any) => {
      if (!crossSellSearchQuery || crossSellSearchQuery.length < 2) return true;
      const details = getProductDetails(cs.cross_sell_product);
      const searchLower = crossSellSearchQuery.toLowerCase();
      return cs.cross_sell_product?.toLowerCase().includes(searchLower) || details?.manufacturer?.toLowerCase().includes(searchLower) || details?.product_family?.toLowerCase().includes(searchLower) || details?.product_description?.toLowerCase().includes(searchLower) || cs.rec_source?.toLowerCase().includes(searchLower);
    });

    // Pagination
    const totalCrossSells = filteredCrossSells.length;
    const totalCrossSellPages = Math.ceil(totalCrossSells / crossSellsPerPage);
    const crossSellStartIndex = (crossSellsPage - 1) * crossSellsPerPage;
    const crossSellEndIndex = crossSellStartIndex + crossSellsPerPage;
    const paginatedCrossSells = filteredCrossSells.slice(crossSellStartIndex, crossSellEndIndex);

    // Visible columns for cross-sells view
    const visibleCrossSellViewColumns = crossSellViewColumns.filter((col: any) => col.visible).sort((a: any, b: any) => a.order - b.order);
    return <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Projekte / {crossSellsProject.project_name}
            </p>
            <h1 className="text-3xl font-medium text-foreground font-clash">Cross Sells</h1>
          </div>
          <Button variant="ghost" onClick={() => {
          setViewMode('detail');
          setCrossSellsProject(null);
        }}>
            <X className="h-4 w-4 mr-2" />
            Schließen
          </Button>
        </div>

        {/* Card with Table */}
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Suchen..." className="pl-10 bg-muted/50" value={crossSellSearchQuery} onChange={e => {
                setCrossSellSearchQuery(e.target.value);
                setCrossSellsPage(1);
              }} />
              </div>
              <div className="flex items-center gap-2">
                <ColumnVisibilityToggle columns={crossSellViewColumns} onToggle={toggleCrossSellViewColumn} onReset={resetCrossSellViewColumns} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  {visibleCrossSellViewColumns.map((col: any, colIdx: number) => <ResizableTableHeader key={col.key} label={col.label} labelTooltip={col.labelTooltip} width={col.width} onResize={w => updateCrossSellViewColumnWidth(col.key, w)} draggable={true} onDragStart={() => setCrossSellViewDraggedIndex(colIdx)} onDragEnd={() => {
                  setCrossSellViewDraggedIndex(null);
                }} onDragOver={e => {
                  e.preventDefault();
                  if (crossSellViewDraggedIndex !== null && crossSellViewDraggedIndex !== colIdx) {
                    reorderCrossSellViewColumns(crossSellViewDraggedIndex, colIdx);
                    setCrossSellViewDraggedIndex(colIdx);
                  }
                }} />)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCrossSells.map((cs: any, idx: number) => {
                const details = getProductDetails(cs.cross_sell_product);
                return <TableRow key={`crosssellsview-cs-${cs.cross_sell_product}-${idx}`}>
                      {visibleCrossSellViewColumns.map((col: any) => {
                    switch (col.key) {
                      case 'product':
                        return <TableCell key={col.key} className="py-3 pl-4" style={{
                          width: col.width
                        }}>
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-xs font-semibold text-foreground hover:underline cursor-pointer" onClick={() => {
                              setSelectedProductForQuickView(details || {
                                product: cs.cross_sell_product
                              });
                              setProductQuickViewOpen(true);
                            }}>
                                    {cs.cross_sell_product}
                                  </span>
                                  <span className="text-2xs text-muted-foreground">
                                    {[details?.manufacturer, details?.product_family].filter(Boolean).join(' • ') || '-'}
                                  </span>
                                  {details?.product_description && <span className="text-2xs text-muted-foreground truncate max-w-[250px]">
                                      {truncateText(details.product_description, 60)}
                                    </span>}
                                </div>
                              </TableCell>;
                      case 'product_tags':
                        return <TableCell key={col.key} className="py-3" style={{
                          width: col.width
                        }}>
                                <div className="flex flex-wrap gap-1">
                                  {details?.product_lifecycle && renderLifecycleBadge(details.product_lifecycle)}
                                  {details?.product_new === 'Y' && renderNeuBadge()}
                                  {details?.product_top === 'Y' && renderTopBadge()}
                                </div>
                              </TableCell>;
                      case 'product_price':
                        return <TableCell key={col.key} className="py-3 text-xs text-right" style={{
                          width: col.width
                        }}>
                                {details?.product_price ? `${Number(details.product_price).toFixed(2)} €` : '-'}
                              </TableCell>;
                      case 'product_lead_time':
                        return <TableCell key={col.key} className="py-3 text-xs text-right" style={{
                          width: col.width
                        }}>
                                {details?.product_lead_time ? `${details.product_lead_time}` : '-'}
                              </TableCell>;
                      case 'product_inventory':
                        return <TableCell key={col.key} className="py-3 text-xs text-right" style={{
                          width: col.width
                        }}>
                                {details?.product_inventory ?? '-'}
                              </TableCell>;
                      case 'rec_source':
                        return <TableCell key={col.key} className="py-3" style={{
                          width: col.width
                        }}>
                                {cs.rec_source ? <Badge variant="secondary" className="bg-muted border-border text-muted-foreground text-xs">
                                    {cs.rec_source}
                                  </Badge> : '-'}
                              </TableCell>;
                      case 'rec_score':
                        return <TableCell key={col.key} className="py-3 text-center align-middle" style={{
                          width: col.width
                        }}>
                                <RecommendationScoreBar score={cs.rec_score} />
                              </TableCell>;
                      case 'actions':
                        return <TableCell key={col.key} className="py-3" style={{
                          width: col.width
                        }}>
                                <div className="flex items-center gap-1">
                                  <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => handleAddCrossSell(crossSellsProject, cs.cross_sell_product)} title="Hinzufügen">
                                    <Plus className="h-3.5 w-3.5" />
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Ablehnen">
                                        <ThumbsDown className="h-3.5 w-3.5 text-destructive" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent side="left" align="end">
                                      <DropdownMenuItem onSelect={() => handleConfirmRemoval('technischer_fit', {
                                  project: crossSellsProject,
                                  crossSellProduct: cs.cross_sell_product
                                })}>
                                        Technischer Fit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onSelect={() => handleConfirmRemoval('commercial_fit', {
                                  project: crossSellsProject,
                                  crossSellProduct: cs.cross_sell_product
                                })}>
                                        Commercial Fit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onSelect={() => handleConfirmRemoval('anderer_lieferant', {
                                  project: crossSellsProject,
                                  crossSellProduct: cs.cross_sell_product
                                })}>
                                        Anderer Lieferant
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onSelect={() => handleConfirmRemoval('kein_bedarf', {
                                  project: crossSellsProject,
                                  crossSellProduct: cs.cross_sell_product
                                })}>
                                        Kein Bedarf
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onSelect={() => handleConfirmRemoval('sonstige', {
                                  project: crossSellsProject,
                                  crossSellProduct: cs.cross_sell_product
                                })}>
                                        Sonstige
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </TableCell>;
                      default:
                        return <TableCell key={col.key} style={{
                          width: col.width
                        }}>-</TableCell>;
                    }
                  })}
                    </TableRow>;
              })}
              </TableBody>
            </Table>

            {/* Pagination Footer */}
            <div className="flex items-center justify-between py-4 mt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {totalCrossSells > 0 ? `${crossSellStartIndex + 1}-${Math.min(crossSellEndIndex, totalCrossSells)} von ${totalCrossSells} Ergebnissen` : '0 Ergebnisse'}
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Ergebnisse pro Seite:</span>
                  <Select value={crossSellsPerPage.toString()} onValueChange={val => {
                  setCrossSellsPerPage(Number(val));
                  setCrossSellsPage(1);
                }}>
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
                  <Button variant="outline" size="sm" onClick={() => setCrossSellsPage(p => Math.max(1, p - 1))} disabled={crossSellsPage === 1} className="h-8 px-3">
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Zurück
                  </Button>
                  <div className="flex items-center gap-1 mx-2">
                    {Array.from({
                    length: Math.min(5, totalCrossSellPages)
                  }, (_, i) => {
                    let pageNum;
                    if (totalCrossSellPages <= 5) {
                      pageNum = i + 1;
                    } else if (crossSellsPage <= 3) {
                      pageNum = i + 1;
                    } else if (crossSellsPage >= totalCrossSellPages - 2) {
                      pageNum = totalCrossSellPages - 4 + i;
                    } else {
                      pageNum = crossSellsPage - 2 + i;
                    }
                    return <Button key={pageNum} variant={crossSellsPage === pageNum ? "default" : "outline"} size="sm" onClick={() => setCrossSellsPage(pageNum)} className="h-8 w-8 p-0">
                          {pageNum}
                        </Button>;
                  })}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setCrossSellsPage(p => Math.min(totalCrossSellPages, p + 1))} disabled={crossSellsPage === totalCrossSellPages || totalCrossSellPages === 0} className="h-8 px-3">
                    Weiter
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Product Quick View Sheet */}
        <Sheet open={productQuickViewOpen} onOpenChange={setProductQuickViewOpen}>
          <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto">
            <SheetHeader>
              <Breadcrumb className="mb-4">
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink className="cursor-pointer" onClick={() => setProductQuickViewOpen(false)}>
                      Cross Sells
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
            {selectedProductForQuickView && <div className="mt-6 space-y-6">
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
                  {selectedProductForQuickView.product_lifecycle ? renderLifecycleBadge(selectedProductForQuickView.product_lifecycle) : <p className="text-base">-</p>}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Beschreibung</h3>
                  <p className="text-base leading-relaxed">
                    {selectedProductForQuickView.product_description || 'Keine Beschreibung verfügbar'}
                  </p>
                </div>
              </div>}
          </SheetContent>
        </Sheet>

        {/* Removal Reason Modal */}
        {removalDialogOpen && <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
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
          </div>}
      </div>;
  }
  return <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-medium text-foreground font-clash">Projekte</h1>
        </div>
      </div>

      {/* Projects Table */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Projektname, Kunde, Applikation oder Produkt suchen..." className="pl-10" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="mr-2 h-4 w-4" />
                    Filter
                    {(quickFilter !== 'all' || statusFilter) && <Badge variant="secondary" className="ml-2 h-5 px-1 text-xs">
                        {(quickFilter !== 'all' ? 1 : 0) + (statusFilter ? 1 : 0)}
                      </Badge>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64" align="end">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Filter</h4>
                      <p className="text-sm text-muted-foreground">Projekte nach Kriterien filtern</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Ansicht</Label>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={quickFilter === 'favorites' ? 'default' : 'outline'} className="cursor-pointer text-xs" onClick={() => {
                        setQuickFilter(quickFilter === 'favorites' ? 'all' : 'favorites');
                        setStatusFilter(null);
                      }}>
                          <Star className={`mr-1 h-3 w-3 ${quickFilter === 'favorites' ? 'fill-current' : ''}`} />
                          Favoriten
                        </Badge>
                        <Badge variant={quickFilter === 'recent' ? 'default' : 'outline'} className="cursor-pointer text-xs" onClick={() => {
                        setQuickFilter(quickFilter === 'recent' ? 'all' : 'recent');
                        setStatusFilter(null);
                      }}>
                          Zuletzt angesehen
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Status</Label>
                      <div className="flex flex-wrap gap-2">
                        {['Neu', 'Offen', 'Prüfung', 'Validierung', 'Abgeschlossen'].map(status => <Badge key={status} variant={statusFilter === status ? 'default' : 'outline'} className="cursor-pointer text-xs" onClick={() => {
                        setStatusFilter(statusFilter === status ? null : status);
                        setQuickFilter('all');
                      }}>
                            {status}
                          </Badge>)}
                      </div>
                    </div>

                    {(quickFilter !== 'all' || statusFilter) && <Button variant="ghost" size="sm" className="w-full" onClick={() => {
                    setQuickFilter('all');
                    setStatusFilter(null);
                  }}>
                        Alle Filter zurücksetzen
                      </Button>}
                  </div>
                </PopoverContent>
              </Popover>
              <ColumnVisibilityToggle columns={columns} onToggle={toggleColumn} onReset={resetColumns} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div> : paginatedProjects && paginatedProjects.length > 0 ? <>
            <Table>
              <TableHeader>
                <TableRow>
                  <th className="w-12"></th>
                  {visibleColumns.map((column, index) => <ResizableTableHeader key={column.key} label={column.label} width={column.width} onResize={width => updateColumnWidth(column.key, width)} sortable={true} sortDirection={sortField === column.key ? sortDirection : null} onSort={() => handleSort(column.key as SortField)} draggable={true} onDragStart={() => setDraggedIndex(index)} onDragOver={e => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }} onDrop={e => {
                  e.preventDefault();
                  if (draggedIndex !== null && draggedIndex !== index) {
                    reorderColumns(draggedIndex, index);
                  }
                  setDraggedIndex(null);
                }} onDragEnd={() => setDraggedIndex(null)} />)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProjects.map((project: any) => {
                return <TableRow key={project.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleRowClick(project)}>
                    <TableCell className="w-12">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={e => {
                      e.stopPropagation();
                      const targetId = project.sourceIds?.[0] || project.id;
                      toggleFavorite(targetId);
                    }}>
                        <Star className={`h-4 w-4 ${project.sourceIds?.some((sourceId: string) => isFavorite(sourceId)) || isFavorite(project.id) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                      </Button>
                    </TableCell>
                    {visibleColumns.map(column => {
                    let value;
                    if (column.key === 'applications') {
                      value = null; // Will be handled separately
                    } else if (column.key === 'products') {
                      value = null; // Will be handled separately
                    } else if (column.key === 'optimization_status') {
                      value = null; // Will be handled separately
                    } else if (column.key === 'created_at') {
                      value = project.created_at ? format(new Date(project.created_at), 'dd.MM.yyyy') : '-';
                    } else if (column.key === 'updated_at') {
                      value = project.updated_at ? format(new Date(project.updated_at), 'dd.MM.yyyy') : '-';
                    } else {
                      value = project[column.key];
                    }
                    return <TableCell key={column.key} className={column.key === 'project_name' ? 'font-medium' : ''} style={{
                      width: `${column.width}px`
                    }} onClick={e => {
                      if (column.key === 'customer') {
                        e.stopPropagation();
                        handleCustomerClick(project.customer);
                      }
                    }}>
                          {column.key === 'customer' ? <span className="text-foreground hover:underline cursor-pointer">
                              {value}
                            </span> : column.key === 'applications' ? <div className="flex flex-wrap gap-1">
                              {project.applications.length > 0 ? project.applications.map((appName: string, idx: number) => <span key={idx} className="text-foreground hover:underline cursor-pointer text-sm" onClick={e => {
                          e.stopPropagation();
                          setSelectedApplicationForQuickView(appName);
                          setApplicationQuickViewOpen(true);
                        }}>
                                    {appName}
                                    {idx < project.applications.length - 1 && ', '}
                                  </span>) : '-'}
                            </div> : column.key === 'products' ? <div className="flex flex-wrap gap-1">
                              {project.products.length > 0 ? project.products.map((productName: string, idx: number) => <span key={idx} className="text-foreground hover:underline cursor-pointer text-sm" onClick={e => {
                          e.stopPropagation();
                          const details = getProductDetails(productName);
                          setSelectedProductForQuickView(details || {
                            product: productName
                          });
                          setProductQuickViewOpen(true);
                        }}>
                                    {productName}
                                    {idx < project.products.length - 1 && ', '}
                                  </span>) : '-'}
                            </div> : column.key === 'optimization_status' ? <StatusBadge status={calculateProjectStatus(project, false)} /> : value}
                        </TableCell>;
                  })}
                  </TableRow>;
              })}
              </TableBody>
            </Table>
            {/* Pagination Footer */}
            <div className="border-t pt-4 mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {totalProjectItems > 0 ? `${projectStartIndex + 1}-${Math.min(projectEndIndex, totalProjectItems)} von ${totalProjectItems} Ergebnissen` : '0 Ergebnisse'}
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Ergebnisse pro Seite:</span>
                  <Select value={itemsPerPage.toString()} onValueChange={val => {
                  setItemsPerPage(Number(val));
                  setCurrentPage(1);
                }}>
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
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-8 px-3">
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Zurück
                  </Button>
                  <div className="flex items-center gap-1 mx-2">
                    {Array.from({
                    length: Math.min(5, totalProjectPages)
                  }, (_, i) => {
                    let pageNum;
                    if (totalProjectPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalProjectPages - 2) {
                      pageNum = totalProjectPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return <Button key={pageNum} variant={currentPage === pageNum ? "default" : "outline"} size="sm" onClick={() => setCurrentPage(pageNum)} className="h-8 w-8 p-0">
                          {pageNum}
                        </Button>;
                  })}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalProjectPages, p + 1))} disabled={currentPage === totalProjectPages || totalProjectPages === 0} className="h-8 px-3">
                    Weiter
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
            </> : <div className="p-8 text-center text-muted-foreground">
              {searchQuery.length >= 2 ? 'Keine Projekte gefunden.' : 'Keine Projekte vorhanden. Laden Sie Projektdaten im Datenhub hoch.'}
            </div>}
        </CardContent>
      </Card>

      {/* Project Details Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedProject?.project_name}</SheetTitle>
            <SheetDescription>Projektdetails und Informationen</SheetDescription>
          </SheetHeader>
          
          {selectedProject && <div className="mt-6 space-y-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Kunde</h3>
                <p className="text-base font-semibold">{selectedProject.customer}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Applikationen</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedProject.applications && selectedProject.applications.length > 0 ? selectedProject.applications.map((app: string, index: number) => <Badge key={index} variant="secondary" className="cursor-pointer hover:bg-secondary/80" onClick={() => {
                setSelectedApplicationForQuickView(app);
                setApplicationQuickViewOpen(true);
              }}>
                        {app}
                      </Badge>) : <span className="text-sm text-muted-foreground">Keine Applikationen</span>}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Produkte</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedProject.products && selectedProject.products.length > 0 ? selectedProject.products.map((prod: string, index: number) => <Badge key={index} variant="outline">{prod}</Badge>) : <span className="text-sm text-muted-foreground">Keine Produkte</span>}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Erstellt am</h3>
                <p className="text-base">
                  {selectedProject.created_at ? format(new Date(selectedProject.created_at), 'dd.MM.yyyy') : '-'}
                </p>
              </div>
            </div>}
        </SheetContent>
      </Sheet>

      {/* Product Quick View Sheet */}
      <Sheet open={productQuickViewOpen} onOpenChange={setProductQuickViewOpen}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <Breadcrumb className="mb-4">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink className="cursor-pointer" onClick={() => {
                  setProductQuickViewOpen(false);
                  // Optionally reopen project sheet if needed
                  if (selectedProject) {
                    setIsSheetOpen(true);
                  }
                }}>
                    Projekte
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {selectedProject && <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbLink className="cursor-pointer" onClick={() => {
                    setProductQuickViewOpen(false);
                    setIsSheetOpen(true);
                  }}>
                        {selectedProject.project_name}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                  </>}
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{selectedProductForQuickView?.product}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <SheetTitle>{selectedProductForQuickView?.product}</SheetTitle>
            <SheetDescription>Produktdetails und Spezifikationen</SheetDescription>
          </SheetHeader>
          
          {selectedProductForQuickView && <div className="mt-6 space-y-6">
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
                {selectedProductForQuickView.product_lifecycle ? renderLifecycleBadge(selectedProductForQuickView.product_lifecycle) : <p className="text-base">-</p>}
              </div>

              {(selectedProductForQuickView.product_new === 'Y' || selectedProductForQuickView.product_top === 'Y') && <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Produkt-Tags</h3>
                  <div className="flex gap-2">
                    {selectedProductForQuickView.product_new === 'Y' && renderNeuBadge()}
                    {selectedProductForQuickView.product_top === 'Y' && renderTopBadge('Top Seller')}
                  </div>
                </div>}

              {selectedProductForQuickView.manufacturer_link && <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Hersteller-Link</h3>
                  <a href={selectedProductForQuickView.manufacturer_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline">
                    <Package className="h-4 w-4" />
                    Zur Website
                  </a>
                </div>}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Preis
                    <br />
                    <span className="text-xs font-normal">(in €/pcs)</span>
                  </h3>
                  <p className="text-base font-semibold">
                    {selectedProductForQuickView.product_price ? `€ ${Number(selectedProductForQuickView.product_price).toFixed(2)}` : '-'}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Lieferzeit
                    <br />
                    <span className="text-xs font-normal">(in Wochen)</span>
                  </h3>
                  <p className="text-base font-semibold">
                    {selectedProductForQuickView.product_lead_time ? String(Math.ceil(selectedProductForQuickView.product_lead_time / 7)) : '-'}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Lagerbestand
                    <br />
                    <span className="text-xs font-normal">(in pcs)</span>
                  </h3>
                  <p className="text-base font-semibold">
                    {selectedProductForQuickView.product_inventory !== null && selectedProductForQuickView.product_inventory !== undefined ? selectedProductForQuickView.product_inventory.toString() : '-'}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Beschreibung</h3>
                <p className="text-base leading-relaxed">
                  {selectedProductForQuickView.product_description || 'Keine Beschreibung verfügbar'}
                </p>
              </div>
            </div>}
        </SheetContent>
      </Sheet>

      {/* Application Quick View Sheet */}
      <Sheet open={applicationQuickViewOpen} onOpenChange={open => {
      console.log('📝 Sheet onOpenChange:', open);
      setApplicationQuickViewOpen(open);
    }}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto z-[2000]">
          <SheetHeader>
            <Breadcrumb className="mb-4">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink className="cursor-pointer" onClick={() => {
                  setApplicationQuickViewOpen(false);
                }}>
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
          {appInsightsLoading ? <div className="mt-6 space-y-6">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-24 w-full" />
            </div> : selectedApplicationForQuickView ? (() => {
          // Try exact match first, then case-insensitive match, then partial match
          const appData = appInsights.find((app: any) => app.application === selectedApplicationForQuickView || app.application?.toLowerCase() === selectedApplicationForQuickView?.toLowerCase() || app.application?.toLowerCase().includes(selectedApplicationForQuickView?.toLowerCase()) || selectedApplicationForQuickView?.toLowerCase().includes(app.application?.toLowerCase()));
          console.log('🔍 Searching for application:', selectedApplicationForQuickView);
          console.log('📊 Available applications:', appInsights.map((a: any) => a.application));
          console.log('✅ Found app data:', appData);
          return appData ? <div className="mt-6 space-y-6">
                {appData.industry && <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Industrie</h3>
                    <Badge variant="secondary">{appData.industry}</Badge>
                  </div>}

                {appData.application_description && <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Beschreibung</h3>
                    <p className="text-base leading-relaxed">
                      {appData.application_description}
                    </p>
                  </div>}

                {appData.application_trends && <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Trends</h3>
                    <p className="text-base leading-relaxed">
                      {appData.application_trends}
                    </p>
                  </div>}

                {(appData.product_family_1 || appData.product_family_2 || appData.product_family_3 || appData.product_family_4 || appData.product_family_5) && <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Product Families</h3>
                    <div className="flex flex-wrap gap-2">
                      {appData.product_family_1 && <Badge variant="outline">#{1} {appData.product_family_1}</Badge>}
                      {appData.product_family_2 && <Badge variant="outline">#{2} {appData.product_family_2}</Badge>}
                      {appData.product_family_3 && <Badge variant="outline">#{3} {appData.product_family_3}</Badge>}
                      {appData.product_family_4 && <Badge variant="outline">#{4} {appData.product_family_4}</Badge>}
                      {appData.product_family_5 && <Badge variant="outline">#{5} {appData.product_family_5}</Badge>}
                    </div>
                  </div>}

                {appData.application_block_diagram && <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Blockdiagramm</h3>
                    <BlockDiagramViewer content={appData.application_block_diagram} />
                  </div>}
              </div> : <div className="mt-6 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Keine detaillierten Informationen für diese Applikation verfügbar.
                </p>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    <strong>Gesuchte Applikation:</strong> {selectedApplicationForQuickView}
                  </p>
                  {appInsights.length > 0 && <p className="text-xs text-muted-foreground mt-2">
                      <strong>Verfügbare Applikationen:</strong> {appInsights.length}
                    </p>}
                </div>
              </div>;
        })() : <div className="mt-6">
              <p className="text-sm text-muted-foreground">
                Keine Applikation ausgewählt.
              </p>
            </div>}
        </SheetContent>
      </Sheet>

      {/* Removal Reason Modal (custom fallback to ensure visibility) */}
      {removalDialogOpen && <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
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
        </div>}

      {/* Undo Modal - 4 seconds */}
      {undoModalOpen && <div className="fixed bottom-6 right-6 z-[99999] animate-fade-in" style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px'
    }}>
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
        </div>}

    </div>;
}