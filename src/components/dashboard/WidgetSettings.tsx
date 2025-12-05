import { Settings, Eye, EyeOff, RotateCcw, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WidgetConfig, WidgetSize } from '@/hooks/useWidgets';
import { useLanguage } from '@/contexts/LanguageContext';

interface WidgetSettingsProps {
  widgets: WidgetConfig[];
  onToggleWidget: (id: string) => void;
  onReset: () => void;
  onSetWidgetSize: (id: string, size: WidgetSize) => void;
  isAdmin?: boolean;
}

export function WidgetSettings({ widgets, onToggleWidget, onReset, onSetWidgetSize, isAdmin = false }: WidgetSettingsProps) {
  const { t } = useLanguage();
  
  const widgetLabels: Record<string, string> = {
    'projects': t('widgetSettings.projects'),
    'action-items': t('widgetSettings.actionItems'),
    'npi-products': t('widgetSettings.npiProducts'),
    'statistics': t('widgetSettings.statistics'),
    'optimization-status': t('widgetSettings.optimizationStatus'),
    'login-activity': t('widgetSettings.loginActivity'),
    'access-stats': t('widgetSettings.accessStats'),
    'added-products': t('widgetSettings.addedProducts'),
    'getting-started': t('widgetSettings.gettingStarted'),
  };

  const sizeLabels: Record<WidgetSize, string> = {
    medium: t('widgetSettings.halfWidth'),
    full: t('widgetSettings.fullWidth'),
  };

  // Filter widgets based on admin status
  const visibleWidgets = widgets.filter(widget => {
    // Hide admin-only widgets for non-admins
    if ((widget.type === 'access-stats' || widget.type === 'login-activity') && !isAdmin) {
      return false;
    }
    return true;
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          {t('widgetSettings.customize')}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">{t('widgetSettings.customizeWidgets')}</h4>
            <p className="text-sm text-muted-foreground mb-4">
              {t('widgetSettings.customizeDesc')}
            </p>
          </div>

          <Separator />

          <div className="space-y-3">
            {visibleWidgets.map((widget) => (
              <div
                key={widget.id}
                className="space-y-2 p-2 rounded-lg hover:bg-muted"
              >
                <div className="flex items-center justify-between">
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
                {widget.visible && (
                  <div className="flex items-center gap-2">
                    <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <Select
                      value={widget.size}
                      onValueChange={(value) => onSetWidgetSize(widget.id, value as WidgetSize)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder={sizeLabels[widget.size]} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="medium">{sizeLabels.medium}</SelectItem>
                        <SelectItem value="full">{sizeLabels.full}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
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
            {t('common.reset')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
