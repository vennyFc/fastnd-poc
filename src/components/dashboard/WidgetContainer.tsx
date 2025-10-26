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
  small: 'col-span-1 md:col-span-4',
  medium: 'col-span-1 md:col-span-6',
  large: 'col-span-1 md:col-span-8',
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
      className={`relative group ${isDragging ? 'opacity-50' : ''} ${sizeClasses[size]}`}
    >
      <div className="absolute -left-8 top-4 opacity-0 group-hover:opacity-100 transition-opacity cursor-move z-10">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="h-full">
        {children}
      </div>
    </div>
  );
}
