import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Check } from 'lucide-react';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useMyNotifications } from '@/hooks/useCommunication';
import { formatRelativeTime } from '@/lib/communication';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

function List({ onlyUnread }: { onlyUnread: boolean }) {
  const { data = [], isLoading } = useMyNotifications(onlyUnread);
  const markRead = useMarkNotificationRead();

  if (isLoading) return <p className="text-sm text-muted-foreground p-4">Carregando…</p>;
  if (data.length === 0) return <p className="text-sm text-muted-foreground text-center py-10">Sem notificações.</p>;

  return (
    <ul className="divide-y">
      {data.map(n => {
        const body = (
          <div className="flex items-start gap-3 px-3 py-3">
            {!n.read_at && <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="font-medium">{n.title}</p>
              {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
              <p className="text-xs text-muted-foreground mt-1">{formatRelativeTime(n.created_at)}</p>
            </div>
          </div>
        );
        return (
          <li key={n.id} className={cn('hover:bg-muted/40 cursor-pointer', !n.read_at && 'bg-primary/5')}
              onClick={() => { if (!n.read_at) markRead.mutate(n.id); }}>
            {n.link ? <Link to={n.link} className="block">{body}</Link> : body}
          </li>
        );
      })}
    </ul>
  );
}

export default function Notificacoes() {
  const markAll = useMarkAllNotificationsRead();

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold">Notificações</h1>
          </div>
          <Button variant="outline" size="sm" onClick={() => markAll.mutate()}>
            <Check className="h-4 w-4 mr-1" /> Marcar todas como lidas
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Tabs defaultValue="all">
              <TabsList className="mx-3 mt-3">
                <TabsTrigger value="all">Todas</TabsTrigger>
                <TabsTrigger value="unread">Não lidas</TabsTrigger>
              </TabsList>
              <TabsContent value="all"><List onlyUnread={false} /></TabsContent>
              <TabsContent value="unread"><List onlyUnread /></TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
