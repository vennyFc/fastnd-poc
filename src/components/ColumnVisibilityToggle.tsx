import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Columns3 } from 'lucide-react';
import { ColumnConfig } from '@/hooks/useTableColumns';

interface ColumnVisibilityToggleProps {
  columns: ColumnConfig[];
  onToggle: (key: string) => void;
  onReset: () => void;
}

interface ColumnGroup {
  label: string;
  columns: ColumnConfig[];
  onToggle: (key: string) => void;
  onReset: () => void;
}

interface MultiColumnVisibilityToggleProps {
  groups: ColumnGroup[];
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

export function MultiColumnVisibilityToggle({
  groups,
}: MultiColumnVisibilityToggleProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Columns3 className="mr-2 h-4 w-4" />
          Spalten
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 max-h-96 overflow-y-auto">
        {groups.map((group, groupIndex) => (
          <div key={group.label}>
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
              {group.label}
            </DropdownMenuLabel>
            {group.columns.map((column) => (
              <DropdownMenuCheckboxItem
                key={column.key}
                checked={column.visible}
                onCheckedChange={() => group.onToggle(column.key)}
              >
                {column.label}
              </DropdownMenuCheckboxItem>
            ))}
            {groupIndex < groups.length - 1 && <DropdownMenuSeparator />}
          </div>
        ))}
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start text-xs"
            onClick={() => groups.forEach(g => g.onReset())}
          >
            Alle zurücksetzen
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
