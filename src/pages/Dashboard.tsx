import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSearchParams } from 'react-router-dom';
import { useWidgets } from '@/hooks/useWidgets';
import { SearchWidget } from '@/components/dashboard/SearchWidget';
import { StatisticsWidget } from '@/components/dashboard/StatisticsWidget';
import { GettingStartedWidget } from '@/components/dashboard/GettingStartedWidget';
import { ActionItemsWidget } from '@/components/dashboard/ActionItemsWidget';
import { ProjectsWidget } from '@/components/dashboard/ProjectsWidget';
import { WidgetContainer } from '@/components/dashboard/WidgetContainer';
import { WidgetSettings } from '@/components/dashboard/WidgetSettings';

export default function Dashboard() {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  const { widgets, toggleWidget, reorderWidgets, resetWidgets, setWidgetSize } = useWidgets();

  useEffect(() => {
    const search = searchParams.get('search');
    if (search) {
      setSearchQuery(search);
    }
  }, [searchParams]);

  // Fetch all data for search
  const { data: projects } = useQuery({
    queryKey: ['customer_projects'],
    queryFn: async () => {
      // @ts-ignore
      const { data } = await supabase
        // @ts-ignore
        .from('customer_projects')
        .select('*');
      return data || [];
    },
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      // @ts-ignore
      const { data } = await supabase
        // @ts-ignore
        .from('products')
        .select('*');
      return data || [];
    },
  });

  const { data: applications } = useQuery({
    queryKey: ['applications'],
    queryFn: async () => {
      // @ts-ignore
      const { data } = await supabase
        // @ts-ignore
        .from('applications')
        .select('*');
      return data || [];
    },
  });

  const { data: crossSells } = useQuery({
    queryKey: ['cross_sells'],
    queryFn: async () => {
      // @ts-ignore
      const { data } = await supabase
        // @ts-ignore
        .from('cross_sells')
        .select('*');
      return data || [];
    },
  });

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    reorderWidgets(draggedIndex, index);
    setDraggedIndex(index);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggedIndex(null);
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
            onDragStart={handleDragStart}
            onDragEnter={handleDragEnter}
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
            onDragStart={handleDragStart}
            onDragEnter={handleDragEnter}
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
            onDragStart={handleDragStart}
            onDragEnter={handleDragEnter}
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
            onDragStart={handleDragStart}
            onDragEnter={handleDragEnter}
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
      case 'getting-started':
        return (
          <WidgetContainer
            key="getting-started"
            id="getting-started"
            index={index}
            isDragging={draggedIndex === index}
            onDragStart={handleDragStart}
            onDragEnter={handleDragEnter}
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
