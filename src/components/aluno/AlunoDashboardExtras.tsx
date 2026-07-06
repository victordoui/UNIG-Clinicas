import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Megaphone, CalendarDays } from 'lucide-react';
import { useAnnouncements, useUpcomingEvents } from '@/hooks/useStudentData';

export function AlunoDashboardExtras() {
  const { data: announcements = [] } = useAnnouncements(3);
  const { data: events = [] } = useUpcomingEvents(3);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Megaphone className="h-4 w-4 text-primary" />Comunicados</CardTitle>
        </CardHeader>
        <CardContent>
          {announcements.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sem comunicados no momento.</p>}
          <div className="divide-y">
            {announcements.map((a: any) => (
              <div key={a.id} className="py-3">
                <div className="font-medium text-sm">{a.title}</div>
                <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{a.body}</div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {new Date(a.published_at).toLocaleDateString('pt-BR')}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" />Próximos eventos</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sem eventos agendados.</p>}
          <div className="divide-y">
            {events.map((e: any) => (
              <div key={e.id} className="py-3">
                <div className="font-medium text-sm">{e.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {new Date(e.starts_at).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  {e.event_type && ` · ${e.event_type}`}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
