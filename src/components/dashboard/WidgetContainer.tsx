import { GripVertical } from 'lucide-react';
import { ReactNode } from 'react';
import { WidgetSize } from '@/hooks/useWidgets';

interface WidgetContainerProps {
  id: string;
  children: ReactNode;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragEnter: (e: React.DragEvent, index: number) => void;
  onDragEnd: (e: React.DragEvent) => void;
  index: number;
  isDragging: boolean;
  size?: WidgetSize;
}

const sizeClasses: Record<WidgetSize, string> = {
  medium: 'col-span-1 md:col-span-6',
  full: 'col-span-1 md:col-span-12',
};

export function WidgetContainer({
  id,
  children,
  onDragStart,
  onDragEnter,
  onDragEnd,
  index,
  isDragging,
  size = 'full',
}: WidgetContainerProps) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragEnter={(e) => onDragEnter(e, index)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      className={`relative group ${isDragging ? 'opacity-50 scale-95' : ''} ${sizeClasses[size]} transition-all duration-200`}
    >
      <div className="absolute -left-6 top-4 opacity-30 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10 bg-background/80 backdrop-blur-sm rounded p-1">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className={`h-full rounded-lg border transition-all ${isDragging ? 'border-primary border-dashed' : 'border-transparent'}`}>
        {children}
      </div>
    </div>
  );
}
