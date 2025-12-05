import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { LogIn } from 'lucide-react';
import { subMonths, format, startOfDay, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfWeek, startOfMonth } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

type TimeRange = '1' | '3' | '6' | '12';
type Granularity = 'day' | 'week' | 'month';

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

export function LoginActivityWidget() {
  const [timeRange, setTimeRange] = useState<TimeRange>('3');
  const { activeTenant } = useAuth();
  const { t, language } = useLanguage();
  const dateLocale = language === 'de' ? de : enUS;

  const timeRangeLabels: Record<TimeRange, string> = {
    '1': t('loginActivity.1month'),
    '3': t('loginActivity.3months'),
    '6': t('loginActivity.6months'),
    '12': t('loginActivity.12months'),
  };

  // Fetch login events
  const { data: loginEvents = [], isLoading } = useQuery({
    queryKey: ['login-events', activeTenant?.id],
    queryFn: async () => {
      // First fetch all login events
      const { data: allLoginEvents, error: eventsError } = await supabase
        .from('user_access_logs')
        .select('*')
        .eq('event_type', 'login')
        .order('created_at', { ascending: true });
      
      if (eventsError) throw eventsError;
      if (!allLoginEvents) return [];
      
      // If global view, return all events
      if (activeTenant?.id === 'global') {
        return allLoginEvents;
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
        
        // Filter login events to only those from users in this tenant
        return allLoginEvents.filter(event => tenantUserIds.has(event.user_id));
      }
      
      return allLoginEvents;
    },
  });

  // Calculate date threshold and granularity
  const getDateThreshold = () => {
    const months = parseInt(timeRange);
    return subMonths(new Date(), months);
  };

  const getGranularity = (): Granularity => {
    const months = parseInt(timeRange);
    if (months <= 1) return 'day';
    if (months <= 3) return 'week';
    return 'month';
  };

  // Generate chart data
  const getChartData = () => {
    const threshold = getDateThreshold();
    const granularity = getGranularity();
    const now = new Date();
    
    // Filter events by date
    const filteredEvents = loginEvents.filter((event: any) => {
      const eventDate = new Date(event.created_at);
      return eventDate >= threshold;
    });

    // Generate time intervals
    let intervals: Date[] = [];
    
    if (granularity === 'day') {
      intervals = eachDayOfInterval({ start: threshold, end: now });
    } else if (granularity === 'week') {
      intervals = eachWeekOfInterval({ start: threshold, end: now }, { weekStartsOn: 1 });
    } else {
      intervals = eachMonthOfInterval({ start: threshold, end: now });
    }

    // Count logins per interval
    const loginCounts = intervals.map(interval => {
      let intervalStart: Date;
      let intervalEnd: Date;

      if (granularity === 'day') {
        intervalStart = startOfDay(interval);
        intervalEnd = new Date(intervalStart);
        intervalEnd.setDate(intervalEnd.getDate() + 1);
      } else if (granularity === 'week') {
        intervalStart = startOfWeek(interval, { weekStartsOn: 1 });
        intervalEnd = new Date(intervalStart);
        intervalEnd.setDate(intervalEnd.getDate() + 7);
      } else {
        intervalStart = startOfMonth(interval);
        intervalEnd = new Date(intervalStart);
        intervalEnd.setMonth(intervalEnd.getMonth() + 1);
      }

      const count = filteredEvents.filter((event: any) => {
        const eventDate = new Date(event.created_at);
        return eventDate >= intervalStart && eventDate < intervalEnd;
      }).length;

      // Format label based on granularity
      let label: string;
      if (granularity === 'day') {
        label = format(interval, 'dd.MM', { locale: dateLocale });
      } else if (granularity === 'week') {
        label = `${t('loginActivity.week')} ${format(interval, 'ww', { locale: dateLocale })}`;
      } else {
        label = format(interval, 'MMM yy', { locale: dateLocale });
      }

      return {
        date: label,
        logins: count,
      };
    });

    return loginCounts;
  };

  // Get statistics
  const getStatistics = () => {
    const threshold = getDateThreshold();
    const filteredEvents = loginEvents.filter((event: any) => {
      const eventDate = new Date(event.created_at);
      return eventDate >= threshold;
    });

    const uniqueUsers = new Set(filteredEvents.map((event: any) => event.user_id));
    const totalLogins = filteredEvents.length;
    const avgLoginsPerUser = uniqueUsers.size > 0 ? (totalLogins / uniqueUsers.size).toFixed(1) : '0';
    const avgLoginsPerDay = filteredEvents.length > 0 
      ? (totalLogins / Math.max(1, Math.ceil((new Date().getTime() - threshold.getTime()) / (1000 * 60 * 60 * 24)))).toFixed(1)
      : '0';

    return {
      totalLogins,
      uniqueUsers: uniqueUsers.size,
      avgLoginsPerUser,
      avgLoginsPerDay,
    };
  };

  const chartData = getChartData();
  const statistics = getStatistics();
  const granularity = getGranularity();

  const getGranularityLabel = () => {
    if (granularity === 'day') return t('loginActivity.daily');
    if (granularity === 'week') return t('loginActivity.weekly');
    return t('loginActivity.monthly');
  };

  return (
    <Card className="shadow-card h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LogIn className="h-4 w-4 text-primary" />
              {t('loginActivity.title')}
              <span className="ml-2 px-1.5 py-0.5 text-2xs bg-primary/10 text-primary rounded">
                Admin
              </span>
            </CardTitle>
            <CardDescription className="mt-1">
              {t('loginActivity.description')}
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
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground mb-0.5">{t('loginActivity.totalLogins')}</p>
                <p className="text-xl font-bold">{statistics.totalLogins}</p>
              </div>
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground mb-0.5">{t('loginActivity.activeUsers')}</p>
                <p className="text-xl font-bold">{statistics.uniqueUsers}</p>
              </div>
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground mb-0.5">{t('loginActivity.avgLoginsPerUser')}</p>
                <p className="text-xl font-bold">{statistics.avgLoginsPerUser}</p>
              </div>
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground mb-0.5">{t('loginActivity.avgLoginsPerDay')}</p>
                <p className="text-xl font-bold">{statistics.avgLoginsPerDay}</p>
              </div>
            </div>

            {/* Chart */}
            <div className="flex-1 min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorLogins" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--foreground))"
                    fontSize={10}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    stroke="hsl(var(--foreground))"
                    fontSize={10}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="logins" 
                    name={t('loginActivity.logins')}
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#colorLogins)"
                    dot={{ fill: 'hsl(var(--primary))', r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-2xs text-muted-foreground">
                {t('loginActivity.timeRange')}: {format(getDateThreshold(), 'dd. MMM yyyy', { locale: dateLocale })} - {format(new Date(), 'dd. MMM yyyy', { locale: dateLocale })}
                {' • '}
                {t('loginActivity.granularity')}: {getGranularityLabel()}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}