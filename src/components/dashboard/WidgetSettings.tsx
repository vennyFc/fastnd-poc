import { Settings, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { WidgetConfig } from '@/hooks/useWidgets';

interface WidgetSettingsProps {
  widgets: WidgetConfig[];
  onToggleWidget: (id: string) => void;
  onReset: () => void;
}

const widgetLabels: Record<string, string> = {
  'search': 'Suche',
  'statistics': 'Statistiken',
  'getting-started': 'Erste Schritte',
};

export function WidgetSettings({ widgets, onToggleWidget, onReset }: WidgetSettingsProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Dashboard anpassen
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Widgets anpassen</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Wählen Sie, welche Widgets angezeigt werden sollen. Ziehen Sie sie, um die Reihenfolge zu ändern.
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            {widgets.map((widget) => (
              <div
                key={widget.id}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted"
              >
                <span className="text-sm font-medium">{widgetLabels[widget.type]}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleWidget(widget.id)}
                  className="h-8 w-8 p-0"
                >
                  {widget.visible ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            ))}
          </div>

          <Separator />

          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="w-full gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Zurücksetzen
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
