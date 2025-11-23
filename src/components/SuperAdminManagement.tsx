import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Shield, UserMinus, Clock, Mail } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

interface SuperAdmin {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  tenant_id: string | null;
}

export function SuperAdminManagement() {
  const queryClient = useQueryClient();

  const { data: superAdmins, isLoading } = useQuery({
    queryKey: ['super-admins'],
    queryFn: async () => {
      // Get all users with super_admin role
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'super_admin');

      if (rolesError) throw rolesError;

      if (!roles || roles.length === 0) return [];

      const userIds = roles.map(r => r.user_id);

      // Get profile information for these users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at, tenant_id')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      return profiles as SuperAdmin[];
    }
  });

  const revokeSuperAdminMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'super_admin');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admins'] });
      toast.success('Super-Admin Rechte erfolgreich entzogen');
    },
    onError: (error: Error) => {
      toast.error('Fehler beim Entziehen der Rechte: ' + error.message);
    }
  });

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Super-Admin Verwaltung
          </CardTitle>
          <CardDescription>Lädt...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Super-Admin Verwaltung
        </CardTitle>
        <CardDescription>
          Übersicht aller Super-Administratoren im System
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!superAdmins || superAdmins.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Keine Super-Administratoren gefunden
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>E-Mail</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Erstellt</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {superAdmins.map((admin) => {
                  const isCurrentUser = currentUser?.id === admin.id;
                  
                  return (
                    <TableRow key={admin.id}>
                      <TableCell className="font-medium">
                        {admin.full_name || 'Kein Name'}
                        {isCurrentUser && (
                          <Badge variant="outline" className="ml-2">Sie</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {admin.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="default" className="gap-1">
                          <Shield className="h-3 w-3" />
                          Super Admin
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {formatDistanceToNow(new Date(admin.created_at), {
                            addSuffix: true,
                            locale: de
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isCurrentUser || revokeSuperAdminMutation.isPending}
                              className="text-destructive hover:text-destructive"
                            >
                              <UserMinus className="h-4 w-4 mr-2" />
                              Rechte entziehen
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Super-Admin Rechte entziehen?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Sind Sie sicher, dass Sie {admin.full_name || admin.email} die Super-Admin Rechte entziehen möchten?
                                <br /><br />
                                Der Benutzer verliert alle administrativen Berechtigungen und kann nicht mehr auf die Super-Admin Funktionen zugreifen.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => revokeSuperAdminMutation.mutate(admin.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Rechte entziehen
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        
        <div className="mt-4 text-sm text-muted-foreground">
          <p>Gesamt: {superAdmins?.length || 0} Super-Administrator{superAdmins?.length !== 1 ? 'en' : ''}</p>
        </div>
      </CardContent>
    </Card>
  );
}
