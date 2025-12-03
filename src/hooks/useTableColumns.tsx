import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ColumnConfig {
  key: string;
  label: string | React.ReactNode;
  labelTooltip?: string;
  visible: boolean;
  width: number;
  order: number;
}

export function useTableColumns(storageKey: string, defaultColumns: ColumnConfig[]) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch column settings from database
  const { data: dbSettings } = useQuery({
    queryKey: ['user-column-settings', user?.id, storageKey],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('user_column_settings')
        .select('settings')
        .eq('user_id', user.id)
        .eq('table_name', storageKey)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    return defaultColumns;
  });

  // Keep a ref of the latest defaults without affecting hook order (placed after useState)
  const defaultColumnsRef = React.useRef(defaultColumns);
  defaultColumnsRef.current = defaultColumns;

  // Update local state when database settings are loaded
  useEffect(() => {
    const currentDefaults = defaultColumnsRef.current;
    
    if (dbSettings?.settings) {
      const saved = (dbSettings.settings as any[]) || [];
      // Merge defaults with saved settings by key so new columns appear automatically
      // ONLY keep columns that exist in defaults - discard any deprecated/removed columns
      const savedMap = new Map(saved.map((c) => [c.key, c]));
      const merged: ColumnConfig[] = currentDefaults.map((def, idx) => {
        const s = savedMap.get(def.key);
        return {
          ...def,
          ...(s || {}),
          label: def.label, // Always use label from defaults (not from saved settings)
          labelTooltip: def.labelTooltip, // Always use labelTooltip from defaults
          order: s?.order !== undefined ? s.order : def.order ?? idx,
        } as ColumnConfig;
      });
      // Do NOT keep extra columns from saved settings that are no longer in defaults
      console.log('📊 Merged columns for', storageKey, ':', merged);
      setColumns(merged);
    } else {
      // No saved settings: ensure defaults are set
      console.log('📊 Using default columns for', storageKey, ':', currentDefaults);
      setColumns(currentDefaults);
    }
  }, [dbSettings, storageKey]);

  // Mutation to save settings to database
  const saveSettings = useMutation({
    mutationFn: async (newColumns: ColumnConfig[]) => {
      if (!user) return;
      
      const { data: existing } = await supabase
        .from('user_column_settings')
        .select('id')
        .eq('user_id', user.id)
        .eq('table_name', storageKey)
        .single();

      if (existing) {
        await supabase
          .from('user_column_settings')
          .update({ settings: newColumns as any })
          .eq('user_id', user.id)
          .eq('table_name', storageKey);
      } else {
        await supabase
          .from('user_column_settings')
          .insert({ user_id: user.id, table_name: storageKey, settings: newColumns as any });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-column-settings', user?.id, storageKey] });
    },
  });

  // Update columns and save to database
  const updateColumns = (newColumns: ColumnConfig[]) => {
    setColumns(newColumns);
    saveSettings.mutate(newColumns);
  };

  const toggleColumn = (key: string) => {
    const newColumns = columns.map(col =>
      col.key === key ? { ...col, visible: !col.visible } : col
    );
    updateColumns(newColumns);
  };

  const updateColumnWidth = (key: string, width: number) => {
    const newColumns = columns.map(col =>
      col.key === key ? { ...col, width: Math.max(80, width) } : col
    );
    updateColumns(newColumns);
  };

  const reorderColumns = (fromIndex: number, toIndex: number) => {
    // Work on full ordered list but map indices from VISIBLE headers
    const sortedAll = [...columns].sort((a, b) => a.order - b.order);
    const visiblePositions = sortedAll.reduce<number[]>((acc, col, idx) => {
      if (col.visible) acc.push(idx);
      return acc;
    }, []);

    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= visiblePositions.length ||
      toIndex >= visiblePositions.length
    ) {
      return;
    }

    const fromPos = visiblePositions[fromIndex];
    const toPos = visiblePositions[toIndex];

    const updated = [...sortedAll];
    const [moved] = updated.splice(fromPos, 1);
    updated.splice(toPos, 0, moved);

    const newColumns = updated.map((col, idx) => ({ ...col, order: idx }));
    updateColumns(newColumns);
  };

  const resetColumns = () => {
    updateColumns(defaultColumns);
  };

  // Return columns sorted by order
  const sortedColumns = [...columns].sort((a, b) => a.order - b.order);

  return {
    columns: sortedColumns,
    toggleColumn,
    updateColumnWidth,
    reorderColumns,
    resetColumns,
  };
}
