import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { z } from 'zod';

// Validation schemas for each data type
const customerProjectSchema = z.object({
  customer: z.string().trim().min(1, 'Customer name required').max(255, 'Customer name too long'),
  project_name: z.string().trim().min(1, 'Project name required').max(255, 'Project name too long'),
  application: z.string().trim().min(1, 'Application required').max(255, 'Application too long'),
  product: z.string().trim().min(1, 'Product required').max(255, 'Product too long'),
  user_id: z.string().uuid(),
  upload_id: z.string().uuid(),
}).passthrough();

const customerSchema = z.object({
  customer_name: z.string().trim().min(1, 'Customer name required').max(255, 'Customer name too long'),
  industry: z.string().trim().max(255, 'Industry too long').nullable(),
  country: z.string().trim().max(100, 'Country too long').nullable(),
  city: z.string().trim().max(100, 'City too long').nullable(),
  customer_category: z.string().trim().max(100, 'Category too long').nullable(),
  user_id: z.string().uuid(),
  upload_id: z.string().uuid(),
}).passthrough();

const applicationSchema = z.object({
  application: z.string().trim().min(1, 'Application required').max(255, 'Application too long'),
  related_product: z.string().trim().min(1, 'Related product required').max(255, 'Related product too long'),
  user_id: z.string().uuid(),
  upload_id: z.string().uuid(),
}).passthrough();

const productSchema = z.object({
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
  user_id: z.string().uuid(),
  upload_id: z.string().uuid(),
}).passthrough();

const crossSellSchema = z.object({
  application: z.string().trim().min(1, 'Application required').max(255, 'Application too long'),
  base_product: z.string().trim().min(1, 'Base product required').max(255, 'Base product too long'),
  cross_sell_product: z.string().trim().min(1, 'Cross-sell product required').max(255, 'Cross-sell product too long'),
  rec_source: z.string().trim().max(255, 'Rec source too long').nullable(),
  rec_score: z.number().nullable(),
  user_id: z.string().uuid(),
  upload_id: z.string().uuid(),
}).passthrough();

const productAlternativeSchema = z.object({
  base_product: z.string().trim().min(1, 'Base product required').max(255, 'Base product too long'),
  alternative_product: z.string().trim().min(1, 'Alternative product required').max(255, 'Alternative product too long'),
  similarity: z.number().min(0, 'Similarity must be 0-1').max(1, 'Similarity must be 0-1').nullable(),
  user_id: z.string().uuid(),
  upload_id: z.string().uuid(),
}).passthrough();

const appInsightSchema = z.object({
  application: z.string().trim().min(1, 'Application required').max(255, 'Application too long'),
  application_description: z.string().trim().max(2000, 'Description too long (max 2000 chars)').nullable(),
  application_block_diagram: z.string().trim().max(5000, 'Block diagram too long').nullable(),
  application_trends: z.string().trim().max(2000, 'Trends too long (max 2000 chars)').nullable(),
  industry: z.string().trim().max(255, 'Industry too long').nullable(),
  product_family_1: z.string().trim().max(100, 'Product family too long').nullable(),
  product_family_2: z.string().trim().max(100, 'Product family too long').nullable(),
  product_family_3: z.string().trim().max(100, 'Product family too long').nullable(),
  product_family_4: z.string().trim().max(100, 'Product family too long').nullable(),
  product_family_5: z.string().trim().max(100, 'Product family too long').nullable(),
  user_id: z.string().uuid(),
  upload_id: z.string().uuid(),
}).passthrough();

const schemaMap: Record<string, z.ZodSchema> = {
  'customer_projects': customerProjectSchema,
  'customers': customerSchema,
  'applications': applicationSchema,
  'products': productSchema,
  'cross_sells': crossSellSchema,
  'product_alternatives': productAlternativeSchema,
  'app_insights': appInsightSchema,
};

// Calculate similarity between two strings (0-1, where 1 is identical)
const calculateSimilarity = (str1: string, str2: string): number => {
  const normalize = (s: string) => s.toLowerCase().replace(/[_\s-]/g, '');
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
  targetTenantId?: string | null;
}

