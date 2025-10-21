import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileSpreadsheet, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import FileUploadDialog from '@/components/FileUploadDialog';
import { format } from 'date-fns';

const dataTypes = [
  {
    id: 'customer_projects',
    title: 'Kundenprojekte',
    description: 'Kunde, Projektname, Applikation, Produkt',
    fields: ['customer', 'project_name', 'application', 'product'],
    icon: FileSpreadsheet,
  },
  {
    id: 'applications',
    title: 'Applikationen',
    description: 'Applikation, zugehöriges_Produkt',
    fields: ['application', 'related_product'],
    icon: FileSpreadsheet,
  },
  {
    id: 'products',
    title: 'Produkte',
    description: 'Produkt, Produktfamilie, Produktbeschreibung, Hersteller, Link_Herstellerseite',
    fields: ['product', 'product_family', 'product_description', 'manufacturer', 'manufacturer_link'],
    icon: FileSpreadsheet,
  },
  {
    id: 'cross_sells',
    title: 'Cross-Sells',
    description: 'Applikation, Basis_Produkt, Cross_Sell_Produkt',
    fields: ['application', 'base_product', 'cross_sell_product'],
    icon: FileSpreadsheet,
  },
  {
    id: 'product_alternatives',
    title: 'Produktalternativen',
    description: 'Basis_Produkt, Alternatives_Produkt',
    fields: ['base_product', 'alternative_product'],
    icon: FileSpreadsheet,
  },
];

export default function DataHub() {
  const [uploadHistory, setUploadHistory] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDataType, setSelectedDataType] = useState<any>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [fileName, setFileName] = useState('');
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    loadUploadHistory();
  }, []);

  const loadUploadHistory = async () => {
    // @ts-ignore - Supabase types will be updated after migration
    const { data, error } = await supabase
      .from('upload_history')
      .select('*')
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Error loading upload history:', error);
      return;
    }

    setUploadHistory(data || []);
  };

  const handleFileSelect = (dataType: any) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.xls,.xlsx';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setFileName(file.name);
      const reader = new FileReader();

      reader.onload = (event) => {
        const data = event.target?.result;
        
        if (file.name.endsWith('.csv')) {
          Papa.parse(data as string, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              setParsedData(results.data);
              setSelectedDataType(dataType);
              setDialogOpen(true);
            },
            error: (error) => {
              toast.error(`CSV-Parsing-Fehler: ${error.message}`);
            },
          });
        } else {
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          setParsedData(jsonData);
          setSelectedDataType(dataType);
          setDialogOpen(true);
        }
      };

      if (file.name.endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        reader.readAsBinaryString(file);
      }
    };
    input.click();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Möchten Sie diesen Upload wirklich löschen?')) return;

    // @ts-ignore - Supabase types will be updated after migration
    const { error } = await supabase
      .from('upload_history')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Fehler beim Löschen');
      return;
    }

    toast.success('Upload gelöscht');
    loadUploadHistory();
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
                onClick={() => handleFileSelect(dataType)}
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
                {uploadHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      Keine Uploads vorhanden. Laden Sie Dateien hoch, um zu beginnen.
                    </td>
                  </tr>
                ) : (
                  uploadHistory.map((upload) => (
                    <tr key={upload.id} className="border-b border-border hover:bg-muted/50">
                      <td className="p-3 text-sm">{upload.filename}</td>
                      <td className="p-3 text-sm">{upload.data_type}</td>
                      <td className="p-3 text-sm">
                        {format(new Date(upload.uploaded_at), 'dd.MM.yyyy HH:mm')}
                      </td>
                      <td className="p-3 text-sm">{upload.row_count}</td>
                      <td className="p-3 text-sm">
                        <span
                          className={`inline-flex px-2 py-1 text-xs rounded-full ${
                            upload.status === 'success'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {upload.status === 'success' ? 'Erfolgreich' : 'Fehlgeschlagen'}
                        </span>
                      </td>
                      <td className="p-3 text-sm">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(upload.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {selectedDataType && (
        <FileUploadDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          dataType={selectedDataType}
          parsedData={parsedData}
          fileName={fileName}
        />
      )}
    </div>
  );
}
