import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, X, ShieldCheck, RefreshCw } from 'lucide-react';
import {
  OperationalDemand, useDecideDemand, useChangeDemandStatus,
  DEMAND_STATUS, DEMAND_STATUS_LABEL, DemandStatus,
} from '@/hooks/useOperationalDemands';

export function ManagerDecisionCard({ demand }: { demand: OperationalDemand }) {
  const decide = useDecideDemand();
  const change = useChangeDemandStatus();
  const [comment, setComment] = useState('');
  const [newStatus, setNewStatus] = useState<DemandStatus>(demand.status);

  const approvalState = (demand as any).approval_state as 'pendente' | 'aprovado' | 'rejeitado' | null;

  async function doDecide(decision: 'aprovado' | 'rejeitado') {
    if (!comment.trim()) return;
    await decide.mutateAsync({ id: demand.id, decision, comment });
    setComment('');
  }

  async function doStatus() {
    if (!comment.trim() || newStatus === demand.status) return;
    await change.mutateAsync({ id: demand.id, status: newStatus, comment });
    setComment('');
  }

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> Decisão Gerencial
          </CardTitle>
          {approvalState && (
            <Badge variant={
              approvalState === 'aprovado' ? 'default'
                : approvalState === 'rejeitado' ? 'destructive' : 'secondary'
            }>
              {approvalState === 'aprovado' ? 'Aprovada'
                : approvalState === 'rejeitado' ? 'Rejeitada' : 'Pendente'}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Comentário gerencial *</Label>
          <Textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)}
            placeholder="Justifique sua decisão ou mudança de status (obrigatório)" />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => doDecide('aprovado')}
            disabled={!comment.trim() || decide.isPending} size="sm">
            <Check className="h-4 w-4 mr-1" /> Aprovar
          </Button>
          <Button variant="destructive" onClick={() => doDecide('rejeitado')}
            disabled={!comment.trim() || decide.isPending} size="sm">
            <X className="h-4 w-4 mr-1" /> Rejeitar
          </Button>
        </div>

        <div className="border-t pt-3 space-y-2">
          <Label className="text-xs">Alterar status</Label>
          <div className="flex gap-2">
            <Select value={newStatus} onValueChange={(v) => setNewStatus(v as DemandStatus)}>
              <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DEMAND_STATUS.map((s) => (
                  <SelectItem key={s} value={s}>{DEMAND_STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={doStatus}
              disabled={!comment.trim() || newStatus === demand.status || change.isPending}>
              <RefreshCw className="h-4 w-4 mr-1" /> Aplicar
            </Button>
          </div>
        </div>

        {(demand as any).approval_comment && approvalState && (
          <div className="bg-muted/50 rounded-md p-2 text-xs">
            <p className="font-medium mb-1">Último parecer:</p>
            <p className="whitespace-pre-wrap">{(demand as any).approval_comment}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
