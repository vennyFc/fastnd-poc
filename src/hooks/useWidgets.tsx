import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type WidgetSize = 'medium' | 'full';

export interface WidgetConfig {
  id: string;
  type: string;
  visible: boolean;
  order: number;
  size: WidgetSize;
}

export const defaultWidgets: WidgetConfig[] = [
  { id: 'projects', type: 'projects', visible: true, order: 0, size: 'medium' },
  { id: 'action-items', type: 'action-items', visible: true, order: 1, size: 'medium' },
  { id: 'npi-products', type: 'npi-products', visible: true, order: 2, size: 'full' },
  { id: 'statistics', type: 'statistics', visible: true, order: 3, size: 'full' },
  { id: 'optimization-status', type: 'optimization-status', visible: true, order: 4, size: 'full' },
  { id: 'access-stats', type: 'access-stats', visible: true, order: 5, size: 'full' },
  { id: 'added-products', type: 'added-products', visible: true, order: 6, size: 'full' },
  { id: 'getting-started', type: 'getting-started', visible: true, order: 7, size: 'medium' },
];

export function useWidgets(storageKey: string = 'dashboard-widgets') {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch widget settings from database
  const { data: dbSettings } = useQuery({
    queryKey: ['user-dashboard-settings', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('user_dashboard_settings')
        .select('settings')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const [widgets, setWidgets] = useState<WidgetConfig[]>(() => {
    return defaultWidgets;
  });

  // Update local state when database settings are loaded
  useEffect(() => {
    if (dbSettings?.settings) {
      const storedWidgets = dbSettings.settings as any[];
      
      // Get IDs from defaultWidgets
      const defaultIds = new Set(defaultWidgets.map(dw => dw.id));
      
      // Filter out widgets that are no longer in defaults
      const validWidgets = storedWidgets.filter((w: WidgetConfig) => defaultIds.has(w.id));
      
      // Add new widgets from defaultWidgets that aren't in stored config
      const storedIds = new Set(validWidgets.map((w: WidgetConfig) => w.id));
      const newWidgets = defaultWidgets.filter(dw => !storedIds.has(dw.id));
      
      if (newWidgets.length > 0) {
        // Find max order in stored widgets
        const maxOrder = validWidgets.reduce((max: number, w: WidgetConfig) => 
          Math.max(max, w.order), -1);
        
        // Add new widgets with incremented orders
        const migratedWidgets = [
          ...validWidgets,
          ...newWidgets.map((w, idx) => ({ ...w, order: maxOrder + 1 + idx }))
        ];
        
        setWidgets(migratedWidgets);
      } else {
        setWidgets(validWidgets);
      }
    }
  }, [dbSettings]);

  // Mutation to save settings to database
  const saveSettings = useMutation({
    mutationFn: async (newWidgets: WidgetConfig[]) => {
      if (!user) return;
      
      const { data: existing } = await supabase
        .from('user_dashboard_settings')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existing) {
        await supabase
          .from('user_dashboard_settings')
          .update({ settings: newWidgets as any })
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('user_dashboard_settings')
          .insert({ user_id: user.id, settings: newWidgets as any });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-dashboard-settings', user?.id] });
    },
  });

  // Update widgets and save to database
  const updateWidgets = (newWidgets: WidgetConfig[]) => {
    setWidgets(newWidgets);
    saveSettings.mutate(newWidgets);
  };

  const toggleWidget = (id: string) => {
    const newWidgets = widgets.map(widget =>
      widget.id === id ? { ...widget, visible: !widget.visible } : widget
    );
    updateWidgets(newWidgets);
  };

  const reorderWidgets = (fromIndex: number, toIndex: number) => {
    const sorted = [...widgets].sort((a, b) => a.order - b.order);
    const [movedWidget] = sorted.splice(fromIndex, 1);
    sorted.splice(toIndex, 0, movedWidget);
    
    const newWidgets = sorted.map((widget, idx) => ({ ...widget, order: idx }));
    updateWidgets(newWidgets);
  };

  const resetWidgets = () => {
    updateWidgets(defaultWidgets);
  };

  const setWidgetSize = (id: string, size: WidgetSize) => {
    const newWidgets = widgets.map(widget =>
      widget.id === id ? { ...widget, size } : widget
    );
    updateWidgets(newWidgets);
  };

  const sortedWidgets = [...widgets].sort((a, b) => a.order - b.order);

  return {
    widgets: sortedWidgets,
    toggleWidget,
    reorderWidgets,
    resetWidgets,
    setWidgetSize,
  };
}
