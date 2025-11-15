import { Bell, Package, ClipboardList, AlertCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useNotifications } from '@/hooks/useNotifications';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

export function NotificationPopover() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  const getIcon = (type: string) => {
    switch (type) {
      case 'new_project':
        return <Package className="h-4 w-4 text-blue-500" />;
      case 'new_action_item':
        return <ClipboardList className="h-4 w-4 text-green-500" />;
      case 'overdue_action_item':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (type: string) => {
    switch (type) {
      case 'overdue_action_item':
        return 'bg-destructive/10 hover:bg-destructive/20';
      case 'new_action_item':
        return 'bg-green-50 hover:bg-green-100 dark:bg-green-950 dark:hover:bg-green-900';
      case 'new_project':
        return 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900';
      default:
        return 'hover:bg-muted';
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-2 hover:bg-muted rounded-md transition-colors">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-lg">Benachrichtigungen</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs"
            >
              Alle als gelesen markieren
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                Keine Benachrichtigungen
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`transition-colors ${
                    notification.read ? 'opacity-60' : ''
                  } ${getPriorityColor(notification.type)}`}
                >
                  {notification.link ? (
                    <Link 
                      to={notification.link} 
                      className="block p-4 cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault();
                        markAsRead(notification.id);
                        navigate(notification.link!);
                      }}
                    >
                      <div className="flex gap-3">
                        <div className="mt-0.5">{getIcon(notification.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="font-medium text-sm">{notification.title}</p>
                            {!notification.read && (
                              <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                              locale: de,
                            })}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <div 
                      className="flex gap-3 p-4 cursor-pointer"
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="mt-0.5">{getIcon(notification.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-medium text-sm">{notification.title}</p>
                          {!notification.read && (
                            <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: de,
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <p className="text-xs text-center text-muted-foreground">
                Zeigt Aktivitäten der letzten 7 Tage
              </p>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
