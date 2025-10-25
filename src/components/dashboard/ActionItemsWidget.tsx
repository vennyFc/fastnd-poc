import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, CheckCircle2, Circle, Clock, Trash2, Edit } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';

export function ActionItemsWidget() {
  const [open, setOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'open',
    due_date: '',
    project_id: '',
  });

  const queryClient = useQueryClient();

  // Fetch action items
  const { data: actionItems = [], isLoading } = useQuery({
    queryKey: ['action_items'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('action_items')
        .select('*, customer_projects(customer, project_name)')
        .or(`user_id.eq.${user.id},assigned_to.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch projects for dropdown
  const { data: projects = [] } = useQuery({
    queryKey: ['customer_projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_projects')
        .select('id, customer, project_name');
      if (error) throw error;
      return data || [];
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (editingItem) {
        const { error } = await supabase
          .from('action_items')
          .update({
            ...data,
            project_id: data.project_id || null,
            due_date: data.due_date || null,
          })
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('action_items')
          .insert({
            ...data,
            user_id: user.id,
            assigned_to: user.id,
            project_id: data.project_id || null,
            due_date: data.due_date || null,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action_items'] });
      setOpen(false);
      resetForm();
      toast.success(editingItem ? 'Action Item aktualisiert' : 'Action Item erstellt');
    },
    onError: (error) => {
      toast.error('Fehler beim Speichern: ' + error.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('action_items')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action_items'] });
      toast.success('Action Item gelöscht');
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'open' | 'in_progress' | 'completed' }) => {
      const { error } = await supabase
        .from('action_items')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action_items'] });
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      status: 'open',
      due_date: '',
      project_id: '',
    });
    setEditingItem(null);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description || '',
      priority: item.priority,
      status: item.status,
      due_date: item.due_date ? format(new Date(item.due_date), 'yyyy-MM-dd') : '',
      project_id: item.project_id || '',
    });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-blue-500" />;
      default: return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const openItems = actionItems.filter(item => item.status === 'open');
  const inProgressItems = actionItems.filter(item => item.status === 'in_progress');
  const completedItems = actionItems.filter(item => item.status === 'completed');

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Action Items</CardTitle>
        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Neu
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Action Item bearbeiten' : 'Neues Action Item'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Titel</label>
                <Input
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Titel des Action Items"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Beschreibung</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optionale Beschreibung"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Priorität</label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Niedrig</SelectItem>
                      <SelectItem value="medium">Mittel</SelectItem>
                      <SelectItem value="high">Hoch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Offen</SelectItem>
                      <SelectItem value="in_progress">In Bearbeitung</SelectItem>
                      <SelectItem value="completed">Abgeschlossen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Projekt (optional)</label>
                <Select
                  value={formData.project_id}
                  onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Projekt auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Kein Projekt</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.customer} - {project.project_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Fälligkeitsdatum (optional)</label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
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
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Lädt...</div>
        ) : actionItems.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            Noch keine Action Items. Erstellen Sie Ihr erstes!
          </div>
        ) : (
          <div className="space-y-6">
            {/* Open Items */}
            {openItems.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Offen ({openItems.length})</h4>
                <div className="space-y-2">
                  {openItems.map((item) => (
                    <div key={item.id} className="p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusIcon(item.status)}
                            <span className="font-medium text-sm">{item.title}</span>
                            <Badge variant={getPriorityColor(item.priority)} className="text-xs">
                              {item.priority === 'high' ? 'Hoch' : item.priority === 'medium' ? 'Mittel' : 'Niedrig'}
                            </Badge>
                          </div>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mb-1">{item.description}</p>
                          )}
                          {item.customer_projects && (
                            <p className="text-xs text-muted-foreground">
                              📁 {item.customer_projects.customer} - {item.customer_projects.project_name}
                            </p>
                          )}
                          {item.due_date && (
                            <p className="text-xs text-muted-foreground">
                              🗓️ {format(new Date(item.due_date), 'dd. MMM yyyy', { locale: de })}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => updateStatusMutation.mutate({ id: item.id, status: 'in_progress' })}
                          >
                            <Clock className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => handleEdit(item)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => deleteMutation.mutate(item.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* In Progress Items */}
            {inProgressItems.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 text-muted-foreground">In Bearbeitung ({inProgressItems.length})</h4>
                <div className="space-y-2">
                  {inProgressItems.map((item) => (
                    <div key={item.id} className="p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusIcon(item.status)}
                            <span className="font-medium text-sm">{item.title}</span>
                            <Badge variant={getPriorityColor(item.priority)} className="text-xs">
                              {item.priority === 'high' ? 'Hoch' : item.priority === 'medium' ? 'Mittel' : 'Niedrig'}
                            </Badge>
                          </div>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mb-1">{item.description}</p>
                          )}
                          {item.customer_projects && (
                            <p className="text-xs text-muted-foreground">
                              📁 {item.customer_projects.customer} - {item.customer_projects.project_name}
                            </p>
                          )}
                          {item.due_date && (
                            <p className="text-xs text-muted-foreground">
                              🗓️ {format(new Date(item.due_date), 'dd. MMM yyyy', { locale: de })}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => updateStatusMutation.mutate({ id: item.id, status: 'completed' })}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => handleEdit(item)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => deleteMutation.mutate(item.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Completed Items */}
            {completedItems.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Abgeschlossen ({completedItems.length})</h4>
                <div className="space-y-2">
                  {completedItems.slice(0, 3).map((item) => (
                    <div key={item.id} className="p-3 bg-muted/50 rounded-lg opacity-60">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusIcon(item.status)}
                            <span className="font-medium text-sm line-through">{item.title}</span>
                          </div>
                          {item.customer_projects && (
                            <p className="text-xs text-muted-foreground">
                              📁 {item.customer_projects.customer} - {item.customer_projects.project_name}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => deleteMutation.mutate(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {completedItems.length > 3 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      + {completedItems.length - 3} weitere abgeschlossen
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
