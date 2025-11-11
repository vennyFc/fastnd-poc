import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp } from 'lucide-react';
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
  'Angeboten': '#8b5cf6',
  'Gewonnen': '#10b981',
  'Verloren': '#ef4444',
};

export function AddedProductsWidget() {
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
    
    // Count cross-sells by status
    const crossSellCounts: Record<string, number> = {};
    const alternativeCounts: Record<string, number> = {};

    optimizationData.forEach((item: any) => {
      // Cross-Sells
      if (item.cross_sell_product_name && item.cross_sell_date_added) {
        const addedDate = new Date(item.cross_sell_date_added);
        if (addedDate >= threshold) {
          const status = item.cross_sell_status || 'Neu';
          crossSellCounts[status] = (crossSellCounts[status] || 0) + 1;
        }
      }

      // Alternatives
      if (item.alternative_product_name && item.alternative_date_added) {
        const addedDate = new Date(item.alternative_date_added);
        if (addedDate >= threshold) {
          const status = item.alternative_status || 'Neu';
          alternativeCounts[status] = (alternativeCounts[status] || 0) + 1;
        }
      }
    });

    // Get all unique statuses
    const allStatuses = new Set([
      ...Object.keys(crossSellCounts),
      ...Object.keys(alternativeCounts),
    ]);

    // Convert to chart format
    const data = Array.from(allStatuses).map((status) => {
      const color = statusColors[status] || '#94a3b8';
      return {
        status,
        crossSells: crossSellCounts[status] || 0,
        alternativen: alternativeCounts[status] || 0,
        fill: color,
      };
    }).sort((a, b) => {
      // Sort by total (descending)
      const totalA = a.crossSells + a.alternativen;
      const totalB = b.crossSells + b.alternativen;
      return totalB - totalA;
    });

    console.log('Chart Data:', data); // Debug log
    return data;
  };

  const chartData = getChartData();
  const totalCrossSells = chartData.reduce((sum, item) => sum + item.crossSells, 0);
  const totalAlternatives = chartData.reduce((sum, item) => sum + item.alternativen, 0);
  const totalProducts = totalCrossSells + totalAlternatives;

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Hinzugefügte Produkte nach Status
            </CardTitle>
            <CardDescription className="mt-2">
              Cross-Sells und Alternativen, die zu Projekten hinzugefügt wurden
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
        ) : totalProducts === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <TrendingUp className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Keine hinzugefügten Produkte im ausgewählten Zeitraum</p>
            <p className="text-sm mt-2">
              Fügen Sie Cross-Sells oder Alternativen zu Projekten hinzu, um sie hier zu sehen
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Gesamt</p>
                <p className="text-2xl font-bold text-foreground">{totalProducts}</p>
              </div>
              <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                <p className="text-xs text-muted-foreground">Cross-Sells</p>
                <p className="text-2xl font-bold" style={{ color: '#3b82f6' }}>{totalCrossSells}</p>
              </div>
              <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)' }}>
                <p className="text-xs text-muted-foreground">Alternativen</p>
                <p className="text-2xl font-bold" style={{ color: '#8b5cf6' }}>{totalAlternatives}</p>
              </div>
            </div>
            
            <ResponsiveContainer width="100%" height={320}>
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
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  formatter={(value) => <span className="text-sm">{value}</span>}
                />
                <Bar 
                  dataKey="crossSells" 
                  name="Cross-Sells"
                  radius={[4, 4, 0, 0]}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cross-${index}`} 
                      fill={statusColors[entry.status] || entry.fill || '#3b82f6'} 
                    />
                  ))}
                </Bar>
                <Bar 
                  dataKey="alternativen" 
                  name="Alternativen"
                  radius={[4, 4, 0, 0]}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`alt-${index}`} 
                      fill={statusColors[entry.status] || entry.fill || '#8b5cf6'}
                      opacity={0.7} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-6">
              <p className="text-sm font-medium mb-3">Verteilung nach Status:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {chartData.map((item) => (
                  <div 
                    key={item.status} 
                    className="p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div 
                        className="h-3 w-3 rounded-full" 
                        style={{ backgroundColor: item.fill }}
                      />
                      <p className="text-sm font-medium">{item.status}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Cross-Sells</p>
                        <p className="font-bold text-lg">{item.crossSells}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Alternativen</p>
                        <p className="font-bold text-lg">{item.alternativen}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-right mt-4">
              Zeitraum: {timeRangeLabels[timeRange]}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
