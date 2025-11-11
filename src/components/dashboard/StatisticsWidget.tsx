import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StatisticsWidgetProps {
  projects: any[];
  products: any[];
  crossSells: any[];
}

export function StatisticsWidget({ projects, products, crossSells }: StatisticsWidgetProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="shadow-card">
        <CardHeader className="h-[72px]">
          <CardTitle className="text-lg">Projekte</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-primary">{projects?.length || 0}</p>
          <p className="text-sm text-muted-foreground mt-1">In der Datenbank</p>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader className="h-[72px]">
          <CardTitle className="text-lg">Produkte</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-primary">{products?.length || 0}</p>
          <p className="text-sm text-muted-foreground mt-1">Verfügbar</p>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader className="h-[72px]">
          <CardTitle className="text-lg">Cross-Selling</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-primary">{crossSells?.length || 0}</p>
          <p className="text-sm text-muted-foreground mt-1">Möglichkeiten</p>
        </CardContent>
      </Card>
    </div>
  );
}
