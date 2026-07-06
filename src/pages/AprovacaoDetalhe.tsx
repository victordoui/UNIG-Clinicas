import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useApprovalRequest, useDecideStep } from '@/hooks/useApprovalWorkflow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { StickyActionBar } from '@/components/ui/sticky-action-bar';
import { ArrowLeft, CheckCircle2, XCircle, Clock, Circle, ExternalLink, ClipboardCheck } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';

export default function AprovacaoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: req, isLoading } = useApprovalRequest(id);
  const decide = useDecideStep();
  const { user } = useAuth();
  const [dialog, setDialog] = useState<{ open: boolean; stepId?: string; decisao?: 'aprovado' | 'rejeitado' }>({ open: false });
  const [comentario, setComentario] = useState('');

  if (isLoading) return <MainLayout><div className="container mx-auto p-6">Carregando…</div></MainLayout>;
  if (!req) return <MainLayout><div className="container mx-auto p-6">Aprovação não encontrada</div></MainLayout>;

  const steps = (req.approval_request_steps ?? []).slice().sort((a, b) => a.ordem - b.ordem);
  const myPendingStep = steps.find((s) => s.aprovador_user_id === user?.id && s.status === 'pendente');
  const refLink = req.referencia_tipo === 'purchase_request'
    ? `/solicitacoes/${req.referencia_id}`
    : `/pedidos/${req.referencia_id}`;

  const onDecide = async () => {
    if (!dialog.stepId || !dialog.decisao) return;
    if (dialog.decisao === 'rejeitado' && comentario.trim().length < 3) return;
    await decide.mutateAsync({ stepId: dialog.stepId, decisao: dialog.decisao, comentario: comentario || undefined });
    setDialog({ open: false });
    setComentario('');
  };

  return (
    <MainLayout>
    <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-6 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate('/aprovacoes')}>
          <ArrowLeft className="h-4 w-4 mr-2" />Voltar
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6 text-primary" />
          <span>Aprovação</span>
        </h1>
        <Badge>{req.status}</Badge>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Referência</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tipo</span>
            <span>{req.referencia_tipo === 'purchase_request' ? 'Solicitação de Compra' : 'Pedido de Compra'}</span>
          </div>
          {req.valor != null && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor</span>
              <strong>{Number(req.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Iniciado em</span>
            <span>{format(new Date(req.iniciado_em), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span>
          </div>
          <Button asChild variant="outline" size="sm" className="w-full mt-3">
            <Link to={refLink}><ExternalLink className="h-4 w-4 mr-2" />Abrir documento original</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Trilha de aprovação</CardTitle></CardHeader>
        <CardContent>
          <ol className="space-y-4">
            {steps.map((s) => {
              const isMine = s.aprovador_user_id === user?.id && s.status === 'pendente';
              const Icon =
                s.status === 'aprovado' ? CheckCircle2 :
                s.status === 'rejeitado' ? XCircle :
                s.status === 'pendente' ? Clock : Circle;
              const color =
                s.status === 'aprovado' ? 'text-green-600' :
                s.status === 'rejeitado' ? 'text-destructive' :
                s.status === 'pendente' ? 'text-amber-500' : 'text-muted-foreground';
              return (
                <li key={s.id} className="flex gap-3 border-l-2 border-muted pl-4 relative">
                  <Icon className={`h-5 w-5 absolute -left-[11px] bg-background ${color}`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <strong>{s.ordem}. {s.nome}</strong>
                      <Badge variant="outline">{s.status}</Badge>
                    </div>
                    {s.aprovador_papel && <p className="text-xs text-muted-foreground">Papel: {s.aprovador_papel}</p>}
                    {s.decidido_em && (
                      <p className="text-xs text-muted-foreground">
                        Decidido em {format(new Date(s.decidido_em), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </p>
                    )}
                    {s.comentario && <p className="text-sm mt-1 italic">"{s.comentario}"</p>}
                    {s.prazo_em && s.status === 'pendente' && (
                      <p className="text-xs text-muted-foreground">
                        Prazo: {format(new Date(s.prazo_em), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </p>
                    )}
                    {isMine && (
                      <div className="flex flex-col sm:flex-row flex-wrap gap-2 mt-4">
                        <Button
                          size="sm"
                          className="w-full sm:w-auto min-h-10"
                          onClick={() => setDialog({ open: true, stepId: s.id, decisao: 'aprovado' })}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />Aprovar e enviar para cotação
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="w-full sm:w-auto min-h-10"
                          onClick={() => setDialog({ open: true, stepId: s.id, decisao: 'rejeitado' })}
                        >
                          <XCircle className="h-4 w-4 mr-1" />Reprovar
                        </Button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      <Dialog open={dialog.open} onOpenChange={(o) => setDialog({ ...dialog, open: o })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog.decisao === 'aprovado' ? 'Aprovar etapa' : 'Rejeitar etapa'}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder={dialog.decisao === 'rejeitado' ? 'Motivo da rejeição (obrigatório)' : 'Comentário (opcional)'}
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog({ open: false })}>Cancelar</Button>
            <Button
              onClick={onDecide}
              disabled={decide.isPending || (dialog.decisao === 'rejeitado' && comentario.trim().length < 3)}
              variant={dialog.decisao === 'rejeitado' ? 'destructive' : 'default'}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {myPendingStep && (
        <StickyActionBar>
          <Button
            variant="destructive"
            className="flex-1 min-h-11"
            onClick={() => setDialog({ open: true, stepId: myPendingStep.id, decisao: 'rejeitado' })}
          >
            <XCircle className="h-4 w-4 mr-1" />Rejeitar
          </Button>
          <Button
            className="flex-1 min-h-11"
            onClick={() => setDialog({ open: true, stepId: myPendingStep.id, decisao: 'aprovado' })}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />Aprovar
          </Button>
        </StickyActionBar>
      )}
    </div>
    </MainLayout>
  );
}
