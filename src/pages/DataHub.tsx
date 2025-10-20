import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileSpreadsheet, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const dataTypes = [
  {
    id: 'customer_projects',
    title: 'Kundenprojekte',
    description: 'Kunde, Projektname, Applikation, Produkt',
    icon: FileSpreadsheet,
  },
  {
    id: 'applications',
    title: 'Applikationen',
    description: 'Applikation, zugehöriges_Produkt',
    icon: FileSpreadsheet,
  },
  {
    id: 'products',
    title: 'Produkte',
    description: 'Produkt, Produktfamilie, Produktbeschreibung, Hersteller, Link_Herstellerseite',
    icon: FileSpreadsheet,
  },
  {
    id: 'cross_sells',
    title: 'Cross-Sells',
    description: 'Applikation, Basis_Produkt, Cross_Sell_Produkt',
    icon: FileSpreadsheet,
  },
  {
    id: 'product_alternatives',
    title: 'Produktalternativen',
    description: 'Basis_Produkt, Alternatives_Produkt',
    icon: FileSpreadsheet,
  },
];

export default function DataHub() {
  const handleFileUpload = (dataType: string) => {
    toast.info(`Upload-Funktion für ${dataType} wird implementiert`);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Datenhub</h1>
        <p className="text-muted-foreground">
          Laden Sie Ihre Daten hoch und verwalten Sie Ihre Uploads
        </p>
      </div>

      {/* Upload Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dataTypes.map((dataType) => (
          <Card key={dataType.id} className="shadow-card hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <dataType.icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">{dataType.title}</CardTitle>
              </div>
              <CardDescription className="text-sm">
                {dataType.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => handleFileUpload(dataType.title)}
                className="w-full"
                variant="outline"
              >
                <Upload className="mr-2 h-4 w-4" />
                XLS/CSV hochladen
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Upload History */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Upload-Historie</CardTitle>
          <CardDescription>
            Übersicht Ihrer hochgeladenen Datensätze
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 text-sm font-semibold">Dateiname</th>
                  <th className="text-left p-3 text-sm font-semibold">Datentyp</th>
                  <th className="text-left p-3 text-sm font-semibold">Upload-Datum</th>
                  <th className="text-left p-3 text-sm font-semibold">Anzahl Zeilen</th>
                  <th className="text-left p-3 text-sm font-semibold">Status</th>
                  <th className="text-left p-3 text-sm font-semibold">Aktion</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    Keine Uploads vorhanden. Laden Sie Dateien hoch, um zu beginnen.
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
