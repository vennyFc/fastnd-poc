import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { UserPlus, Mail, Shield, User, Trash2, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Admin() {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; email: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all users with their profiles and roles
  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      // @ts-ignore
      const { data: profiles, error: profilesError } = await supabase
        // @ts-ignore
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // @ts-ignore
      const { data: roles, error: rolesError } = await supabase
        // @ts-ignore
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Combine profiles with roles
      return profiles?.map((profile: any) => ({
        ...profile,
        roles: roles?.filter((r: any) => r.user_id === profile.id) || [],
      })) || [];
    },
  });

  // Invite user mutation
  const inviteUserMutation = useMutation({
    mutationFn: async (email: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('invite-user', {
        body: { email },
      });

      // Check for errors - the error object contains the actual error response
      if (response.error) {
        // Try to get the error message from the response data first
        const errorData = response.data;
        if (errorData?.error) {
          const error = new Error(errorData.error);
          (error as any).userExists = errorData.userExists;
          throw error;
        }
        // Fallback to the error message
        throw new Error(response.error.message || 'Einladung fehlgeschlagen');
      }
      
      return response.data;
    },
    onSuccess: (data: any) => {
      if (data?.userExists) {
        toast.info(data.message || 'Benutzer ist bereits registriert');
      } else {
        toast.success(data?.message || 'Einladung erfolgreich versendet');
      }
      setInviteEmail('');
      setInviteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: any) => {
      console.error('Invite error:', error);
      const errorMessage = error.message || 'Einladung fehlgeschlagen';
      toast.error(errorMessage);
    },
  });

  // Toggle admin role mutation
  const toggleAdminMutation = useMutation({
    mutationFn: async ({ userId, isCurrentlyAdmin }: { userId: string; isCurrentlyAdmin: boolean }) => {
      if (isCurrentlyAdmin) {
        // Remove admin role
        // @ts-ignore
        const { error } = await supabase
          // @ts-ignore
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'admin');
        if (error) throw error;
      } else {
        // Add admin role
        const roleData: any = { user_id: userId, role: 'admin' };
        // @ts-ignore
        const { error } = await supabase
          // @ts-ignore
          .from('user_roles')
          // @ts-ignore
          .insert(roleData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Rolle erfolgreich aktualisiert');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: any) => {
      toast.error(`Fehler beim Aktualisieren der Rolle: ${error.message}`);
    },
  });

  // Resend invitation mutation
  const resendInviteMutation = useMutation({
    mutationFn: async (email: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('invite-user', {
        body: { email },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Fehler beim erneuten Senden');
      }
      
      return response.data;
    },
    onSuccess: () => {
      toast.success('Einladung erfolgreich erneut versendet');
    },
    onError: (error: any) => {
      toast.error(`Fehler beim erneuten Senden: ${error.message}`);
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('delete-user', {
        body: { userId },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Fehler beim Löschen');
      }
      
      return response.data;
    },
    onSuccess: () => {
      toast.success('Benutzer erfolgreich gelöscht');
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: any) => {
      toast.error(`Fehler beim Löschen: ${error.message}`);
    },
  });

  const handleInviteUser = () => {
    if (!inviteEmail || !inviteEmail.includes('@')) {
      toast.error('Bitte geben Sie eine gültige E-Mail-Adresse ein');
      return;
    }
    inviteUserMutation.mutate(inviteEmail);
  };

  const handleToggleAdmin = (userId: string, isCurrentlyAdmin: boolean) => {
    if (userId === user?.id) {
      toast.error('Sie können Ihre eigene Admin-Rolle nicht ändern');
      return;
    }
    toggleAdminMutation.mutate({ userId, isCurrentlyAdmin });
  };

  const handleResendInvite = (email: string) => {
    resendInviteMutation.mutate(email);
  };

  const handleDeleteClick = (userId: string, email: string) => {
    if (userId === user?.id) {
      toast.error('Sie können sich nicht selbst löschen');
      return;
    }
    setUserToDelete({ id: userId, email });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id);
    }
  };

  // Filter users based on search query
  const filteredUsers = users?.filter((user: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.email?.toLowerCase().includes(query) ||
      user.full_name?.toLowerCase().includes(query)
    );
  }) || [];

  // Redirect if not admin (using useEffect to avoid hook ordering issues)
  if (!isAdmin) {
    navigate('/');
    return null;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Benutzerverwaltung und Einladungen
          </p>
        </div>
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Benutzer einladen
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Neuen Benutzer einladen</DialogTitle>
              <DialogDescription>
                Senden Sie eine Einladungs-E-Mail an einen neuen Benutzer
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail-Adresse</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="benutzer@beispiel.de"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleInviteUser()}
                />
              </div>

              {/* Show existing users */}
              {users && users.length > 0 && (
                <div className="border rounded-lg p-4 bg-muted/50">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-medium">Bereits registrierte Benutzer ({users.length})</h4>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto space-y-1">
                    {users.map((user: any) => (
                      <div 
                        key={user.id} 
                        className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-background"
                      >
                        <span className="text-foreground">{user.email}</span>
                        {user.roles.some((r: any) => r.role === 'admin') && (
                          <Badge variant="default" className="h-5 text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    💡 Diese E-Mail-Adressen sind bereits registriert
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleInviteUser} disabled={inviteUserMutation.isPending}>
                {inviteUserMutation.isPending ? (
                  <>
                    <Mail className="mr-2 h-4 w-4 animate-spin" />
                    Wird gesendet...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Einladung senden
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Benutzer gesamt</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{users?.length || 0}</p>
            <p className="text-sm text-muted-foreground mt-1">Registrierte Benutzer</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Administratoren</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">
              {users?.filter((u: any) => u.roles.some((r: any) => r.role === 'admin')).length || 0}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Mit Admin-Rechten</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Aktive Benutzer</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{users?.length || 0}</p>
            <p className="text-sm text-muted-foreground mt-1">Letzte 30 Tage</p>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Alle Benutzer</CardTitle>
              <CardDescription>
                Verwalten Sie Benutzer und deren Berechtigungen
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nach E-Mail oder Name suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : filteredUsers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>E-Mail</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Rolle</TableHead>
                  <TableHead>Registriert</TableHead>
                  <TableHead className="w-[450px]">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user: any) => {
                  const isUserAdmin = user.roles.some((r: any) => r.role === 'admin');
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>{user.full_name || '-'}</TableCell>
                      <TableCell>
                        {isUserAdmin ? (
                          <Badge variant="default" className="gap-1">
                            <Shield className="h-3 w-3" />
                            Admin
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <User className="h-3 w-3" />
                            Benutzer
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.created_at ? format(new Date(user.created_at), 'dd.MM.yyyy') : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="grid grid-cols-[auto_auto_auto] gap-2 items-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResendInvite(user.email)}
                            disabled={resendInviteMutation.isPending}
                            className="whitespace-nowrap"
                          >
                            <Mail className="h-4 w-4 mr-1" />
                            Einladung
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleAdmin(user.id, isUserAdmin)}
                            disabled={toggleAdminMutation.isPending}
                            className="whitespace-nowrap min-w-[160px]"
                          >
                            <Shield className="h-4 w-4 mr-1" />
                            {isUserAdmin ? 'Admin entfernen' : 'Admin setzen'}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteClick(user.id, user.email)}
                            disabled={deleteUserMutation.isPending}
                            title="Benutzer löschen"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : searchQuery ? (
            <div className="p-8 text-center text-muted-foreground">
              Keine Benutzer gefunden für "{searchQuery}"
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              Keine Benutzer vorhanden
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Benutzer löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Sind Sie sicher, dass Sie den Benutzer <strong>{userToDelete?.email}</strong> löschen möchten?
              <br /><br />
              Diese Aktion kann nicht rückgängig gemacht werden. Alle Daten des Benutzers werden dauerhaft gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
