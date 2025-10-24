import { useState, useRef, useEffect } from 'react';
import { TableHead } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface ResizableTableHeaderProps {
  label: string;
  width: number;
  onResize: (width: number) => void;
  sortable?: boolean;
  sortDirection?: 'asc' | 'desc' | null;
  onSort?: () => void;
  className?: string;
}

export function ResizableTableHeader({
  label,
  width,
  onResize,
  sortable = false,
  sortDirection = null,
  onSort,
  className = '',
}: ResizableTableHeaderProps) {
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startXRef.current;
      const newWidth = startWidthRef.current + diff;
      onResize(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, onResize]);

  const getSortIcon = () => {
    if (!sortable) return null;
    if (sortDirection === 'asc') return <ArrowUp className="ml-1 h-3 w-3" />;
    if (sortDirection === 'desc') return <ArrowDown className="ml-1 h-3 w-3" />;
    return <ArrowUpDown className="ml-1 h-3 w-3" />;
  };

  return (
    <TableHead style={{ width: `${width}px`, position: 'relative' }} className={className}>
      <div className="flex items-center justify-between">
        {sortable && onSort ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSort}
            className="h-auto p-0 font-semibold hover:bg-transparent"
          >
            {label}
            {getSortIcon()}
          </Button>
        ) : (
          <span className="font-semibold">{label}</span>
        )}
        <div
          onMouseDown={handleMouseDown}
          className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 active:bg-primary"
          style={{ userSelect: 'none' }}
        />
      </div>
    </TableHead>
  );
}
