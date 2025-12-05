import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLanguage } from '@/contexts/LanguageContext';

interface StatisticsWidgetProps {
  projects: any[];
  products: any[];
  crossSells: any[];
}

export function StatisticsWidget({ projects, products, crossSells }: StatisticsWidgetProps) {
  const { t } = useLanguage();
  
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
                  <CardTitle className="text-xs">{t('statistics.projects')}</CardTitle>
                </CardHeader>
                <CardContent className="pt-1 text-center">
                  <p className="text-xl font-bold text-primary">{projectCount}</p>
                  <p className="text-2xs text-muted-foreground mt-0.5">{t('statistics.inDatabase')}</p>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="font-semibold text-xs">{t('statistics.projectOverview')}</p>
              <p className="text-xs">{t('statistics.allActiveProjects')}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="shadow-card cursor-help">
                <CardHeader className="py-2 text-center">
                  <CardTitle className="text-xs">{t('statistics.products')}</CardTitle>
                </CardHeader>
                <CardContent className="pt-1 text-center">
                  <p className="text-xl font-bold text-primary">{products?.length || 0}</p>
                  <p className="text-2xs text-muted-foreground mt-0.5">{t('statistics.available')}</p>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="font-semibold text-xs">{t('statistics.productCatalog')}</p>
              <p className="text-xs">{t('statistics.allAvailableProducts')}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="shadow-card cursor-help">
                <CardHeader className="py-2 text-center">
                  <CardTitle className="text-xs">{t('statistics.crossSelling')}</CardTitle>
                </CardHeader>
                <CardContent className="pt-1 text-center">
                  <p className="text-xl font-bold text-primary">{crossSells?.length || 0}</p>
                  <p className="text-2xs text-muted-foreground mt-0.5">{t('statistics.opportunities')}</p>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="font-semibold text-xs">{t('statistics.crossSellingPotential')}</p>
              <p className="text-xs">{t('statistics.identifiedOpportunities')}</p>
            </TooltipContent>
          </Tooltip>
      </div>
    </TooltipProvider>
  );
}