import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FileSearch, ClipboardList, Receipt, AlertTriangle, ArrowRight, Clock, UserCog, FileWarning } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { SupplierInboxItem, SupplierInboxKind, SlaTone } from '@/hooks/useSupplierInbox';

const META: Record<SupplierInboxKind, { label: string; Icon: any; tone: string }> = {
  quote:      { label: 'Cotação',     Icon: FileSearch,    tone: 'text-primary' },
  order:      { label: 'Pedido',      Icon: ClipboardList, tone: 'text-emerald-600' },
  nf:         { label: 'NF pendente', Icon: Receipt,       tone: 'text-amber-600' },
  divergence: { label: 'Divergência', Icon: AlertTriangle, tone: 'text-destructive' },
  cadastro:   { label: 'Cadastro',    Icon: UserCog,       tone: 'text-indigo-600' },
  docs:       { label: 'Documento',   Icon: FileWarning,   tone: 'text-rose-600' },
};

const SLA_STYLES: Record<SlaTone, { bar: string; badge: string; label: string }> = {
  ok:   { bar: 'bg-muted',                badge: 'bg-muted text-muted-foreground border-transparent', label: 'No prazo' },
  warn: { bar: 'bg-amber-500',            badge: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200', label: 'Atenção' },
  late: { bar: 'bg-destructive',          badge: 'bg-destructive text-destructive-foreground border-transparent', label: 'Atrasado' },
};

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

interface Props {
  item: SupplierInboxItem;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: (id: string) => void;
  archivedBadge?: string;
  hideOpen?: boolean;
}

export function SupplierInboxCard({ item, selectable, selected, onToggle, archivedBadge, hideOpen }: Props) {
  const meta = META[item.kind];
  const sla = SLA_STYLES[item.slaTone];
  return (
    <Card className={cn('hover:border-primary/50 hover:shadow-md transition-all overflow-hidden', selected && 'ring-2 ring-primary')}>
      <div className="flex">
        <div className={cn('w-1 shrink-0', sla.bar)} aria-hidden />
        <CardContent className="p-4 flex items-start gap-3 flex-1">
          {selectable && (
            <div className="pt-1">
              <Checkbox
                checked={!!selected}
                onCheckedChange={() => onToggle?.(item.id)}
                aria-label="Selecionar item"
              />
            </div>
          )}
          <div className={`mt-0.5 ${meta.tone}`}>
            <meta.Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge variant="outline" className="text-xs">{meta.label}</Badge>
              {item.reference && (
                <span className="font-mono text-xs text-muted-foreground">{item.reference}</span>
              )}
              {archivedBadge ? (
                <Badge variant="secondary" className="text-xs">{archivedBadge}</Badge>
              ) : (
                <>
                  <Badge variant="outline" className={cn('text-xs gap-1', sla.badge)}>
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: ptBR })}
                  </Badge>
                  {item.slaTone !== 'ok' && (
                    <Badge variant="outline" className={cn('text-xs', sla.badge)}>{sla.label}</Badge>
                  )}
                </>
              )}
            </div>
            <div className="text-sm font-medium truncate">{item.title}</div>
            {item.subtitle && (
              <div className="text-xs text-muted-foreground truncate">{item.subtitle}</div>
            )}
            {item.amount != null && (
              <div className="text-sm font-semibold mt-1">{fmtBRL(item.amount)}</div>
            )}
            {!hideOpen && (
              <div className="mt-3">
                <Button asChild size="sm" variant="default">
                  <Link to={item.href}>Abrir <ArrowRight className="h-4 w-4 ml-1" /></Link>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
