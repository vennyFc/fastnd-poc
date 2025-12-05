import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, Star, Package, AlertCircle, List } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectHistory } from '@/hooks/useProjectHistory';
import { format } from 'date-fns';
export function ProjectsWidget() {
  const [activeTab, setActiveTab] = useState('alle');
  const {
    user,
    activeTenant,
    isSuperAdmin
  } = useAuth();
  const {
    favorites: favoriteIds
  } = useFavorites('project');
  const {
    addToHistory
  } = useProjectHistory();

  // Fetch all projects (filtered by tenant when a tenant is selected)
  const {
    data: allProjectsRaw = []
  } = useQuery({
    queryKey: ['customer_projects', activeTenant?.id],
    queryFn: async () => {
      let query = supabase.from('customer_projects').select('*');

      // Filter by tenant if a tenant is selected
      if (activeTenant?.id) {
        query = query.eq('tenant_id', activeTenant.id);
      }
      const {
        data
      } = await query.order('created_at', {
        ascending: false
      });
      return data || [];
    },
    enabled: isSuperAdmin || !!activeTenant?.id
  });

  // Group projects by customer and project_name and track all source IDs
  const allProjects = allProjectsRaw.reduce((acc: any[], project: any) => {
    const existing = acc.find(p => p.customer === project.customer && p.project_name === project.project_name);
    if (existing) {
      // Add application and product if not already included
      // Ensure we extract string value in case application is an object
      const appValue = typeof project.application === 'object' ? project.application?.application : project.application;
      if (appValue && !existing.applications?.includes(appValue)) {
        existing.applications = [...(existing.applications || []), String(appValue)];
      }
      const prodValue = typeof project.product === 'object' ? project.product?.product : project.product;
      if (prodValue && !existing.products?.includes(prodValue)) {
        existing.products = [...(existing.products || []), String(prodValue)];
      }
      // Track all project ids that belong to this grouped project
      if (!existing.sourceIds?.includes(project.id)) {
        existing.sourceIds = [...(existing.sourceIds || []), project.id];
      }
      // Keep the earliest created_at date
      if (new Date(project.created_at) < new Date(existing.created_at)) {
        existing.created_at = project.created_at;
      }
    } else {
      // Ensure we extract string values in case they are objects
      const appValue = typeof project.application === 'object' ? project.application?.application : project.application;
      const prodValue = typeof project.product === 'object' ? project.product?.product : project.product;
      acc.push({
        ...project,
        applications: appValue ? [String(appValue)] : [],
        products: prodValue ? [String(prodValue)] : [],
        sourceIds: [project.id]
      });
    }
    return acc;
  }, []);

  // Fetch user preferences for recent limit
  const {
    data: userPreferences
  } = useQuery({
    queryKey: ['user_preferences', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const {
        data
      } = await supabase.from('user_preferences').select('recent_projects_limit').eq('user_id', user.id).maybeSingle();
      return data;
    },
    enabled: !!user
  });

  // Fetch recently viewed projects from database
  const {
    data: recentHistory = []
  } = useQuery({
    queryKey: ['user-project-history', user?.id, userPreferences?.recent_projects_limit],
    queryFn: async () => {
      if (!user) return [];
      const limit = userPreferences?.recent_projects_limit || 10;
      const {
        data
      } = await supabase.from('user_project_history').select('project_id, viewed_at').eq('user_id', user.id).order('viewed_at', {
        ascending: false
      }).limit(limit);
      return data || [];
    },
    enabled: !!user
  });

  // Get recently viewed projects with full data
  const recentProjects = allProjects.filter((p: any) => recentHistory.some(rh => p.sourceIds ? p.sourceIds.includes(rh.project_id) : rh.project_id === p.id)).sort((a: any, b: any) => {
    const aTime = Math.max(...recentHistory.filter(rh => a.sourceIds ? a.sourceIds.includes(rh.project_id) : rh.project_id === a.id).map(rh => new Date(rh.viewed_at).getTime()));
    const bTime = Math.max(...recentHistory.filter(rh => b.sourceIds ? b.sourceIds.includes(rh.project_id) : rh.project_id === b.id).map(rh => new Date(rh.viewed_at).getTime()));
    return bTime - aTime;
  });

  // Get favorite projects with full data
  const favoriteProjects = allProjects.filter((p: any) => p.sourceIds?.some((sourceId: string) => favoriteIds.includes(sourceId)) || favoriteIds.includes(p.id));

  // Fetch optimization records
  const {
    data: optimizationRecords = []
  } = useQuery({
    queryKey: ['opps_optimization', activeTenant?.id],
    queryFn: async () => {
      let query = supabase.from('opps_optimization').select('*');

      // Filter by tenant if a tenant is selected
      if (activeTenant?.id) {
        query = query.or(`tenant_id.eq.${activeTenant.id},tenant_id.is.null`);
      }
      const {
        data,
        error
      } = await query;
      if (error) throw error;
      return data as any[];
    },
    enabled: isSuperAdmin || !!activeTenant?.id
  });

  // Get optimization status for a project
  const getOptimizationStatus = (project: any) => {
    // Find all project_numbers that belong to this grouped project
    const projectNumbers = allProjectsRaw.filter((p: any) => p.customer === project.customer && p.project_name === project.project_name).map((p: any) => p.project_number).filter(Boolean);
    const projectOptRecords = optimizationRecords.filter((rec: any) => projectNumbers.includes(rec.project_number));

    // 1. Manuell gesetzter Status (höchste Priorität, aber NEU kann nicht manuell gesetzt werden)
    const order = ['Neu', 'Offen', 'Prüfung', 'Validierung', 'Abgeschlossen'] as const;
    const manualStatuses = projectOptRecords.map((rec: any) => rec.optimization_status).filter((status: string) => status && status !== 'Neu') as typeof order[number][];
    if (manualStatuses.length > 0) {
      const highest = manualStatuses.reduce((acc, cur) => order.indexOf(cur) > order.indexOf(acc) ? cur : acc, 'Offen' as typeof order[number]);
      return highest;
    }

    // 2. Prüfe ob Projekt < 7 Tage alt UND noch nicht angeschaut → NEU
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const wasViewed = recentHistory.some((rh: any) => project.sourceIds ? project.sourceIds.includes(rh.project_id) : rh.project_id === project.id);
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
    const hasAddedProducts = projectOptRecords.some((rec: any) => rec.cross_sell_product_name || rec.alternative_product_name);
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
  const {
    isFavorite,
    toggleFavorite
  } = useFavorites('project');

  // Get new projects (with status "Neu")
  const newProjects = allProjects.filter((p: any) => getOptimizationStatus(p) === 'Neu');

  // Get projects to review (with status "Prüfung")
  const projectsToReview = allProjects.filter((p: any) => getOptimizationStatus(p) === 'Prüfung');
  const renderProjectList = (projects: any[]) => {
    if (projects.length === 0) {
      return <div className="text-center py-8 text-muted-foreground text-sm">
          Keine Projekte gefunden
        </div>;
    }

    // Helper to get last modified date from optimization records
    const getLastModifiedDate = (project: any) => {
      const projectNumbers = allProjectsRaw
        .filter((p: any) => p.customer === project.customer && p.project_name === project.project_name)
        .map((p: any) => p.project_number)
        .filter(Boolean);
      
      const projectOptRecords = optimizationRecords.filter((rec: any) => 
        projectNumbers.includes(rec.project_number)
      );
      
      if (projectOptRecords.length > 0) {
        const latestDate = projectOptRecords.reduce((latest: Date, rec: any) => {
          const recDate = new Date(rec.updated_at);
          return recDate > latest ? recDate : latest;
        }, new Date(0));
        return latestDate.getTime() > 0 ? latestDate : null;
      }
      return project.created_at ? new Date(project.created_at) : null;
    };

    return <div className="space-y-3">
        {projects.slice(0, 5).map((project: any) => {
          const status = getOptimizationStatus(project);
          const lastModified = getLastModifiedDate(project);
          return (
          <Link 
            key={project.id} 
            to={`/projects?detail=${encodeURIComponent(project.project_name)}`}
            onClick={() => addToHistory(project.sourceIds?.[0] || project.id)}
            className="block p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/30 transition-all group"
          >
            {/* Project Name with Favorite Star */}
            <div className="flex items-center gap-2 mb-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-5 w-5 p-0 opacity-60 group-hover:opacity-100 transition-opacity" 
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  const targetId = project.sourceIds?.[0] || project.id;
                  toggleFavorite(targetId);
                }}
              >
                <Star className={`h-3.5 w-3.5 ${project.sourceIds?.some((sourceId: string) => isFavorite(sourceId)) || isFavorite(project.id) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
              </Button>
              <span className="font-semibold text-sm truncate flex-1">{project.project_name}</span>
            </div>
            
            {/* Metadata Row - all items aligned */}
            <div className="flex items-start gap-8 pl-7">
              <div className="min-w-0 w-[180px]">
                <div className="text-xs text-muted-foreground mb-0.5">Kunde</div>
                <div className="text-sm font-medium truncate">{project.customer}</div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground mb-0.5">Applikation</div>
                <div className="text-sm font-medium truncate">
                  {project.applications && project.applications.length > 0 
                    ? project.applications.join(', ') 
                    : '-'}
                </div>
              </div>
              <div className="shrink-0 w-[85px]">
                <div className="text-xs text-muted-foreground mb-0.5">Erstellt</div>
                <div className="text-sm font-medium">
                  {project.opportunity_creation_date 
                    ? format(new Date(project.opportunity_creation_date), 'dd.MM.yyyy') 
                    : '-'}
                </div>
              </div>
              <div className="shrink-0 w-[85px]">
                <div className="text-xs text-muted-foreground mb-0.5">Geändert</div>
                <div className="text-sm font-medium">
                  {lastModified ? format(lastModified, 'dd.MM.yyyy') : '-'}
                </div>
              </div>
              <div className="shrink-0 w-[100px]">
                <div className="text-xs text-muted-foreground mb-0.5">Status</div>
                <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                  <div className="h-2 w-2 rounded-full animate-pulse bg-emerald-500" />
                  <span className="text-xs">{status}</span>
                </div>
              </div>
            </div>
          </Link>
        )})}
        {projects.length > 5 && (
          <Link to="/projects" className="block text-center py-2 text-xs text-primary hover:underline">
            Alle {projects.length} Projekte anzeigen
          </Link>
        )}
      </div>;
  };
  return <Card className="shadow-card">
      <CardHeader>
        <CardTitle>Projekte</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="alle" className="gap-2">
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Alle</span>
              <Badge variant="secondary" className="ml-1">
                {allProjects.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="recent" className="gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Zuletzt</span>
              <Badge variant="secondary" className="ml-1">
                {recentProjects.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="favorites" className="gap-2">
              <Star className="h-4 w-4" />
              <span className="hidden sm:inline">Favoriten</span>
              <Badge variant="secondary" className="ml-1">
                {favoriteProjects.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="new" className="gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Neu</span>
              <Badge variant="secondary" className="ml-1">
                {newProjects.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="review" className="gap-2">
              <AlertCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Prüfen</span>
              <Badge variant="secondary" className="ml-1">
                {projectsToReview.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="alle" className="mt-4">
            {renderProjectList(allProjects)}
          </TabsContent>

          <TabsContent value="recent" className="mt-4">
            {renderProjectList(recentProjects)}
          </TabsContent>

          <TabsContent value="favorites" className="mt-4">
            {renderProjectList(favoriteProjects)}
          </TabsContent>

          <TabsContent value="new" className="mt-4">
            {renderProjectList(newProjects)}
          </TabsContent>

          <TabsContent value="review" className="mt-4">
            {renderProjectList(projectsToReview)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>;
}