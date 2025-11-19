import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Shield, Plus, UserPlus, Users, Pencil, Trash, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function SuperAdmin() {
  const navigate = useNavigate();
  const [newTenantName, setNewTenantName] = useState('');
  const [newSuperAdminEmail, setNewSuperAdminEmail] = useState('');
  const [inviteDialog, setInviteDialog] = useState<{
    open: boolean;
    tenantId: string;
    tenantName: string;
  } | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    tenantId: string;
    tenantName: string;
  } | null>(null);
  const [editTenantName, setEditTenantName] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    tenantId: string;
    tenantName: string;
  } | null>(null);
  const [detailSheet, setDetailSheet] = useState<{
    open: boolean;
    tenantId: string;
    tenantName: string;
  } | null>(null);
  const [addUserEmail, setAddUserEmail] = useState('');
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

  // Update tenant mutation
  const updateTenantMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data, error } = await supabase
        .from('tenants')
        .update({ name })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setEditDialog(null);
      setEditTenantName('');
      toast.success('Mandant erfolgreich aktualisiert');
    },
    onError: (error: Error) => {
      toast.error('Fehler beim Aktualisieren des Mandanten', {
        description: error.message,
      });
    },
  });

  const handleUpdateTenant = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editTenantName.trim()) {
      toast.error('Bitte geben Sie einen Mandantennamen ein');
      return;
    }

    if (editDialog) {
      updateTenantMutation.mutate({
        id: editDialog.tenantId,
        name: editTenantName.trim(),
      });
    }
  };

  // Delete tenant mutation
  const deleteTenantMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      const { error } = await supabase
        .from('tenants')
        .delete()
        .eq('id', tenantId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setDeleteDialog(null);
      toast.success('Mandant erfolgreich gelöscht');
    },
    onError: (error: Error) => {
      toast.error('Fehler beim Löschen des Mandanten', {
        description: error.message,
      });
    },
  });

  const handleDeleteTenant = () => {
    if (deleteDialog) {
      deleteTenantMutation.mutate(deleteDialog.tenantId);
    }
  };

  // Fetch tenant users
  const { data: tenantUsers, isLoading: usersLoading } = useQuery({
    queryKey: ['tenant-users', detailSheet?.tenantId],
    queryFn: async () => {
      if (!detailSheet?.tenantId) return [];
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('tenant_id', detailSheet.tenantId);
      
      if (profilesError) throw profilesError;
      
      // Fetch roles for each user
      const usersWithRoles = await Promise.all(
        profiles.map(async (profile) => {
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.id);
          
          return {
            ...profile,
            role: roles?.[0]?.role || 'user'
          };
        })
      );
      
      return usersWithRoles;
    },
    enabled: !!detailSheet?.tenantId,
  });

  // Update user role mutation
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: 'user' | 'tenant_admin' | 'super_admin' }) => {
      // Update the role in user_roles table
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users', detailSheet?.tenantId] });
      toast.success('Rolle erfolgreich aktualisiert');
    },
    onError: (error: Error) => {
      toast.error('Fehler beim Aktualisieren der Rolle', {
        description: error.message,
      });
    },
  });

  // Add user to tenant mutation
  const addUserToTenantMutation = useMutation({
    mutationFn: async ({ email, tenantId }: { email: string; tenantId: string }) => {
      // Search for user by email
      const { data: profiles, error: searchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();
      
      if (searchError) throw searchError;
      if (!profiles) throw new Error('Benutzer nicht gefunden');
      
      // Update tenant_id
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ tenant_id: tenantId })
        .eq('id', profiles.id);
      
      if (updateError) throw updateError;
      
      // Check if user already has a role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', profiles.id)
        .maybeSingle();
      
      // Create role entry if none exists
      if (!existingRole) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({ user_id: profiles.id, role: 'user' });
        
        if (roleError) throw roleError;
      }
      
      return profiles;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users', detailSheet?.tenantId] });
      setAddUserEmail('');
      toast.success('Benutzer erfolgreich zum Mandanten hinzugefügt');
    },
    onError: (error: Error) => {
      toast.error('Fehler beim Hinzufügen des Benutzers', {
        description: error.message,
      });
    },
  });

  const handleAddUserToTenant = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!addUserEmail.trim()) {
      toast.error('Bitte geben Sie eine E-Mail-Adresse ein');
      return;
    }

    if (!detailSheet?.tenantId) return;

    addUserToTenantMutation.mutate({
      email: addUserEmail.trim(),
      tenantId: detailSheet.tenantId,
    });
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
                  <TableHead>Verwaltung</TableHead>
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
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDetailSheet({
                              open: true,
                              tenantId: tenant.id,
                              tenantName: tenant.name,
                            });
                          }}
                        >
                          <Info className="mr-2 h-4 w-4" />
                          Details
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/admin/${tenant.id}`)}
                        >
                          <Users className="mr-2 h-4 w-4" />
                          Benutzer verwalten
                        </Button>
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
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditDialog({
                              open: true,
                              tenantId: tenant.id,
                              tenantName: tenant.name,
                            });
                            setEditTenantName(tenant.name);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeleteDialog({
                              open: true,
                              tenantId: tenant.id,
                              tenantName: tenant.name,
                            });
                          }}
                        >
                          <Trash className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
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

      {/* Edit Tenant Dialog */}
      <Dialog 
        open={editDialog?.open || false} 
        onOpenChange={(open) => {
          if (!open) {
            setEditDialog(null);
            setEditTenantName('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mandant bearbeiten</DialogTitle>
            <DialogDescription>
              Ändern Sie den Namen des Mandanten "{editDialog?.tenantName}".
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateTenant} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-tenant-name">Mandantenname</Label>
              <Input
                id="edit-tenant-name"
                type="text"
                value={editTenantName}
                onChange={(e) => setEditTenantName(e.target.value)}
                placeholder="Firmenname"
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditDialog(null);
                  setEditTenantName('');
                }}
              >
                Abbrechen
              </Button>
              <Button 
                type="submit"
                disabled={updateTenantMutation.isPending}
              >
                {updateTenantMutation.isPending ? 'Speichert...' : 'Speichern'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Tenant Confirmation */}
      <AlertDialog 
        open={deleteDialog?.open || false} 
        onOpenChange={(open) => {
          if (!open) {
            setDeleteDialog(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mandant wirklich löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie den Mandanten "{deleteDialog?.tenantName}" wirklich löschen? 
              Diese Aktion kann nicht rückgängig gemacht werden und alle zugehörigen Daten werden ebenfalls gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTenant}
              disabled={deleteTenantMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTenantMutation.isPending ? 'Löscht...' : 'Löschen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Tenant Details Sheet */}
      <Sheet 
        open={detailSheet?.open || false} 
        onOpenChange={(open) => {
          if (!open) {
            setDetailSheet(null);
          }
        }}
      >
        <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{detailSheet?.tenantName}</SheetTitle>
            <SheetDescription>
              Benutzer und deren Rollen in diesem Mandanten
            </SheetDescription>
          </SheetHeader>
          
          {/* Add User Section */}
          <div className="mt-6 p-4 border rounded-lg bg-muted/30">
            <h3 className="text-sm font-semibold mb-3">Benutzer hinzufügen</h3>
            <form onSubmit={handleAddUserToTenant} className="flex gap-2">
              <Input
                type="email"
                placeholder="benutzer@example.com"
                value={addUserEmail}
                onChange={(e) => setAddUserEmail(e.target.value)}
                className="flex-1"
              />
              <Button 
                type="submit"
                disabled={addUserToTenantMutation.isPending}
              >
                {addUserToTenantMutation.isPending ? 'Lädt...' : 'Hinzufügen'}
              </Button>
            </form>
            <p className="text-xs text-muted-foreground mt-2">
              Geben Sie die E-Mail-Adresse eines existierenden Benutzers ein, um ihn diesem Mandanten zuzuweisen.
            </p>
          </div>
          
          <div className="mt-6">
            {usersLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : tenantUsers && tenantUsers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>E-Mail</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Rolle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenantUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        {user.full_name || '-'}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(newRole: 'user' | 'tenant_admin' | 'super_admin') => {
                            updateUserRoleMutation.mutate({
                              userId: user.id,
                              newRole,
                            });
                          }}
                          disabled={updateUserRoleMutation.isPending}
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="tenant_admin">Tenant Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Keine Benutzer in diesem Mandanten
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
