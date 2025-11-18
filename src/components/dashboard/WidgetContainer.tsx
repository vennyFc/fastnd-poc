import { GripVertical } from 'lucide-react';
import { ReactNode } from 'react';
import { WidgetSize } from '@/hooks/useWidgets';

interface WidgetContainerProps {
  id: string;
  children: ReactNode;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onDragLeave: (e: React.DragEvent, index: number) => void;
  onDragEnd: (e: React.DragEvent) => void;
  index: number;
  isDragging: boolean;
  isDropTarget?: boolean;
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
  onDragOver,
  onDrop,
  onDragLeave,
  onDragEnd,
  index,
  isDragging,
  isDropTarget = false,
  size = 'full',
}: WidgetContainerProps) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
      onDragLeave={(e) => onDragLeave(e, index)}
      onDragEnd={onDragEnd}
      className={`relative group ${isDragging ? 'opacity-50 scale-95' : ''} ${sizeClasses[size]} transition-all duration-200`}
    >
      {/* Drop Zone Indicator */}
      {isDropTarget && !isDragging && (
        <div className="absolute inset-0 z-20 pointer-events-none">
          <div className="h-full w-full rounded-lg border-2 border-primary border-dashed bg-primary/5 animate-pulse flex items-center justify-center">
            <div className="text-primary font-medium text-sm bg-background/90 px-3 py-1 rounded-full shadow-lg">
              Widget hier platzieren
            </div>
          </div>
        </div>
      )}
      
      <div className="absolute -left-6 top-4 opacity-30 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10 bg-background/80 backdrop-blur-sm rounded p-1">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className={`h-full rounded-lg border transition-all ${isDragging ? 'border-primary border-dashed' : 'border-transparent'}`}>
        {children}
      </div>
    </div>
  );
}
