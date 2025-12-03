import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface StatisticsWidgetProps {
  projects: any[];
  products: any[];
  crossSells: any[];
}

export function StatisticsWidget({ projects, products, crossSells }: StatisticsWidgetProps) {
  // Group projects by customer and project_name (same logic as ProjectsWidget)
  const groupedProjects = projects.reduce((acc: any[], project: any) => {
    const existing = acc.find(
      (p) => p.customer === project.customer && p.project_name === project.project_name
    );
    if (!existing) {
      acc.push({
        ...project,
        sourceIds: [project.id],
      });
    }
    return acc;
  }, []);

  const projectCount = groupedProjects.length;

  return (
    <TooltipProvider delayDuration={0}>
      <div className="grid grid-cols-3 gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="shadow-card cursor-help">
                <CardHeader className="py-2 text-center">
                  <CardTitle className="text-xs">Projekte</CardTitle>
                </CardHeader>
                <CardContent className="pt-1 text-center">
                  <p className="text-xl font-bold text-primary">{projectCount}</p>
                  <p className="text-2xs text-muted-foreground mt-0.5">In der Datenbank</p>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="font-semibold text-xs">Projektübersicht</p>
              <p className="text-xs">Alle aktiven Kundenprojekte in der Datenbank</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="shadow-card cursor-help">
                <CardHeader className="py-2 text-center">
                  <CardTitle className="text-xs">Produkte</CardTitle>
                </CardHeader>
                <CardContent className="pt-1 text-center">
                  <p className="text-xl font-bold text-primary">{products?.length || 0}</p>
                  <p className="text-2xs text-muted-foreground mt-0.5">Verfügbar</p>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="font-semibold text-xs">Produktkatalog</p>
              <p className="text-xs">Alle verfügbaren Produkte für Optimierungen</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="shadow-card cursor-help">
                <CardHeader className="py-2 text-center">
                  <CardTitle className="text-xs">Cross-Selling</CardTitle>
                </CardHeader>
                <CardContent className="pt-1 text-center">
                  <p className="text-xl font-bold text-primary">{crossSells?.length || 0}</p>
                  <p className="text-2xs text-muted-foreground mt-0.5">Möglichkeiten</p>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="font-semibold text-xs">Cross-Selling Potenzial</p>
              <p className="text-xs">Identifizierte Verkaufschancen für zusätzliche Produkte</p>
            </TooltipContent>
          </Tooltip>
      </div>
    </TooltipProvider>
  );
}
