import { useState, useEffect } from 'react';

export interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  width: number;
}

export function useTableColumns(storageKey: string, defaultColumns: ColumnConfig[]) {
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        return JSON.parse(stored);
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

  const resetColumns = () => {
    setColumns(defaultColumns);
  };

  return {
    columns,
    toggleColumn,
    updateColumnWidth,
    resetColumns,
  };
}
