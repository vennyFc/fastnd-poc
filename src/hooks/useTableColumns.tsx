import { useState, useEffect } from 'react';

export interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  width: number;
  order: number;
}

export function useTableColumns(storageKey: string, defaultColumns: ColumnConfig[]) {
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Ensure all columns have order property
        return parsed.map((col: any, idx: number) => ({
          ...col,
          order: col.order !== undefined ? col.order : idx
        }));
      } catch {
        return defaultColumns;
      }
    }
    return defaultColumns;
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(columns));
  }, [columns, storageKey]);

  const toggleColumn = (key: string) => {
    setColumns(cols =>
      cols.map(col =>
        col.key === key ? { ...col, visible: !col.visible } : col
      )
    );
  };

  const updateColumnWidth = (key: string, width: number) => {
    setColumns(cols =>
      cols.map(col =>
        col.key === key ? { ...col, width: Math.max(80, width) } : col
      )
    );
  };

  const reorderColumns = (fromIndex: number, toIndex: number) => {
    setColumns(cols => {
      const sorted = [...cols].sort((a, b) => a.order - b.order);
      const [movedColumn] = sorted.splice(fromIndex, 1);
      sorted.splice(toIndex, 0, movedColumn);
      
      // Update order values
      return sorted.map((col, idx) => ({ ...col, order: idx }));
    });
  };

  const resetColumns = () => {
    setColumns(defaultColumns);
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
