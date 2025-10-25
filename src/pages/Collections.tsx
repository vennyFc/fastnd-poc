import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Edit, Users, Lock, Globe, Eye, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

export default function Collections() {
  const [open, setOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<any>(null);
  const [editingCollection, setEditingCollection] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    visibility: 'private',
    shared_users: [] as string[],
  });

  const queryClient = useQueryClient();

  // Fetch collections
  const { data: collections = [], isLoading } = useQuery({
    queryKey: ['collections'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('collections')
        .select(`
          *,
          collection_products(count),
          profiles!collections_user_id_fkey(email, full_name)
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch products in selected collection
  const { data: collectionProducts = [] } = useQuery({
    queryKey: ['collection_products', selectedCollection?.id],
    queryFn: async () => {
      if (!selectedCollection) return [];

      const { data, error } = await supabase
        .from('collection_products')
        .select('*, products(*)')
        .eq('collection_id', selectedCollection.id)
        .order('added_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCollection,
  });

  // Fetch all users for sharing
  const { data: users = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .order('email');
      if (error) throw error;
      return data || [];
    },
  });

  // Create/Update collection mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (editingCollection) {
        const { error } = await supabase
          .from('collections')
          .update({
            name: data.name,
            description: data.description,
            visibility: data.visibility,
          })
          .eq('id', editingCollection.id);
        if (error) throw error;

        // Update shares if visibility is 'selected'
        if (data.visibility === 'selected') {
          // Delete existing shares
          await supabase
            .from('collection_shares')
            .delete()
            .eq('collection_id', editingCollection.id);

          // Insert new shares
          if (data.shared_users.length > 0) {
            await supabase
              .from('collection_shares')
              .insert(
                data.shared_users.map((userId: string) => ({
                  collection_id: editingCollection.id,
                  shared_with_user_id: userId,
                }))
              );
          }
        }
      } else {
        const { data: newCollection, error } = await supabase
          .from('collections')
          .insert({
            user_id: user.id,
            name: data.name,
            description: data.description,
            visibility: data.visibility,
          })
          .select()
          .single();

        if (error) throw error;

        // Insert shares if visibility is 'selected'
        if (data.visibility === 'selected' && data.shared_users.length > 0) {
          await supabase
            .from('collection_shares')
            .insert(
              data.shared_users.map((userId: string) => ({
                collection_id: newCollection.id,
                shared_with_user_id: userId,
              }))
            );
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      setOpen(false);
      resetForm();
      toast.success(editingCollection ? 'Sammlung aktualisiert' : 'Sammlung erstellt');
    },
    onError: (error) => {
      toast.error('Fehler beim Speichern: ' + error.message);
    },
  });

  // Delete collection mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('collections')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      setSelectedCollection(null);
      toast.success('Sammlung gelöscht');
    },
  });

  // Remove product from collection
  const removeProductMutation = useMutation({
    mutationFn: async ({ collectionId, productId }: { collectionId: string; productId: string }) => {
      const { error } = await supabase
        .from('collection_products')
        .delete()
        .eq('collection_id', collectionId)
        .eq('product_id', productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection_products'] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      toast.success('Produkt entfernt');
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      visibility: 'private',
      shared_users: [],
    });
    setEditingCollection(null);
  };

  const handleEdit = (collection: any) => {
    setEditingCollection(collection);
    setFormData({
      name: collection.name,
      description: collection.description || '',
      visibility: collection.visibility,
      shared_users: [],
    });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'private': return <Lock className="h-4 w-4" />;
      case 'selected': return <Users className="h-4 w-4" />;
      case 'organization': return <Globe className="h-4 w-4" />;
      default: return <Lock className="h-4 w-4" />;
    }
  };

  const getVisibilityLabel = (visibility: string) => {
    switch (visibility) {
      case 'private': return 'Privat';
      case 'selected': return 'Ausgewählt';
      case 'organization': return 'Organisation';
      default: return visibility;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sammlungen</h1>
          <p className="text-muted-foreground mt-1">
            Organisieren Sie Ihre Produkte in Sammlungen
          </p>
        </div>
        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Neue Sammlung
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCollection ? 'Sammlung bearbeiten' : 'Neue Sammlung erstellen'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Name der Sammlung"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Beschreibung (optional)</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Beschreibung der Sammlung"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Sichtbarkeit</label>
                <Select
                  value={formData.visibility}
                  onValueChange={(value) => setFormData({ ...formData, visibility: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Nur für mich</SelectItem>
                    <SelectItem value="selected">Ausgewählte Nutzer</SelectItem>
                    <SelectItem value="organization">Gesamte Organisation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.visibility === 'selected' && (
                <div>
                  <label className="text-sm font-medium">Mit Nutzern teilen</label>
                  <Select
                    value={formData.shared_users[0] || undefined}
                    onValueChange={(value) => {
                      if (!formData.shared_users.includes(value)) {
                        setFormData({
                          ...formData,
                          shared_users: [...formData.shared_users, value],
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Nutzer auswählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.shared_users.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.shared_users.map((userId) => {
                        const user = users.find(u => u.id === userId);
                        return (
                          <Badge key={userId} variant="secondary" className="gap-1">
                            {user?.full_name || user?.email}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => setFormData({
                                ...formData,
                                shared_users: formData.shared_users.filter(id => id !== userId),
                              })}
                            />
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Abbrechen
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Speichert...' : 'Speichern'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Collections List */}
        <div className="lg:col-span-1 space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Lädt...</p>
              </CardContent>
            </Card>
          ) : collections.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground text-center">
                  Noch keine Sammlungen vorhanden
                </p>
              </CardContent>
            </Card>
          ) : (
            collections.map((collection) => (
              <Card
                key={collection.id}
                className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                  selectedCollection?.id === collection.id ? 'border-primary' : ''
                }`}
                onClick={() => setSelectedCollection(collection)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{collection.name}</CardTitle>
                      {collection.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {collection.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(collection);
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Sammlung wirklich löschen?')) {
                            deleteMutation.mutate(collection.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      {getVisibilityIcon(collection.visibility)}
                      <span>{getVisibilityLabel(collection.visibility)}</span>
                    </div>
                    <Badge variant="secondary">
                      {collection.collection_products?.[0]?.count || 0} Produkte
                    </Badge>
                  </div>
                  {collection.created_at && (
                    <div className="text-xs text-muted-foreground mt-2">
                      Erstellt: {format(new Date(collection.created_at), 'dd.MM.yyyy', { locale: de })}
                    </div>
                  )}
                  {collection.updated_at && collection.updated_at !== collection.created_at && (
                    <div className="text-xs text-muted-foreground">
                      Geändert: {format(new Date(collection.updated_at), 'dd.MM.yyyy', { locale: de })}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Collection Details */}
        <div className="lg:col-span-2">
          {selectedCollection ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">{selectedCollection.name}</CardTitle>
                    {selectedCollection.description && (
                      <p className="text-muted-foreground mt-1">
                        {selectedCollection.description}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedCollection(null)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {collectionProducts.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">
                      Diese Sammlung enthält noch keine Produkte.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Fügen Sie Produkte über die Produkte-Ansicht hinzu.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {collectionProducts.map((item: any) => (
                      <div
                        key={item.id}
                        className="p-4 bg-muted rounded-lg flex items-start justify-between"
                      >
                        <div className="flex-1">
                          <h4 className="font-medium">{item.products.product}</h4>
                          <p className="text-sm text-muted-foreground">
                            {item.products.manufacturer} • {item.products.product_family}
                          </p>
                          {item.products.product_description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {item.products.product_description}
                            </p>
                          )}
                          {item.added_at && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Hinzugefügt: {format(new Date(item.added_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            removeProductMutation.mutate({
                              collectionId: selectedCollection.id,
                              productId: item.products.id,
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">
                  Wählen Sie eine Sammlung aus, um Details zu sehen
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
