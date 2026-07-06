import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { History, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useDemandStatusHistory, DEMAND_STATUS_LABEL } from '@/hooks/useOperationalDemands';

export function StatusHistoryList({ demandId }: { demandId: string }) {
  const { data, isLoading } = useDemandStatusHistory(demandId);
  if (isLoading) return <p className="text-xs text-muted-foreground">Carregando histórico…</p>;
  if (!data || data.length === 0) {
    return <p className="text-xs text-muted-foreground">Sem mudanças de status registradas.</p>;
  }
  return (
    <ul className="space-y-3">
      {data.map((h) => (
        <li key={h.id} className="flex gap-3 border-l-2 border-primary/30 pl-3">
          <History className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {h.from_status && (
                <>
                  <Badge variant="outline" className="text-[10px]">
                    {DEMAND_STATUS_LABEL[h.from_status as keyof typeof DEMAND_STATUS_LABEL] ?? h.from_status}
                  </Badge>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </>
              )}
              <Badge className="text-[10px]">
                {DEMAND_STATUS_LABEL[h.to_status as keyof typeof DEMAND_STATUS_LABEL] ?? h.to_status}
              </Badge>
              <span className="text-muted-foreground ml-auto">
                {format(new Date(h.changed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            </div>
            {h.comment && <p className="text-sm mt-1 whitespace-pre-wrap">{h.comment}</p>}
            {h.author?.full_name && (
              <p className="text-[11px] text-muted-foreground mt-0.5">por {h.author.full_name}</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
