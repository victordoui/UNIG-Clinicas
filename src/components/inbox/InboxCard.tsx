import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ClipboardCheck, Vote, FileSignature, ArrowRight, Check, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { InboxItem } from '@/hooks/useInbox';
import { useDecideStep } from '@/hooks/useApprovalWorkflow';
import { useCastCouncilVote } from '@/hooks/useCouncil';
import { useAuth } from '@/hooks/useAuth';

const KIND_META: Record<InboxItem['kind'], { label: string; Icon: any; tone: string }> = {
  approval: { label: 'Aprovar', Icon: ClipboardCheck, tone: 'text-primary' },
  council:  { label: 'Votar',   Icon: Vote,            tone: 'text-amber-600' },
  ci:       { label: 'CI',      Icon: FileSignature,   tone: 'text-emerald-600' },
};

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

interface InboxCardProps {
  item: InboxItem;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}

export function InboxCard({ item, selectable, selected, onToggleSelect }: InboxCardProps) {
  const meta = KIND_META[item.kind];
  const decide = useDecideStep();
  const vote = useCastCouncilVote();
  const { isCouncilMember, isSuperAdmin } = useAuth();

  const canApprove = item.kind === 'approval' && !!item.approvalStepId;
  const canVote = item.kind === 'council' && !!item.proposalId && (isCouncilMember || isSuperAdmin);
  const showCheckbox = selectable && (canApprove || canVote);

  return (
    <Card className={`hover:border-primary/50 hover:shadow-md transition-all ${selected ? 'border-primary ring-1 ring-primary/30' : ''}`}>
      <CardContent className="p-4 flex items-start gap-3">
        {showCheckbox && (
          <div className="pt-1">
            <Checkbox checked={selected} onCheckedChange={() => onToggleSelect?.()} />
          </div>
        )}
        <div className={`mt-0.5 ${meta.tone}`}>
          <meta.Icon className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge variant="outline" className="text-xs">{meta.label}</Badge>
            {item.delegatedFromUserId && (
              <Badge variant="secondary" className="text-xs">
                Delegado por {item.delegatedFromName ?? '...'}
              </Badge>
            )}
            {item.reference && (
              <span className="font-mono text-xs text-muted-foreground">{item.reference}</span>
            )}
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: ptBR })}
            </span>
          </div>
          <div className="text-sm font-medium truncate">{item.title}</div>
          {item.subtitle && (
            <div className="text-xs text-muted-foreground truncate">{item.subtitle}</div>
          )}
          {item.amount != null && (
            <div className="text-sm font-semibold mt-1">{fmtBRL(item.amount)}</div>
          )}

          <div className="flex gap-2 mt-3 flex-wrap">
            {canApprove && (
              <>
                <Button size="sm" variant="default" disabled={decide.isPending}
                  onClick={() => decide.mutate({ stepId: item.approvalStepId!, decisao: 'aprovado' })}>
                  <Check className="h-4 w-4 mr-1" /> Aprovar
                </Button>
                <Button size="sm" variant="outline" disabled={decide.isPending}
                  onClick={() => decide.mutate({ stepId: item.approvalStepId!, decisao: 'rejeitado' })}>
                  <X className="h-4 w-4 mr-1" /> Rejeitar
                </Button>
              </>
            )}
            {canVote && (
              <>
                <Button size="sm" variant="default" disabled={vote.isPending}
                  onClick={() => vote.mutate({ proposalId: item.proposalId!, voto: 'aprovado' })}>
                  <Check className="h-4 w-4 mr-1" /> Aprovar
                </Button>
                <Button size="sm" variant="outline" disabled={vote.isPending}
                  onClick={() => vote.mutate({ proposalId: item.proposalId!, voto: 'rejeitado' })}>
                  <X className="h-4 w-4 mr-1" /> Rejeitar
                </Button>
              </>
            )}
            <Button asChild size="sm" variant="ghost">
              <Link to={item.href}>Abrir <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
