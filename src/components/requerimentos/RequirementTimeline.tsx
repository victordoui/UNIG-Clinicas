import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Circle, Clock, XCircle } from 'lucide-react';
import { REQ_STATUS_LABEL } from '@/lib/requirements';

export function RequirementTimeline({ req }: { req: any }) {
  const events = [
    { key: 'created', label: 'Aberto', at: req.created_at, done: true, icon: Circle },
    { key: 'in_progress', label: 'Em análise', at: req.status !== 'open' ? req.updated_at : null, done: ['in_progress', 'completed', 'rejected'].includes(req.status), icon: Clock },
    req.status === 'rejected'
      ? { key: 'rejected', label: 'Rejeitado', at: req.completed_at ?? req.updated_at, done: true, icon: XCircle }
      : { key: 'completed', label: 'Concluído', at: req.completed_at, done: req.status === 'completed', icon: CheckCircle2 },
  ];

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="text-sm font-semibold">Linha do tempo</div>
        <ol className="relative border-l pl-4 space-y-4">
          {events.map((e) => {
            const Icon = e.icon;
            return (
              <li key={e.key} className="relative">
                <span className={`absolute -left-[22px] top-0.5 h-4 w-4 rounded-full flex items-center justify-center ${e.done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  <Icon className="h-3 w-3" />
                </span>
                <div className="text-sm font-medium">{e.label}</div>
                <div className="text-xs text-muted-foreground">{e.at ? new Date(e.at).toLocaleString('pt-BR') : 'Pendente'}</div>
                {e.key === 'completed' && req.response && <p className="text-xs mt-1 p-2 bg-muted rounded">{req.response}</p>}
              </li>
            );
          })}
        </ol>
        <div className="text-xs text-muted-foreground pt-2 border-t">Status atual: <strong>{REQ_STATUS_LABEL[req.status as keyof typeof REQ_STATUS_LABEL] ?? req.status}</strong></div>
      </CardContent>
    </Card>
  );
}
