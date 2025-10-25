import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function GettingStartedWidget() {
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>Erste Schritte</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
          <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
            1
          </div>
          <div>
            <h3 className="font-semibold">Daten hochladen</h3>
            <p className="text-sm text-muted-foreground">
              Beginnen Sie mit dem Upload Ihrer Kundenprojekte und Produktdaten im Datenhub
            </p>
          </div>
        </div>
        
        <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
          <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
            2
          </div>
          <div>
            <h3 className="font-semibold">Daten durchsuchen</h3>
            <p className="text-sm text-muted-foreground">
              Nutzen Sie die Suche, um Cross-Selling und Alternative Produktempfehlungen zu finden
            </p>
          </div>
        </div>
        
        <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
          <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
            3
          </div>
          <div>
            <h3 className="font-semibold">Verkaufschancen nutzen</h3>
            <p className="text-sm text-muted-foreground">
              Analysieren Sie die Vorschläge und kontaktieren Sie Ihre Kunden mit neuen Angeboten
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
