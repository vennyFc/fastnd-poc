import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity } from 'lucide-react';
import { subMonths, format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

type TimeRange = '1' | '3' | '6' | '12';

const eventTypeColors: Record<string, string> = {
  'login': '#10b981',
  'logout': '#ef4444',
  'page_view': '#3b82f6',
  'action': '#f59e0b',
};

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

export function AccessStatsWidget() {
  const [timeRange, setTimeRange] = useState<TimeRange>('3');
  const { activeTenant } = useAuth();
  const { t, language } = useLanguage();
  const dateLocale = language === 'de' ? de : enUS;

  const timeRangeLabels: Record<TimeRange, string> = {
    '1': t('accessStats.1month'),
    '3': t('accessStats.3months'),
    '6': t('accessStats.6months'),
    '12': t('accessStats.12months'),
  };

  const eventTypeLabels: Record<string, string> = {
    'login': t('accessStats.logins'),
    'logout': t('accessStats.logouts'),
    'page_view': t('accessStats.pageViews'),
    'action': t('accessStats.actions'),
  };

  // Fetch access logs data
  const { data: accessLogs = [], isLoading } = useQuery({
    queryKey: ['user_access_logs', activeTenant?.id],
    queryFn: async () => {
      // First fetch all access logs
      const { data: allAccessLogs, error: logsError } = await supabase
        .from('user_access_logs')
        .select('*');
      
      if (logsError) throw logsError;
      if (!allAccessLogs) return [];
      
      // If global view, return all logs
      if (activeTenant?.id === 'global') {
        return allAccessLogs;
      }
      
      // For specific tenant, filter by user's tenant_id via profiles
      if (activeTenant?.id) {
        // Get all user_ids that belong to this tenant
        const { data: tenantUsers, error: usersError } = await supabase
          .from('profiles')
          .select('id')
          .eq('tenant_id', activeTenant.id);
        
        if (usersError) throw usersError;
        if (!tenantUsers) return [];
        
        const tenantUserIds = new Set(tenantUsers.map(u => u.id));
        
        // Filter access logs to only those from users in this tenant
        return allAccessLogs.filter(log => tenantUserIds.has(log.user_id));
      }
      
      return allAccessLogs;
    },
  });

  // Calculate date threshold based on selected time range
  const getDateThreshold = () => {
    const months = parseInt(timeRange);
    return subMonths(new Date(), months);
  };

  // Filter and aggregate data
  const getChartData = () => {
    const threshold = getDateThreshold();
    
    // Filter by date
    const filteredData = accessLogs.filter((log: any) => {
      const createdDate = new Date(log.created_at);
      return createdDate >= threshold;
    });

    // Count by event type
    const eventTypeCounts: Record<string, number> = {
      'login': 0,
      'logout': 0,
      'page_view': 0,
      'action': 0,
    };

    filteredData.forEach((log: any) => {
      const eventType = log.event_type;
      if (eventTypeCounts.hasOwnProperty(eventType)) {
        eventTypeCounts[eventType]++;
      }
    });

    // Convert to chart format
    return Object.entries(eventTypeCounts).map(([eventType, count]) => ({
      eventType: eventTypeLabels[eventType] || eventType,
      eventTypeKey: eventType,
      anzahl: count,
      fill: eventTypeColors[eventType] || '#94a3b8',
    }));
  };

  // Get statistics
  const getStatistics = () => {
    const threshold = getDateThreshold();
    const filteredData = accessLogs.filter((log: any) => {
      const createdDate = new Date(log.created_at);
      return createdDate >= threshold;
    });

    const uniqueUsers = new Set(filteredData.map((log: any) => log.user_id));
    const totalEvents = filteredData.length;
    const avgEventsPerUser = uniqueUsers.size > 0 ? (totalEvents / uniqueUsers.size).toFixed(1) : '0';

    return {
      totalEvents,
      uniqueUsers: uniqueUsers.size,
      avgEventsPerUser,
    };
  };

  const chartData = getChartData();
  const statistics = getStatistics();

  return (
    <Card className="shadow-card h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              {t('accessStats.title')}
              <span className="ml-2 px-1.5 py-0.5 text-2xs bg-primary/10 text-primary rounded">
                Admin
              </span>
            </CardTitle>
            <CardDescription className="mt-1">
              {t('accessStats.description')}
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
          <div className="flex-1 flex items-center justify-center">
            <Skeleton className="w-full h-[250px]" />
          </div>
        ) : (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground mb-0.5">{t('accessStats.totalEvents')}</p>
                <p className="text-xl font-bold">{statistics.totalEvents}</p>
              </div>
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground mb-0.5">{t('accessStats.activeUsers')}</p>
                <p className="text-xl font-bold">{statistics.uniqueUsers}</p>
              </div>
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground mb-0.5">{t('accessStats.avgEventsPerUser')}</p>
                <p className="text-xl font-bold">{statistics.avgEventsPerUser}</p>
              </div>
            </div>

            {/* Chart */}
            <div className="flex-1 min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <defs>
                    <linearGradient id="gradientLogin" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="gradientLogout" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="gradientPageView" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="gradientAction" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="eventType" 
                    stroke="hsl(var(--foreground))"
                    fontSize={10}
                  />
                  <YAxis 
                    stroke="hsl(var(--foreground))"
                    fontSize={10}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="anzahl" 
                    name={t('accessStats.count')}
                    radius={[8, 8, 0, 0]}
                  >
                    {chartData.map((entry, index) => {
                      const gradientMap: Record<string, string> = {
                        'login': 'url(#gradientLogin)',
                        'logout': 'url(#gradientLogout)',
                        'page_view': 'url(#gradientPageView)',
                        'action': 'url(#gradientAction)',
                      };
                      return <Cell key={`cell-${index}`} fill={gradientMap[entry.eventTypeKey] || 'url(#gradientLogin)'} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-2xs text-muted-foreground">
                {t('accessStats.timeRange')}: {format(getDateThreshold(), 'dd. MMM yyyy', { locale: dateLocale })} - {format(new Date(), 'dd. MMM yyyy', { locale: dateLocale })}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}