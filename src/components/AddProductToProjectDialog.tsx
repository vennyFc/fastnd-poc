import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Building2, FolderKanban, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AddProductToProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: {
    id: string;
    product: string;
    manufacturer?: string;
    product_family?: string;
  } | null;
}

export function AddProductToProjectDialog({
  open,
  onOpenChange,
  product,
}: AddProductToProjectDialogProps) {
  const { activeTenant, tenantId, user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [projectSearch, setProjectSearch] = useState('');

  // Fetch customers
  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['customers', activeTenant?.id],
    queryFn: async () => {
      if (!activeTenant) return [];

      const { data, error } = await supabase
        .from('customers')
        .select('id, customer_name, industry, city, country')
        .eq('tenant_id', activeTenant.id)
        .order('customer_name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!activeTenant && open,
  });

  // Fetch projects filtered by selected customer
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['customer_projects', activeTenant?.id, selectedCustomerId],
    queryFn: async () => {
      if (!activeTenant) return [];

      let query = supabase
        .from('customer_projects')
        .select('id, project_name, project_number, customer, application, product')
        .eq('tenant_id', activeTenant.id)
        .order('project_name');

      if (selectedCustomerId) {
        const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
        if (selectedCustomer) {
          query = query.eq('customer', selectedCustomer.customer_name);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeTenant && open,
  });

  // Filter customers by search
  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers;
    const search = customerSearch.toLowerCase();
    return customers.filter(
      (c: any) =>
        c.customer_name?.toLowerCase().includes(search) ||
        c.industry?.toLowerCase().includes(search) ||
        c.city?.toLowerCase().includes(search)
    );
  }, [customers, customerSearch]);

  // Filter projects by search
  const filteredProjects = useMemo(() => {
    if (!projectSearch) return projects;
    const search = projectSearch.toLowerCase();
    return projects.filter(
      (p: any) =>
        p.project_name?.toLowerCase().includes(search) ||
        p.project_number?.toLowerCase().includes(search) ||
        p.application?.toLowerCase().includes(search)
    );
  }, [projects, projectSearch]);

  // Mutation to add product to project
  const addProductMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProjectId || !product || !user) {
        throw new Error('Missing required data');
      }

      const selectedProject = projects.find(p => p.id === selectedProjectId);
      if (!selectedProject) {
        throw new Error('Project not found');
      }

      const effectiveTenantId =
        activeTenant?.id && activeTenant.id !== 'global' ? activeTenant.id : tenantId;

      if (!effectiveTenantId) {
        throw new Error(t('errors.noTenantSelected'));
      }

      // Check if product already exists in project's opps_optimization
      const { data: existingOpt } = await supabase
        .from('opps_optimization')
        .select('id')
        .eq('project_number', selectedProject.project_number)
        .eq('cross_sell_product_name', product.product)
        .eq('tenant_id', effectiveTenantId)
        .maybeSingle();

      if (existingOpt) {
        throw new Error(t('products.alreadyInProject'));
      }

      // Add to opps_optimization as cross-sell
      const { error: optError } = await supabase
        .from('opps_optimization')
        .insert({
          project_number: selectedProject.project_number,
          user_id: user.id,
          tenant_id: effectiveTenantId,
          optimization_status: 'Offen',
          cross_sell_product_name: product.product,
          cross_sell_status: 'Identifiziert',
          cross_sell_date_added: new Date().toISOString(),
        });

      if (optError) throw optError;

      return { projectName: selectedProject.project_name };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['opps_optimization'] });
      queryClient.invalidateQueries({ queryKey: ['customer_projects'] });
      toast.success(
        t('products.addedToProject').replace('{project}', data.projectName)
      );
      handleClose();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleClose = () => {
    setSelectedCustomerId(null);
    setSelectedProjectId(null);
    setCustomerSearch('');
    setProjectSearch('');
    onOpenChange(false);
  };

  const handleAdd = () => {
    addProductMutation.mutate();
  };

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t('products.addToProject')}</DialogTitle>
          <DialogDescription>
            {product && (
              <span>
                {t('products.assignProduct')}: <strong>{product.product}</strong>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Customer Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {t('common.customer')}
            </Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('products.searchCustomer')}
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <ScrollArea className="h-[150px] rounded-md border">
              {customersLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  {t('common.noResults')}
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredCustomers.map((customer: any) => (
                    <div
                      key={customer.id}
                      className={`p-2 rounded-md cursor-pointer text-sm transition-colors ${
                        selectedCustomerId === customer.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => {
                        setSelectedCustomerId(customer.id);
                        setSelectedProjectId(null);
                      }}
                    >
                      <div className="font-medium">{customer.customer_name}</div>
                      {(customer.industry || customer.city) && (
                        <div className="text-xs opacity-70">
                          {[customer.industry, customer.city].filter(Boolean).join(' • ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Project Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FolderKanban className="h-4 w-4" />
              {t('common.project')}
              {selectedCustomer && (
                <span className="text-muted-foreground text-xs">
                  ({selectedCustomer.customer_name})
                </span>
              )}
            </Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('products.searchProject')}
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <ScrollArea className="h-[150px] rounded-md border">
              {projectsLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  {selectedCustomerId
                    ? t('products.noProjectsForCustomer')
                    : t('products.selectCustomerFirst')}
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredProjects.map((project: any) => (
                    <div
                      key={project.id}
                      className={`p-2 rounded-md cursor-pointer text-sm transition-colors ${
                        selectedProjectId === project.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => setSelectedProjectId(project.id)}
                    >
                      <div className="font-medium">{project.project_name}</div>
                      <div className="text-xs opacity-70">
                        {project.project_number}
                        {project.application && ` • ${project.application}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!selectedProjectId || addProductMutation.isPending}
          >
            {addProductMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {t('common.add')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
