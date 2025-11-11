import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from 'lucide-react';
import { subMonths } from 'date-fns';

type TimeRange = '1' | '3' | '6' | '12';

const timeRangeLabels: Record<TimeRange, string> = {
  '1': '1 Monat',
  '3': '3 Monate',
  '6': '6 Monate',
  '12': '12 Monate',
};

const statusColors: Record<string, string> = {
  'Neu': '#3b82f6',
  'In Bearbeitung': '#f59e0b',
  'Abgeschlossen': '#10b981',
  'Abgelehnt': '#ef4444',
};

const statusLabels: Record<string, string> = {
  'Neu': 'Neu',
  'In Bearbeitung': 'In Bearbeitung',
  'Abgeschlossen': 'Abgeschlossen',
  'Abgelehnt': 'Abgelehnt',
};

export function OptimizationStatusWidget() {
  const [timeRange, setTimeRange] = useState<TimeRange>('3');

  // Fetch opps_optimization data
  const { data: optimizationData = [], isLoading } = useQuery({
    queryKey: ['opps_optimization'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('opps_optimization')
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
    const filteredData = optimizationData.filter((item: any) => {
      const createdDate = new Date(item.created_at);
      return createdDate >= threshold;
    });

    // Count by status
    const statusCounts: Record<string, number> = {
      'Neu': 0,
      'In Bearbeitung': 0,
      'Abgeschlossen': 0,
      'Abgelehnt': 0,
    };

    filteredData.forEach((item: any) => {
      const status = item.optimization_status || 'Neu';
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

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Projekte nach Optimierungsstatus
            </CardTitle>
            <CardDescription className="mt-2">
              Verteilung der Projekte nach Status im ausgewählten Zeitraum
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
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : totalProjects === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Keine Projekte im ausgewählten Zeitraum</p>
            <p className="text-sm mt-2">
              Versuchen Sie einen längeren Zeitraum oder laden Sie Projektdaten hoch
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Gesamt: <span className="font-bold text-foreground">{totalProjects}</span> Projekte
              </p>
              <p className="text-xs text-muted-foreground">
                Zeitraum: {timeRangeLabels[timeRange]}
              </p>
            </div>
            
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
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
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Bar 
                  dataKey="anzahl" 
                  name="Anzahl Projekte"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
              {chartData.map((item) => (
                <div 
                  key={item.status} 
                  className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                >
                  <div 
                    className="h-3 w-3 rounded-full" 
                    style={{ backgroundColor: item.fill }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{item.status}</p>
                    <p className="text-lg font-bold">{item.anzahl}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
