import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, FolderKanban, Package, Users, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';

type ActivityType = 'project' | 'product' | 'customer' | 'optimization';

interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  subtitle?: string;
  timestamp: string;
  icon: any;
  color: string;
}

export function RecentActivityWidget() {
  const { activeTenant } = useAuth();

  // Fetch recent projects
  const { data: recentProjects = [] } = useQuery({
    queryKey: ['recent_projects', activeTenant?.id],
    queryFn: async () => {
      let query = supabase
        .from('customer_projects')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (activeTenant?.id && activeTenant.id !== 'global') {
        query = query.eq('tenant_id', activeTenant.id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch recent products
  const { data: recentProducts = [] } = useQuery({
    queryKey: ['recent_products', activeTenant?.id],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (activeTenant?.id && activeTenant.id !== 'global') {
        query = query.eq('tenant_id', activeTenant.id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch recent customers
  const { data: recentCustomers = [] } = useQuery({
    queryKey: ['recent_customers', activeTenant?.id],
    queryFn: async () => {
      let query = supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (activeTenant?.id && activeTenant.id !== 'global') {
        query = query.eq('tenant_id', activeTenant.id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch recent optimization entries
  const { data: recentOptimizations = [] } = useQuery({
    queryKey: ['recent_optimizations', activeTenant?.id],
    queryFn: async () => {
      let query = supabase
        .from('opps_optimization')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (activeTenant?.id && activeTenant.id !== 'global') {
        query = query.eq('tenant_id', activeTenant.id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = !recentProjects && !recentProducts && !recentCustomers && !recentOptimizations;

  // Combine and sort all activities
  const getActivities = (): Activity[] => {
    const activities: Activity[] = [];

    // Add projects
    recentProjects.forEach((project: any) => {
      activities.push({
        id: project.id,
        type: 'project',
        title: project.project_name,
        subtitle: project.customer,
        timestamp: project.created_at,
        icon: FolderKanban,
        color: 'text-blue-500',
      });
    });

    // Add products
    recentProducts.forEach((product: any) => {
      activities.push({
        id: product.id,
        type: 'product',
        title: product.product,
        subtitle: product.product_family,
        timestamp: product.created_at,
        icon: Package,
        color: 'text-green-500',
      });
    });

    // Add customers
    recentCustomers.forEach((customer: any) => {
      activities.push({
        id: customer.id,
        type: 'customer',
        title: customer.customer_name,
        subtitle: customer.industry,
        timestamp: customer.created_at,
        icon: Users,
        color: 'text-purple-500',
      });
    });

    // Add optimizations
    recentOptimizations.forEach((opt: any) => {
      activities.push({
        id: opt.id,
        type: 'optimization',
        title: `Projekt ${opt.project_number}`,
        subtitle: opt.optimization_status,
        timestamp: opt.created_at,
        icon: TrendingUp,
        color: 'text-orange-500',
      });
    });

    // Sort by timestamp (newest first)
    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
  };

  const activities = getActivities();

  const getTypeLabel = (type: ActivityType): string => {
    switch (type) {
      case 'project': return 'Projekt';
      case 'product': return 'Produkt';
      case 'customer': return 'Kunde';
      case 'optimization': return 'Optimierung';
      default: return type;
    }
  };

  return (
    <Card className="shadow-card h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Kürzliche Aktivitäten
            </CardTitle>
            <CardDescription className="mt-2">
              Die neuesten Änderungen und Hinzufügungen
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Keine kürzlichen Aktivitäten</p>
            <p className="text-sm mt-2">
              Neue Daten werden hier angezeigt, sobald sie hinzugefügt werden
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {activities.map((activity) => {
              const Icon = activity.icon;
              return (
                <div
                  key={`${activity.type}-${activity.id}`}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className={`mt-0.5 ${activity.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {getTypeLabel(activity.type)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.timestamp), {
                          addSuffix: true,
                          locale: de,
                        })}
                      </span>
                    </div>
                    <p className="font-medium text-sm truncate">{activity.title}</p>
                    {activity.subtitle && (
                      <p className="text-xs text-muted-foreground truncate">
                        {activity.subtitle}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
