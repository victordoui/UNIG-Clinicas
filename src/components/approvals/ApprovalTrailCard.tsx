import { Link } from 'react-router-dom';
import { useApprovalRequestByReference } from '@/hooks/useApprovalWorkflow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Clock, Circle, ShieldCheck, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function ApprovalTrailCard({
  referencia_tipo, referencia_id,
}: { referencia_tipo: 'purchase_request' | 'purchase_order'; referencia_id: string | undefined }) {
  const { data: req, isLoading } = useApprovalRequestByReference(referencia_tipo, referencia_id);
  if (isLoading || !req) return null;
  const steps = (req.approval_request_steps ?? []).slice().sort((a, b) => a.ordem - b.ordem);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Aprovação avançada
            <Badge variant={req.status === 'aprovado' ? 'secondary' : req.status === 'rejeitado' ? 'destructive' : 'default'}>
              {req.status}
            </Badge>
          </CardTitle>
          <Button asChild size="sm" variant="ghost">
            <Link to={`/aprovacoes/${req.id}`}><ExternalLink className="h-4 w-4 mr-1" />Abrir</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ol className="space-y-2">
          {steps.map((s) => {
            const Icon =
              s.status === 'aprovado' ? CheckCircle2 :
              s.status === 'rejeitado' ? XCircle :
              s.status === 'pendente' ? Clock : Circle;
            const color =
              s.status === 'aprovado' ? 'text-green-600' :
              s.status === 'rejeitado' ? 'text-destructive' :
              s.status === 'pendente' ? 'text-amber-500' : 'text-muted-foreground';
            return (
              <li key={s.id} className="flex items-start gap-2 text-sm">
                <Icon className={`h-4 w-4 mt-0.5 ${color}`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span><strong>{s.ordem}.</strong> {s.nome}</span>
                    <span className="text-xs text-muted-foreground">{s.aprovador_papel ?? ''}</span>
                  </div>
                  {s.decidido_em && (
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(s.decidido_em), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      {s.comentario && ` — "${s.comentario}"`}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
