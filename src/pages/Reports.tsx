import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { BarChart3, PieChart, TrendingUp, FileText } from 'lucide-react';

export default function Reports() {
  const { t } = useLanguage();

  const reportCards = [
    {
      title: 'Projekt-Übersicht',
      description: 'Zusammenfassung aller Projekte nach Status und Phase',
      icon: BarChart3,
      color: 'text-blue-500',
    },
    {
      title: 'Produkt-Analyse',
      description: 'Produktverteilung und Cross-Sell Möglichkeiten',
      icon: PieChart,
      color: 'text-green-500',
    },
    {
      title: 'Umsatz-Trends',
      description: 'Umsatzentwicklung und Forecasts',
      icon: TrendingUp,
      color: 'text-purple-500',
    },
    {
      title: 'Kunden-Berichte',
      description: 'Kundenaktivitäten und Engagement',
      icon: FileText,
      color: 'text-orange-500',
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground mt-2">
            Übersicht und Analyse Ihrer Geschäftsdaten
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {reportCards.map((report) => (
          <Card key={report.title} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-muted ${report.color}`}>
                  <report.icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg">{report.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>{report.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Verfügbare Reports</CardTitle>
          <CardDescription>
            Wählen Sie einen Berichtstyp aus, um detaillierte Analysen anzuzeigen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>Wählen Sie einen Report aus den Karten oben aus</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
