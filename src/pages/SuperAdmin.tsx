import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Shield, Plus, Upload, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import GlobalFileUploadDialog from '@/components/GlobalFileUploadDialog';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export default function SuperAdmin() {
  const [newTenantName, setNewTenantName] = useState('');
  const [newSuperAdminEmail, setNewSuperAdminEmail] = useState('');
  const [uploadDialog, setUploadDialog] = useState<{
    open: boolean;
    dataType: { id: string; title: string; fields: string[] } | null;
    parsedData: any[];
    fileName: string;
  }>({
    open: false,
    dataType: null,
    parsedData: [],
    fileName: '',
  });
  const [inviteDialog, setInviteDialog] = useState<{
    open: boolean;
    tenantId: string;
    tenantName: string;
  } | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const queryClient = useQueryClient();

  // Fetch all tenants
  const { data: tenants, isLoading, error } = useQuery({
    queryKey: ['tenants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Create new tenant mutation
  const createTenantMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('tenants')
        .insert({ name })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setNewTenantName('');
      toast.success('Mandant erfolgreich erstellt');
    },
    onError: (error: Error) => {
      toast.error('Fehler beim Erstellen des Mandanten', {
        description: error.message,
      });
    },
  });

  const handleCreateTenant = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newTenantName.trim()) {
      toast.error('Bitte geben Sie einen Mandantennamen ein');
      return;
    }

    createTenantMutation.mutate(newTenantName.trim());
  };

  const handleFileUpload = (tableName: 'global_products' | 'global_applications') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.xlsx,.xls';
    
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const fileName = file.name;
      const fileExtension = fileName.split('.').pop()?.toLowerCase();

      try {
        let parsedData: any[] = [];

        if (fileExtension === 'csv') {
          Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              parsedData = results.data;
              openUploadDialog(tableName, parsedData, fileName);
            },
            error: (error) => {
              toast.error('Fehler beim Parsen der CSV-Datei', {
                description: error.message,
              });
            },
          });
        } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
          const data = await file.arrayBuffer();
          const workbook = XLSX.read(data);
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          parsedData = XLSX.utils.sheet_to_json(firstSheet);
          openUploadDialog(tableName, parsedData, fileName);
        } else {
          toast.error('Nicht unterstütztes Dateiformat', {
            description: 'Bitte laden Sie eine CSV- oder Excel-Datei hoch',
          });
        }
      } catch (error: any) {
        toast.error('Fehler beim Lesen der Datei', {
          description: error.message,
        });
      }
    };

    input.click();
  };

  const openUploadDialog = (tableName: string, parsedData: any[], fileName: string) => {
    const dataTypes = {
      global_products: {
        id: 'global_products',
        title: 'Globale Produkte',
        fields: [
          'product',
          'product_family',
          'product_description',
          'manufacturer',
          'manufacturer_link',
          'product_price',
          'product_inventory',
          'product_lead_time',
          'product_lifecycle',
          'product_new',
          'product_top',
        ],
      },
      global_applications: {
        id: 'global_applications',
        title: 'Globale Applikationen',
        fields: ['application', 'related_product'],
      },
    };

    const dataType = dataTypes[tableName as keyof typeof dataTypes];
    if (!dataType) {
      toast.error('Unbekannter Datentyp');
      return;
    }

    setUploadDialog({
      open: true,
      dataType,
      parsedData,
      fileName,
    });
  };

  // Invite tenant admin mutation
  const inviteUserMutation = useMutation({
    mutationFn: async ({ email, tenantId }: { email: string; tenantId: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('invite-user', {
        body: { 
          email, 
          tenantId,
          role: 'tenant_admin' 
        },
      });

      if (response.error) {
        const errorData = response.data;
        if (errorData?.error) {
          const error = new Error(errorData.error);
          (error as any).userExists = errorData.userExists;
          throw error;
        }
        throw new Error(response.error.message || 'Einladung fehlgeschlagen');
      }
      
      return response.data;
    },
    onSuccess: (data: any) => {
      if (data?.userExists) {
        toast.info(data.message || 'Benutzer ist bereits registriert');
      } else {
        toast.success('Tenant-Admin erfolgreich eingeladen');
      }
      setInviteEmail('');
      setInviteDialog(null);
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
    onError: (error: any) => {
      console.error('Invite error:', error);
      const errorMessage = error.message || 'Einladung fehlgeschlagen';
      toast.error('Fehler beim Einladen', {
        description: errorMessage,
      });
    },
  });

  const handleInviteAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteEmail.trim() || !inviteDialog) {
      toast.error('Bitte geben Sie eine E-Mail-Adresse ein');
      return;
    }

    if (!inviteEmail.includes('@')) {
      toast.error('Bitte geben Sie eine gültige E-Mail-Adresse ein');
      return;
    }

    inviteUserMutation.mutate({ 
      email: inviteEmail.trim(), 
      tenantId: inviteDialog.tenantId 
    });
  };

  // Invite super admin mutation
  const inviteSuperAdminMutation = useMutation({
    mutationFn: async (email: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('invite-user', {
        body: { 
          email, 
          tenantId: null,
          role: 'super_admin' 
        },
      });

      if (response.error) {
        const errorData = response.data;
        if (errorData?.error) {
          const error = new Error(errorData.error);
          (error as any).userExists = errorData.userExists;
          throw error;
        }
        throw new Error(response.error.message || 'Einladung fehlgeschlagen');
      }
      
      return response.data;
    },
    onSuccess: (data: any) => {
      if (data?.userExists) {
        toast.info(data.message || 'Benutzer ist bereits registriert');
      } else {
        toast.success('Super-Admin erfolgreich eingeladen');
      }
      setNewSuperAdminEmail('');
    },
    onError: (error: any) => {
      console.error('Invite super admin error:', error);
      const errorMessage = error.message || 'Einladung fehlgeschlagen';
      toast.error('Fehler beim Einladen', {
        description: errorMessage,
      });
    },
  });

  const handleInviteSuperAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newSuperAdminEmail.trim()) {
      toast.error('Bitte geben Sie eine E-Mail-Adresse ein');
      return;
    }

    if (!newSuperAdminEmail.includes('@')) {
      toast.error('Bitte geben Sie eine gültige E-Mail-Adresse ein');
      return;
    }

    inviteSuperAdminMutation.mutate(newSuperAdminEmail.trim());
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Super Admin</h1>
      </div>

      {/* Invite Super Admin */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Super-Admin einladen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInviteSuperAdmin} className="flex gap-4">
            <Input
              type="email"
              placeholder="super-admin@example.com"
              value={newSuperAdminEmail}
              onChange={(e) => setNewSuperAdminEmail(e.target.value)}
              className="max-w-md"
            />
            <Button 
              type="submit" 
              disabled={inviteSuperAdminMutation.isPending}
            >
              {inviteSuperAdminMutation.isPending ? 'Lädt ein...' : 'Super-Admin einladen'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Create New Tenant */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Neuen Mandanten erstellen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateTenant} className="flex gap-4">
            <Input
              placeholder="Mandantenname"
              value={newTenantName}
              onChange={(e) => setNewTenantName(e.target.value)}
              className="max-w-md"
            />
            <Button 
              type="submit" 
              disabled={createTenantMutation.isPending}
            >
              {createTenantMutation.isPending ? 'Erstelle...' : 'Erstellen'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Global Data Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Globale Daten hochladen
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button
            onClick={() => handleFileUpload('global_products')}
            variant="outline"
          >
            <Upload className="mr-2 h-4 w-4" />
            Globale Produkte hochladen
          </Button>
          <Button
            onClick={() => handleFileUpload('global_applications')}
            variant="outline"
          >
            <Upload className="mr-2 h-4 w-4" />
            Globale Applikationen hochladen
          </Button>
        </CardContent>
      </Card>

      {/* Tenants List */}
      <Card>
        <CardHeader>
          <CardTitle>Alle Mandanten</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : error ? (
            <div className="text-destructive">
              Fehler beim Laden der Mandanten: {error.message}
            </div>
          ) : tenants && tenants.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Erstellt am</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-mono text-sm">
                      {tenant.id}
                    </TableCell>
                    <TableCell className="font-medium">
                      {tenant.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(tenant.created_at).toLocaleDateString('de-DE', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setInviteDialog({
                          open: true,
                          tenantId: tenant.id,
                          tenantName: tenant.name,
                        })}
                      >
                        <UserPlus className="mr-2 h-4 w-4" />
                        Admin einladen
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              Noch keine Mandanten vorhanden
            </p>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      {uploadDialog.dataType && (
        <GlobalFileUploadDialog
          open={uploadDialog.open}
          onOpenChange={(open) =>
            setUploadDialog((prev) => ({ ...prev, open }))
          }
          dataType={uploadDialog.dataType}
          parsedData={uploadDialog.parsedData}
          fileName={uploadDialog.fileName}
        />
      )}

      {/* Invite Tenant Admin Dialog */}
      <Dialog 
        open={inviteDialog?.open || false} 
        onOpenChange={(open) => {
          if (!open) {
            setInviteDialog(null);
            setInviteEmail('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tenant-Admin einladen</DialogTitle>
            <DialogDescription>
              Laden Sie einen Administrator für den Mandanten "{inviteDialog?.tenantName}" ein.
              Der eingeladene Benutzer erhält Admin-Rechte für diesen Mandanten.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInviteAdmin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">E-Mail-Adresse</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="admin@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setInviteDialog(null);
                  setInviteEmail('');
                }}
              >
                Abbrechen
              </Button>
              <Button 
                type="submit"
                disabled={inviteUserMutation.isPending}
              >
                {inviteUserMutation.isPending ? 'Lädt ein...' : 'Einladung senden'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
