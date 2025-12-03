import { useState, useRef, useEffect } from 'react';
import { TableHead } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ResizableTableHeaderProps {
  label: string | React.ReactNode;
  labelTooltip?: string;
  width: number;
  onResize: (width: number) => void;
  sortable?: boolean;
  sortDirection?: 'asc' | 'desc' | null;
  onSort?: () => void;
  className?: string;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
}

export function ResizableTableHeader({
  label,
  labelTooltip,
  width,
  onResize,
  sortable = false,
  sortDirection = null,
  onSort,
  className = '',
  draggable = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: ResizableTableHeaderProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    onDragStart?.(e);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    onDragEnd?.();
  };

  return (
    <TableHead 
      style={{ width: `${width}px`, position: 'relative' }} 
      className={`${className} ${isDragging ? 'opacity-50' : ''}`}
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={handleDragEnd}
    >
      <div className="flex items-center justify-between gap-1 pr-3">
        {draggable && (
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-move flex-shrink-0" />
        )}
        {sortable && onSort ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSort}
            className="h-auto p-0 font-semibold hover:bg-transparent flex-1 justify-start text-left whitespace-normal leading-tight"
          >
            {labelTooltip ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="block cursor-help underline decoration-dotted decoration-muted-foreground">{label}</span>
                </TooltipTrigger>
                <TooltipContent>{labelTooltip}</TooltipContent>
              </Tooltip>
            ) : (
              <span className="block">{label}</span>
            )}
            {getSortIcon()}
          </Button>
        ) : (
          labelTooltip ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="font-semibold flex-1 block whitespace-normal leading-tight text-left cursor-help underline decoration-dotted decoration-muted-foreground">{label}</span>
              </TooltipTrigger>
              <TooltipContent>{labelTooltip}</TooltipContent>
            </Tooltip>
          ) : (
            <span className="font-semibold flex-1 block whitespace-normal leading-tight text-left">{label}</span>
          )
        )}
        <div
          onMouseDown={handleMouseDown}
          className={`absolute right-0 top-0 h-full w-2 cursor-col-resize border-r-2 transition-colors ${
            isResizing 
              ? 'border-primary bg-primary/20' 
              : 'border-transparent hover:border-primary/30 hover:bg-primary/10'
          }`}
          style={{ userSelect: 'none' }}
          title="Spaltenbreite anpassen"
        />
      </div>
    </TableHead>
  );
}
