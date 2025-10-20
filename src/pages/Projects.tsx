import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, Plus, Star } from 'lucide-react';

export default function Projects() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Projekte</h1>
          <p className="text-muted-foreground">
            Übersicht aller Kundenprojekte mit Opportunity-Scores
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Hinzufügen
        </Button>
      </div>

      {/* Search and Filter Bar */}
      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Suchen..."
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
            <Button variant="outline">
              Konfigurieren
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Projects Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Alle Projekte</CardTitle>
          <CardDescription>
            1-20 von 20 Ergebnissen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 text-sm font-semibold">Score</th>
                  <th className="text-left p-3 text-sm font-semibold">Name</th>
                  <th className="text-left p-3 text-sm font-semibold">Kunde</th>
                  <th className="text-left p-3 text-sm font-semibold">Applikation</th>
                  <th className="text-left p-3 text-sm font-semibold">Umsatzpotenzial</th>
                  <th className="text-left p-3 text-sm font-semibold">Erstellt</th>
                  <th className="text-left p-3 text-sm font-semibold">Status</th>
                  <th className="text-left p-3 text-sm font-semibold">Produkte</th>
                  <th className="text-left p-3 text-sm font-semibold">Optionen</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    Keine Projekte vorhanden. Laden Sie Daten im Datenhub hoch, um zu beginnen.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Ergebnisse pro Seite: 25
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>
                Zurück
              </Button>
              <Button variant="outline" size="sm" disabled>
                Weiter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
