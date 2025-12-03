import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { BarChart3, PieChart, TrendingUp, FileText, ThumbsDown, RotateCcw, Search, Download } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type ReportView = 'overview' | 'rejected-cross-sells' | 'added-products';

const removalReasonLabels: Record<string, string> = {
  'technischer_fit': 'Technischer Fit',
  'commercial_fit': 'Commercial Fit',
  'anderer_lieferant': 'Anderer Lieferant',
  'kein_bedarf': 'Kein Bedarf',
  'sonstige': 'Sonstige',
};

export default function Reports() {
  const { t } = useLanguage();
  const { user, activeTenant, isSuperAdmin } = useAuth();
  const [currentView, setCurrentView] = useState<ReportView>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [productTypeFilter, setProductTypeFilter] = useState<string>('all');
  const [validationStatusFilter, setValidationStatusFilter] = useState<string>('all');
  const [productFamilyFilterRejected, setProductFamilyFilterRejected] = useState<string>('all');
  const [removalReasonFilter, setRemovalReasonFilter] = useState<string>('all');
  const queryClient = useQueryClient();

  const reportCards = [
    {
      id: 'rejected-cross-sells' as ReportView,
      title: 'Abgelehnte Cross-Sells',
      description: 'Übersicht aller abgelehnten Cross-Sell Produkte',
      icon: ThumbsDown,
      color: 'text-red-500',
    },
    {
      id: 'added-products' as ReportView,
      title: 'Ergänzte Produkte',
      description: 'Alle zu Projekten hinzugefügten Cross-Sells und Alternativen',
      icon: BarChart3,
      color: 'text-blue-500',
    },
  ];

  // Fetch removed cross-sells
  const { data: removedCrossSells = [], isLoading } = useQuery({
    queryKey: ['removed_cross_sells', activeTenant?.id],
    queryFn: async () => {
      if (!activeTenant?.id) return [];
      
      // Note: removed_cross_sells doesn't have tenant_id, so we show all for now
      const { data, error } = await supabase
        .from('removed_cross_sells')
        .select('*')
        .order('removed_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!activeTenant?.id,
  });

  // Fetch added products (opps_optimization)
  const { data: addedProducts = [], isLoading: isLoadingAdded } = useQuery({
    queryKey: ['opps_optimization', activeTenant?.id],
    queryFn: async () => {
      if (!activeTenant?.id) return [];
      
      let query = supabase
        .from('opps_optimization')
        .select('*');
      
      // Filter by tenant: if global, show all tenant data; otherwise filter by specific tenant
      if (activeTenant.id === 'global') {
        query = query.not('tenant_id', 'is', null);
      } else {
        query = query.eq('tenant_id', activeTenant.id);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!activeTenant?.id,
  });

  // Fetch customer projects for joining
  const { data: customerProjects = [] } = useQuery({
    queryKey: ['customer_projects', activeTenant?.id],
    queryFn: async () => {
      if (!activeTenant?.id) return [];
      
      let query = supabase
        .from('customer_projects')
        .select('*');
      
      // Filter by tenant: if global, show all tenant data; otherwise filter by specific tenant
      if (activeTenant.id === 'global') {
        query = query.not('tenant_id', 'is', null);
      } else {
        query = query.eq('tenant_id', activeTenant.id);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
    enabled: !!activeTenant?.id,
  });

  // Fetch products for product family
  const { data: products = [] } = useQuery({
    queryKey: ['products', activeTenant?.id],
    queryFn: async () => {
      if (!activeTenant?.id) return [];
      
      let query = supabase
        .from('products')
        .select('product, product_family');
      
      // Filter by tenant: if global, show all tenant data; otherwise filter by specific tenant
      if (activeTenant.id === 'global') {
        query = query.not('tenant_id', 'is', null);
      } else {
        query = query.eq('tenant_id', activeTenant.id);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
    enabled: !!activeTenant?.id,
  });

  // Fetch recently viewed projects from database
  const { data: recentHistory = [] } = useQuery({
    queryKey: ['user-project-history', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('user_project_history')
        .select('project_id, viewed_at')
        .eq('user_id', user.id)
        .order('viewed_at', { ascending: false });
      return data || [];
    },
    enabled: !!user
  });

  // Get optimization status for a project (same logic as ProjectsWidget)
  const getOptimizationStatus = (projectNumber: string, optRecords: any[]) => {
    const projectOptRecords = optRecords.filter(
      (rec: any) => rec.project_number === projectNumber
    );
    
    // 1. Manually set status (highest priority, but NEU cannot be manually set)
    const order = ['Neu', 'Offen', 'Prüfung', 'Validierung', 'Abgeschlossen'] as const;
    const manualStatuses = projectOptRecords
      .map((rec: any) => rec.optimization_status)
      .filter((status: string) => status && status !== 'Neu') as typeof order[number][];
    if (manualStatuses.length > 0) {
      const highest = manualStatuses.reduce((acc, cur) => 
        order.indexOf(cur) > order.indexOf(acc) ? cur : acc, 'Offen' as typeof order[number]
      );
      return highest;
    }
    
    // 2. Check if project < 7 days old AND not viewed yet → NEU
    const project = customerProjects.find((p: any) => p.project_number === projectNumber);
    if (project) {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const wasViewed = recentHistory.some((rh: any) => rh.project_id === project.id);
      
      if (!wasViewed && project.created_at) {
        const createdDate = new Date(project.created_at);
        if (createdDate > oneWeekAgo) {
          return 'Neu';
        }
      }
    }
    
    // If no optimization records exist, check remaining status logic
    if (projectOptRecords.length === 0) {
      return 'Offen';
    }
    
    // 3. Check if products have been added
    const hasAddedProducts = projectOptRecords.some((rec: any) => 
      rec.cross_sell_product_name || rec.alternative_product_name
    );
    
    if (!hasAddedProducts) {
      // 3a. No products added → OFFEN
      return 'Offen';
    }
    
    // 4-6. Products added, check product status
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
      // Products added but no status set → PRÜFUNG
      return 'Prüfung';
    }
    
    // 4. At least one product has status "Identifiziert" → PRÜFUNG
    if (allProductStatuses.some(status => status === 'Identifiziert')) {
      return 'Prüfung';
    }
    
    // 5. At least one product has status "Vorgeschlagen" → VALIDIERUNG
    if (allProductStatuses.some(status => status === 'Vorgeschlagen')) {
      return 'Validierung';
    }
    
    // 6. All products have status "Akzeptiert" or "Registriert" → ABGESCHLOSSEN
    if (allProductStatuses.every(status => status === 'Akzeptiert' || status === 'Registriert')) {
      return 'Abgeschlossen';
    }
    
    // Default fallback
    return 'Offen';
  };

  const handleRestore = async (id: string, productName: string) => {
    try {
      const { error } = await supabase
        .from('removed_cross_sells')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success(`"${productName}" wurde wiederhergestellt und erscheint wieder in Cross-Sells`);
      
      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['removed_cross_sells'] });
      await queryClient.invalidateQueries({ queryKey: ['cross_sells'] });
    } catch (error: any) {
      console.error('Error restoring product:', error);
      toast.error(`Fehler beim Wiederherstellen: ${error?.message || 'Unbekannter Fehler'}`);
    }
  };

  const enrichedRemovedCrossSells = removedCrossSells.map((item: any) => {
    const productInfo = products.find((p: any) => p.product === item.cross_sell_product);
    return {
      ...item,
      product_family: productInfo?.product_family || '-',
    };
  });

  // Get unique values for rejected filters
  const uniqueProductFamiliesRejected = ['all', ...Array.from(new Set(enrichedRemovedCrossSells.map((p: any) => p.product_family).filter(Boolean)))];
  const uniqueRemovalReasons = ['all', ...Object.keys(removalReasonLabels)];

  const filteredRemovedCrossSells = enrichedRemovedCrossSells.filter((item: any) => {
    // Search filter
    if (searchQuery && searchQuery.length >= 2) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = (
        item.cross_sell_product?.toLowerCase().includes(query) ||
        item.application?.toLowerCase().includes(query) ||
        item.project_number?.toLowerCase().includes(query) ||
        removalReasonLabels[item.removal_reason]?.toLowerCase().includes(query) ||
        item.product_family?.toLowerCase().includes(query)
      );
      if (!matchesSearch) return false;
    }

    // Product family filter
    if (productFamilyFilterRejected !== 'all' && item.product_family !== productFamilyFilterRejected) return false;

    // Removal reason filter
    if (removalReasonFilter !== 'all' && item.removal_reason !== removalReasonFilter) return false;

    return true;
  });

  const hasActiveRejectedFilters = productFamilyFilterRejected !== 'all' || removalReasonFilter !== 'all' || searchQuery.length >= 2;

  const clearRejectedFilters = () => {
    setProductFamilyFilterRejected('all');
    setRemovalReasonFilter('all');
    setSearchQuery('');
  };

  // Prepare added products data with customer/project info
  const enrichedAddedProducts = addedProducts.map((opt: any) => {
    const project = customerProjects.find((p: any) => p.project_number === opt.project_number);
    
    // Calculate dynamic optimization status
    const dynamicStatus = getOptimizationStatus(opt.project_number, addedProducts);
    
    const products_list = [];
    
    // Cross-Sell Product
    if (opt.cross_sell_product_name) {
      const productInfo = products.find((p: any) => p.product === opt.cross_sell_product_name);
      products_list.push({
        id: `${opt.id}-cross`,
        customer: project?.customer || '-',
        application: project?.application || '-',
        project_name: project?.project_name || '-',
        project_number: opt.project_number,
        optimization_status: dynamicStatus,
        product_name: opt.cross_sell_product_name,
        product_family: productInfo?.product_family || '-',
        product_type: 'Cross-Sell',
        validation_status: opt.cross_sell_status || 'Neu',
        date_added: opt.cross_sell_date_added,
      });
    }
    
    // Alternative Product
    if (opt.alternative_product_name) {
      const productInfo = products.find((p: any) => p.product === opt.alternative_product_name);
      products_list.push({
        id: `${opt.id}-alt`,
        customer: project?.customer || '-',
        application: project?.application || '-',
        project_name: project?.project_name || '-',
        project_number: opt.project_number,
        optimization_status: dynamicStatus,
        product_name: opt.alternative_product_name,
        product_family: productInfo?.product_family || '-',
        product_type: 'Alternative',
        validation_status: opt.alternative_status || 'Neu',
        date_added: opt.alternative_date_added,
      });
    }
    
    return products_list;
  }).flat();

  // Get unique values for filters
  const uniqueCustomers = ['all', ...Array.from(new Set(enrichedAddedProducts.map((p: any) => p.customer).filter(Boolean)))];
  const uniqueStatuses = ['all', ...Array.from(new Set(enrichedAddedProducts.map((p: any) => p.optimization_status).filter(Boolean)))];
  const uniqueProductTypes = ['all', 'Cross-Sell', 'Alternative'];
  const uniqueValidationStatuses = ['all', ...Array.from(new Set(enrichedAddedProducts.map((p: any) => p.validation_status).filter(Boolean)))];

  const filteredAddedProducts = enrichedAddedProducts.filter((item: any) => {
    // Search filter
    if (searchQuery && searchQuery.length >= 2) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = (
        item.customer?.toLowerCase().includes(query) ||
        item.application?.toLowerCase().includes(query) ||
        item.project_name?.toLowerCase().includes(query) ||
        item.product_name?.toLowerCase().includes(query) ||
        item.optimization_status?.toLowerCase().includes(query) ||
        item.validation_status?.toLowerCase().includes(query)
      );
      if (!matchesSearch) return false;
    }

    // Customer filter
    if (customerFilter !== 'all' && item.customer !== customerFilter) return false;

    // Status filter
    if (statusFilter !== 'all' && item.optimization_status !== statusFilter) return false;

    // Product type filter
    if (productTypeFilter !== 'all' && item.product_type !== productTypeFilter) return false;

    // Validation status filter
    if (validationStatusFilter !== 'all' && item.validation_status !== validationStatusFilter) return false;

    return true;
  });

  const hasActiveFilters = customerFilter !== 'all' || statusFilter !== 'all' || 
                          productTypeFilter !== 'all' || validationStatusFilter !== 'all' || searchQuery.length >= 2;

  const clearAllFilters = () => {
    setCustomerFilter('all');
    setStatusFilter('all');
    setProductTypeFilter('all');
    setValidationStatusFilter('all');
    setSearchQuery('');
  };

  const exportToExcel = () => {
    // Prepare data for export
    const exportData = filteredAddedProducts.map((item: any) => ({
      'Kunde': item.customer,
      'Projekt': item.project_name,
      'Projekt-Nummer': item.project_number,
      'Applikation': item.application,
      'Projekt-Status': item.optimization_status,
      'Produkt': item.product_name,
      'Produktfamilie': item.product_family,
      'Produkttyp': item.product_type,
      'Validierungsstatus': item.validation_status,
      'Hinzugefügt': item.date_added ? format(new Date(item.date_added), 'dd.MM.yyyy', { locale: de }) : '-',
    }));

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ergänzte Produkte');

    // Auto-size columns
    const maxWidth = 50;
    const colWidths = Object.keys(exportData[0] || {}).map(key => ({
      wch: Math.min(
        Math.max(
          key.length,
          ...exportData.map(row => String(row[key as keyof typeof row] || '').length)
        ),
        maxWidth
      )
    }));
    ws['!cols'] = colWidths;

    // Generate filename with timestamp
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');
    const filename = `Ergänzte_Produkte_${timestamp}.xlsx`;

    // Download file
    XLSX.writeFile(wb, filename);
    toast.success(`Report wurde als ${filename} heruntergeladen`);
  };

  const exportRejectedToExcel = () => {
    // Prepare data for export
    const exportData = filteredRemovedCrossSells.map((item: any) => ({
      'Produkt': item.cross_sell_product,
      'Produktfamilie': item.product_family,
      'Applikation': item.application,
      'Projekt-Nr.': item.project_number,
      'Ablehnungsgrund': removalReasonLabels[item.removal_reason] || item.removal_reason,
      'Datum': format(new Date(item.removed_at), 'dd.MM.yyyy HH:mm', { locale: de }),
    }));

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Abgelehnte Cross-Sells');

    // Auto-size columns
    const maxWidth = 50;
    const colWidths = Object.keys(exportData[0] || {}).map(key => ({
      wch: Math.min(
        Math.max(
          key.length,
          ...exportData.map(row => String(row[key as keyof typeof row] || '').length)
        ),
        maxWidth
      )
    }));
    ws['!cols'] = colWidths;

    // Generate filename with timestamp
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');
    const filename = `Abgelehnte_Cross-Sells_${timestamp}.xlsx`;

    // Download file
    XLSX.writeFile(wb, filename);
    toast.success(`Report wurde als ${filename} heruntergeladen`);
  };

  const renderRejectedCrossSellsReport = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ThumbsDown className="h-5 w-5 text-red-500" />
              Abgelehnte Cross-Sell Produkte
            </CardTitle>
            <CardDescription className="mt-2">
              Alle abgelehnten Cross-Sells mit der Möglichkeit zur Wiederherstellung
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportRejectedToExcel}
              disabled={filteredRemovedCrossSells.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Excel exportieren
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentView('overview')}>
              Zurück zur Übersicht
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Suche nach Produkt, Applikation, Projekt oder Grund..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Select value={productFamilyFilterRejected} onValueChange={setProductFamilyFilterRejected}>
              <SelectTrigger>
                <SelectValue placeholder="Produktfamilie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Produktfamilien</SelectItem>
                {uniqueProductFamiliesRejected.slice(1).map((family) => (
                  <SelectItem key={family} value={family}>
                    {family}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={removalReasonFilter} onValueChange={setRemovalReasonFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Ablehnungsgrund" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Ablehnungsgründe</SelectItem>
                {uniqueRemovalReasons.slice(1).map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {removalReasonLabels[reason]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasActiveRejectedFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearRejectedFilters}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Filter zurücksetzen
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : filteredRemovedCrossSells.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ThumbsDown className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">
              {searchQuery ? 'Keine Ergebnisse gefunden' : 'Keine abgelehnten Cross-Sells vorhanden'}
            </p>
            <p className="text-sm mt-2">
              {searchQuery
                ? 'Versuchen Sie eine andere Suchanfrage'
                : 'Produkte, die aus Cross-Sell Opportunities entfernt wurden, erscheinen hier'}
            </p>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produkt</TableHead>
                  <TableHead>Produktfamilie</TableHead>
                  <TableHead>Applikation</TableHead>
                  <TableHead>Projekt-Nr.</TableHead>
                  <TableHead>Ablehnungsgrund</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead className="text-right">Aktion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRemovedCrossSells.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.cross_sell_product}</TableCell>
                    <TableCell className="text-muted-foreground">{item.product_family}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.application}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.project_number}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {removalReasonLabels[item.removal_reason] || item.removal_reason}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(item.removed_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestore(item.id, item.cross_sell_product)}
                        className="gap-2"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Wiederherstellen
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <p>
            {filteredRemovedCrossSells.length} von {enrichedRemovedCrossSells.length} Einträge{' '}
            {hasActiveRejectedFilters && 'gefunden'}
          </p>
        </div>
      </CardContent>
    </Card>
  );

  const renderAddedProductsReport = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              Ergänzte Produkte
            </CardTitle>
            <CardDescription className="mt-2">
              Alle zu Projekten hinzugefügten Cross-Sells und Alternativen mit Validierungsstatus
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportToExcel}
              disabled={filteredAddedProducts.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Excel exportieren
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentView('overview')}>
              Zurück zur Übersicht
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Suche nach Kunde, Projekt, Produkt, Status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <Select value={customerFilter} onValueChange={setCustomerFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Kunde" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Kunden</SelectItem>
                {uniqueCustomers.slice(1).map((customer) => (
                  <SelectItem key={customer} value={customer}>
                    {customer}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Projekt-Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                {uniqueStatuses.slice(1).map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={productTypeFilter} onValueChange={setProductTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Produkttyp" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Typen</SelectItem>
                <SelectItem value="Cross-Sell">Cross-Sell</SelectItem>
                <SelectItem value="Alternative">Alternative</SelectItem>
              </SelectContent>
            </Select>

            <Select value={validationStatusFilter} onValueChange={setValidationStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Validierungsstatus" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Validierungen</SelectItem>
                {uniqueValidationStatuses.slice(1).map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Filter zurücksetzen
            </Button>
          )}
        </div>

        {isLoadingAdded ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : filteredAddedProducts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">
              {searchQuery ? 'Keine Ergebnisse gefunden' : 'Keine ergänzten Produkte vorhanden'}
            </p>
            <p className="text-sm mt-2">
              {searchQuery
                ? 'Versuchen Sie eine andere Suchanfrage'
                : 'Fügen Sie Cross-Sells oder Alternativen zu Projekten hinzu'}
            </p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kunde</TableHead>
                  <TableHead>Projekt</TableHead>
                  <TableHead>Applikation</TableHead>
                  <TableHead>Projekt-Status</TableHead>
                  <TableHead>Produkt</TableHead>
                  <TableHead>Produktfamilie</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Validierungsstatus</TableHead>
                  <TableHead>Hinzugefügt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAddedProducts.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.customer}</TableCell>
                    <TableCell>{item.project_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.application}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.optimization_status}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{item.product_name}</TableCell>
                    <TableCell className="text-muted-foreground">{item.product_family}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={item.product_type === 'Cross-Sell' ? 'default' : 'outline'}
                        style={{ 
                          backgroundColor: item.product_type === 'Cross-Sell' ? '#3b82f6' : '#8b5cf6',
                          color: 'white'
                        }}
                      >
                        {item.product_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary"
                        style={{
                          backgroundColor: 
                            item.validation_status === 'Gewonnen' ? '#10b981' :
                            item.validation_status === 'Verloren' ? '#ef4444' :
                            item.validation_status === 'Angeboten' ? '#8b5cf6' :
                            item.validation_status === 'In Bearbeitung' ? '#f59e0b' :
                            '#3b82f6',
                          color: 'white'
                        }}
                      >
                        {item.validation_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.date_added 
                        ? format(new Date(item.date_added), 'dd.MM.yyyy', { locale: de })
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <p>
            {filteredAddedProducts.length} von {enrichedAddedProducts.length} Einträge{' '}
            {searchQuery && 'gefunden'}
          </p>
        </div>
      </CardContent>
    </Card>
  );

  if (currentView === 'added-products') {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight font-clash">Reports</h1>
            <p className="text-muted-foreground mt-2">
              Übersicht und Analyse Ihrer Geschäftsdaten
            </p>
          </div>
        </div>

        {renderAddedProductsReport()}
      </div>
    );
  }

  if (currentView === 'rejected-cross-sells') {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight font-clash">Reports</h1>
            <p className="text-muted-foreground mt-2">
              Übersicht und Analyse Ihrer Geschäftsdaten
            </p>
          </div>
        </div>

        {renderRejectedCrossSellsReport()}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight font-clash">Reports</h1>
          <p className="text-muted-foreground mt-2">
            Übersicht und Analyse Ihrer Geschäftsdaten
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {reportCards.map((report) => {
          const getReportCount = () => {
            if (report.id === 'rejected-cross-sells') {
              return removedCrossSells.length;
            } else if (report.id === 'added-products') {
              return enrichedAddedProducts.length;
            }
            return 0;
          };

          const count = getReportCount();
          const currentLoading = report.id === 'rejected-cross-sells' ? isLoading : isLoadingAdded;

          return (
            <Card
              key={report.title}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setCurrentView(report.id)}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-muted ${report.color}`}>
                    <report.icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg">{report.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-3">{report.description}</CardDescription>
                {currentLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="mt-2">
                    <p className="text-3xl font-bold text-primary">{count}</p>
                    <p className="text-sm text-muted-foreground">
                      {report.id === 'rejected-cross-sells' ? 'Abgelehnte Produkte' : 'Ergänzte Einträge'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Verfügbare Reports</CardTitle>
          <CardDescription>
            Wählen Sie einen Berichtstyp aus, um detaillierte Analysen anzuzeigen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>Wählen Sie einen Report aus den Karten oben aus</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
