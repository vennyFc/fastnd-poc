import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Globe } from 'lucide-react';
import { subMonths } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border shadow-lg rounded-md p-2">
        <p className="font-semibold text-xs mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-1.5">
            <div 
              className="h-1.5 w-1.5 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <p className="text-xs text-muted-foreground">
              {entry.name}: <span className="font-semibold text-foreground">{entry.value}</span>
            </p>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

type TimeRange = '1' | '3' | '6' | '12';

export function OptimizationStatusWidget() {
  const [timeRange, setTimeRange] = useState<TimeRange>('3');
  const { user, activeTenant, isSuperAdmin } = useAuth();
  const { t } = useLanguage();
  
  const isGlobalView = activeTenant?.id === 'global';
  
  const timeRangeLabels: Record<TimeRange, string> = {
    '1': t('optimizationStatus.1month'),
    '3': t('optimizationStatus.3months'),
    '6': t('optimizationStatus.6months'),
    '12': t('optimizationStatus.12months'),
  };

  const statusLabels: Record<string, string> = {
    'Neu': t('status.new'),
    'Offen': t('status.open'),
    'Prüfung': t('status.review'),
    'Validierung': t('status.validation'),
    'Abgeschlossen': t('status.completed'),
  };

  // Fetch all projects
  const { data: allProjectsRaw = [], isLoading: isLoadingProjects } = useQuery({
    queryKey: ['customer_projects', activeTenant?.id],
    queryFn: async () => {
      let query = supabase.from('customer_projects').select('*');
      
      // In global view, fetch all tenant projects (not null tenant_id)
      if (activeTenant?.id === 'global') {
        query = query.not('tenant_id', 'is', null);
      } else if (activeTenant?.id) {
        query = query.eq('tenant_id', activeTenant.id);
      }
      
      const { data } = await query.order('created_at', { ascending: false });
      return data || [];
    },
    enabled: isSuperAdmin || !!activeTenant?.id
  });

  // Fetch optimization records
  const { data: optimizationRecords = [] } = useQuery({
    queryKey: ['opps_optimization', activeTenant?.id],
    queryFn: async () => {
      let query = supabase.from('opps_optimization').select('*');
      
      if (isGlobalView) {
        // Im Global-View alle Mandanten (tenant_id nicht NULL)
        query = query.not('tenant_id', 'is', null);
      } else if (activeTenant?.id) {
        // In der Mandantenansicht nur mandantenspezifische Datensätze
        query = query.eq('tenant_id', activeTenant.id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
    enabled: isSuperAdmin || !!activeTenant?.id,
  });

  // Fetch recently viewed projects
  // In global view, fetch ALL users' history to properly calculate "Neu" status
  const { data: recentHistory = [] } = useQuery({
    queryKey: ['user-project-history', user?.id, activeTenant?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data } = await supabase
        .from('user_project_history')
        .select('project_id, viewed_at')
        .order('viewed_at', { ascending: false })
        .limit(10);
      
      return data || [];
    },
    enabled: !!user
  });

  // Group projects by customer and project_name
  const allProjects = allProjectsRaw.reduce((acc: any[], project: any) => {
    const existing = acc.find(
      (p) => p.customer === project.customer && p.project_name === project.project_name
    );
    if (existing) {
      const appValue = typeof project.application === 'object' ? project.application?.application : project.application;
      if (appValue && !existing.applications?.includes(appValue)) {
        existing.applications = [...(existing.applications || []), String(appValue)];
      }
      const prodValue = typeof project.product === 'object' ? project.product?.product : project.product;
      if (prodValue && !existing.products?.includes(prodValue)) {
        existing.products = [...(existing.products || []), String(prodValue)];
      }
      if (!existing.sourceIds?.includes(project.id)) {
        existing.sourceIds = [...(existing.sourceIds || []), project.id];
      }
      if (new Date(project.created_at) < new Date(existing.created_at)) {
        existing.created_at = project.created_at;
      }
    } else {
      const appValue = typeof project.application === 'object' ? project.application?.application : project.application;
      const prodValue = typeof project.product === 'object' ? project.product?.product : project.product;
      acc.push({
        ...project,
        applications: appValue ? [String(appValue)] : [],
        products: prodValue ? [String(prodValue)] : [],
        sourceIds: [project.id],
      });
    }
    return acc;
  }, []);

  // Get optimization status for a project (same logic as ProjectsWidget)
  const getOptimizationStatus = (project: any) => {
    // Find all project_numbers that belong to this grouped project
    const projectNumbers = allProjectsRaw
      .filter((p: any) => p.customer === project.customer && p.project_name === project.project_name)
      .map((p: any) => p.project_number)
      .filter(Boolean);
    
    const projectOptRecords = optimizationRecords.filter(
      (rec: any) => projectNumbers.includes(rec.project_number)
    );
    
    // 1. Manuell gesetzter Status (höchste Priorität, aber NEU kann nicht manuell gesetzt werden)
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
    
    // 2. Prüfe ob Projekt < 7 Tage alt UND noch nicht angeschaut → NEU
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const wasViewed = recentHistory.some((rh: any) => 
      project.sourceIds ? project.sourceIds.includes(rh.project_id) : rh.project_id === project.id
    );
    
    if (!wasViewed && project.created_at) {
      const createdDate = new Date(project.created_at);
      if (createdDate > oneWeekAgo) {
        return 'Neu';
      }
    }
    
    // If no optimization records exist, check remaining status logic
    if (projectOptRecords.length === 0) {
      return 'Offen';
    }
    
    // 3. Prüfe ob Produkte hinzugefügt wurden
    const hasAddedProducts = projectOptRecords.some((rec: any) => 
      rec.cross_sell_product_name || rec.alternative_product_name
    );
    
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

  // Calculate date threshold based on selected time range
  const getDateThreshold = () => {
    const months = parseInt(timeRange);
    return subMonths(new Date(), months);
  };

  // Filter and aggregate data
  const getChartData = () => {
    const threshold = getDateThreshold();
    
    // Filter projects nach letztem Aktivitätsdatum (Optimierung oder Erstellung)
    const filteredProjects = allProjects.filter((project: any) => {
      // Zugehörige project_numbers für diese Projektgruppe
      const projectNumbers = allProjectsRaw
        .filter((p: any) => p.customer === project.customer && p.project_name === project.project_name)
        .map((p: any) => p.project_number)
        .filter(Boolean);

      const projectOptRecords = optimizationRecords.filter(
        (rec: any) => projectNumbers.includes(rec.project_number)
      );

      // Basis ist Erstellungsdatum des Projekts
      let lastActivityDate = project.created_at ? new Date(project.created_at) : null;

      // Berücksichtige Optimierungsaktivitäten (created_at/updated_at)
      projectOptRecords.forEach((rec: any) => {
        const dates: (string | null | undefined)[] = [rec.updated_at, rec.created_at];
        dates.forEach((d) => {
          if (!d) return;
          const date = new Date(d);
          if (!lastActivityDate || date > lastActivityDate) {
            lastActivityDate = date;
          }
        });
      });

      if (!lastActivityDate) return false;
      return lastActivityDate >= threshold;
    });

    // Count by calculated status
    const statusCounts: Record<string, number> = {
      'Neu': 0,
      'Offen': 0,
      'Prüfung': 0,
      'Validierung': 0,
      'Abgeschlossen': 0,
    };

    filteredProjects.forEach((project: any) => {
      const status = getOptimizationStatus(project);
      if (statusCounts.hasOwnProperty(status)) {
        statusCounts[status]++;
      }
    });

    // Convert to chart format
    return Object.entries(statusCounts).map(([status, count]) => ({
      status: statusLabels[status] || status,
      statusKey: status,
      anzahl: count,
      fill: statusColors[status] || '#94a3b8',
    }));
  };

  const statusColors: Record<string, string> = {
    'Neu': '#3b82f6',
    'Offen': '#f59e0b',
    'Prüfung': '#8b5cf6',
    'Validierung': '#06b6d4',
    'Abgeschlossen': '#10b981',
  };

  const chartData = getChartData();
  const totalProjects = chartData.reduce((sum, item) => sum + item.anzahl, 0);
  const isLoading = isLoadingProjects;

  return (
    <Card className="shadow-card h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t('optimizationStatus.title')}
              {isGlobalView && (
                <Badge variant="outline" className="ml-2 gap-1">
                  <Globe className="h-2.5 w-2.5" />
                  {t('optimizationStatus.allTenants')}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              {isGlobalView 
                ? t('optimizationStatus.aggregatedDistribution')
                : t('optimizationStatus.distribution')
              }
            </CardDescription>
          </div>
          <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(timeRangeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-56 w-full" />
          </div>
        ) : totalProjects === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            {isGlobalView ? (
              <Globe className="h-12 w-12 mx-auto mb-3 opacity-50" />
            ) : (
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            )}
            <p className="text-sm font-medium">
              {isGlobalView 
                ? t('optimizationStatus.noProjectsInTenants')
                : t('optimizationStatus.noProjectsInTimeframe')
              }
            </p>
            <p className="text-xs mt-1">
              {isGlobalView
                ? t('optimizationStatus.ensureTenantsHaveData')
                : t('optimizationStatus.tryLongerTimeframe')
              }
            </p>
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-center min-h-[72px]">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-0.5">
                  {isGlobalView ? t('optimizationStatus.totalAllTenants') : t('optimizationStatus.total')}
                </p>
                <p className="text-2xl font-bold text-foreground">{totalProjects}</p>
                <p className="text-2xs text-muted-foreground mt-0.5">
                  {isGlobalView ? t('optimizationStatus.projectsCrossTenants') : t('optimizationStatus.projects')}
                </p>
              </div>
            </div>
            
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData} margin={{ top: 15, right: 20, left: 15, bottom: 5 }}>
                <defs>
                  <linearGradient id="gradientNeu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="gradientOffen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="gradientPrüfung" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="gradientValidierung" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="gradientAbgeschlossen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="status" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="anzahl" 
                  name={t('optimizationStatus.projectCount')}
                  radius={[8, 8, 0, 0]}
                >
                {chartData.map((entry, index) => {
                    const gradientMap: Record<string, string> = {
                      'Neu': 'url(#gradientNeu)',
                      'Offen': 'url(#gradientOffen)',
                      'Prüfung': 'url(#gradientPrüfung)',
                      'Validierung': 'url(#gradientValidierung)',
                      'Abgeschlossen': 'url(#gradientAbgeschlossen)',
                    };
                    return <Cell key={`cell-${index}`} fill={gradientMap[entry.statusKey] || 'url(#gradientNeu)'} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-4">
              <p className="text-xs font-medium mb-2">{t('optimizationStatus.distributionByStatus')}:</p>
              <div className="grid grid-cols-5 gap-2">
              {chartData.map((item) => {
                const percentage = totalProjects > 0 
                  ? Math.round((item.anzahl / totalProjects) * 100) 
                  : 0;
                
                return (
                  <div 
                    key={item.status} 
                    className="p-3 rounded-lg border"
                    style={{ backgroundColor: `${item.fill}10` }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div 
                        className="h-3 w-3 rounded-full" 
                        style={{ backgroundColor: item.fill }}
                      />
                      <p className="text-sm font-medium">{item.status}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{item.anzahl}</p>
                      <p className="text-xs text-muted-foreground">{t('optimizationStatus.projects')}</p>
                      <p className="text-sm font-semibold mt-1 text-foreground">
                        {percentage}%
                      </p>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
