import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, Star, Package, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuth } from '@/contexts/AuthContext';
import { format, formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { useProjectHistory } from '@/hooks/useProjectHistory';
export function ProjectsWidget() {
  const [activeTab, setActiveTab] = useState('new');
  const {
    user
  } = useAuth();
  const {
    favorites: favoriteIds
  } = useFavorites('project');
  const { addToHistory } = useProjectHistory();

  // Fetch all projects
  const {
    data: allProjectsRaw = []
  } = useQuery({
    queryKey: ['customer_projects'],
    queryFn: async () => {
      const {
        data
      } = await supabase.from('customer_projects').select('*').order('created_at', {
        ascending: false
      });
      return data || [];
    }
  });

  // Group projects by customer and project_name and track all source IDs
  const allProjects = allProjectsRaw.reduce((acc: any[], project: any) => {
    const existing = acc.find(
      (p) => p.customer === project.customer && p.project_name === project.project_name
    );
    if (existing) {
      // Add application and product if not already included
      if (project.application && !existing.applications?.includes(project.application)) {
        existing.applications = [...(existing.applications || []), project.application];
      }
      if (project.product && !existing.products?.includes(project.product)) {
        existing.products = [...(existing.products || []), project.product];
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
      acc.push({
        ...project,
        applications: project.application ? [project.application] : [],
        products: project.product ? [project.product] : [],
        sourceIds: [project.id],
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
  const recentProjects = allProjects
    .filter((p: any) =>
      recentHistory.some((rh) => (p.sourceIds ? p.sourceIds.includes(rh.project_id) : rh.project_id === p.id))
    )
    .sort((a: any, b: any) => {
      const aTime = Math.max(
        ...recentHistory
          .filter((rh) => (a.sourceIds ? a.sourceIds.includes(rh.project_id) : rh.project_id === a.id))
          .map((rh) => new Date(rh.viewed_at).getTime())
      );
      const bTime = Math.max(
        ...recentHistory
          .filter((rh) => (b.sourceIds ? b.sourceIds.includes(rh.project_id) : rh.project_id === b.id))
          .map((rh) => new Date(rh.viewed_at).getTime())
      );
      return bTime - aTime;
    });

  // Get favorite projects with full data
  const favoriteProjects = allProjects.filter((p: any) => favoriteIds.includes(p.id));

  // Get new projects (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const newProjects = allProjects.filter((p: any) => new Date(p.created_at) > sevenDaysAgo);

  // Fetch optimization records
  const { data: optimizationRecords = [] } = useQuery({
    queryKey: ['opps_optimization'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('opps_optimization')
        .select('*');
      
      if (error) throw error;
      return data as any[];
    },
  });

  const { isFavorite, toggleFavorite } = useFavorites('project');

  // Get projects to review (missing application or product info)
  const projectsToReview = allProjects.filter((p: any) => !p.applications || p.applications.length === 0 || !p.products || p.products.length === 0);
  
  // Get optimization status for a project
  const getOptimizationStatus = (project: any) => {
    const projectOptRecords = optimizationRecords.filter(
      (rec: any) => rec.project_number === project.project_number
    );
    
    if (projectOptRecords.length === 0) {
      return 'Offen';
    }
    
    // Get the most advanced status from all records
    const statusPriority: Record<string, number> = {
      'Abgeschlossen': 5,
      'Validierung': 4,
      'Prüfung': 3,
      'Offen': 2,
      'Neu': 1
    };
    
    const highestStatus = projectOptRecords.reduce((highest, rec: any) => {
      const currentPriority = statusPriority[rec.optimization_status] || 0;
      const highestPriority = statusPriority[highest] || 0;
      return currentPriority > highestPriority ? rec.optimization_status : highest;
    }, 'Offen');
    
    return highestStatus;
  };

  const renderProjectList = (projects: any[], showViewedTime: boolean = false) => {
    if (projects.length === 0) {
      return <div className="text-center py-8 text-muted-foreground text-sm">
          Keine Projekte gefunden
        </div>;
    }
    
    // Helper function to get the most recent viewed_at time for a project
    const getViewedTime = (project: any) => {
      if (!showViewedTime || !recentHistory.length) return null;
      
      const relevantHistories = recentHistory.filter((rh) =>
        project.sourceIds ? project.sourceIds.includes(rh.project_id) : rh.project_id === project.id
      );
      
      if (relevantHistories.length === 0) return null;
      
      const mostRecent = relevantHistories.reduce((latest, current) =>
        new Date(current.viewed_at) > new Date(latest.viewed_at) ? current : latest
      );
      
      return mostRecent.viewed_at;
    };
    return <div className="space-y-1">
        {/* Column Headers */}
        <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground border-b">
          <div className="h-7 w-7" /> {/* Spacer for favorite button */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">Projekt / Kunde</div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="w-24 text-right">Status</span>
                <span className="w-28 text-right">
                  {showViewedTime ? 'Zuletzt angesehen' : 'Erstellt am'}
                </span>
              </div>
            </div>
          </div>
        </div>
        {projects.slice(0, 5).map((project: any) => (
          <div key={project.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors group">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(project.id);
              }}
            >
              <Star
                className={`h-3.5 w-3.5 ${
                  isFavorite(project.id)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-muted-foreground'
                }`}
              />
            </Button>
            <Link 
              to={`/projects?search=${encodeURIComponent(project.project_name)}`} 
              className="flex-1 min-w-0"
              onClick={() => addToHistory(project.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="font-medium text-sm truncate">{project.project_name}</div>
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <Link 
                      to={`/projects?customer=${encodeURIComponent(project.customer)}`}
                      className="text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {project.customer}
                    </Link>
                    {project.applications && project.applications.length > 0 && (
                      <span className="text-muted-foreground">•</span>
                    )}
                    {project.applications && project.applications.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {project.applications.map((appName: string, idx: number) => (
                          <span key={idx}>
                            <span className="text-primary hover:underline cursor-pointer">
                              {appName}
                            </span>
                            {idx < project.applications.length - 1 && ', '}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge 
                    variant={
                      getOptimizationStatus(project) === 'Abgeschlossen' ? 'default' :
                      getOptimizationStatus(project) === 'Validierung' ? 'secondary' :
                      'outline'
                    }
                    className="text-xs whitespace-nowrap"
                  >
                    {getOptimizationStatus(project)}
                  </Badge>
                  {showViewedTime && getViewedTime(project) ? (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(getViewedTime(project)!), { 
                        addSuffix: true, 
                        locale: de 
                      })}
                    </span>
                  ) : project.created_at && !showViewedTime ? (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(project.created_at), 'dd.MM.yyyy')}
                    </span>
                  ) : null}
                </div>
              </div>
            </Link>
          </div>
        ))}
        {projects.length > 5 && <Link to="/projects" className="block text-center py-2 text-sm text-primary hover:underline">
            Alle {projects.length} Projekte anzeigen
          </Link>}
      </div>;
  };
  return <Card className="shadow-card">
      <CardHeader>
        <CardTitle>Projekte</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
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

          <TabsContent value="recent" className="mt-4">
            {renderProjectList(recentProjects, true)}
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