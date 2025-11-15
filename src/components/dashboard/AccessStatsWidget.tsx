import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, Calendar } from 'lucide-react';
import { subMonths, format } from 'date-fns';
import { de } from 'date-fns/locale';

type TimeRange = '1' | '3' | '6' | '12';

const timeRangeLabels: Record<TimeRange, string> = {
  '1': '1 Monat',
  '3': '3 Monate',
  '6': '6 Monate',
  '12': '12 Monate',
};

const eventTypeColors: Record<string, string> = {
  'login': '#10b981',
  'logout': '#ef4444',
  'page_view': '#3b82f6',
  'action': '#f59e0b',
};

const eventTypeLabels: Record<string, string> = {
  'login': 'Logins',
  'logout': 'Logouts',
  'page_view': 'Seitenaufrufe',
  'action': 'Aktionen',
};

export function AccessStatsWidget() {
  const [timeRange, setTimeRange] = useState<TimeRange>('3');

  // Fetch access logs data
  const { data: accessLogs = [], isLoading } = useQuery({
    queryKey: ['user_access_logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_access_logs')
        .select('*');
      
      if (error) throw error;
      return data;
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
              <Activity className="h-5 w-5 text-primary" />
              Access Statistiken
              <span className="ml-2 px-2 py-0.5 text-xs bg-primary/10 text-primary rounded">
                Admin
              </span>
            </CardTitle>
            <CardDescription className="mt-2">
              Benutzeraktivitäten im ausgewählten Zeitraum
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
          <div className="flex-1 flex items-center justify-center">
            <Skeleton className="w-full h-[300px]" />
          </div>
        ) : (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Gesamt Events</p>
                <p className="text-2xl font-bold">{statistics.totalEvents}</p>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Aktive Benutzer</p>
                <p className="text-2xl font-bold">{statistics.uniqueUsers}</p>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Ø Events/Benutzer</p>
                <p className="text-2xl font-bold">{statistics.avgEventsPerUser}</p>
              </div>
            </div>

            {/* Chart */}
            <div className="flex-1 min-h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="eventType" 
                    stroke="hsl(var(--foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--foreground))"
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="anzahl" 
                    name="Anzahl"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Zeitraum: {format(getDateThreshold(), 'dd. MMM yyyy', { locale: de })} - {format(new Date(), 'dd. MMM yyyy', { locale: de })}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
