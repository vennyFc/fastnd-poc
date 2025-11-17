import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';

// Validation schemas for global data types
const globalProductSchema = z.object({
  product: z.string().trim().min(1, 'Product name required').max(255, 'Product name too long'),
  product_family: z.string().trim().max(100, 'Product family too long').nullable(),
  product_description: z.string().trim().max(2000, 'Description too long (max 2000 chars)').nullable(),
  manufacturer: z.string().trim().max(255, 'Manufacturer too long').nullable(),
  product_price: z.number().nonnegative('Price must be positive').nullable(),
  product_inventory: z.number().int('Inventory must be integer').nonnegative('Inventory must be positive').nullable(),
  product_lead_time: z.number().int('Lead time must be integer').nonnegative('Lead time must be positive').nullable(),
  product_lifecycle: z.enum(['Coming Soon', 'Active', 'NFND', 'Discontinued']).nullable(),
  product_new: z.string().max(10).nullable(),
  product_top: z.string().max(10).nullable(),
  manufacturer_link: z.string().trim().url('Invalid URL format').max(500, 'URL too long').or(z.literal('')).nullable(),
  upload_id: z.string().uuid(),
}).passthrough();

const globalApplicationSchema = z.object({
  application: z.string().trim().min(1, 'Application required').max(255, 'Application too long'),
  related_product: z.string().trim().min(1, 'Related product required').max(255, 'Related product too long'),
  upload_id: z.string().uuid(),
}).passthrough();

const schemaMap: Record<string, z.ZodSchema> = {
  'global_products': globalProductSchema,
  'global_applications': globalApplicationSchema,
};

// Normalize string for comparison
const normalize = (str: string): string => {
  return str
    .toLowerCase()
    .replace(/[_\s-]/g, '')
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ß/g, 'ss');
};

// Calculate similarity between two strings
const calculateSimilarity = (str1: string, str2: string): number => {
  const s1 = normalize(str1);
  const s2 = normalize(str2);
  
  // Exact match after normalization
  if (s1 === s2) return 1;
  
  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.8;
  }
  
  // Levenshtein distance-based similarity
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1;
  
  const editDistance = (s1: string, s2: string): number => {
    const costs: number[] = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  };
  
  return (longer.length - editDistance(longer, shorter)) / longer.length;
};

// Find best matching column for a field
const findBestMatch = (field: string, columns: string[]): string | null => {
  let bestMatch: string | null = null;
  let bestScore = 0;
  const threshold = 0.6; // Minimum similarity threshold
  
  for (const column of columns) {
    const score = calculateSimilarity(field, column);
    if (score > bestScore && score >= threshold) {
      bestScore = score;
      bestMatch = column;
    }
  }
  
  return bestMatch;
};

interface GlobalFileUploadDialogProps {
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

export default function GlobalFileUploadDialog({
  open,
  onOpenChange,
  dataType,
  parsedData,
  fileName,
}: GlobalFileUploadDialogProps) {
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);

  // Collect all unique columns from all rows, not just the first one
  const fileColumns = parsedData.length > 0 
    ? Array.from(new Set(parsedData.flatMap(row => Object.keys(row))))
    : [];

  // Auto-map columns when dialog opens or data changes
  useEffect(() => {
    if (open && fileColumns.length > 0 && dataType.fields.length > 0) {
      console.log('🔧 GlobalFileUploadDialog - Auto-mapping columns');
      console.log('📁 File columns:', fileColumns);
      console.log('📝 Required fields:', dataType.fields);
      
      const autoMapping: Record<string, string> = {};
      const usedColumns = new Set<string>();
      
      // First pass: find best matches for each field
      dataType.fields.forEach(field => {
        const bestMatch = findBestMatch(field, fileColumns);
        if (bestMatch && !usedColumns.has(bestMatch)) {
          autoMapping[field] = bestMatch;
          usedColumns.add(bestMatch);
          console.log(`✅ Auto-mapped: ${field} -> ${bestMatch}`);
        } else {
          console.log(`❌ No match found for: ${field}`);
        }
      });
      
      setColumnMapping(autoMapping);
      
      // Show toast if auto-mapping was successful
      const mappedCount = Object.keys(autoMapping).length;
      if (mappedCount > 0) {
        toast.success(`${mappedCount} von ${dataType.fields.length} Spalten automatisch zugeordnet`);
      }
      
      // Warn about unmapped fields
      const unmappedFields = dataType.fields.filter(f => !autoMapping[f]);
      if (unmappedFields.length > 0) {
        console.warn('⚠️ Unmapped required fields:', unmappedFields);
      }
    }
  }, [open, fileColumns.length, dataType.fields]);

