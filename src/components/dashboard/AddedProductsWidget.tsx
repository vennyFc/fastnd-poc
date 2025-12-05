import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp } from 'lucide-react';
import { subMonths } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

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

const statusColors: Record<string, string> = {
  'Neu': '#3b82f6',           // Blue
  'Offen': '#f97316',         // Orange
  'Prüfung': '#0d9488',       // Teal/Petrol
  'Validierung': '#eab308',   // Yellow
  'Abgeschlossen': '#10b981', // Green
  'Identifiziert': '#0d9488', // Teal (same as Prüfung)
  'Vorgeschlagen': '#eab308', // Yellow (same as Validierung)
  'Akzeptiert': '#10b981',    // Green (same as Abgeschlossen)
  'Registriert': '#8b5cf6',   // Purple
  'Abgelehnt': '#ef4444',     // Red
};

const statusOrder = ['Identifiziert', 'Vorgeschlagen', 'Akzeptiert', 'Registriert', 'Abgelehnt'];

export function AddedProductsWidget() {
  const [timeRange, setTimeRange] = useState<TimeRange>('3');
  const { activeTenant } = useAuth();
  const { t } = useLanguage();

  const timeRangeLabels: Record<TimeRange, string> = {
    '1': t('addedProducts.1month'),
    '3': t('addedProducts.3months'),
    '6': t('addedProducts.6months'),
    '12': t('addedProducts.12months'),
  };

  const statusLabels: Record<string, string> = {
    'Identifiziert': t('productStatus.identified'),
    'Vorgeschlagen': t('productStatus.suggested'),
    'Akzeptiert': t('productStatus.accepted'),
    'Registriert': t('productStatus.registered'),
    'Abgelehnt': t('productStatus.rejected'),
    'Neu': t('status.new'),
  };

  // Fetch opps_optimization data
  const { data: optimizationData = [], isLoading } = useQuery({
    queryKey: ['opps_optimization', activeTenant?.id],
    queryFn: async () => {
      let query = supabase
        .from('opps_optimization')
        .select('*');
      
      // Filter by tenant: if 'global', get all; if specific tenant, filter by it
      if (activeTenant?.id && activeTenant.id !== 'global') {
        query = query.eq('tenant_id', activeTenant.id);
      }
      // For 'global', no filter is applied - get all tenants
      
      const { data, error } = await query;
      
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
      // Sort by predefined status order
      const orderA = statusOrder.indexOf(a.status);
      const orderB = statusOrder.indexOf(b.status);
      
      // If status is in the order array, use its position
      // Otherwise, put it at the end
      if (orderA !== -1 && orderB !== -1) {
        return orderA - orderB;
      }
      if (orderA !== -1) return -1;
      if (orderB !== -1) return 1;
      
      // For statuses not in the order array, sort by total (descending)
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
    <Card className="shadow-card h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {t('addedProducts.title')}
            </CardTitle>
            <CardDescription className="mt-1">
              {t('addedProducts.description')}
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
        ) : totalProducts === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium">{t('addedProducts.noProducts')}</p>
            <p className="text-xs mt-1">
              {t('addedProducts.addProductsHint')}
            </p>
          </div>
        ) : (
          <>
            <div className="mb-3 grid grid-cols-3 gap-3 min-h-[72px]">
              <div className="text-center p-2 rounded-lg bg-muted/50 flex flex-col justify-center">
                <p className="text-2xs text-muted-foreground">{t('addedProducts.total')}</p>
                <p className="text-xl font-bold text-foreground">{totalProducts}</p>
              </div>
              <div className="text-center p-2 rounded-lg flex flex-col justify-center" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                <p className="text-2xs text-muted-foreground">{t('addedProducts.crossSells')}</p>
                <p className="text-xl font-bold" style={{ color: '#3b82f6' }}>{totalCrossSells}</p>
              </div>
              <div className="text-center p-2 rounded-lg flex flex-col justify-center" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)' }}>
                <p className="text-2xs text-muted-foreground">{t('addedProducts.alternatives')}</p>
                <p className="text-xl font-bold" style={{ color: '#8b5cf6' }}>{totalAlternatives}</p>
              </div>
            </div>
            
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData} margin={{ top: 15, right: 20, left: 15, bottom: 5 }}>
                <defs>
                  {chartData.map((item) => {
                    const gradientId = `gradient-${item.status.replace(/\s+/g, '-')}`;
                    const color = statusColors[item.status] || '#94a3b8';
                    return (
                      <linearGradient key={gradientId} id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.9}/>
                        <stop offset="95%" stopColor={color} stopOpacity={0.1}/>
                      </linearGradient>
                    );
                  })}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="status" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  stroke="hsl(var(--border))"
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  stroke="hsl(var(--border))"
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="crossSells" 
                  name="Cross-Sells"
                  radius={[4, 4, 0, 0]}
                >
                  {chartData.map((item, index) => (
                    <Cell key={`cross-${index}`} fill={`url(#gradient-${item.status.replace(/\s+/g, '-')})`} />
                  ))}
                </Bar>
                <Bar 
                  dataKey="alternativen" 
                  name="Alternativen"
                  radius={[4, 4, 0, 0]}
                >
                  {chartData.map((item, index) => (
                    <Cell key={`alt-${index}`} fill={`url(#gradient-${item.status.replace(/\s+/g, '-')})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-4">
              <p className="text-xs font-medium mb-2">{t('addedProducts.distributionByStatus')}:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {chartData.map((item) => (
                  <div 
                    key={item.status} 
                    className="p-2 rounded-lg border"
                    style={{ backgroundColor: `${item.fill}10` }}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <div 
                        className="h-2 w-2 rounded-full" 
                        style={{ backgroundColor: statusColors[item.status] || item.fill }}
                      />
                      <p className="text-xs font-medium">{statusLabels[item.status] || item.status}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-2xs">
                      <div>
                        <p className="text-muted-foreground">{t('addedProducts.crossSells')}</p>
                        <p className="font-bold text-base">{item.crossSells}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t('addedProducts.alternatives')}</p>
                        <p className="font-bold text-base">{item.alternativen}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
