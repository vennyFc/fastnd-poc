import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, Plus } from 'lucide-react';

export default function Products() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Produkte</h1>
          <p className="text-muted-foreground">
            Produktkatalog und Halbleiter-Komponenten
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Hinzufügen
        </Button>
      </div>

      {/* Search and Filter */}
      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Produktname, Hersteller oder Produktfamilie suchen..."
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

      {/* Products Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Alle Produkte</CardTitle>
          <CardDescription>
            Halbleiter-Komponenten und Spezifikationen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 text-sm font-semibold">Produkt</th>
                  <th className="text-left p-3 text-sm font-semibold">Produktfamilie</th>
                  <th className="text-left p-3 text-sm font-semibold">Hersteller</th>
                  <th className="text-left p-3 text-sm font-semibold">Beschreibung</th>
                  <th className="text-left p-3 text-sm font-semibold">Link</th>
                  <th className="text-left p-3 text-sm font-semibold">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    Keine Produkte vorhanden. Laden Sie Produktdaten im Datenhub hoch.
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
