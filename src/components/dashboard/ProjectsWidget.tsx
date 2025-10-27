import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, Star, Package, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuth } from '@/contexts/AuthContext';

export function ProjectsWidget() {
  const [activeTab, setActiveTab] = useState('recent');
  const { user } = useAuth();
  const { favorites: favoriteIds } = useFavorites('project');

  // Fetch all projects
  const { data: allProjects = [] } = useQuery({
    queryKey: ['customer_projects'],
    queryFn: async () => {
      const { data } = await supabase
        .from('customer_projects')
        .select('*')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  // Fetch recently viewed projects from database
  const { data: recentHistory = [] } = useQuery({
    queryKey: ['user-project-history', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('user_project_history')
        .select('project_id, viewed_at')
        .eq('user_id', user.id)
        .order('viewed_at', { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!user,
  });

  // Get recently viewed projects with full data
  const recentProjects = allProjects.filter((p: any) =>
    recentHistory.some(rh => rh.project_id === p.id)
  ).sort((a: any, b: any) => {
    const aHistory = recentHistory.find(rh => rh.project_id === a.id);
    const bHistory = recentHistory.find(rh => rh.project_id === b.id);
    return new Date(bHistory?.viewed_at || 0).getTime() - new Date(aHistory?.viewed_at || 0).getTime();
  });

  // Get favorite projects with full data
  const favoriteProjects = allProjects.filter((p: any) => favoriteIds.includes(p.id));

  // Get new projects (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const newProjects = allProjects.filter((p: any) => 
    new Date(p.created_at) > sevenDaysAgo
  );

  // Get projects to review (missing application or product info)
  const projectsToReview = allProjects.filter((p: any) => 
    !p.application || !p.product || p.application.trim() === '' || p.product.trim() === ''
  );

  const renderProjectList = (projects: any[]) => {
    if (projects.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Keine Projekte gefunden
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {projects.slice(0, 5).map((project: any) => (
          <Link
            key={project.id}
            to={`/projects?search=${encodeURIComponent(project.project_name)}`}
            className="block p-3 rounded-lg hover:bg-muted transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{project.project_name}</div>
                <div className="text-sm text-muted-foreground truncate">
                  {project.customer}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground whitespace-nowrap">
                {project.application && (
                  <span>App: {project.application}</span>
                )}
                {project.created_at && (
                  <span>{new Date(project.created_at).toLocaleDateString('de-DE')}</span>
                )}
              </div>
            </div>
          </Link>
        ))}
        {projects.length > 5 && (
          <Link
            to="/projects"
            className="block text-center py-2 text-sm text-primary hover:underline"
          >
            Alle {projects.length} Projekte anzeigen
          </Link>
        )}
      </div>
    );
  };

  return (
    <Card className="shadow-card">
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
    </Card>
  );
}
