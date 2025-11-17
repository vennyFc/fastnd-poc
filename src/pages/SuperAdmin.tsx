import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export default function SuperAdmin() {
  const [newTenantName, setNewTenantName] = useState('');
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Super Admin</h1>
      </div>

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
    </div>
  );
}
