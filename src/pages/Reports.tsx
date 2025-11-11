import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { BarChart3, PieChart, TrendingUp, FileText, ThumbsDown, RotateCcw, Search } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

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
  const [currentView, setCurrentView] = useState<ReportView>('overview');
  const [searchQuery, setSearchQuery] = useState('');
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
    {
      id: 'overview' as ReportView,
      title: 'Produkt-Analyse',
      description: 'Produktverteilung und Cross-Sell Möglichkeiten',
      icon: PieChart,
      color: 'text-green-500',
    },
    {
      id: 'overview' as ReportView,
      title: 'Umsatz-Trends',
      description: 'Umsatzentwicklung und Forecasts',
      icon: TrendingUp,
      color: 'text-purple-500',
    },
    {
      id: 'overview' as ReportView,
      title: 'Kunden-Berichte',
      description: 'Kundenaktivitäten und Engagement',
      icon: FileText,
      color: 'text-orange-500',
    },
  ];

  // Fetch removed cross-sells
  const { data: removedCrossSells = [], isLoading } = useQuery({
    queryKey: ['removed_cross_sells'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('removed_cross_sells')
        .select('*')
        .order('removed_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch added products (opps_optimization)
  const { data: addedProducts = [], isLoading: isLoadingAdded } = useQuery({
    queryKey: ['opps_optimization'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('opps_optimization')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch customer projects for joining
  const { data: customerProjects = [] } = useQuery({
    queryKey: ['customer_projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_projects')
        .select('*');
      
      if (error) throw error;
      return data;
    },
  });

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

  const filteredRemovedCrossSells = removedCrossSells.filter((item: any) => {
    if (!searchQuery || searchQuery.length < 2) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.cross_sell_product?.toLowerCase().includes(query) ||
      item.application?.toLowerCase().includes(query) ||
      item.project_number?.toLowerCase().includes(query) ||
      removalReasonLabels[item.removal_reason]?.toLowerCase().includes(query)
    );
  });

  // Prepare added products data with customer/project info
  const enrichedAddedProducts = addedProducts.map((opt: any) => {
    const project = customerProjects.find((p: any) => p.project_number === opt.project_number);
    
    const products = [];
    
    // Cross-Sell Product
    if (opt.cross_sell_product_name) {
      products.push({
        id: `${opt.id}-cross`,
        customer: project?.customer || '-',
        application: project?.application || '-',
        project_name: project?.project_name || '-',
        project_number: opt.project_number,
        optimization_status: opt.optimization_status,
        product_name: opt.cross_sell_product_name,
        product_type: 'Cross-Sell',
        validation_status: opt.cross_sell_status || 'Neu',
        date_added: opt.cross_sell_date_added,
      });
    }
    
    // Alternative Product
    if (opt.alternative_product_name) {
      products.push({
        id: `${opt.id}-alt`,
        customer: project?.customer || '-',
        application: project?.application || '-',
        project_name: project?.project_name || '-',
        project_number: opt.project_number,
        optimization_status: opt.optimization_status,
        product_name: opt.alternative_product_name,
        product_type: 'Alternative',
        validation_status: opt.alternative_status || 'Neu',
        date_added: opt.alternative_date_added,
      });
    }
    
    return products;
  }).flat();

  const filteredAddedProducts = enrichedAddedProducts.filter((item: any) => {
    if (!searchQuery || searchQuery.length < 2) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.customer?.toLowerCase().includes(query) ||
      item.application?.toLowerCase().includes(query) ||
      item.project_name?.toLowerCase().includes(query) ||
      item.product_name?.toLowerCase().includes(query) ||
      item.optimization_status?.toLowerCase().includes(query) ||
      item.validation_status?.toLowerCase().includes(query)
    );
  });

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
          <Button variant="outline" size="sm" onClick={() => setCurrentView('overview')}>
            Zurück zur Übersicht
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Suche nach Produkt, Applikation, Projekt oder Grund..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
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
            {filteredRemovedCrossSells.length} von {removedCrossSells.length} Einträge{' '}
            {searchQuery && 'gefunden'}
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
          <Button variant="outline" size="sm" onClick={() => setCurrentView('overview')}>
            Zurück zur Übersicht
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Suche nach Kunde, Projekt, Produkt, Status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
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
            <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
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
            <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
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
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground mt-2">
            Übersicht und Analyse Ihrer Geschäftsdaten
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {reportCards.map((report) => (
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
              <CardDescription>{report.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
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
