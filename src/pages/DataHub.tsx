import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, FileSpreadsheet, Trash2, Database } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import FileUploadDialog from '@/components/FileUploadDialog';
import { format } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
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

export default function DataHub() {
  const { isSuperAdmin, activeTenant } = useAuth();
  const { t } = useLanguage();

// Pure tenant-specific data types - ALL uploads are now tenant-specific
const dataTypes = [
  {
    id: 'customer_projects',
    titleKey: 'dataType.customer_projects',
    descKey: 'dataType.customer_projects_desc',
    fields: ['customer', 'project_name', 'application', 'product', 'opportunity_creation_date'],
    icon: FileSpreadsheet,
  },
  {
    id: 'customers',
    titleKey: 'dataType.customers',
    descKey: 'dataType.customers_desc',
    fields: ['customer_name', 'industry', 'country', 'city', 'customer_category'],
    icon: FileSpreadsheet,
  },
  {
    id: 'app_insights',
    titleKey: 'dataType.app_insights',
    descKey: 'dataType.app_insights_desc',
    fields: ['application', 'application_description', 'application_block_diagram', 'application_trends', 'industry', 'product_family_1', 'product_family_2', 'product_family_3', 'product_family_4', 'product_family_5'],
    icon: FileSpreadsheet,
  },
  {
    id: 'applications',
    titleKey: 'dataType.applications',
    descKey: 'dataType.applications_desc',
    fields: ['application', 'related_product'],
    icon: FileSpreadsheet,
  },
  {
    id: 'products',
    titleKey: 'dataType.products',
    descKey: 'dataType.products_desc',
    fields: ['product', 'product_family', 'product_description', 'manufacturer', 'product_price', 'product_inventory', 'product_lead_time', 'product_lifecycle', 'product_new', 'product_top', 'manufacturer_link'],
    icon: FileSpreadsheet,
  },
  {
    id: 'cross_sells',
    titleKey: 'dataType.cross_sells',
    descKey: 'dataType.cross_sells_desc',
    fields: ['application', 'base_product', 'cross_sell_product', 'rec_source', 'rec_score'],
    icon: FileSpreadsheet,
  },
  {
    id: 'product_alternatives',
    titleKey: 'dataType.product_alternatives',
    descKey: 'dataType.product_alternatives_desc',
    fields: ['base_product', 'alternative_product', 'similarity'],
    icon: FileSpreadsheet,
  },
];

export default function DataHub() {
  const { isSuperAdmin, activeTenant } = useAuth();
  const { t } = useLanguage();
  const [uploadHistory, setUploadHistory] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDataType, setSelectedDataType] = useState<any>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [fileName, setFileName] = useState('');
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [deleteTableDialogOpen, setDeleteTableDialogOpen] = useState(false);
  const [tableToDelete, setTableToDelete] = useState<string | null>(null);
  const [selectedUploads, setSelectedUploads] = useState<Set<string>>(new Set());
  const [isRemovingDuplicates, setIsRemovingDuplicates] = useState(false);
  const [targetTenantId, setTargetTenantId] = useState<string | null | undefined>(undefined);

  // Fetch tenants for Super Admin - removed as global uploads are no longer supported

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

  const handleFileSelect = (dataType: any, targetTenant?: string | null) => {
    // Set the target tenant before opening dialog
    setTargetTenantId(targetTenant);
    
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

  const handleRemoveDuplicates = async () => {
    setIsRemovingDuplicates(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('remove-product-duplicates');

      if (error) {
        toast.error('Fehler beim Entfernen von Duplikaten: ' + error.message);
        return;
      }

      if (data.duplicatesRemoved === 0) {
        toast.info('Keine Duplikate gefunden');
      } else {
        toast.success(`${data.duplicatesRemoved} Duplikate wurden erfolgreich entfernt`);
        // Reload upload history if needed
        loadUploadHistory();
      }
    } catch (err) {
      console.error('Error removing duplicates:', err);
      toast.error('Ein unerwarteter Fehler ist aufgetreten');
    } finally {
      setIsRemovingDuplicates(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-medium text-foreground mb-2 font-clash">{t('dataHub.title')}</h1>
          <p className="text-muted-foreground">
            {t('dataHub.description')}
          </p>
        </div>
        <Button
          onClick={handleRemoveDuplicates}
          disabled={isRemovingDuplicates}
          variant="outline"
          className="gap-2"
        >
          <Database className="h-4 w-4" />
          {isRemovingDuplicates ? t('dataHub.processing') : t('dataHub.removeDuplicates')}
        </Button>
      </div>

      {/* Data Upload Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dataTypes.map((dataType) => {
          // All uploads are now tenant-specific
          const targetTenant = activeTenant?.id || null;
          const canUpload = !!activeTenant;

          return (
            <Card key={dataType.id} className="shadow-card hover:shadow-md transition-shadow flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <dataType.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{t(dataType.titleKey)}</CardTitle>
                </div>
                <CardDescription className="text-sm">
                  {t(dataType.descKey)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 mt-auto">
                <Button
                  onClick={() => handleFileSelect(dataType, targetTenant)}
                  className="w-full"
                  variant="outline"
                  disabled={!canUpload}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {t('dataHub.uploadXlsCsv')}
                </Button>
                <Button
                  onClick={() => openDeleteTableDialog(dataType.id)}
                  className="w-full transition-colors hover:bg-destructive hover:text-destructive-foreground"
                  variant="outline"
                >
                  <Database className="mr-2 h-4 w-4" />
                  {t('dataHub.clearTable')}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Upload History */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('dataHub.uploadHistory')}</CardTitle>
              <CardDescription>
                {t('dataHub.uploadHistoryDesc')}
              </CardDescription>
            </div>
            {selectedUploads.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteSelected}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t('dataHub.deleteSelected')} ({selectedUploads.size})
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
                  <th className="text-left p-3 text-sm font-semibold">{t('dataHub.filename')}</th>
                  <th className="text-left p-3 text-sm font-semibold">{t('dataHub.dataType')}</th>
                  <th className="text-left p-3 text-sm font-semibold">{t('dataHub.uploadDate')}</th>
                  <th className="text-left p-3 text-sm font-semibold">{t('dataHub.rowCount')}</th>
                  <th className="text-left p-3 text-sm font-semibold">{t('dataHub.statusLabel')}</th>
                  <th className="text-left p-3 text-sm font-semibold">{t('table.action')}</th>
                </tr>
              </thead>
              <tbody>
                {uploadHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      {t('dataHub.noUploads')}
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
                          {upload.status === 'success' ? t('dataHub.statusSuccess') : t('dataHub.statusFailed')}
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

      <FileUploadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        dataType={selectedDataType}
        parsedData={parsedData}
        fileName={fileName}
        targetTenantId={targetTenantId}
      />

      <AlertDialog open={deleteTableDialogOpen} onOpenChange={setDeleteTableDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tabelle wirklich leeren?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Alle Daten aus der Tabelle
              "{tableToDelete}" werden dauerhaft gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTable} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Tabelle leeren
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