export default function FileUploadDialog({
  open,
  onOpenChange,
  dataType,
  parsedData,
  fileName,
  targetTenantId,
}: FileUploadDialogProps) {
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);
  const { user, tenantId } = useAuth();
  
  // If targetTenantId is explicitly provided (even if null for global), use it
  // Otherwise fall back to the user's tenant
  const effectiveTenantId = targetTenantId !== undefined ? targetTenantId : tenantId;

  // Collect all unique columns from all rows, not just the first one
  const fileColumns = parsedData.length > 0 
    ? Array.from(new Set(parsedData.flatMap(row => Object.keys(row))))
    : [];

  // Auto-map columns when dialog opens or data changes
  useEffect(() => {
    if (open && fileColumns.length > 0 && dataType && dataType.fields.length > 0) {
      console.log('🔧 FileUploadDialog - Auto-mapping columns');
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
  }, [open, fileColumns.length, dataType?.fields]);

  const handleUpload = async () => {
    // Guard clause: Ensure dataType exists
    if (!dataType || !dataType.fields) {
      toast.error('Fehler: Datentyp nicht korrekt initialisiert');
      return;
    }

    // Validate all required fields are mapped
    const unmappedFields = dataType.fields.filter(field => !columnMapping[field]);
    if (unmappedFields.length > 0) {
      toast.error(`Bitte ordnen Sie alle Felder zu: ${unmappedFields.join(', ')}`);
      return;
    }

    if (!user) {
      toast.error('Nicht authentifiziert. Bitte melden Sie sich an.');
      return;
    }

    // Only validate tenant requirement if targetTenantId was not explicitly set
    // (targetTenantId can be null for global uploads)
    if (targetTenantId === undefined && !tenantId) {
      console.error('No tenant ID found for user');
      toast.error('Fehler: Kein Mandant zugeordnet', {
        description: 'Der Upload kann nicht durchgeführt werden, da kein Mandant zugeordnet ist.',
      });
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
      // @ts-ignore - Supabase types not yet updated
      const { data: uploadHistoryData, error: historyError } = await supabase
        // @ts-ignore
        .from('upload_history')
        // @ts-ignore
        .insert({
          user_id: session.user.id,
          filename: fileName,
          data_type: dataType.title,
          row_count: parsedData.length,
          status: 'success',
          tenant_id: effectiveTenantId,
        })
        .select()
        .single();

      if (historyError) {
        console.error('History error:', historyError);
        throw historyError;
      }
      const uploadId = uploadHistoryData.id;

      // Transform data according to mapping and add upload_id and tenant_id
      const transformedData = parsedData.map(row => {
        const transformed: Record<string, any> = { 
          user_id: session.user.id,
          upload_id: uploadId,
          tenant_id: effectiveTenantId
        };
        dataType.fields.forEach(field => {
          const sourceColumn = columnMapping[field];
          if (sourceColumn) {
            let value = (row as Record<string, any>)[sourceColumn];
            
            // Handle empty values - convert to null
            if (value === null || value === undefined || value === '') {
              value = null;
            } else {
              // Convert similarity to number if present
              if (field === 'similarity') {
                value = parseFloat(value);
                if (isNaN(value)) {
                  value = null;
                }
              }
              
              // Convert numeric product fields
              if (field === 'product_price' || field === 'product_inventory' || field === 'product_lead_time') {
                value = parseFloat(value);
                if (isNaN(value)) {
                  value = null;
                }
              }
              
              // Handle product_new and product_top - convert to 'Y' or empty
              if (field === 'product_new' || field === 'product_top') {
                // Check if value is truthy (Y, yes, true, 1, etc.)
                const normalizedValue = String(value).toLowerCase().trim();
                value = (normalizedValue === 'y' || normalizedValue === 'yes' || 
                         normalizedValue === 'true' || normalizedValue === '1') ? 'Y' : '';
              }
            }
            
            transformed[field] = value;
          }
        });
        return transformed;
      });

      // Validate transformed data using appropriate schema
      const schema = schemaMap[dataType.id];
      if (!schema) {
        throw new Error(`No validation schema found for ${dataType.id}`);
      }

      const validationErrors: string[] = [];
      const validatedData = transformedData.map((item, index) => {
        try {
          return schema.parse(item);
        } catch (error) {
          if (error instanceof z.ZodError) {
            const rowNum = index + 1;
            const fieldErrors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
            validationErrors.push(`Row ${rowNum}: ${fieldErrors}`);
          }
          return null;
        }
      }).filter(item => item !== null);

      // If there are validation errors, show them and abort
      if (validationErrors.length > 0) {
        const errorMessage = validationErrors.length > 5 
          ? `${validationErrors.length} validation errors found. First 5:\n${validationErrors.slice(0, 5).join('\n')}`
          : `Validation errors:\n${validationErrors.join('\n')}`;
        
        toast.error('Data validation failed', {
          description: errorMessage,
          duration: 10000,
        });
        setIsUploading(false);
        return;
      }

      // Use validated data for insertion
      const dataToInsert = validatedData;
      if (dataType.id === 'products') {
        // Fetch existing products for the tenant (not user)
        let existingQuery = supabase
          .from('products')
          .select('id, product, manufacturer');
        
        // Filter by tenant_id to find duplicates within the tenant
        if (effectiveTenantId) {
          existingQuery = existingQuery.eq('tenant_id', effectiveTenantId);
        } else {
          // For global uploads, check against global products (tenant_id IS NULL)
          existingQuery = existingQuery.is('tenant_id', null);
        }
        
        const { data: existingProducts, error: fetchError } = await existingQuery;

        if (fetchError) throw fetchError;

        // Create a map of existing products by product name and manufacturer
        const existingMap = new Map<string, string>();
        existingProducts?.forEach(p => {
          const key = `${p.product?.toLowerCase() || ''}_${p.manufacturer?.toLowerCase() || ''}`;
          existingMap.set(key, p.id);
        });

        const toInsert: any[] = [];
        const toUpdate: any[] = [];

        // Separate data into inserts and updates
        dataToInsert.forEach(item => {
          const key = `${item.product?.toLowerCase() || ''}_${item.manufacturer?.toLowerCase() || ''}`;
          const existingId = existingMap.get(key);
          
          if (existingId) {
            // Product exists - prepare for update
            toUpdate.push({
              ...item,
              id: existingId,
            });
          } else {
            // New product - prepare for insert
            toInsert.push(item);
          }
        });

        // Perform inserts
        if (toInsert.length > 0) {
          const { error: insertError } = await supabase
            .from('products')
            .insert(toInsert);
          
          if (insertError) throw insertError;
        }

        // Perform updates (one by one for now, could be optimized)
        for (const item of toUpdate) {
          const { id, ...updateData } = item;
          const { error: updateError } = await supabase
            .from('products')
            .update(updateData)
            .eq('id', id);
          
          if (updateError) throw updateError;
        }

        const insertedCount = toInsert.length;
        const updatedCount = toUpdate.length;
        
        if (insertedCount > 0 && updatedCount > 0) {
          toast.success(`${insertedCount} neue Einträge erstellt, ${updatedCount} bestehende aktualisiert`);
        } else if (insertedCount > 0) {
          toast.success(`${insertedCount} Einträge erfolgreich hochgeladen`);
        } else if (updatedCount > 0) {
          toast.success(`${updatedCount} Einträge erfolgreich aktualisiert`);
        }
      } else {
        // For other tables, use normal insert
        // @ts-ignore - Supabase types not yet updated
        const { error } = await supabase
          // @ts-ignore
          .from(dataType.id)
          // @ts-ignore
          .insert(dataToInsert);

        if (error) throw error;

        toast.success(`${parsedData.length} Einträge erfolgreich hochgeladen`);
      }
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
        {!dataType ? (
          <div className="p-4">
            <p className="text-muted-foreground">Datentyp wird geladen...</p>
          </div>
        ) : (
          <>
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
