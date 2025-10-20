import { useState } from 'react';
import { Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="p-6 space-y-6">
      {/* Hero Search Section */}
      <div className="bg-gradient-to-br from-primary to-primary-hover rounded-lg p-12 text-white">
        <h1 className="text-4xl font-bold mb-4">Opportunity Optimizer</h1>
        <p className="text-lg mb-8 opacity-90">
          Finden Sie Cross-Selling und Up-Selling Potenziale in Ihren Kundenprojekten
        </p>
        
        <div className="relative max-w-3xl">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Suchen Sie nach Kunden, Projekten, Applikationen oder Produkten..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-lg text-foreground bg-white shadow-lg focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        
        {searchQuery.length >= 3 && (
          <div className="mt-4 bg-white rounded-lg p-4 shadow-lg text-foreground">
            <p className="text-sm text-muted-foreground">
              Suche nach: <span className="font-semibold">{searchQuery}</span>
            </p>
            <div className="mt-2 text-sm text-muted-foreground">
              Keine Ergebnisse gefunden. Laden Sie Daten im Datenhub hoch, um zu beginnen.
            </div>
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Projekte</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">0</p>
            <p className="text-sm text-muted-foreground mt-1">In der Datenbank</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Produkte</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">0</p>
            <p className="text-sm text-muted-foreground mt-1">Verfügbar</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Kunden</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">0</p>
            <p className="text-sm text-muted-foreground mt-1">Registriert</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
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
    </div>
  );
}
