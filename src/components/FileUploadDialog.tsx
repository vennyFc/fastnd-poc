import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface FileUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataType: {
    id: string;
    title: string;
    fields: string[];
  };
  parsedData: any[];
  fileName: string;
}

export default function FileUploadDialog({
  open,
  onOpenChange,
  dataType,
  parsedData,
  fileName,
}: FileUploadDialogProps) {
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);

  const fileColumns = parsedData.length > 0 ? Object.keys(parsedData[0]) : [];

  const handleUpload = async () => {
    // Validate all required fields are mapped
    const unmappedFields = dataType.fields.filter(field => !columnMapping[field]);
    if (unmappedFields.length > 0) {
      toast.error(`Bitte ordnen Sie alle Felder zu: ${unmappedFields.join(', ')}`);
      return;
    }

    setIsUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nicht authentifiziert');

      // Transform data according to mapping
      const transformedData = parsedData.map(row => {
        const transformed: Record<string, any> = { user_id: user.id };
        dataType.fields.forEach(field => {
          const sourceColumn = columnMapping[field];
          if (sourceColumn) {
            let value = (row as Record<string, any>)[sourceColumn];
            
            // Convert similarity to number if present
            if (field === 'similarity' && value !== null && value !== undefined && value !== '') {
              value = parseFloat(value);
              if (isNaN(value)) {
                value = null;
              }
            }
            
            transformed[field] = value;
          }
        });
        return transformed;
      });

      // Insert data based on type
      // @ts-ignore - Supabase types not yet updated
      const { error } = await supabase
        // @ts-ignore
        .from(dataType.id)
        // @ts-ignore
        .insert(transformedData);

      if (error) throw error;

      // Record upload history
      // @ts-ignore - Supabase types not yet updated
      const uploadHistoryData: any = {
        user_id: user.id,
        filename: fileName,
        data_type: dataType.title,
        row_count: parsedData.length,
        status: 'success',
      };
      // @ts-ignore
      await supabase
        // @ts-ignore
        .from('upload_history')
        // @ts-ignore
        .insert(uploadHistoryData);

      toast.success(`${parsedData.length} Einträge erfolgreich hochgeladen`);
      onOpenChange(false);
      window.location.reload();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(`Upload fehlgeschlagen: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Spalten zuordnen - {dataType.title}</DialogTitle>
          <DialogDescription>
            Ordnen Sie die Spalten aus Ihrer Datei den erwarteten Feldern zu
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {dataType.fields.map((field) => (
            <div key={field} className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor={field} className="text-right font-semibold">
                {field}
              </Label>
              <Select
                value={columnMapping[field] || ''}
                onValueChange={(value) =>
                  setColumnMapping({ ...columnMapping, [field]: value })
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Spalte auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {fileColumns.map((col) => (
                    <SelectItem key={col} value={col}>
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleUpload} disabled={isUploading}>
            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Hochladen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
