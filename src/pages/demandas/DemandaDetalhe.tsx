import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Save, MessageSquare, Activity, Clock, FileText, Plus, Briefcase, Link2, Paperclip, History } from 'lucide-react';
import {
  useOperationalDemand, useUpdateDemand, useDemandUpdates, useDemandActivity, useDemandComments,
  useAddDemandUpdate, useAddDemandComment, DEMAND_STATUS, DEMAND_STATUS_LABEL,
  DEMAND_PRIORITY, DEMAND_PRIORITY_LABEL, DEMAND_TYPE, DEMAND_TYPE_LABEL,
  useOrgGestores, isOverdue, FINAL_STATUSES,
} from '@/hooks/useOperationalDemands';
import { DemandStatusBadge, DemandPriorityBadge } from '@/components/demandas/DemandBadges';
import { DemandLinksPanel } from '@/components/demandas/DemandLinksPanel';
import { DemandAttachments } from '@/components/demandas/DemandAttachments';
import { DemandTimeline } from '@/components/demandas/DemandTimeline';
import { ManagerSummaryDialog } from '@/components/demandas/ManagerSummaryDialog';
import { EvolutionUpdateDialog } from '@/components/demandas/EvolutionUpdateDialog';
import { ManagerDecisionCard } from '@/components/demandas/ManagerDecisionCard';
import { StatusHistoryList } from '@/components/demandas/StatusHistoryList';
import { buildDemandSummary } from '@/lib/demandSummary';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';


