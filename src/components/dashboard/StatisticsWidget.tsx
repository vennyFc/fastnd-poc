import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface StatisticsWidgetProps {
  projects: any[];
  products: any[];
  crossSells: any[];
}

export function StatisticsWidget({ projects, products, crossSells }: StatisticsWidgetProps) {
  return (
    <TooltipProvider delayDuration={0}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="shadow-card cursor-help">
              <CardHeader className="h-[72px] text-center">
                <CardTitle className="text-lg">Projekte</CardTitle>
              </CardHeader>
              <CardContent className="!pt-12 text-center">
                <p className="text-3xl font-bold text-primary">{projects?.length || 0}</p>
                <p className="text-sm text-muted-foreground mt-1">In der Datenbank</p>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="font-semibold">Projektübersicht</p>
            <p className="text-sm">Alle aktiven Kundenprojekte in der Datenbank</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="shadow-card cursor-help">
              <CardHeader className="h-[72px] text-center">
                <CardTitle className="text-lg">Produkte</CardTitle>
              </CardHeader>
              <CardContent className="!pt-12 text-center">
                <p className="text-3xl font-bold text-primary">{products?.length || 0}</p>
                <p className="text-sm text-muted-foreground mt-1">Verfügbar</p>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="font-semibold">Produktkatalog</p>
            <p className="text-sm">Alle verfügbaren Produkte für Optimierungen</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="shadow-card cursor-help">
              <CardHeader className="h-[72px] text-center">
                <CardTitle className="text-lg">Cross-Selling</CardTitle>
              </CardHeader>
              <CardContent className="!pt-12 text-center">
                <p className="text-3xl font-bold text-primary">{crossSells?.length || 0}</p>
                <p className="text-sm text-muted-foreground mt-1">Möglichkeiten</p>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="font-semibold">Cross-Selling Potenzial</p>
            <p className="text-sm">Identifizierte Verkaufschancen für zusätzliche Produkte</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
