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
import { format } from 'date-fns';
export function ProjectsWidget() {
  const [activeTab, setActiveTab] = useState('new');
  const {
    user
  } = useAuth();
  const {
    favorites: favoriteIds
  } = useFavorites('project');

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

  // Group projects by customer and project_name
  const allProjects = allProjectsRaw.reduce((acc: any[], project: any) => {
    const existing = acc.find(p => p.customer === project.customer && p.project_name === project.project_name);
    if (existing) {
      // Add application and product if not already included
      if (project.application && !existing.applications?.includes(project.application)) {
        existing.applications = [...(existing.applications || []), project.application];
      }
      if (project.product && !existing.products?.includes(project.product)) {
        existing.products = [...(existing.products || []), project.product];
      }
      // Keep the earliest created_at date
      if (new Date(project.created_at) < new Date(existing.created_at)) {
        existing.created_at = project.created_at;
      }
    } else {
      acc.push({
        ...project,
        applications: project.application ? [project.application] : [],
        products: project.product ? [project.product] : []
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
  const recentProjects = allProjects.filter((p: any) => recentHistory.some(rh => rh.project_id === p.id)).sort((a: any, b: any) => {
    const aHistory = recentHistory.find(rh => rh.project_id === a.id);
    const bHistory = recentHistory.find(rh => rh.project_id === b.id);
    return new Date(bHistory?.viewed_at || 0).getTime() - new Date(aHistory?.viewed_at || 0).getTime();
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
  
  // Calculate project optimization status
  const calculateProjectStatus = (project: any) => {
    const projectOptRecords = optimizationRecords.filter(
      (rec: any) => rec.project_number === project.project_number
    );
    
    if (projectOptRecords.length === 0) {
      return 'Offen';
    }
    
    // Registriert: Has at least one cross-sell or alternative with "Registriert" status
    const hasRegistered = projectOptRecords.some((rec: any) => 
      rec.cross_sell_status === 'Registriert' || rec.alternative_status === 'Registriert'
    );
    if (hasRegistered) {
      return 'Registriert';
    }
    
    // Akzeptiert: Has at least one cross-sell or alternative with "Akzeptiert" status
    const hasAccepted = projectOptRecords.some((rec: any) => 
      rec.cross_sell_status === 'Akzeptiert' || rec.alternative_status === 'Akzeptiert'
    );
    if (hasAccepted) {
      return 'Akzeptiert';
    }
    
    // Vorgeschlagen: Has at least one cross-sell or alternative with "Vorgeschlagen" status
    const hasSuggested = projectOptRecords.some((rec: any) => 
      rec.cross_sell_status === 'Vorgeschlagen' || rec.alternative_status === 'Vorgeschlagen'
    );
    if (hasSuggested) {
      return 'Vorgeschlagen';
    }
    
    // Identifiziert: Has at least one cross-sell or alternative with "Identifiziert" status
    const hasIdentified = projectOptRecords.some((rec: any) => 
      rec.cross_sell_status === 'Identifiziert' || rec.alternative_status === 'Identifiziert'
    );
    if (hasIdentified) {
      return 'Identifiziert';
    }
    
    // Neu: Has recently added cross-sell/alternative (within last 7 days)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const newestRecord = projectOptRecords
      .filter((rec: any) => rec.cross_sell_date_added || rec.alternative_date_added)
      .sort((a: any, b: any) => {
        const dateA = new Date(a.cross_sell_date_added || a.alternative_date_added);
        const dateB = new Date(b.cross_sell_date_added || b.alternative_date_added);
        return dateB.getTime() - dateA.getTime();
      })[0];
    
    if (newestRecord) {
      const addedDate = new Date(newestRecord.cross_sell_date_added || newestRecord.alternative_date_added);
      if (addedDate > oneWeekAgo) {
        return 'Neu';
      }
    }
    
    // Default: Prüfung
    return 'Prüfung';
  };

  const renderProjectList = (projects: any[]) => {
    if (projects.length === 0) {
      return <div className="text-center py-8 text-muted-foreground text-sm">
          Keine Projekte gefunden
        </div>;
    }
    return <div className="space-y-1">
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
              onClick={() => {
                if (user) {
                  supabase.from('user_project_history').upsert([{
                    user_id: user.id,
                    project_id: project.id,
                    viewed_at: new Date().toISOString()
                  }], {
                    onConflict: 'user_id,project_id'
                  });
                }
              }}
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
                      calculateProjectStatus(project) === 'Registriert' ? 'default' :
                      calculateProjectStatus(project) === 'Akzeptiert' ? 'secondary' :
                      'outline'
                    }
                    className="text-xs whitespace-nowrap"
                  >
                    {calculateProjectStatus(project)}
                  </Badge>
                  {project.created_at && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(project.created_at), 'dd.MM.yyyy')}
                    </span>
                  )}
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