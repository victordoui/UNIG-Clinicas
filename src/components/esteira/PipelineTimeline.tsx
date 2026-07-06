import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { History } from 'lucide-react';
import type { PipelineEvent } from '@/hooks/usePurchasePipeline';

const SOURCE_COLOR: Record<PipelineEvent['source'], string> = {
  ci: 'bg-sky-500',
  request: 'bg-primary',
  approval: 'bg-emerald-500',
  order: 'bg-violet-500',
  receipt: 'bg-amber-500',
};

export function PipelineTimeline({ events }: { events: PipelineEvent[] }) {
  return (
    <Card className="rounded-2xl border-border/60 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4" /> Linha do tempo
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p>
        ) : (
          <ol className="relative border-l border-border ml-2 space-y-4">
            {events.map((e, i) => (
              <li key={i} className="ml-4">
                <span className={`absolute -left-[5px] mt-1.5 w-2.5 h-2.5 rounded-full ${SOURCE_COLOR[e.source]}`} />
                <div className="text-xs text-muted-foreground">{new Date(e.at).toLocaleString('pt-BR')}</div>
                <div className="text-sm font-medium">{e.title}</div>
                {e.detail && <div className="text-xs text-muted-foreground italic">{e.detail}</div>}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
