import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

interface StatisticsWidgetProps {
  projects: any[];
  products: any[];
  crossSells: any[];
}

// Custom Tooltip Component styled like Shadcn Card
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border shadow-lg rounded-md p-3">
        <p className="font-semibold text-sm mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="h-2 w-2 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <p className="text-sm text-muted-foreground">
              {entry.name}: <span className="font-semibold text-foreground">{entry.value}</span>
            </p>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

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

  // Prepare chart data
  const chartData = [
    { name: 'Projekte', value: projectCount },
    { name: 'Produkte', value: products?.length || 0 },
    { name: 'Cross-Selling', value: crossSells?.length || 0 },
  ];

  return (
    <TooltipProvider delayDuration={0}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="shadow-card cursor-help">
                <CardHeader className="py-3 text-center">
                  <CardTitle className="text-sm">Projekte</CardTitle>
                </CardHeader>
                <CardContent className="pt-2 text-center">
                  <p className="text-2xl font-bold text-primary">{projectCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">In der Datenbank</p>
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
                <CardHeader className="py-3 text-center">
                  <CardTitle className="text-sm">Produkte</CardTitle>
                </CardHeader>
                <CardContent className="pt-2 text-center">
                  <p className="text-2xl font-bold text-primary">{products?.length || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">Verfügbar</p>
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
                <CardHeader className="py-3 text-center">
                  <CardTitle className="text-sm">Cross-Selling</CardTitle>
                </CardHeader>
                <CardContent className="pt-2 text-center">
                  <p className="text-2xl font-bold text-primary">{crossSells?.length || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">Möglichkeiten</p>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="font-semibold">Cross-Selling Potenzial</p>
              <p className="text-sm">Identifizierte Verkaufschancen für zusätzliche Produkte</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Chart with Gradient */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Übersicht</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <defs>
                  <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                <Bar 
                  dataKey="value" 
                  fill="url(#colorBar)" 
                  radius={[8, 8, 0, 0]}
                  name="Anzahl"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
