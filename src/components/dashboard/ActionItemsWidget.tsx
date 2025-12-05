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
import { de, enUS } from 'date-fns/locale';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export function ActionItemsWidget() {
  const { activeTenant } = useAuth();
  const { t, language } = useLanguage();
  const dateLocale = language === 'de' ? de : enUS;
  const [open, setOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [assignmentType, setAssignmentType] = useState<'project' | 'customer'>('project');
  const [sortBy, setSortBy] = useState<'priority' | 'due_date' | 'created'>('created');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'open',
    due_date: '',
    project_id: '',
    customer_id: '',
    assigned_to: '',
  });

  const queryClient = useQueryClient();

  // Fetch action items
  const { data: actionItems = [], isLoading } = useQuery({
    queryKey: ['action_items', activeTenant?.id],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from('action_items')
        .select(`
          *, 
          project:customer_projects!action_items_project_id_fkey(customer, project_name),
          customer:customer_projects!action_items_customer_id_fkey(customer, project_name)
        `)
        .or(`user_id.eq.${user.id},assigned_to.eq.${user.id}`)
        .order('created_at', { ascending: false });
      
      // Filter by tenant if a tenant is selected
      if (activeTenant?.id) {
        query = query.eq('tenant_id', activeTenant.id);
      }
      
      const { data, error } = await query;

      if (error) throw error;
      
      // Fetch assigned user details separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(item => item.assigned_to).filter(Boolean))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds);
        
        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
        
        return data.map(item => ({
          ...item,
          assigned_user: item.assigned_to ? profilesMap.get(item.assigned_to) : null,
        }));
      }
      
      return data || [];
    },
  });

  // Fetch projects for dropdown
  const { data: projects = [] } = useQuery({
    queryKey: ['customer_projects', activeTenant?.id],
    queryFn: async () => {
      let query = supabase
        .from('customer_projects')
        .select('id, customer, project_name');
      
      // Filter by tenant if a tenant is selected
      if (activeTenant?.id) {
        query = query.eq('tenant_id', activeTenant.id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch unique customers
  const { data: customers = [] } = useQuery({
    queryKey: ['customers', activeTenant?.id],
    queryFn: async () => {
      let query = supabase
        .from('customer_projects')
        .select('id, customer')
        .order('customer');
      
      // Filter by tenant if a tenant is selected
      if (activeTenant?.id) {
        query = query.eq('tenant_id', activeTenant.id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Get unique customers
      const uniqueCustomers = Array.from(
        new Map(data?.map(item => [item.customer, item])).values()
      );
      return uniqueCustomers || [];
    },
  });

  // Fetch all users for assignment
  const { data: users = [] } = useQuery({
    queryKey: ['profiles', activeTenant?.id],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('id, email, full_name')
        .order('email');
      
      // Filter by tenant if a tenant is selected
      if (activeTenant?.id) {
        query = query.eq('tenant_id', activeTenant.id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const payload = {
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: data.status,
        due_date: data.due_date || null,
        project_id: assignmentType === 'project' ? (data.project_id || null) : null,
        customer_id: assignmentType === 'customer' ? (data.customer_id || null) : null,
        assigned_to: data.assigned_to || user.id,
      };

      if (editingItem) {
        const { error } = await supabase
          .from('action_items')
          .update(payload)
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('action_items')
          .insert({
            ...payload,
            user_id: user.id,
            tenant_id: activeTenant?.id && activeTenant.id !== 'global' ? activeTenant.id : null,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action_items'] });
      setOpen(false);
      resetForm();
      toast.success(editingItem ? t('actionItems.updated') : t('actionItems.created'));
    },
    onError: (error) => {
      toast.error(t('actionItems.saveError') + ': ' + error.message);
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
      toast.success(t('actionItems.deleted'));
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
      customer_id: '',
      assigned_to: '',
    });
    setAssignmentType('project');
    setEditingItem(null);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setAssignmentType(item.project_id ? 'project' : item.customer_id ? 'customer' : 'project');
    setFormData({
      title: item.title,
      description: item.description || '',
      priority: item.priority,
      status: item.status,
      due_date: item.due_date ? format(new Date(item.due_date), 'yyyy-MM-dd') : '',
      project_id: item.project_id || '',
      customer_id: item.customer_id || '',
      assigned_to: item.assigned_to || '',
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

  const sortItems = (items: any[]) => {
    return [...items].sort((a, b) => {
      if (sortBy === 'priority') {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder];
      } else if (sortBy === 'due_date') {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      } else {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
  };

  const openItems = sortItems(actionItems.filter(item => item.status === 'open'));
  const inProgressItems = sortItems(actionItems.filter(item => item.status === 'in_progress'));
  const completedItems = sortItems(actionItems.filter(item => item.status === 'completed'));

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>{t('actionItems.title')}</CardTitle>
        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={(value: 'priority' | 'due_date' | 'created') => setSortBy(value)}>
            <SelectTrigger className="w-[160px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created">{t('actionItems.sortByCreation')}</SelectItem>
              <SelectItem value="priority">{t('actionItems.sortByPriority')}</SelectItem>
              <SelectItem value="due_date">{t('actionItems.sortByDueDate')}</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                {t('actionItems.new')}
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? t('actionItems.edit') : t('actionItems.create')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">{t('actionItems.titleLabel')}</label>
                <Input
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder={t('actionItems.titlePlaceholder')}
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t('actionItems.descriptionLabel')}</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t('actionItems.descriptionPlaceholder')}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">{t('actionItems.priority')}</label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{t('actionItems.priorityLow')}</SelectItem>
                      <SelectItem value="medium">{t('actionItems.priorityMedium')}</SelectItem>
                      <SelectItem value="high">{t('actionItems.priorityHigh')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">{t('table.status')}</label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">{t('actionItems.statusOpen')}</SelectItem>
                      <SelectItem value="in_progress">{t('actionItems.statusInProgress')}</SelectItem>
                      <SelectItem value="completed">{t('actionItems.statusCompleted')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">{t('actionItems.assignedTo')}</label>
                <Select
                  value={formData.assigned_to || undefined}
                  onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('actionItems.assignMyself')} />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">{t('actionItems.assignment')}</label>
                <div className="space-y-2">
                  <Select
                    value={assignmentType}
                    onValueChange={(value: 'project' | 'customer') => {
                      setAssignmentType(value);
                      setFormData({ ...formData, project_id: '', customer_id: '' });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="project">{t('actionItems.project')}</SelectItem>
                      <SelectItem value="customer">{t('actionItems.customer')}</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {assignmentType === 'project' ? (
                    <Select
                      value={formData.project_id || undefined}
                      onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('actionItems.selectProject')} />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.customer} - {project.project_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Select
                      value={formData.customer_id || undefined}
                      onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('actionItems.selectCustomer')} />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.customer}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">{t('actionItems.dueDate')}</label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? t('common.loading') : t('common.save')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">{t('common.loading')}</div>
        ) : actionItems.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            {t('actionItems.noItems')}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Open Items */}
            {openItems.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold mb-2 text-muted-foreground">Offen ({openItems.length})</h4>
                <div className="space-y-2">
                  {openItems.map((item) => (
                    <div key={item.id} className="p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusIcon(item.status)}
                            <span className="font-medium text-xs">{item.title}</span>
                            <Badge variant={getPriorityColor(item.priority)} className="text-2xs">
                              {item.priority === 'high' ? 'Hoch' : item.priority === 'medium' ? 'Mittel' : 'Niedrig'}
                            </Badge>
                          </div>
                          {item.description && (
                            <p className="text-2xs text-muted-foreground mb-1">{item.description}</p>
                          )}
                          {(item as any).assigned_user && (
                            <p className="text-2xs text-muted-foreground">
                              👤 {(item as any).assigned_user.full_name || (item as any).assigned_user.email}
                            </p>
                          )}
                          {item.project && (
                            <p className="text-2xs text-muted-foreground">
                              📁 {item.project.customer} - {item.project.project_name}
                            </p>
                          )}
                          {item.customer && !item.project && (
                            <p className="text-2xs text-muted-foreground">
                              🏢 {item.customer.customer}
                            </p>
                          )}
                          {item.due_date && (
                            <p className="text-2xs text-muted-foreground">
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
                <h4 className="text-xs font-semibold mb-2 text-muted-foreground">In Bearbeitung ({inProgressItems.length})</h4>
                <div className="space-y-2">
                  {inProgressItems.map((item) => (
                    <div key={item.id} className="p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusIcon(item.status)}
                            <span className="font-medium text-xs">{item.title}</span>
                            <Badge variant={getPriorityColor(item.priority)} className="text-2xs">
                              {item.priority === 'high' ? 'Hoch' : item.priority === 'medium' ? 'Mittel' : 'Niedrig'}
                            </Badge>
                          </div>
                          {item.description && (
                            <p className="text-2xs text-muted-foreground mb-1">{item.description}</p>
                          )}
                          {(item as any).assigned_user && (
                            <p className="text-2xs text-muted-foreground">
                              👤 {(item as any).assigned_user.full_name || (item as any).assigned_user.email}
                            </p>
                          )}
                          {item.project && (
                            <p className="text-2xs text-muted-foreground">
                              📁 {item.project.customer} - {item.project.project_name}
                            </p>
                          )}
                          {item.customer && !item.project && (
                            <p className="text-2xs text-muted-foreground">
                              🏢 {item.customer.customer}
                            </p>
                          )}
                          {item.due_date && (
                            <p className="text-2xs text-muted-foreground">
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
                <h4 className="text-xs font-semibold mb-2 text-muted-foreground">Abgeschlossen ({completedItems.length})</h4>
                <div className="space-y-2">
                  {completedItems.slice(0, 3).map((item) => (
                    <div key={item.id} className="p-3 bg-muted/50 rounded-lg opacity-60">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusIcon(item.status)}
                            <span className="font-medium text-xs line-through">{item.title}</span>
                          </div>
                          {(item as any).assigned_user && (
                            <p className="text-2xs text-muted-foreground">
                              👤 {(item as any).assigned_user.full_name || (item as any).assigned_user.email}
                            </p>
                          )}
                          {item.project && (
                            <p className="text-2xs text-muted-foreground">
                              📁 {item.project.customer} - {item.project.project_name}
                            </p>
                          )}
                          {item.customer && !item.project && (
                            <p className="text-2xs text-muted-foreground">
                              🏢 {item.customer.customer}
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
