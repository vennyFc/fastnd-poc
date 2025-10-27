import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ColumnConfig {
  key: string;
  label: string;
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

  // Update local state when database settings are loaded
  useEffect(() => {
    if (dbSettings?.settings) {
      const parsed = dbSettings.settings as any[];
      setColumns(parsed.map((col: any, idx: number) => ({
        ...col,
        order: col.order !== undefined ? col.order : idx
      })));
    }
  }, [dbSettings]);

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
    const sorted = [...columns].sort((a, b) => a.order - b.order);
    const [movedColumn] = sorted.splice(fromIndex, 1);
    sorted.splice(toIndex, 0, movedColumn);
    
    const newColumns = sorted.map((col, idx) => ({ ...col, order: idx }));
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
