import { Link } from 'react-router-dom';
import { Bell, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useMyNotifications, useUnreadNotificationCount } from '@/hooks/useCommunication';
import { formatRelativeTime } from '@/lib/communication';
import { cn } from '@/lib/utils';

export function NotificationBell() {
  const { data: notifications = [] } = useMyNotifications();
  const { data: unread = 0 } = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative h-9 w-9 p-0" aria-label="Notificações">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full text-[10px] leading-none grid place-items-center">
              {unread > 9 ? '9+' : unread}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-sm font-semibold">Notificações</span>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => markAll.mutate()}>
              <Check className="h-3.5 w-3.5 mr-1" /> Marcar todas
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sem notificações</p>
          ) : (
            <ul className="divide-y">
              {notifications.slice(0, 20).map(n => (
                <li
                  key={n.id}
                  className={cn('px-3 py-2 text-sm hover:bg-muted/50 cursor-pointer', !n.read_at && 'bg-primary/5')}
                  onClick={() => { if (!n.read_at) markRead.mutate(n.id); }}
                >
                  <div className="flex items-start gap-2">
                    {!n.read_at && <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{n.title}</p>
                      {n.body && <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>}
                      <p className="text-[10px] text-muted-foreground mt-0.5">{formatRelativeTime(n.created_at)}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
        <div className="border-t p-2">
          <Button asChild variant="ghost" size="sm" className="w-full text-xs">
            <Link to="/comunicacao/notificacoes">Ver todas</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
