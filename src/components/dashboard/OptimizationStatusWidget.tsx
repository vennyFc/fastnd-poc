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
import { Badge } from '@/components/ui/badge';

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border shadow-lg rounded-md p-3">
        <p className="font-semibold text-sm mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="h-2 w-2 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <p className="text-sm text-muted-foreground">
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

const timeRangeLabels: Record<TimeRange, string> = {
  '1': '1 Monat',
  '3': '3 Monate',
  '6': '6 Monate',
  '12': '12 Monate',
};

const statusColors: Record<string, string> = {
  'Neu': '#3b82f6',
  'Offen': '#f59e0b',
  'Prüfung': '#8b5cf6',
  'Validierung': '#06b6d4',
  'Abgeschlossen': '#10b981',
};

const statusLabels: Record<string, string> = {
  'Neu': 'Neu',
  'Offen': 'Offen',
  'Prüfung': 'Prüfung',
  'Validierung': 'Validierung',
  'Abgeschlossen': 'Abgeschlossen',
};

export function OptimizationStatusWidget() {
  const [timeRange, setTimeRange] = useState<TimeRange>('3');
  const { user, activeTenant, isSuperAdmin } = useAuth();
  
  const isGlobalView = activeTenant?.id === 'global';

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
      
      // In global view, fetch all tenant optimization records (not null tenant_id)
      if (activeTenant?.id === 'global') {
        query = query.not('tenant_id', 'is', null);
      } else if (activeTenant?.id) {
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
      
      let query = supabase
        .from('user_project_history')
        .select('project_id, viewed_at');
      
      // In global view, get history from all tenants (not just current user)
      if (activeTenant?.id === 'global') {
        query = query.not('tenant_id', 'is', null);
      } else {
        // In tenant view, only current user's history
        query = query.eq('user_id', user.id);
      }
      
      const { data } = await query.order('viewed_at', { ascending: false });
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
    const projectNumbers = allProjectsRaw
      .filter((p: any) => p.customer === project.customer && p.project_name === project.project_name)
      .map((p: any) => p.project_number)
      .filter(Boolean);
    
    const projectOptRecords = optimizationRecords.filter(
      (rec: any) => projectNumbers.includes(rec.project_number)
    );
    
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
    
    if (projectOptRecords.length === 0) {
      return 'Offen';
    }
    
    const hasAddedProducts = projectOptRecords.some((rec: any) => 
      rec.cross_sell_product_name || rec.alternative_product_name
    );
    
    if (!hasAddedProducts) {
      return 'Offen';
    }
    
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
      return 'Prüfung';
    }
    
    if (allProductStatuses.some(status => status === 'Identifiziert')) {
      return 'Prüfung';
    }
    
    if (allProductStatuses.some(status => status === 'Vorgeschlagen')) {
      return 'Validierung';
    }
    
    if (allProductStatuses.every(status => status === 'Akzeptiert' || status === 'Registriert')) {
      return 'Abgeschlossen';
    }
    
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
    
    // Filter projects by creation date within time range
    const filteredProjects = allProjects.filter((project: any) => {
      const createdDate = new Date(project.created_at);
      return createdDate >= threshold;
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
      anzahl: count,
      fill: statusColors[status] || '#94a3b8',
    }));
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
              <Calendar className="h-5 w-5" />
              Projekte nach Optimierungsstatus
              {isGlobalView && (
                <Badge variant="outline" className="ml-2 gap-1">
                  <Globe className="h-3 w-3" />
                  Alle Mandanten
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-2">
              {isGlobalView 
                ? 'Aggregierte Verteilung aller Projekte aus allen Mandanten nach Status'
                : 'Verteilung der Projekte nach Status im ausgewählten Zeitraum'
              }
            </CardDescription>
          </div>
          <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
            <SelectTrigger className="w-[140px]">
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
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : totalProjects === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {isGlobalView ? (
              <Globe className="h-16 w-16 mx-auto mb-4 opacity-50" />
            ) : (
              <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
            )}
            <p className="text-lg font-medium">
              {isGlobalView 
                ? 'Keine Projekte in den Mandanten gefunden'
                : 'Keine Projekte im ausgewählten Zeitraum'
              }
            </p>
            <p className="text-sm mt-2">
              {isGlobalView
                ? 'Stellen Sie sicher, dass Mandanten Projektdaten hochgeladen haben'
                : 'Versuchen Sie einen längeren Zeitraum oder laden Sie Projektdaten hoch'
              }
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-center min-h-[88px]">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">
                  {isGlobalView ? 'Gesamt (Alle Mandanten)' : 'Gesamt'}
                </p>
                <p className="text-3xl font-bold text-foreground">{totalProjects}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isGlobalView ? 'Projekte mandantenübergreifend' : 'Projekte'}
                </p>
              </div>
            </div>
            
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="status" 
                  className="text-sm"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-sm"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="anzahl" 
                  name="Anzahl Projekte"
                  radius={[8, 8, 0, 0]}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`url(#colorBar)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-6">
              <p className="text-sm font-medium mb-3">Verteilung nach Status:</p>
              <div className="grid grid-cols-5 gap-3">
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
                      <p className="text-xs text-muted-foreground">Projekte</p>
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
