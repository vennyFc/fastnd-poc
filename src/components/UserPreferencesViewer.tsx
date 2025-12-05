import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Settings, User, Eye, EyeOff } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function UserPreferencesViewer() {
  const { activeTenant } = useAuth();
  const { t, language } = useLanguage();

  // Fetch all users in the tenant
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['tenant-users', activeTenant?.id],
    queryFn: async () => {
      if (!activeTenant?.id) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('tenant_id', activeTenant.id)
        .order('email');

      if (error) throw error;
      return data || [];
    },
    enabled: !!activeTenant?.id,
  });

  // Fetch all dashboard settings for the tenant
  const { data: dashboardSettings, isLoading: dashboardLoading } = useQuery({
    queryKey: ['tenant-dashboard-settings', activeTenant?.id],
    queryFn: async () => {
      if (!activeTenant?.id) return [];

      const { data, error } = await supabase
        .from('user_dashboard_settings')
        .select('*')
        .eq('tenant_id', activeTenant.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!activeTenant?.id,
  });

  // Fetch all column settings for the tenant
  const { data: columnSettings, isLoading: columnLoading } = useQuery({
    queryKey: ['tenant-column-settings', activeTenant?.id],
    queryFn: async () => {
      if (!activeTenant?.id) return [];

      const { data, error } = await supabase
        .from('user_column_settings')
        .select('*')
        .eq('tenant_id', activeTenant.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!activeTenant?.id,
  });

  const isLoading = usersLoading || dashboardLoading || columnLoading;

  // Combine data
  const usersWithSettings = users?.map(user => {
    const userDashboardSettings = dashboardSettings?.filter(s => s.user_id === user.id) || [];
    const userColumnSettings = columnSettings?.filter(s => s.user_id === user.id) || [];
    
    return {
      ...user,
      dashboardSettings: userDashboardSettings,
      columnSettings: userColumnSettings,
    };
  }) || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t('userPrefsViewer.title')}</h2>
        <p className="text-muted-foreground mt-2">
          {t('userPrefsViewer.description')}
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{t('userPrefsViewer.usersWithDashboard')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {usersWithSettings.filter(u => u.dashboardSettings.length > 0).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('userPrefsViewer.ofUsers').replace('{count}', usersWithSettings.length.toString())}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{t('userPrefsViewer.usersWithColumns')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {usersWithSettings.filter(u => u.columnSettings.length > 0).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('userPrefsViewer.ofUsers').replace('{count}', usersWithSettings.length.toString())}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{t('userPrefsViewer.totalSettings')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {(dashboardSettings?.length || 0) + (columnSettings?.length || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('userPrefsViewer.configurations')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Users with Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t('userPrefsViewer.userOverview')}</CardTitle>
          <CardDescription>
            {t('userPrefsViewer.userOverviewDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {usersWithSettings.map(user => (
                <Card key={user.id} className="border-muted">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <CardTitle className="text-base">{user.full_name || user.email}</CardTitle>
                          <CardDescription className="text-xs">{user.email}</CardDescription>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={user.dashboardSettings.length > 0 ? "default" : "outline"}>
                          {user.dashboardSettings.length} {t('userPrefsViewer.dashboard')}
                        </Badge>
                        <Badge variant={user.columnSettings.length > 0 ? "default" : "outline"}>
                          {user.columnSettings.length} {t('userPrefsViewer.columns')}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  
                  {(user.dashboardSettings.length > 0 || user.columnSettings.length > 0) && (
                    <CardContent>
                      <Tabs defaultValue="dashboard" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="dashboard" className="text-xs">
                            {t('userPrefsViewer.dashboard')} ({user.dashboardSettings.length})
                          </TabsTrigger>
                          <TabsTrigger value="columns" className="text-xs">
                            {t('userPrefsViewer.columns')} ({user.columnSettings.length})
                          </TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="dashboard" className="mt-4">
                          {user.dashboardSettings.length === 0 ? (
                            <p className="text-sm text-muted-foreground">{t('userPrefsViewer.noDashboardSettings')}</p>
                          ) : (
                            <div className="space-y-3">
                              {user.dashboardSettings.map(setting => {
                                const widgets = (setting.settings as any[]) || [];
                                return (
                                  <div key={setting.id} className="border rounded-lg p-3 bg-muted/30">
                                    <p className="text-xs text-muted-foreground mb-2">
                                      {t('userPrefsViewer.lastUpdated')}: {new Date(setting.updated_at).toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US')}
                                    </p>
                                    <div className="space-y-1">
                                      {widgets.map((widget: any, idx: number) => (
                                        <div key={idx} className="flex items-center justify-between text-sm py-1">
                                          <div className="flex items-center gap-2">
                                            {widget.visible ? (
                                              <Eye className="h-3 w-3 text-primary" />
                                            ) : (
                                              <EyeOff className="h-3 w-3 text-muted-foreground" />
                                            )}
                                            <span className={widget.visible ? "" : "text-muted-foreground"}>
                                              {widget.type}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-xs">
                                              {t('userPrefsViewer.position')} {widget.order}
                                            </Badge>
                                            <Badge variant="outline" className="text-xs">
                                              {widget.size}
                                            </Badge>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </TabsContent>
                        
                        <TabsContent value="columns" className="mt-4">
                          {user.columnSettings.length === 0 ? (
                            <p className="text-sm text-muted-foreground">{t('userPrefsViewer.noColumnSettings')}</p>
                          ) : (
                            <div className="space-y-3">
                              {user.columnSettings.map(setting => {
                                const columns = (setting.settings as any[]) || [];
                                const visibleColumns = columns.filter(c => c.visible);
                                return (
                                  <div key={setting.id} className="border rounded-lg p-3 bg-muted/30">
                                    <div className="flex items-center justify-between mb-2">
                                      <p className="text-sm font-medium">{setting.table_name}</p>
                                      <Badge variant="outline" className="text-xs">
                                        {visibleColumns.length}/{columns.length} {t('userPrefsViewer.visible')}
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-2">
                                      {t('userPrefsViewer.lastUpdated')}: {new Date(setting.updated_at).toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US')}
                                    </p>
                                    <div className="space-y-1">
                                      {columns.slice(0, 5).map((column: any, idx: number) => (
                                        <div key={idx} className="flex items-center justify-between text-xs py-1">
                                          <div className="flex items-center gap-2">
                                            {column.visible ? (
                                              <Eye className="h-3 w-3 text-primary" />
                                            ) : (
                                              <EyeOff className="h-3 w-3 text-muted-foreground" />
                                            )}
                                            <span className={column.visible ? "" : "text-muted-foreground"}>
                                              {column.label}
                                            </span>
                                          </div>
                                          <span className="text-muted-foreground">
                                            {column.width}px
                                          </span>
                                        </div>
                                      ))}
                                      {columns.length > 5 && (
                                        <p className="text-xs text-muted-foreground pt-1">
                                          {t('userPrefsViewer.andMore').replace('{count}', (columns.length - 5).toString())}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
