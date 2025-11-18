import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSearchParams } from 'react-router-dom';
import { useWidgets } from '@/hooks/useWidgets';
import { useAuth } from '@/contexts/AuthContext';
import { SearchWidget } from '@/components/dashboard/SearchWidget';
import { StatisticsWidget } from '@/components/dashboard/StatisticsWidget';
import { GettingStartedWidget } from '@/components/dashboard/GettingStartedWidget';
import { ActionItemsWidget } from '@/components/dashboard/ActionItemsWidget';
import { ProjectsWidget } from '@/components/dashboard/ProjectsWidget';
import { OptimizationStatusWidget } from '@/components/dashboard/OptimizationStatusWidget';
import { AddedProductsWidget } from '@/components/dashboard/AddedProductsWidget';
import { NPIProductsWidget } from '@/components/dashboard/NPIProductsWidget';
import { AccessStatsWidget } from '@/components/dashboard/AccessStatsWidget';
import { LoginActivityWidget } from '@/components/dashboard/LoginActivityWidget';
import { WidgetContainer } from '@/components/dashboard/WidgetContainer';
import { WidgetSettings } from '@/components/dashboard/WidgetSettings';

export default function Dashboard() {
  const { activeTenant, isSuperAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  const { widgets, toggleWidget, reorderWidgets, resetWidgets, setWidgetSize } = useWidgets();
  const { user } = useAuth();

  // Check if user is admin
  const { data: isAdmin = false } = useQuery({
    queryKey: ['user-is-admin', user?.id],
    queryFn: async () => {
      if (!user) return false;
      
      const { data } = await supabase
        .rpc('has_role', { _user_id: user.id, _role: 'super_admin' });
      
      return data || false;
    },
    enabled: !!user,
  });

  useEffect(() => {
    const search = searchParams.get('search');
    if (search) {
      setSearchQuery(search);
    }
  }, [searchParams]);

  // Fetch all data for search
  const { data: projects } = useQuery({
    queryKey: ['customer_projects', activeTenant?.id],
    queryFn: async () => {
      // @ts-ignore
      let query = supabase
        // @ts-ignore
        .from('customer_projects')
        .select('*');
      
      // Filter by tenant if super admin has selected a specific tenant
      if (isSuperAdmin && activeTenant) {
        query = query.eq('tenant_id', activeTenant.id);
      }
      
      const { data } = await query;
      return data || [];
    },
  });

  const { data: products } = useQuery({
    queryKey: ['products', activeTenant?.id],
    queryFn: async () => {
      // @ts-ignore
      let query = supabase
        // @ts-ignore
        .from('products')
        .select('*');
      
      // Filter by tenant if super admin has selected a specific tenant
      if (isSuperAdmin && activeTenant) {
        query = query.eq('tenant_id', activeTenant.id);
      }
      
      const { data } = await query;
      return data || [];
    },
  });

  const { data: applications } = useQuery({
    queryKey: ['applications', activeTenant?.id],
    queryFn: async () => {
      // @ts-ignore
      let query = supabase
        // @ts-ignore
        .from('applications')
        .select('*');
      
      // Filter by tenant if super admin has selected a specific tenant
      if (isSuperAdmin && activeTenant) {
        query = query.eq('tenant_id', activeTenant.id);
      }
      
      const { data } = await query;
      return data || [];
    },
  });

  const { data: crossSells } = useQuery({
    queryKey: ['cross_sells', activeTenant?.id],
    queryFn: async () => {
      // @ts-ignore
      let query = supabase
        // @ts-ignore
        .from('cross_sells')
        .select('*');
      
      // Filter by tenant if super admin has selected a specific tenant
      if (isSuperAdmin && activeTenant) {
        query = query.eq('tenant_id', activeTenant.id);
      }
      
      const { data } = await query;
      return data || [];
    },
  });

  // Drag and Drop handlers for widget reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', ''); // Required for Firefox
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedIndex === null || draggedIndex === index) return;
    
    // Only update if we're hovering over a different widget
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedIndex === null || draggedIndex === index) return;
    
    reorderWidgets(draggedIndex, index);
  };

  const handleDragLeave = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    // Only clear if we're actually leaving this widget (not entering a child)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      if (dragOverIndex === index) {
        setDragOverIndex(null);
      }
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const renderWidget = (widget: typeof widgets[0], index: number) => {
    switch (widget.type) {
      case 'search':
        return (
          <WidgetContainer
            key="search"
            id="search"
            index={index}
            isDragging={draggedIndex === index}
            isDropTarget={dragOverIndex === index}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragLeave={handleDragLeave}
            onDragEnd={handleDragEnd}
            size={widget.size}
          >
            <SearchWidget
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              projects={projects || []}
              products={products || []}
              applications={applications || []}
              crossSells={crossSells || []}
            />
          </WidgetContainer>
        );
      case 'projects':
        return (
          <WidgetContainer
            key="projects"
            id="projects"
            index={index}
            isDragging={draggedIndex === index}
            isDropTarget={dragOverIndex === index}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragLeave={handleDragLeave}
            onDragEnd={handleDragEnd}
            size={widget.size}
          >
            <ProjectsWidget />
          </WidgetContainer>
        );
      case 'action-items':
        return (
          <WidgetContainer
            key="action-items"
            id="action-items"
            index={index}
            isDragging={draggedIndex === index}
            isDropTarget={dragOverIndex === index}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragLeave={handleDragLeave}
            onDragEnd={handleDragEnd}
            size={widget.size}
          >
            <ActionItemsWidget />
          </WidgetContainer>
        );
      case 'statistics':
        return (
          <WidgetContainer
            key="statistics"
            id="statistics"
            index={index}
            isDragging={draggedIndex === index}
            isDropTarget={dragOverIndex === index}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragLeave={handleDragLeave}
            onDragEnd={handleDragEnd}
            size={widget.size}
          >
            <StatisticsWidget
              projects={projects || []}
              products={products || []}
              crossSells={crossSells || []}
            />
          </WidgetContainer>
        );
      case 'npi-products':
        return (
          <WidgetContainer
            key="npi-products"
            id="npi-products"
            index={index}
            isDragging={draggedIndex === index}
            isDropTarget={dragOverIndex === index}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragLeave={handleDragLeave}
            onDragEnd={handleDragEnd}
            size={widget.size}
          >
            <NPIProductsWidget />
          </WidgetContainer>
        );
      case 'optimization-status':
        return (
          <WidgetContainer
            key="optimization-status"
            id="optimization-status"
            index={index}
            isDragging={draggedIndex === index}
            isDropTarget={dragOverIndex === index}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragLeave={handleDragLeave}
            onDragEnd={handleDragEnd}
            size={widget.size}
          >
            <OptimizationStatusWidget />
          </WidgetContainer>
        );
      case 'login-activity':
        // Only show for admins
        if (!isAdmin) return null;
        return (
          <WidgetContainer
            key="login-activity"
            id="login-activity"
            index={index}
            isDragging={draggedIndex === index}
            isDropTarget={dragOverIndex === index}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragLeave={handleDragLeave}
            onDragEnd={handleDragEnd}
            size={widget.size}
          >
            <LoginActivityWidget />
          </WidgetContainer>
        );
      case 'access-stats':
        // Only show for admins
        if (!isAdmin) return null;
        return (
          <WidgetContainer
            key="access-stats"
            id="access-stats"
            index={index}
            isDragging={draggedIndex === index}
            isDropTarget={dragOverIndex === index}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragLeave={handleDragLeave}
            onDragEnd={handleDragEnd}
            size={widget.size}
          >
            <AccessStatsWidget />
          </WidgetContainer>
        );
      case 'added-products':
        return (
          <WidgetContainer
            key="added-products"
            id="added-products"
            index={index}
            isDragging={draggedIndex === index}
            isDropTarget={dragOverIndex === index}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragLeave={handleDragLeave}
            onDragEnd={handleDragEnd}
            size={widget.size}
          >
            <AddedProductsWidget />
          </WidgetContainer>
        );
      case 'getting-started':
        return (
          <WidgetContainer
            key="getting-started"
            id="getting-started"
            index={index}
            isDragging={draggedIndex === index}
            isDropTarget={dragOverIndex === index}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragLeave={handleDragLeave}
            onDragEnd={handleDragEnd}
            size={widget.size}
          >
            <GettingStartedWidget />
          </WidgetContainer>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-end mb-4">
        <WidgetSettings
          widgets={widgets}
          onToggleWidget={toggleWidget}
          onReset={resetWidgets}
          onSetWidgetSize={setWidgetSize}
          isAdmin={isAdmin}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pl-8">
        {widgets
          .filter(widget => widget.visible)
          .map((widget, index) => renderWidget(widget, index))}
      </div>
    </div>
  );
}
