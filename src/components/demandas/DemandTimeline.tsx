import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, Clock, MessageSquare, Link2, Paperclip, FileText } from 'lucide-react';
import {
  useDemandUpdates, useDemandActivity, useDemandComments, useDemandAttachments, useDemandLinks,
} from '@/hooks/useOperationalDemands';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Kind = 'all' | 'update' | 'activity' | 'comment' | 'link' | 'attachment';

const KIND_META: Record<Exclude<Kind, 'all'>, { label: string; color: string; icon: any }> = {
  update: { label: 'Atualização', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Activity },
  activity: { label: 'Histórico', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: Clock },
  comment: { label: 'Comentário', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: MessageSquare },
  link: { label: 'Vínculo', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: Link2 },
  attachment: { label: 'Anexo', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: Paperclip },
};

export function DemandTimeline({ demandId }: { demandId: string }) {
  const { data: updates = [] } = useDemandUpdates(demandId);
  const { data: activity = [] } = useDemandActivity(demandId);
  const { data: comments = [] } = useDemandComments(demandId);
  const { data: attachments = [] } = useDemandAttachments(demandId);
  const { data: links = [] } = useDemandLinks(demandId);

  const [filter, setFilter] = useState<Kind>('all');

  const events = useMemo(() => {
    const arr: Array<{ kind: Exclude<Kind, 'all'>; at: string; title: string; detail?: string; author?: string }> = [];
    updates.forEach((u: any) => arr.push({
      kind: 'update', at: u.created_at,
      title: typeof u.percentual_andamento === 'number' ? `Atualização (${u.percentual_andamento}%)` : 'Atualização',
      detail: u.texto, author: u.author?.full_name,
    }));
    activity.forEach((a: any) => arr.push({
      kind: 'activity', at: a.created_at,
      title: a.payload?.descricao ?? a.evento ?? 'Evento', author: a.author?.full_name,
    }));
    comments.forEach((c: any) => arr.push({
      kind: 'comment', at: c.created_at, title: 'Comentário interno',
      detail: c.comentario, author: c.author?.full_name,
    }));
    attachments.forEach((a: any) => arr.push({
      kind: 'attachment', at: a.created_at, title: `Anexo: ${a.file_name}`,
    }));
    links.forEach((l: any) => arr.push({
      kind: 'link', at: l.created_at,
      title: `Vínculo: ${l.link_type === 'ci' ? 'CI' : 'Requisição'} ${l.label ?? l.target_id}`,
    }));
    return arr.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [updates, activity, comments, attachments, links]);

  const filtered = filter === 'all' ? events : events.filter((e) => e.kind === filter);

  const counts: Record<Kind, number> = {
    all: events.length,
    update: updates.length, activity: activity.length, comment: comments.length,
    link: links.length, attachment: attachments.length,
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(['all', 'update', 'activity', 'comment', 'link', 'attachment'] as Kind[]).map((k) => (
          <Button
            key={k}
            size="sm"
            variant={filter === k ? 'default' : 'outline'}
            onClick={() => setFilter(k)}
            className="h-7 text-xs"
          >
            {k === 'all' ? 'Todos' : KIND_META[k].label} <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">{counts[k]}</Badge>
          </Button>
        ))}
      </div>

      <Card className="p-4">
        {filtered.length === 0 && <p className="text-sm text-muted-foreground p-4 text-center">Sem eventos.</p>}
        <ol className="relative border-l border-muted ml-2 space-y-4">
          {filtered.map((e, idx) => {
            const meta = KIND_META[e.kind];
            const Icon = meta.icon;
            return (
              <li key={idx} className="ml-4">
                <span className="absolute -left-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-background border">
                  <Icon className="h-3 w-3 text-muted-foreground" />
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded border ${meta.color}`}>{meta.label}</span>
                  <span className="text-sm font-medium">{e.title}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {e.author && <>por {e.author} • </>}
                  {format(new Date(e.at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </div>
                {e.detail && <p className="text-sm mt-1 whitespace-pre-wrap">{e.detail}</p>}
              </li>
            );
          })}
        </ol>
      </Card>
    </div>
  );
}
