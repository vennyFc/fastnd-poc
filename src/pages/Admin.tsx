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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPlus, Mail, Shield, User, Trash2, Search, ArrowLeft, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { UserPreferencesViewer } from '@/components/UserPreferencesViewer';

export default function Admin() {
  const { isSuperAdmin, user, activeTenant } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  // Immer den aktiven Mandanten verwenden
  const effectiveTenantId = activeTenant?.id;
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [inviteRole, setInviteRole] = useState<'user' | 'tenant_admin'>('user');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; email: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch users in the same tenant
  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users', effectiveTenantId],
    queryFn: async () => {
      if (!effectiveTenantId) return [];

      // @ts-ignore
      const { data: profiles, error: profilesError } = await supabase
        // @ts-ignore
        .from('profiles')
        .select('*')
        .eq('tenant_id', effectiveTenantId)
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // @ts-ignore
      const { data: roles, error: rolesError} = await supabase
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
    enabled: !!effectiveTenantId,
  });

  // Invite user mutation
  const inviteUserMutation = useMutation({
    mutationFn: async ({ email, firstName, lastName, role }: { email: string; firstName: string; lastName: string; role: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      if (!effectiveTenantId) throw new Error('No tenant ID');

      const fullName = `${firstName} ${lastName}`.trim();
      const response = await supabase.functions.invoke('invite-user', {
        body: { 
          email, 
          tenantId: effectiveTenantId,
          role,
          fullName: fullName || undefined
        },
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
      if (data?.updated) {
        toast.success(data.message || 'Bestehender Benutzer erfolgreich dem Mandanten zugeordnet');
      } else if (data?.userExists) {
        toast.info(data.message || 'Benutzer ist bereits registriert');
      } else {
        toast.success(data?.message || 'Einladung erfolgreich versendet');
      }
      setInviteEmail('');
      setInviteFirstName('');
      setInviteLastName('');
      setInviteRole('user');
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
        // Remove tenant admin role
        // @ts-ignore
        const { error } = await supabase
          // @ts-ignore
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'tenant_admin');
        if (error) throw error;
      } else {
        // Add tenant admin role
        const roleData: any = { user_id: userId, role: 'tenant_admin' };
        // @ts-ignore
        const { error } = await supabase
          // @ts-ignore
          .from('user_roles')
          // @ts-ignore
          .insert(roleData);
        if (error) throw error;
      }
      return userId;
    },
    onSuccess: (userId) => {
      toast.success('Rolle erfolgreich aktualisiert. Benutzer muss sich neu anmelden, damit die Änderungen wirksam werden.');
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
      if (!effectiveTenantId) throw new Error('No tenant ID');

      const response = await supabase.functions.invoke('invite-user', {
        body: { email, tenantId: effectiveTenantId },
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
      if (!effectiveTenantId) throw new Error('No tenant ID');

      const response = await supabase.functions.invoke('delete-user', {
        body: { userId, tenantId: effectiveTenantId },
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
    if (!inviteFirstName || !inviteLastName) {
      toast.error('Bitte geben Sie Vor- und Nachname ein');
      return;
    }
    inviteUserMutation.mutate({ 
      email: inviteEmail, 
      firstName: inviteFirstName, 
      lastName: inviteLastName,
      role: inviteRole
    });
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

  return (
    <div className="container mx-auto py-6 space-y-8">

      {!activeTenant && (
        <Card className="bg-destructive/5 border-destructive/20">
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-destructive" />
              <p className="text-sm font-medium text-destructive">
                {t('admin.noTenantSelected')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-medium tracking-tight font-clash">{t('admin.title')}</h1>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList>
          <TabsTrigger value="users">
            <User className="mr-2 h-4 w-4" />
            {t('admin.usersTab')}
          </TabsTrigger>
          <TabsTrigger value="preferences">
            <Settings className="mr-2 h-4 w-4" />
            {t('admin.preferencesTab')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-8 mt-6">
          {/* Invite Button */}
          <div className="flex justify-end">
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  {t('admin.inviteButton')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{t('admin.inviteDialogTitle')}</DialogTitle>
                  <DialogDescription>
                    {t('admin.inviteDialogDesc')}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">{t('admin.firstName')}</Label>
                      <Input
                        id="firstName"
                        placeholder="Max"
                        value={inviteFirstName}
                        onChange={(e) => setInviteFirstName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">{t('admin.lastName')}</Label>
                      <Input
                        id="lastName"
                        placeholder="Mustermann"
                        value={inviteLastName}
                        onChange={(e) => setInviteLastName(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">{t('admin.email')}</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="user@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleInviteUser()}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="role">{t('admin.roleLabel')}</Label>
                    <Select value={inviteRole} onValueChange={(value: 'user' | 'tenant_admin') => setInviteRole(value)}>
                      <SelectTrigger id="role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>{t('admin.roleUser')}</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="tenant_admin">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            <span>{t('admin.roleTenantAdmin')}</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Show existing users */}
                  {users && users.length > 0 && (
                    <div className="border rounded-lg p-4 bg-muted/50">
                      <div className="flex items-center gap-2 mb-3">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <h4 className="text-sm font-medium">{t('admin.registeredUsers')} ({users.length})</h4>
                      </div>
                      <div className="max-h-[200px] overflow-y-auto space-y-1">
                        {users.map((user: any) => (
                          <div 
                            key={user.id} 
                            className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-background"
                          >
                            <span className="text-foreground">{user.email}</span>
                            {user.roles.some((r: any) => r.role === 'tenant_admin' || r.role === 'super_admin') && (
                              <Badge variant="default" className="h-5 text-xs">
                                <Shield className="h-3 w-3 mr-1" />
                                Admin
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">
                        💡 {t('admin.registeredUsersHint')}
                      </p>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button onClick={handleInviteUser} disabled={inviteUserMutation.isPending}>
                    {inviteUserMutation.isPending ? (
                      <>
                        <Mail className="mr-2 h-4 w-4 animate-spin" />
                        {t('admin.sending')}
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        {t('admin.sendInvite')}
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
                <CardTitle className="text-lg">{t('admin.totalUsers')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-primary">{users?.length || 0}</p>
                <p className="text-sm text-muted-foreground mt-1">{t('admin.registeredUsersCount')}</p>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">{t('admin.admins')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-primary">
                  {users?.filter((u: any) => u.roles.some((r: any) => r.role === 'tenant_admin' || r.role === 'super_admin')).length || 0}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{t('admin.adminsCount')}</p>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">{t('admin.activeUsers')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-primary">{users?.length || 0}</p>
                <p className="text-sm text-muted-foreground mt-1">{t('admin.last30Days')}</p>
              </CardContent>
            </Card>
          </div>

          {/* Users Table */}
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t('admin.allUsers')}</CardTitle>
                  <CardDescription>
                    {t('admin.manageUsersPermissions')}
                  </CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('admin.searchByEmailOrName')}
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
                      <TableHead>{t('admin.email')}</TableHead>
                      <TableHead>{t('admin.name')}</TableHead>
                      <TableHead>{t('admin.roleLabel')}</TableHead>
                      <TableHead>{t('admin.registered')}</TableHead>
                      <TableHead className="w-[450px]">{t('admin.actionsColumn')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user: any) => {
                      const isUserAdmin = user.roles.some((r: any) => r.role === 'tenant_admin' || r.role === 'super_admin');
                      return (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.email}</TableCell>
                          <TableCell>{user.full_name || '-'}</TableCell>
                          <TableCell>
                            {isUserAdmin ? (
                              <Badge variant="default" className="gap-1">
                                <Shield className="h-3 w-3" />
                                {t('admin.roleAdmin')}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1">
                                <User className="h-3 w-3" />
                                {t('admin.roleUser')}
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
                                {t('admin.resendInviteShort')}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleAdmin(user.id, isUserAdmin)}
                                disabled={toggleAdminMutation.isPending}
                                className="whitespace-nowrap min-w-[160px]"
                              >
                                <Shield className="h-4 w-4 mr-1" />
                                {isUserAdmin ? t('admin.removeAdmin') : t('admin.makeAdmin')}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteClick(user.id, user.email)}
                                disabled={deleteUserMutation.isPending}
                                title={t('admin.deleteUser')}
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
                  {t('admin.noUsersFoundFor')} "{searchQuery}"
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  {t('admin.noUsersAvailable')}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="mt-6">
          <UserPreferencesViewer />
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.deleteUserTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.deleteUserConfirm')} <strong>{userToDelete?.email}</strong>?
              <br /><br />
              {t('admin.deleteUserWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
