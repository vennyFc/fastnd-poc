import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileSpreadsheet, Trash2, Database } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import FileUploadDialog from '@/components/FileUploadDialog';
import { format } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const dataTypes = [
  {
    id: 'customer_projects',
    title: 'Kundenprojekte',
    description: 'Kunde, Projektname, Applikation, Produkt',
    fields: ['customer', 'project_name', 'application', 'product'],
    icon: FileSpreadsheet,
  },
  {
    id: 'customers',
    title: 'Kunden',
    description: 'Kundenname, Branche, Land, Stadt, Kundenkategorie',
    fields: ['customer_name', 'industry', 'country', 'city', 'customer_category'],
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
    description: 'Produkt, Produktfamilie, Produktbeschreibung, Hersteller, Preis, Inventory, Lead_Time, Lifecycle, NPI, Top_Seller, Link_Herstellerseite',
    fields: ['product', 'product_family', 'product_description', 'manufacturer', 'product_price', 'product_inventory', 'product_lead_time', 'product_lifecycle', 'product_new', 'product_top', 'manufacturer_link'],
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
    description: 'Basis_Produkt, Alternatives_Produkt, Similarity',
    fields: ['base_product', 'alternative_product', 'similarity'],
    icon: FileSpreadsheet,
  },
  {
    id: 'app_insights',
    title: 'App Insights',
    description: 'Application, Application_Description, Application_BlockDiagram, Application_Trends, Industry, Product_Family_1-5',
    fields: ['application', 'application_description', 'application_block_diagram', 'application_trends', 'industry', 'product_family_1', 'product_family_2', 'product_family_3', 'product_family_4', 'product_family_5'],
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
  const [deleteTableDialogOpen, setDeleteTableDialogOpen] = useState(false);
  const [tableToDelete, setTableToDelete] = useState<string | null>(null);
  const [selectedUploads, setSelectedUploads] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadUploadHistory();
  }, []);

  const loadUploadHistory = async () => {
    // @ts-ignore - Supabase types not yet updated
    const { data, error } = await supabase
      // @ts-ignore
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
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            defval: '',
            raw: false 
          });
          
          // Debug: Log detected columns
          if (jsonData.length > 0) {
            const detectedColumns = Array.from(new Set(jsonData.flatMap(row => Object.keys(row))));
            console.log('🔍 Detected columns in XLS file:', detectedColumns);
            console.log('📋 Expected fields for', dataType.title, ':', dataType.fields);
            const missingInConfig = detectedColumns.filter(col => !dataType.fields.includes(col));
            const missingInFile = dataType.fields.filter(field => !detectedColumns.includes(field));
            if (missingInConfig.length > 0) {
              console.warn('⚠️ Columns in file but not in config:', missingInConfig);
            }
            if (missingInFile.length > 0) {
              console.warn('⚠️ Fields expected but not in file:', missingInFile);
            }
          }
          
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

    // Optimistically remove from UI
    setUploadHistory(prev => prev.filter(upload => upload.id !== id));

    // @ts-ignore - Supabase types not yet updated
    const { error } = await supabase
      // @ts-ignore
      .from('upload_history')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Fehler beim Löschen');
      // Reload on error to restore correct state
      loadUploadHistory();
      return;
    }

    toast.success('Upload gelöscht');
  };

  const handleDeleteSelected = async () => {
    if (selectedUploads.size === 0) return;
    
    const count = selectedUploads.size;
    if (!confirm(`Möchten Sie ${count} Upload(s) wirklich löschen?`)) return;

    // Optimistically remove from UI
    const idsToDelete = Array.from(selectedUploads);
    setUploadHistory(prev => prev.filter(upload => !selectedUploads.has(upload.id)));
    setSelectedUploads(new Set());

    // @ts-ignore - Supabase types not yet updated
    const { error } = await supabase
      // @ts-ignore
      .from('upload_history')
      .delete()
      .in('id', idsToDelete);

    if (error) {
      toast.error('Fehler beim Löschen der Uploads');
      // Reload on error to restore correct state
      loadUploadHistory();
      return;
    }

    toast.success(`${count} Upload(s) gelöscht`);
  };

  const toggleSelectUpload = (id: string) => {
    setSelectedUploads(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUploads.size === uploadHistory.length) {
      setSelectedUploads(new Set());
    } else {
      setSelectedUploads(new Set(uploadHistory.map(u => u.id)));
    }
  };

  const openDeleteTableDialog = (tableId: string) => {
    setTableToDelete(tableId);
    setDeleteTableDialogOpen(true);
  };

  const handleDeleteTable = async () => {
    if (!tableToDelete) return;

    try {
      // @ts-ignore - Supabase types not yet updated
      const { error: deleteError } = await supabase
        // @ts-ignore
        .from(tableToDelete)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Deletes all rows

      if (deleteError) {
        toast.error(`Fehler beim Löschen der Tabelle: ${deleteError.message}`);
        return;
      }

      // Delete corresponding upload history entries
      // @ts-ignore - Supabase types not yet updated
      const { error: historyError } = await supabase
        // @ts-ignore
        .from('upload_history')
        .delete()
        .eq('data_type', tableToDelete);

      if (historyError) {
        console.error('Error deleting upload history:', historyError);
        toast.warning('Tabelle geleert, aber Upload-Historie konnte nicht aktualisiert werden');
      } else {
        toast.success(`Alle Einträge und Upload-Historie aus "${dataTypes.find(dt => dt.id === tableToDelete)?.title}" wurden gelöscht`);
      }

      loadUploadHistory();
    } catch (err) {
      toast.error('Ein unerwarteter Fehler ist aufgetreten');
      console.error(err);
    } finally {
      setDeleteTableDialogOpen(false);
      setTableToDelete(null);
    }
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
          <Card key={dataType.id} className="shadow-card hover:shadow-md transition-shadow flex flex-col">
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
            <CardContent className="space-y-2 mt-auto">
              <Button
                onClick={() => handleFileSelect(dataType)}
                className="w-full"
                variant="outline"
              >
                <Upload className="mr-2 h-4 w-4" />
                XLS/CSV hochladen
              </Button>
              <Button
                onClick={() => openDeleteTableDialog(dataType.id)}
                className="w-full transition-colors hover:bg-destructive hover:text-destructive-foreground"
                variant="outline"
              >
                <Database className="mr-2 h-4 w-4" />
                Tabelle leeren
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Upload History */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Upload-Historie</CardTitle>
              <CardDescription>
                Übersicht Ihrer hochgeladenen Datensätze
              </CardDescription>
            </div>
            {selectedUploads.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteSelected}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Ausgewählte löschen ({selectedUploads.size})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 text-sm font-semibold w-12">
                    <Checkbox
                      checked={uploadHistory.length > 0 && selectedUploads.size === uploadHistory.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
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
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      Keine Uploads vorhanden. Laden Sie Dateien hoch, um zu beginnen.
                    </td>
                  </tr>
                ) : (
                  uploadHistory.map((upload) => (
                    <tr key={upload.id} className="border-b border-border hover:bg-muted/50">
                      <td className="p-3 text-sm">
                        <Checkbox
                          checked={selectedUploads.has(upload.id)}
                          onCheckedChange={() => toggleSelectUpload(upload.id)}
                        />
                      </td>
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

      <AlertDialog open={deleteTableDialogOpen} onOpenChange={setDeleteTableDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sind Sie absolut sicher?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Alle Einträge in der Tabelle "{dataTypes.find(dt => dt.id === tableToDelete)?.title}" werden permanent gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTable} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Ja, Tabelle leeren
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
