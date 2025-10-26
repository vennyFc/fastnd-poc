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
  small: 'max-w-2xl',
  medium: 'max-w-4xl',
  large: 'max-w-6xl',
  full: 'w-full',
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
      <div className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-move z-10">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
      {children}
    </div>
  );
}
