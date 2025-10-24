import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Columns3 } from 'lucide-react';
import { ColumnConfig } from '@/hooks/useTableColumns';

interface ColumnVisibilityToggleProps {
  columns: ColumnConfig[];
  onToggle: (key: string) => void;
  onReset: () => void;
}

export function ColumnVisibilityToggle({
  columns,
  onToggle,
  onReset,
}: ColumnVisibilityToggleProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Columns3 className="mr-2 h-4 w-4" />
          Spalten
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {columns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.key}
            checked={column.visible}
            onCheckedChange={() => onToggle(column.key)}
          >
            {column.label}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem onSelect={onReset}>
          Zurücksetzen
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