export default function DemandaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: demand, isLoading } = useOperationalDemand(id);
  const { profile, role } = useAuth() as any;
  const update = useUpdateDemand();
  const { data: updates = [] } = useDemandUpdates(id);
  const { data: activity = [] } = useDemandActivity(id);
  const { data: comments = [] } = useDemandComments(id);
  const addUpdate = useAddDemandUpdate();
  const addComment = useAddDemandComment();
  const { data: gestores = [] } = useOrgGestores();
  const isOwner = profile?.id && demand?.gestor_responsavel === profile.id;
  const isManager = ['gerente_geral', 'administrador', 'coordenador_operacoes'].includes(role ?? '');


  const [novaAtualizacao, setNovaAtualizacao] = useState('');
  const [percentual, setPercentual] = useState<string>('');
  const [novoComentario, setNovoComentario] = useState('');
  const [statusDraft, setStatusDraft] = useState<string | null>(null);
  const [motivoPausa, setMotivoPausa] = useState('');
  const [justifCancel, setJustifCancel] = useState('');
  const [resumoFinal, setResumoFinal] = useState('');

  if (isLoading || !demand) {
    return <div className="p-6 text-muted-foreground">Carregando…</div>;
  }

  const overdue = isOverdue(demand);

  async function applyStatusChange(novoStatus: string) {
    const patch: any = { id: demand!.id, status: novoStatus };
    if (novoStatus === 'pausada') {
      if (!motivoPausa.trim()) { toast({ title: 'Informe o motivo da pausa', variant: 'destructive' }); return; }
      patch.motivo_pausa = motivoPausa.trim();
    }
    if (novoStatus === 'cancelada') {
      if (!justifCancel.trim()) { toast({ title: 'Informe a justificativa do cancelamento', variant: 'destructive' }); return; }
      patch.justificativa_cancelamento = justifCancel.trim();
    }
    if (novoStatus === 'concluida') {
      if (!resumoFinal.trim()) { toast({ title: 'Informe o resumo final', variant: 'destructive' }); return; }
      patch.resumo_final = resumoFinal.trim();
      patch.concluida_em = new Date().toISOString();
    }
    await update.mutateAsync(patch);
    setStatusDraft(null);
    setMotivoPausa(''); setJustifCancel(''); setResumoFinal('');
  }

  return (
    <div className="space-y-4 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <div className="flex items-center gap-2 flex-wrap">
          {(isOwner || isManager) && <EvolutionUpdateDialog demand={demand!} />}
          <ManagerSummaryDialog
            buildSummary={() => buildDemandSummary(demand!, updates[0]?.texto)}
            triggerLabel="Gerar resumo para diretoria"
          />
        </div>
      </div>


      {/* Cabeçalho */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-primary-foreground/85 text-xs font-medium">
                <Briefcase className="h-4 w-4" /> {demand.code}
                {overdue && <span className="ml-2 bg-rose-600/90 text-white px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">Atrasada</span>}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mt-1">{demand.nome}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-primary-foreground/95">
                <span>📍 {demand.unidade}</span>
                {demand.area && <span>• {demand.area}</span>}
                <span>• {DEMAND_TYPE_LABEL[demand.tipo]}</span>
                {demand.prazo_estimado && (
                  <span>• Prazo: {format(new Date(demand.prazo_estimado), 'dd/MM/yyyy', { locale: ptBR })}</span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <DemandStatusBadge status={demand.status} className="bg-white/95 backdrop-blur" />
              <DemandPriorityBadge priority={demand.prioridade} className="bg-white/95 backdrop-blur" />
              {demand.gestor && (
                <div className="flex items-center gap-2 text-xs text-primary-foreground/90">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={demand.gestor.avatar_url ?? undefined} />
                    <AvatarFallback>{(demand.gestor.full_name ?? '?').slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  {demand.gestor.full_name}
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="resumo" className="w-full">
        <TabsList className="flex flex-wrap h-auto max-w-full">
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="atualizacoes"><Activity className="h-3 w-3 mr-1" />Atualizações</TabsTrigger>
          <TabsTrigger value="timeline"><Clock className="h-3 w-3 mr-1" />Linha do tempo</TabsTrigger>
          <TabsTrigger value="comentarios"><MessageSquare className="h-3 w-3 mr-1" />Comentários</TabsTrigger>
          <TabsTrigger value="vinculos"><Link2 className="h-3 w-3 mr-1" />Vínculos</TabsTrigger>
          <TabsTrigger value="anexos"><Paperclip className="h-3 w-3 mr-1" />Anexos</TabsTrigger>
          <TabsTrigger value="historico"><History className="h-3 w-3 mr-1" />Histórico</TabsTrigger>
          <TabsTrigger value="editar"><FileText className="h-3 w-3 mr-1" />Editar</TabsTrigger>
        </TabsList>


        {/* RESUMO */}
        <TabsContent value="resumo" className="space-y-4">
          <Card className="p-5 space-y-4">
            <Block label="Objetivo">{demand.objetivo}</Block>
            {demand.descricao && <Block label="Descrição">{demand.descricao}</Block>}
            {demand.resultado_esperado && <Block label="Resultado esperado">{demand.resultado_esperado}</Block>}
            {demand.proximas_etapas && <Block label="Próximas etapas">{demand.proximas_etapas}</Block>}
            {demand.dependencies && <Block label="Dependências">{demand.dependencies}</Block>}
            {demand.attention_points && <Block label="Pontos de atenção">{demand.attention_points}</Block>}
            {demand.motivo_pausa && <Block label="Motivo da pausa">{demand.motivo_pausa}</Block>}
            {demand.justificativa_cancelamento && <Block label="Justificativa do cancelamento">{demand.justificativa_cancelamento}</Block>}
            {demand.resumo_final && <Block label="Resumo final">{demand.resumo_final}</Block>}
          </Card>

          {/* Mudança de status */}
          <Card className="p-5 space-y-3">
            <h3 className="font-semibold">Alterar status</h3>
            <div className="flex flex-col md:flex-row gap-2">
              <Select value={statusDraft ?? demand.status} onValueChange={setStatusDraft}>
                <SelectTrigger className="md:w-[280px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEMAND_STATUS.map((s) => <SelectItem key={s} value={s}>{DEMAND_STATUS_LABEL[s]}</SelectItem>)}
                </SelectContent>
              </Select>
              {statusDraft === 'pausada' && (
                <Input placeholder="Motivo da pausa *" value={motivoPausa} onChange={(e) => setMotivoPausa(e.target.value)} />
              )}
              {statusDraft === 'cancelada' && (
                <Input placeholder="Justificativa do cancelamento *" value={justifCancel} onChange={(e) => setJustifCancel(e.target.value)} />
              )}
              {statusDraft === 'concluida' && (
                <Input placeholder="Resumo final *" value={resumoFinal} onChange={(e) => setResumoFinal(e.target.value)} />
              )}
              <Button
                disabled={!statusDraft || statusDraft === demand.status || update.isPending}
                onClick={() => applyStatusChange(statusDraft!)}
              >Aplicar</Button>
            </div>
          </Card>

          {isManager && <ManagerDecisionCard demand={demand!} />}
        </TabsContent>


        {/* ATUALIZAÇÕES */}
        <TabsContent value="atualizacoes" className="space-y-3">
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">Nova atualização</h3>
            <Textarea rows={3} placeholder="Descreva o andamento…" value={novaAtualizacao} onChange={(e) => setNovaAtualizacao(e.target.value)} />
            <div className="flex flex-col md:flex-row gap-2">
              <Input type="number" min={0} max={100} placeholder="% de andamento (opcional)" value={percentual}
                onChange={(e) => setPercentual(e.target.value)} className="md:w-[260px]" />
              <Button
                disabled={!novaAtualizacao.trim() || addUpdate.isPending}
                onClick={async () => {
                  await addUpdate.mutateAsync({
                    demandId: demand.id, texto: novaAtualizacao.trim(),
                    percentual: percentual ? Number(percentual) : null,
                  });
                  setNovaAtualizacao(''); setPercentual('');
                }}
              ><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
            </div>
          </Card>
          <div className="space-y-2">
            {updates.length === 0 && <p className="text-sm text-muted-foreground p-4 text-center">Nenhuma atualização ainda.</p>}
            {updates.map((u: any) => (
              <Card key={u.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <Avatar className="h-8 w-8"><AvatarFallback>{(u.author?.full_name ?? '?').slice(0, 1)}</AvatarFallback></Avatar>
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">
                        {u.author?.full_name ?? 'Usuário'} • {format(new Date(u.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>
                      <p className="text-sm mt-1 whitespace-pre-wrap">{u.texto}</p>
                    </div>
                  </div>
                  {typeof u.percentual_andamento === 'number' && (
                    <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-1 shrink-0">
                      {u.percentual_andamento}%
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* TIMELINE */}
        <TabsContent value="timeline" className="space-y-2">
          <DemandTimeline demandId={demand.id} />
        </TabsContent>

        {/* VÍNCULOS */}
        <TabsContent value="vinculos">
          <DemandLinksPanel demandId={demand.id} />
        </TabsContent>

        {/* ANEXOS */}
        <TabsContent value="anexos">
          <DemandAttachments demandId={demand.id} />
        </TabsContent>

        {/* HISTÓRICO DE STATUS */}
        <TabsContent value="historico">
          <Card className="p-5">
            <h3 className="font-semibold mb-3 text-sm">Histórico de mudanças de status</h3>
            <StatusHistoryList demandId={demand.id} />
          </Card>
        </TabsContent>





        {/* COMENTÁRIOS */}
        <TabsContent value="comentarios" className="space-y-3">
          <Card className="p-4 space-y-3">
            <Textarea rows={2} placeholder="Escreva um comentário interno…" value={novoComentario} onChange={(e) => setNovoComentario(e.target.value)} />
            <div className="flex justify-end">
              <Button size="sm" disabled={!novoComentario.trim()} onClick={async () => {
                await addComment.mutateAsync({ demandId: demand.id, comentario: novoComentario.trim() });
                setNovoComentario('');
              }}>Comentar</Button>
            </div>
          </Card>
          {comments.length === 0 && <p className="text-sm text-muted-foreground p-4 text-center">Sem comentários.</p>}
          {comments.map((c: any) => (
            <Card key={c.id} className="p-3 flex items-start gap-3">
              <Avatar className="h-8 w-8"><AvatarFallback>{(c.author?.full_name ?? '?').slice(0, 1)}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground">
                  {c.author?.full_name ?? 'Usuário'} • {format(new Date(c.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </div>
                <p className="text-sm whitespace-pre-wrap">{c.comentario}</p>
              </div>
            </Card>
          ))}
        </TabsContent>

        {/* EDITAR */}
        <TabsContent value="editar">
          <EditForm demand={demand} gestores={gestores} onSave={async (patch) => {
            await update.mutateAsync({ id: demand.id, ...patch });
          }} saving={update.isPending} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">{label}</div>
      <p className="text-sm whitespace-pre-wrap">{children}</p>
      <Separator className="mt-3" />
    </div>
  );
}

function EditForm({ demand, gestores, onSave, saving }: any) {
  const [form, setForm] = useState({
    nome: demand.nome, unidade: demand.unidade, area: demand.area ?? '',
    objetivo: demand.objetivo, descricao: demand.descricao ?? '',
    resultado_esperado: demand.resultado_esperado ?? '', proximas_etapas: demand.proximas_etapas ?? '',
    tipo: demand.tipo, prioridade: demand.prioridade,
    gestor_responsavel: demand.gestor_responsavel,
    prazo_estimado: demand.prazo_estimado ?? '',
    dependencies: demand.dependencies ?? '',
    attention_points: demand.attention_points ?? '',
  });
  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <Card className="p-5 space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Nome"><Input value={form.nome} onChange={(e) => set('nome', e.target.value)} /></Field>
        <Field label="Unidade"><Input value={form.unidade} onChange={(e) => set('unidade', e.target.value)} /></Field>
        <Field label="Área"><Input value={form.area} onChange={(e) => set('area', e.target.value)} /></Field>
        <Field label="Tipo">
          <Select value={form.tipo} onValueChange={(v) => set('tipo', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{DEMAND_TYPE.map((t) => <SelectItem key={t} value={t}>{DEMAND_TYPE_LABEL[t]}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Prioridade">
          <Select value={form.prioridade} onValueChange={(v) => set('prioridade', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{DEMAND_PRIORITY.map((p) => <SelectItem key={p} value={p}>{DEMAND_PRIORITY_LABEL[p]}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Responsável">
          <Select value={form.gestor_responsavel} onValueChange={(v) => set('gestor_responsavel', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{gestores.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.full_name ?? g.email}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Prazo">
          <Input type="date" value={form.prazo_estimado} onChange={(e) => set('prazo_estimado', e.target.value)} />
        </Field>
      </div>
      <Field label="Objetivo"><Textarea rows={2} value={form.objetivo} onChange={(e) => set('objetivo', e.target.value)} /></Field>
      <Field label="Descrição"><Textarea rows={3} value={form.descricao} onChange={(e) => set('descricao', e.target.value)} /></Field>
      <Field label="Resultado esperado"><Textarea rows={2} value={form.resultado_esperado} onChange={(e) => set('resultado_esperado', e.target.value)} /></Field>
      <Field label="Próximas etapas"><Textarea rows={2} value={form.proximas_etapas} onChange={(e) => set('proximas_etapas', e.target.value)} /></Field>
      <Field label="Dependências"><Textarea rows={2} value={form.dependencies} onChange={(e) => set('dependencies', e.target.value)} /></Field>
      <Field label="Pontos de atenção"><Textarea rows={2} value={form.attention_points} onChange={(e) => set('attention_points', e.target.value)} /></Field>
      <div className="flex justify-end">
        <Button onClick={() => onSave(form)} disabled={saving}>
          <Save className="h-4 w-4 mr-1" /> Salvar alterações
        </Button>
      </div>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
    </div>
  );
}
