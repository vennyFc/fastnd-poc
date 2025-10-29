import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, Building2 } from 'lucide-react';

export default function Customers() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Kunden</h1>
          <p className="text-muted-foreground">
            Übersicht aller Kunden und deren Projekte
          </p>
        </div>
      </div>

      {/* Search and Filter */}
      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Kundenname suchen..."
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Customers List */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Alle Kunden</CardTitle>
          <CardDescription>
            Kundenübersicht mit Projektanzahl
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 text-sm font-semibold">Kunde</th>
                  <th className="text-left p-3 text-sm font-semibold">Anzahl Projekte</th>
                  <th className="text-left p-3 text-sm font-semibold">Letzte Aktivität</th>
                  <th className="text-left p-3 text-sm font-semibold">Gesamtumsatzpotenzial</th>
                  <th className="text-left p-3 text-sm font-semibold">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    Keine Kunden vorhanden. Kunden werden automatisch aus Projekten extrahiert.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