  const handleUpload = async () => {
    // Validate all required fields are mapped
    const unmappedFields = dataType.fields.filter(field => !columnMapping[field]);
    if (unmappedFields.length > 0) {
      toast.error(`Bitte ordnen Sie alle Felder zu: ${unmappedFields.join(', ')}`);
      return;
    }

    setIsUploading(true);

    try {
      // Verify session before upload
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Keine aktive Sitzung. Bitte melden Sie sich erneut an.');
      }

      // First, create upload history entry to get upload_id
      const { data: uploadHistoryData, error: historyError } = await supabase
        .from('upload_history')
        .insert({
          user_id: session.user.id,
          filename: fileName,
          data_type: dataType.title,
          row_count: parsedData.length,
          status: 'success',
        })
        .select()
        .single();

      if (historyError) {
        console.error('History error:', historyError);
        throw historyError;
      }
      const uploadId = uploadHistoryData.id;

      // Transform data according to mapping and add upload_id (NO tenant_id for global data)
      const transformedData = parsedData.map(row => {
        const transformed: Record<string, any> = { 
          upload_id: uploadId
        };
        dataType.fields.forEach(field => {
          const sourceColumn = columnMapping[field];
          if (sourceColumn) {
            let value = (row as Record<string, any>)[sourceColumn];
            
            // Handle empty values - convert to null
            if (value === null || value === undefined || value === '') {
              value = null;
            } else {
              // Convert numeric product fields
              if (field === 'product_price' || field === 'product_inventory' || field === 'product_lead_time') {
                value = parseFloat(value);
                if (isNaN(value)) {
                  value = null;
                }
              }
              
              // Handle product_new and product_top - convert to 'Y' or empty
              if (field === 'product_new' || field === 'product_top') {
                if (value && (value.toString().toLowerCase() === 'y' || value.toString().toLowerCase() === 'yes' || value.toString() === '1')) {
                  value = 'Y';
                } else {
                  value = null;
                }
              }
              
              // Trim string values
              if (typeof value === 'string') {
                value = value.trim();
              }
            }
            
            transformed[field] = value;
          }
        });
        return transformed;
      });

      console.log('🔄 Transformed data (first 3 rows):', transformedData.slice(0, 3));

      // Validate data
      const schema = schemaMap[dataType.id];
      if (!schema) {
        throw new Error(`No validation schema found for data type: ${dataType.id}`);
      }

      // Validate each row
      const validationErrors: string[] = [];
      transformedData.forEach((row, index) => {
        try {
          schema.parse(row);
        } catch (error) {
          if (error instanceof z.ZodError) {
            validationErrors.push(`Zeile ${index + 1}: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
          }
        }
      });

      if (validationErrors.length > 0) {
        console.error('Validation errors:', validationErrors);
        toast.error('Validierungsfehler', {
          description: validationErrors.slice(0, 3).join('\n') + (validationErrors.length > 3 ? '\n...' : ''),
        });
        return;
      }

      // Insert data into the appropriate table
      let insertError;
      if (dataType.id === 'global_products') {
        const { error } = await supabase
          .from('global_products')
          .insert(transformedData as any);
        insertError = error;
      } else if (dataType.id === 'global_applications') {
        const { error } = await supabase
          .from('global_applications')
          .insert(transformedData as any);
        insertError = error;
      }

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }

      toast.success('Daten erfolgreich hochgeladen', {
        description: `${transformedData.length} Zeilen wurden importiert`,
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Fehler beim Hochladen', {
        description: error.message || 'Unbekannter Fehler',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Spalten zuordnen - {dataType.title}</DialogTitle>
          <DialogDescription>
            Ordnen Sie die Spalten aus Ihrer Datei den Datenfeldern zu. 
            Automatische Zuordnungen wurden bereits vorgenommen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {dataType.fields.map((field) => (
            <div key={field} className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor={field} className="text-right">
                {field}
              </Label>
              <Select
                value={columnMapping[field] || ''}
                onValueChange={(value) => 
                  setColumnMapping(prev => ({ ...prev, [field]: value }))
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Spalte auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {fileColumns.map((column) => (
                    <SelectItem key={column} value={column}>
                      {column}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button
            onClick={handleUpload}
            disabled={isUploading}
          >
            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isUploading ? 'Wird hochgeladen...' : 'Hochladen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
