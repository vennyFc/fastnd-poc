import { useState, useEffect } from 'react';

export type WidgetSize = 'small' | 'medium' | 'large' | 'full';

export interface WidgetConfig {
  id: string;
  type: string;
  visible: boolean;
  order: number;
  size: WidgetSize;
}

export const defaultWidgets: WidgetConfig[] = [
  { id: 'search', type: 'search', visible: true, order: 0, size: 'full' },
  { id: 'projects', type: 'projects', visible: true, order: 1, size: 'large' },
  { id: 'action-items', type: 'action-items', visible: true, order: 2, size: 'large' },
  { id: 'statistics', type: 'statistics', visible: true, order: 3, size: 'full' },
  { id: 'getting-started', type: 'getting-started', visible: true, order: 4, size: 'medium' },
];

export function useWidgets(storageKey: string = 'dashboard-widgets') {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const storedWidgets = JSON.parse(stored);
        
        // Migrate: Add new widgets from defaultWidgets that aren't in stored config
        const storedIds = new Set(storedWidgets.map((w: WidgetConfig) => w.id));
        const newWidgets = defaultWidgets.filter(dw => !storedIds.has(dw.id));
        
        if (newWidgets.length > 0) {
          // Find max order in stored widgets
          const maxOrder = storedWidgets.reduce((max: number, w: WidgetConfig) => 
            Math.max(max, w.order), -1);
          
          // Add new widgets with incremented orders
          const migratedWidgets = [
            ...storedWidgets,
            ...newWidgets.map((w, idx) => ({ ...w, order: maxOrder + 1 + idx }))
          ];
          
          return migratedWidgets;
        }
        
        return storedWidgets;
      } catch {
        return defaultWidgets;
      }
    }
    return defaultWidgets;
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(widgets));
  }, [widgets, storageKey]);

  const toggleWidget = (id: string) => {
    setWidgets(prev =>
      prev.map(widget =>
        widget.id === id ? { ...widget, visible: !widget.visible } : widget
      )
    );
  };

  const reorderWidgets = (fromIndex: number, toIndex: number) => {
    setWidgets(prev => {
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const [movedWidget] = sorted.splice(fromIndex, 1);
      sorted.splice(toIndex, 0, movedWidget);
      
      return sorted.map((widget, idx) => ({ ...widget, order: idx }));
    });
  };

  const resetWidgets = () => {
    setWidgets(defaultWidgets);
  };

  const setWidgetSize = (id: string, size: WidgetSize) => {
    setWidgets(prev =>
      prev.map(widget =>
        widget.id === id ? { ...widget, size } : widget
      )
    );
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
