import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingButton } from '@/components/ui/loading-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  CheckCircle2, XCircle, UserPlus, ShoppingCart, PackageCheck, AlertTriangle,
  ArrowRight, FileText, Building2, User, Tag, ChevronLeft, Users as UsersIcon,
  Mail, Phone, MessageCircle, Copy, ExternalLink, HardHat, ShieldCheck,
} from 'lucide-react';
import { linkify } from '@/lib/linkify';
import { formatPhoneBR, phoneDigits, whatsappLink } from '@/lib/masks';
import { useToast } from '@/hooks/use-toast';
import { MainLayout } from '@/components/layout/MainLayout';
import { PipelineHeader } from '@/components/esteira/PipelineHeader';
import { PipelineStepper } from '@/components/esteira/PipelineStepper';
import { PipelineTimeline } from '@/components/esteira/PipelineTimeline';
import { QuotesSection } from '@/components/purchases/QuotesSection';
import { ReceiptModal } from '@/components/purchases/ReceiptModal';
import { DocumentFlow } from '@/components/launchpad/DocumentFlow';
import { CommentsPanel } from '@/components/comments/CommentsPanel';
import { ValidationAttachments } from '@/components/ci/ValidationAttachments';
import { useAuth } from '@/hooks/useAuth';
import { usePurchasePipeline } from '@/hooks/usePurchasePipeline';
import {
  useApproveCI, useRejectCI, useAssignBuyerCI, useOrgBuyers, usePromoteCIToPurchase,
  useRequestTechnicalReview, useEngineerApprove, useEngineerRequestAdjustment,
  useRequestRegulatoryReview, useRegulatoryApprove, useRegulatoryRequestAdjustment,
  useCoordinatorApprove, useRequestSuperiorApproval, useManagerSendToCouncil, useCouncilDecide,
} from '@/hooks/useCI';
import { useReceipts } from '@/hooks/useReceipts';
import { formatBRL, STATUS_LABEL, STATUS_BADGE } from '@/lib/purchaseLabels';
import { ORDER_STATUS_LABEL, ORDER_STATUS_BADGE } from '@/hooks/usePurchaseOrders';
import { CI_STATUS_LABEL } from '@/lib/ciLabels';

interface Props {
  ciId?: string | null;
  requestId?: string | null;
  orderId?: string | null;
  /** When true, skips MainLayout (caller already provides a layout — e.g. SupplierLayout). */
  embedded?: boolean;
  /** Override the viewer role for the supplier portal view. */
  viewerRole?: 'fornecedor';
}

const MIN_QUOTES_COUNCIL = 3;

const FORNECEDOR_STEP_LABELS: Partial<Record<string, string>> = {
  compra: 'Pedido emitido',
  entrega: 'Entrega',
  finalizado: 'Aceite',
};
const FORNECEDOR_STEP_KEYS = ['compra', 'entrega', 'finalizado'];

function buyerInitials(b: { full_name?: string | null; email?: string | null }) {
  const source = (b.full_name || b.email || '').trim();
  if (!source) return '?';
  const parts = source.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const second = parts.length > 1 ? parts[parts.length - 1][0] : (parts[0]?.[1] ?? '');
  return (first + second).toUpperCase();
}

export default function EsteiraDetalhe({ ciId, requestId, orderId, embedded, viewerRole }: Props) {
  const { user, unigRole, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data, isLoading } = usePurchasePipeline({ ciId, requestId, orderId });

  const effectiveRole = viewerRole ?? unigRole;
  const isAdmin = !viewerRole && (isSuperAdmin || unigRole === 'administrador' || unigRole === 'coordenador_operacoes' || unigRole === 'gerente_geral');
  const isCoord = !viewerRole && (unigRole === 'coordenador_operacoes' || isAdmin);
  const isEngenheira = !viewerRole && (unigRole === 'engenheira' || isAdmin);
  const isRegulatorio = !viewerRole && (unigRole === 'validador_regulatorio' || isAdmin);
  const isGerente = !viewerRole && (unigRole === 'gerente_geral' || isAdmin);
  const isCompras = !viewerRole && (unigRole === 'compras' || isAdmin);
  const isAlmox = !viewerRole && (unigRole === 'almoxarifado' || isAdmin);
  const isConselho = !viewerRole && isAdmin; // Conselho = administrador no modelo atual
  const isFornecedor = effectiveRole === 'fornecedor';
  const isSolicitante = effectiveRole === 'solicitante' || effectiveRole === 'visitante' || isFornecedor;

  const approve = useApproveCI();
  const reject = useRejectCI();
  const assign = useAssignBuyerCI();
  const promote = usePromoteCIToPurchase();
  const { data: buyers } = useOrgBuyers();
  const reqTech = useRequestTechnicalReview();
  const engOk = useEngineerApprove();
  const engAdjust = useEngineerRequestAdjustment();
  const reqReg = useRequestRegulatoryReview();
  const regOk = useRegulatoryApprove();
  const regAdjust = useRegulatoryRequestAdjustment();
  const coordOk = useCoordinatorApprove();
  const reqSuperior = useRequestSuperiorApproval();
  const mgrToCouncil = useManagerSendToCouncil();
  const councilDecide = useCouncilDecide();

  const [approveComment, setApproveComment] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [buyerId, setBuyerId] = useState('');
  const [coordApproveBuyerId, setCoordApproveBuyerId] = useState('');
  const [openReceipt, setOpenReceipt] = useState(false);
  const [confirmAnim, setConfirmAnim] = useState<'approved' | 'rejected' | 'assigned' | null>(null);
  const [techComment, setTechComment] = useState('');
  const [validationTarget, setValidationTarget] = useState<'tecnica' | 'regulatoria'>('tecnica');
  const [engNote, setEngNote] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [regNote, setRegNote] = useState('');
  const [regAdjustReason, setRegAdjustReason] = useState('');
  const [superiorReason, setSuperiorReason] = useState('');
  const [councilNote, setCouncilNote] = useState('');

  const flashConfirm = (kind: 'approved' | 'rejected' | 'assigned') => {
    setConfirmAnim(kind);
    window.setTimeout(() => setConfirmAnim(null), 1600);
  };

  const handleApprove = () => {
    if (!ci) return;
    approve.mutate(
      { id: ci.id, comentario: approveComment || undefined },
      { onSuccess: () => { setApproveComment(''); flashConfirm('approved'); } }
    );
  };
  const handleReject = () => {
    if (!ci || !rejectReason.trim()) return;
    reject.mutate(
      { id: ci.id, motivo: rejectReason },
      { onSuccess: () => { setRejectReason(''); flashConfirm('rejected'); } }
    );
  };
  const handleAssign = () => {
    if (!ci || !buyerId) return;
    assign.mutate(
      { id: ci.id, buyer_id: buyerId },
      { onSuccess: () => { setBuyerId(''); flashConfirm('assigned'); } }
    );
  };

  const order = data?.order ?? null;
  const { data: receipts = [] } = useReceipts(order?.id);

  if (isLoading || !data) {
    const skeleton = (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-3xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
    return embedded ? skeleton : <MainLayout>{skeleton}</MainLayout>;
  }

  const { ci, request, quotes, steps: rawSteps, currentStep: rawCurrent, events, values } = data;

  const steps = isFornecedor
    ? rawSteps
        .filter(s => FORNECEDOR_STEP_KEYS.includes(s.key))
        .map(s => ({ ...s, label: FORNECEDOR_STEP_LABELS[s.key] ?? s.label }))
    : rawSteps;
  const currentStep = isFornecedor
    ? (steps.find(s => s.state === 'current') ?? steps[0] ?? rawCurrent)
    : rawCurrent;

  const ciStatus = ci?.status as string | undefined;

  // --- Cards de ação por papel (fluxograma oficial) ---
  const showCoordAnalysis = isCoord && ci && ['recebida', 'em_analise', 'aguardando_coordenador', 'revisao_solicitada'].includes(ciStatus ?? '');
  const showEngineerCard = isEngenheira && ci && ciStatus === 'aguardando_validacao_tecnica';
  const showRegulatoryCard = isRegulatorio && ci && ciStatus === 'aguardando_validacao_regulatoria';
  const showComprasCard = isCompras && ci && ciStatus === 'em_cotacao';
  const showGerenteCard = isGerente && ci && ciStatus === 'aguardando_gerente';
  const showConselhoCard = isConselho && ci && ciStatus === 'aguardando_conselho';

  // Cards legados (mantém compatibilidade com CIs antigas)
  const showApprovalCard = isAdmin && ci && ['aguardando_aprovacao'].includes(ciStatus ?? '');
  const canAssignBuyer = isAdmin || unigRole === 'coordenador_operacoes' || unigRole === 'gerente_geral';
  const showDistributeCard = canAssignBuyer && ci && ['aprovada', 'em_cotacao', 'pedido_emitido', 'aguardando_entrega'].includes(ciStatus ?? '');
  const showPromoteBtn = isAdmin && ci && !ci.purchase_request_id && ciStatus === 'aprovada';

  const totalRecebido = receipts.reduce((s, r) => s + Number(r.quantidade_recebida), 0);
  const restante = order ? Math.max(0, Number(order.quantidade) - totalRecebido) : 0;

  const enoughQuotes = quotes.length >= MIN_QUOTES_COUNCIL;
  const showQuoteBlock = !isFornecedor && (isCompras || isAdmin) && request;

  const body = (
    <div className="space-y-6 animate-fade-in relative">
      {!embedded && (
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-primary -ml-2"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
        </div>
      )}

      <PipelineHeader data={data} />

        {/* Stepper card */}
        <Card className="rounded-2xl border-border/60 shadow-sm">
          <CardContent className="p-6">
            <PipelineStepper steps={steps} />
          </CardContent>
        </Card>

        {/* Context KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard icon={<User className="h-4 w-4" />} label="Solicitante" value={ci?.requester_name ?? request?.solicitante_id?.slice(0, 8) ?? '—'} />
          <KpiCard icon={<Building2 className="h-4 w-4" />} label="Setor" value={ci?.source_sector ?? request?.setor ?? '—'} />
          <KpiCard icon={<Tag className="h-4 w-4" />} label="Tipo" value={ci?.request_type ?? request?.categoria ?? '—'} />
          {!isSolicitante ? (
            <KpiCard icon={<FileText className="h-4 w-4" />} label="Valor estimado" value={formatBRL(values.estimated)} />
          ) : (
            <KpiCard icon={<FileText className="h-4 w-4" />} label="Etapa" value={currentStep.label} />
          )}
        </div>

        {/* Details + actions grid */}
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Details */}
          <Card className="lg:col-span-2 rounded-2xl border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Detalhes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {ci && (
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Protocolo" value={ci.protocol} />
                  <Field label="Canal" value={ci.channel} />
                  <Field label="Origem" value={ci.source_sector ?? '—'} />
                  <Field label="Destino" value={ci.destination_sector ?? '—'} />
                  {ci.description && <Field className="sm:col-span-2" label="Descrição" value={ci.description} linkified />}
                  {ci.generated_description && (
                    <Field className="sm:col-span-2" label="Descrição institucional" value={ci.generated_description} linkified />
                  )}
                </div>
              )}
              {ci && (
                <div className="pt-3 mt-2 border-t space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Solicitante</div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field label="Nome" value={ci.requester_name ?? '—'} />
                    <Field label="Cargo" value={(ci as any).requester_role ?? '—'} />
                    <Field label="Setor" value={(ci as any).requester_sector ?? ci.source_sector ?? '—'} />
                    <Field label="Matrícula" value={(ci as any).requester_registration ?? '—'} />
                    <Field label="Aberta em" value={ci.created_at ? new Date(ci.created_at).toLocaleString('pt-BR') : '—'} />
                    <Field label="Tipo" value={(ci as any).request_type ?? '—'} />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2 pt-1">
                    <ContactRow
                      icon={<Mail className="h-4 w-4" />}
                      label="E-mail"
                      value={(ci as any).requester_email}
                      href={(ci as any).requester_email ? `mailto:${(ci as any).requester_email}` : null}
                      copyable
                      onCopy={(v) => {
                        navigator.clipboard.writeText(v);
                        toast({ title: 'E-mail copiado' });
                      }}
                    />
                    <ContactRow
                      icon={<Phone className="h-4 w-4" />}
                      label="Telefone"
                      value={(ci as any).requester_whatsapp ? formatPhoneBR((ci as any).requester_whatsapp) : null}
                      href={(ci as any).requester_whatsapp ? `tel:${phoneDigits((ci as any).requester_whatsapp)}` : null}
                    />
                    <ContactRow
                      icon={<MessageCircle className="h-4 w-4" />}
                      label="WhatsApp"
                      value={(ci as any).requester_whatsapp ? formatPhoneBR((ci as any).requester_whatsapp) : null}
                      href={whatsappLink((ci as any).requester_whatsapp)}
                      copyable
                      onCopy={() => {
                        const d = phoneDigits((ci as any).requester_whatsapp);
                        if (d) {
                          navigator.clipboard.writeText(d);
                          toast({ title: 'WhatsApp copiado' });
                        }
                      }}
                    />
                    <ContactRow
                      icon={<ExternalLink className="h-4 w-4" />}
                      label="Consulta da CI"
                      value={ci.protocol}
                      href={`${window.location.origin}/unigops/ci/consulta/${ci.protocol}`}
                    />
                  </div>
                </div>
              )}
              {request && (
                <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t">
                  <Field label="Nº Solicitação" value={request.numero} />
                  <Field label="Status" value={STATUS_LABEL[request.status]} badgeClass={STATUS_BADGE[request.status]} />
                  <Field label="Quantidade" value={String(request.quantidade)} />
                  {!isSolicitante && <Field label="Valor estimado" value={formatBRL(request.valor_estimado)} />}
                  <Field label="Prazo" value={request.prazo_desejado ? new Date(request.prazo_desejado).toLocaleDateString('pt-BR') : '—'} />
                  <Field label="Categoria" value={request.categoria ?? '—'} />
                  {request.justificativa && <Field className="sm:col-span-2" label="Justificativa" value={request.justificativa} linkified />}
                </div>
              )}
              {order && (
                <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t">
                  <Field label="Pedido" value={order.numero} />
                  <Field label="Status pedido" value={ORDER_STATUS_LABEL[order.status]} badgeClass={ORDER_STATUS_BADGE[order.status]} />
                  {!isSolicitante && <Field label="Valor total" value={formatBRL(order.valor_total)} />}
                  <Field label="Recebido" value={`${totalRecebido}/${Number(order.quantidade)}`} />
                </div>
              )}
              {ci?.purchase_request_id && (
                <Link to={`/solicitacoes/${ci.purchase_request_id}`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                  Ver solicitação de compra <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Side actions */}
          <div className="space-y-3">
            {/* Coordenador de Operações: análise inicial / pós OK técnico / pós revisão */}
            {showCoordAnalysis && (
              <Card className="rounded-2xl border-indigo-300/50 bg-indigo-500/5 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                    Análise do Coordenador
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {ciStatus === 'revisao_solicitada' && (
                    <div className="text-xs text-amber-700 bg-amber-500/10 border border-amber-300/40 rounded-md p-2">
                      ⚠ O Conselho solicitou revisão. Reavalie antes de seguir.
                    </div>
                  )}
                  <Textarea rows={2} placeholder="Observações (opcional) — usadas em qualquer ação abaixo" value={techComment} onChange={(e) => setTechComment(e.target.value)} />

                  {/* Bloco 1 — Aprovar (ação primária) + atribuir comprador */}
                  <section className="rounded-xl border-2 border-emerald-300/60 bg-emerald-500/5 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">1</span>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Aprovar e atribuir comprador</h4>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Selecione o comprador responsável. A CI será aprovada e distribuída em seguida.</p>
                    {(buyers ?? []).length === 0 ? (
                      <div className="text-xs text-muted-foreground bg-muted/40 border border-dashed rounded-lg p-2 flex flex-col gap-1">
                        <span className="flex items-center gap-2"><UsersIcon className="h-3.5 w-3.5" /> Nenhum comprador cadastrado.</span>
                        <Link to="/usuarios" className="text-primary hover:underline">Cadastrar usuário com papel "Comprador"</Link>
                      </div>
                    ) : (
                      <Select value={coordApproveBuyerId} onValueChange={setCoordApproveBuyerId}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Selecione o comprador responsável" /></SelectTrigger>
                        <SelectContent>
                          {(buyers ?? []).map((b: any) => (
                            <SelectItem key={b.user_id} value={b.user_id}>
                              <span className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={b.avatar_url ?? undefined} alt={b.full_name || b.email || ''} />
                                  <AvatarFallback className="text-[10px]">{buyerInitials(b)}</AvatarFallback>
                                </Avatar>
                                <span>{b.full_name || b.email}</span>
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5">{b.role_label ?? b.role}</Badge>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {!coordApproveBuyerId && (buyers ?? []).length > 0 && (
                      <p className="text-[11px] text-amber-700">Selecione o comprador responsável antes de aprovar.</p>
                    )}
                    <LoadingButton
                      size="sm"
                      className="w-full h-11 px-3 bg-emerald-600 hover:bg-emerald-700 text-white"
                      disabled={!coordApproveBuyerId || (buyers ?? []).length === 0}
                      loading={coordOk.isPending || assign.isPending}
                      onClick={async () => {
                        if (!ci || !coordApproveBuyerId) return;
                        try {
                          await assign.mutateAsync({ id: ci.id, buyer_id: coordApproveBuyerId });
                          coordOk.mutate(
                            { id: ci.id, comentario: techComment || undefined },
                            { onSuccess: () => { setTechComment(''); setCoordApproveBuyerId(''); flashConfirm('approved'); } },
                          );
                        } catch (err) {
                          // toast já tratado pelo hook
                        }
                      }}
                    >
                      <span className="flex items-center justify-center gap-2 w-full">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span className="text-sm font-semibold">Aprovar</span>
                      </span>
                    </LoadingButton>
                  </section>

                  {/* Bloco 2 — Reprovar (destrutivo) */}
                  <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">2</span>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-destructive">Reprovar CI</h4>
                    </div>
                    <Input className="h-9" placeholder="Motivo da reprovação (obrigatório)" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                    <LoadingButton variant="destructive" size="sm" className="w-full h-11 px-3"
                      disabled={!rejectReason.trim()} loading={reject.isPending}
                      onClick={handleReject}>
                      <span className="flex items-center justify-center gap-2 w-full">
                        <XCircle className="h-4 w-4 shrink-0" />
                        <span className="text-sm font-semibold">Reprovar</span>
                      </span>
                    </LoadingButton>
                  </section>

                  {/* Bloco 3 — Encaminhar para validação especializada (secundário) */}
                  <section className="rounded-xl border border-border/60 bg-background/60 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">3</span>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Encaminhar para validação</h4>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Use quando precisar de parecer técnico ou regulatório antes de aprovar.</p>
                    <Select value={validationTarget} onValueChange={(v) => setValidationTarget(v as any)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tecnica">
                          <span className="flex items-center gap-2">
                            <HardHat className="h-4 w-4 text-cyan-600" />
                            Validação Técnica (Engenheira)
                          </span>
                        </SelectItem>
                        <SelectItem value="regulatoria">
                          <span className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-rose-600" />
                            Validação Regulatória (PF/Receita)
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <LoadingButton
                      variant="outline"
                      size="sm"
                      className="w-full h-11 px-3"
                      loading={reqTech.isPending || reqReg.isPending}
                      onClick={() => {
                        const fn = validationTarget === 'tecnica' ? reqTech : reqReg;
                        fn.mutate(
                          { id: ci!.id, comentario: techComment || undefined },
                          { onSuccess: () => { setTechComment(''); flashConfirm('assigned'); } },
                        );
                      }}
                    >
                      <span className="flex items-center justify-center gap-2 w-full">
                        {validationTarget === 'tecnica' ? (
                          <HardHat className="h-4 w-4 shrink-0 text-cyan-600" />
                        ) : (
                          <ShieldCheck className="h-4 w-4 shrink-0 text-rose-600" />
                        )}
                        <span className="text-sm font-semibold">Enviar</span>
                      </span>
                    </LoadingButton>
                  </section>
                </CardContent>
              </Card>
            )}


            {/* Engenheira: OK técnico ou solicitar ajuste */}
            {showEngineerCard && (
              <Card className="rounded-2xl border-cyan-300/50 bg-cyan-500/5 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-cyan-600" />
                    Validação técnica (Engenheira)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Textarea rows={2} placeholder="Parecer técnico (opcional)" value={engNote} onChange={(e) => setEngNote(e.target.value)} />
                  <LoadingButton
                    className="w-full"
                    loading={engOk.isPending}
                    onClick={() => engOk.mutate(
                      { id: ci!.id, parecer: engNote || undefined },
                      { onSuccess: () => { setEngNote(''); flashConfirm('approved'); } },
                    )}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Dar OK técnico
                  </LoadingButton>
                  <div className="pt-2 border-t space-y-2">
                    <Input placeholder="Motivo do ajuste" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} />
                    <LoadingButton variant="outline" className="w-full"
                      disabled={!adjustReason.trim()} loading={engAdjust.isPending}
                      onClick={() => engAdjust.mutate(
                        { id: ci!.id, motivo: adjustReason },
                        { onSuccess: () => { setAdjustReason(''); flashConfirm('rejected'); } },
                      )}>
                      Solicitar ajuste
                    </LoadingButton>
                  </div>
                  {ci && (
                    <div className="pt-2 border-t">
                      <ValidationAttachments ciId={ci.id} organizationId={ci.organization_id} validationType="tecnica" />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Validador Regulatório: OK regulatório ou solicitar ajuste */}
            {showRegulatoryCard && (
              <Card className="rounded-2xl border-rose-300/50 bg-rose-500/5 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-rose-600" />
                    Validação Regulatória (PF/Receita)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Textarea rows={2} placeholder="Parecer regulatório (opcional)" value={regNote} onChange={(e) => setRegNote(e.target.value)} />
                  <LoadingButton
                    className="w-full"
                    loading={regOk.isPending}
                    onClick={() => regOk.mutate(
                      { id: ci!.id, parecer: regNote || undefined },
                      { onSuccess: () => { setRegNote(''); flashConfirm('approved'); } },
                    )}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Aprovar regulatório
                  </LoadingButton>
                  <div className="pt-2 border-t space-y-2">
                    <Input placeholder="Motivo do ajuste" value={regAdjustReason} onChange={(e) => setRegAdjustReason(e.target.value)} />
                    <LoadingButton variant="outline" className="w-full"
                      disabled={!regAdjustReason.trim()} loading={regAdjust.isPending}
                      onClick={() => regAdjust.mutate(
                        { id: ci!.id, motivo: regAdjustReason },
                        { onSuccess: () => { setRegAdjustReason(''); flashConfirm('rejected'); } },
                      )}>
                      Solicitar ajuste
                    </LoadingButton>
                  </div>
                  {ci && (
                    <div className="pt-2 border-t">
                      <ValidationAttachments ciId={ci.id} organizationId={ci.organization_id} validationType="regulatoria" />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Compras: solicitar aprovação superior */}
            {showComprasCard && (
              <Card className="rounded-2xl border-emerald-300/50 bg-emerald-500/5 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-emerald-600" />
                    Após cotações
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Se o valor ou a importância exigirem, encaminhe ao Gerente Geral.
                  </p>
                  <Input placeholder="Motivo (opcional)" value={superiorReason} onChange={(e) => setSuperiorReason(e.target.value)} />
                  <LoadingButton
                    variant="outline"
                    className="w-full"
                    loading={reqSuperior.isPending}
                    onClick={() => reqSuperior.mutate(
                      { id: ci!.id, motivo: superiorReason || undefined },
                      { onSuccess: () => { setSuperiorReason(''); flashConfirm('assigned'); } },
                    )}
                  >
                    Solicitar aprovação superior
                  </LoadingButton>
                </CardContent>
              </Card>
            )}

            {/* Gerente Geral: encaminhar ao Conselho */}
            {showGerenteCard && (
              <Card className="rounded-2xl border-fuchsia-300/50 bg-fuchsia-500/5 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-fuchsia-600" />
                    Gerente Geral
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Textarea rows={2} placeholder="Comentário ao Conselho" value={councilNote} onChange={(e) => setCouncilNote(e.target.value)} />
                  <LoadingButton
                    className="w-full"
                    loading={mgrToCouncil.isPending}
                    onClick={() => mgrToCouncil.mutate(
                      { id: ci!.id, comentario: councilNote || undefined },
                      { onSuccess: () => { setCouncilNote(''); flashConfirm('approved'); } },
                    )}
                  >
                    Enviar ao Conselho
                  </LoadingButton>
                  <div className="pt-2 border-t space-y-2">
                    <Input placeholder="Motivo da reprovação" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                    <LoadingButton variant="destructive" className="w-full"
                      disabled={!rejectReason.trim()} loading={reject.isPending}
                      onClick={handleReject}>
                      <XCircle className="h-4 w-4 mr-1" /> Reprovar
                    </LoadingButton>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Conselho: decidir */}
            {showConselhoCard && (
              <Card className="rounded-2xl border-purple-300/50 bg-purple-500/5 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-purple-600" />
                    Decisão do Conselho
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Textarea rows={2} placeholder="Comentário (opcional)" value={councilNote} onChange={(e) => setCouncilNote(e.target.value)} />
                  <LoadingButton
                    className="w-full"
                    loading={councilDecide.isPending}
                    onClick={() => councilDecide.mutate(
                      { id: ci!.id, decisao: 'aprovado', comentario: councilNote || undefined },
                      { onSuccess: () => { setCouncilNote(''); flashConfirm('approved'); } },
                    )}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Aprovar
                  </LoadingButton>
                  <LoadingButton
                    variant="outline"
                    className="w-full"
                    loading={councilDecide.isPending}
                    onClick={() => councilDecide.mutate(
                      { id: ci!.id, decisao: 'revisao', comentario: councilNote || undefined },
                      { onSuccess: () => { setCouncilNote(''); flashConfirm('assigned'); } },
                    )}
                  >
                    Solicitar revisão
                  </LoadingButton>
                  <LoadingButton
                    variant="destructive"
                    className="w-full"
                    loading={councilDecide.isPending}
                    onClick={() => councilDecide.mutate(
                      { id: ci!.id, decisao: 'desaprovado', comentario: councilNote || undefined },
                      { onSuccess: () => { setCouncilNote(''); flashConfirm('rejected'); } },
                    )}
                  >
                    <XCircle className="h-4 w-4 mr-1" /> Desaprovar
                  </LoadingButton>
                </CardContent>
              </Card>
            )}

            {showApprovalCard && (
              <Card className="rounded-2xl border-amber-300/50 bg-amber-500/5 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-amber-600" />Aprovação operacional</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Textarea rows={2} placeholder="Comentário (opcional)" value={approveComment} onChange={(e) => setApproveComment(e.target.value)} />
                  <LoadingButton loading={approve.isPending} className="w-full" onClick={handleApprove}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Aprovar
                  </LoadingButton>
                  <div className="pt-2 border-t space-y-2">
                    <Input placeholder="Motivo da reprovação" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                    <LoadingButton variant="destructive" className="w-full"
                      disabled={!rejectReason.trim()} loading={reject.isPending}
                      onClick={handleReject}>
                      <XCircle className="h-4 w-4 mr-1" /> Reprovar
                    </LoadingButton>
                  </div>
                </CardContent>
              </Card>
            )}

            {showDistributeCard && (
              <Card className="rounded-2xl border-border/60 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><UserPlus className="h-4 w-4" />Distribuir ao comprador</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(() => {
                    const current = (buyers ?? []).find((b: any) => b.user_id === ci?.assigned_to);
                    const currentLabel = current ? (current.full_name || current.email) : (ci?.assigned_to ? '—' : 'Nenhum');
                    return (
                      <div className="text-xs text-muted-foreground bg-muted/30 border rounded-md px-3 py-2 flex items-center gap-2">
                        {current ? (
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={current.avatar_url ?? undefined} alt={currentLabel || ''} />
                            <AvatarFallback className="text-[9px]">{buyerInitials(current)}</AvatarFallback>
                          </Avatar>
                        ) : (
                          <UsersIcon className="h-3.5 w-3.5" />
                        )}
                        <span>Comprador atual: <span className="font-medium text-foreground">{currentLabel}</span></span>
                      </div>
                    );
                  })()}
                  {(buyers ?? []).length === 0 ? (
                    <div className="text-xs text-muted-foreground bg-muted/40 border border-dashed rounded-lg p-3 flex flex-col gap-2">
                      <span className="flex items-center gap-2"><UsersIcon className="h-3.5 w-3.5" /> Nenhum comprador cadastrado na organização.</span>
                      <Link to="/usuarios" className="text-primary hover:underline">Cadastrar usuário com papel "Comprador"</Link>
                    </div>
                  ) : (
                    <>
                      <Select value={buyerId} onValueChange={setBuyerId}>
                        <SelectTrigger><SelectValue placeholder="Selecione comprador" /></SelectTrigger>
                        <SelectContent>
                          {(buyers ?? []).map((b: any) => (
                            <SelectItem key={b.user_id} value={b.user_id}>
                              <span className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={b.avatar_url ?? undefined} alt={b.full_name || b.email || ''} />
                                  <AvatarFallback className="text-[10px]">{buyerInitials(b)}</AvatarFallback>
                                </Avatar>
                                <span>{b.full_name || b.email}</span>
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                                  {b.role_label ?? b.role}
                                </Badge>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <LoadingButton className="w-full" disabled={!buyerId || buyerId === ci?.assigned_to} loading={assign.isPending} onClick={handleAssign}>
                        {ci?.assigned_to ? 'Trocar comprador' : 'Distribuir'}
                      </LoadingButton>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {showPromoteBtn && (
              <Card className="rounded-2xl border-border/60 shadow-sm">
                <CardContent className="p-4">
                  <LoadingButton variant="outline" className="w-full" loading={promote.isPending}
                    onClick={() => promote.mutate(ci!.id)}>
                    <ShoppingCart className="h-4 w-4 mr-1" /> Gerar Solicitação de Compra
                  </LoadingButton>
                </CardContent>
              </Card>
            )}

            {order && isAlmox && order.status !== 'recebido_total' && order.status !== 'cancelado' && (
              <Card className="rounded-2xl border-border/60 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><PackageCheck className="h-4 w-4" />Recebimento</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" onClick={() => setOpenReceipt(true)}>Registrar recebimento</Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Cotações – Compras/Admin */}
        {showQuoteBlock && (
          <div className="space-y-3">
            <Card className={`rounded-2xl border-border/60 shadow-sm ${!enoughQuotes ? 'border-amber-300/60 bg-amber-500/5' : ''}`}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {!enoughQuotes && <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />}
                  <div>
                    <div className="font-semibold text-sm">
                      Cotações: <span className="tabular-nums">{quotes.length}/{MIN_QUOTES_COUNCIL}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {enoughQuotes
                        ? `Menor: ${formatBRL(values.lowest)} · Escolhida: ${formatBRL(values.chosen)} · Economia: ${formatBRL(values.saving)}`
                        : `Mínimo de ${MIN_QUOTES_COUNCIL} cotações para envio ao Conselho.`}
                    </div>
                  </div>
                </div>
                <Button size="sm" variant={enoughQuotes ? 'default' : 'outline'} disabled={!enoughQuotes}
                  title={!enoughQuotes ? `Adicione ao menos ${MIN_QUOTES_COUNCIL} cotações` : ''}>
                  Pronto para o Conselho
                </Button>
              </CardContent>
            </Card>
            <QuotesSection request={request!} canManage={['administrador', 'coordenador_operacoes', 'gerente_geral', 'compras', 'super_admin'].includes(unigRole)} />
          </div>
        )}

        {/* Recebimentos (visível para staff) */}
        {order && !isSolicitante && (
          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><PackageCheck className="h-4 w-4" />Recebimentos</CardTitle>
            </CardHeader>
            <CardContent>
              {receipts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum recebimento registrado.</p>
              ) : (
                <div className="space-y-2">
                  {receipts.map(r => (
                    <div key={r.id} className="border rounded-lg p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{Number(r.quantidade_recebida)} unidades</span>
                        <span className="text-xs text-muted-foreground">{new Date(r.data_recebimento).toLocaleString('pt-BR')}</span>
                      </div>
                      {r.observacoes && <div className="text-xs text-muted-foreground mt-1">{r.observacoes}</div>}
                      {r.divergencia && <div className="text-xs text-amber-700 mt-1">⚠ {r.divergencia_descricao ?? 'Divergência'}</div>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <PipelineTimeline events={events} />

        {request && <DocumentFlow rootRequestId={request.id} currentType="request" currentId={request.id} />}
        {(request || order) && (
          <CommentsPanel
            entidadeTipo={order ? 'purchase_order' : 'purchase_request'}
            entidadeId={order?.id ?? request!.id}
          />
        )}

        <AnimatePresence>
          {confirmAnim && (
            <motion.div
              key="confirm-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm pointer-events-none"
            >
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                className={`rounded-2xl px-8 py-6 shadow-2xl flex flex-col items-center gap-3 text-center ${
                  confirmAnim === 'approved'
                    ? 'bg-emerald-500 text-white'
                    : confirmAnim === 'rejected'
                      ? 'bg-destructive text-destructive-foreground'
                      : 'bg-primary text-primary-foreground'
                }`}
              >
                {confirmAnim === 'approved' && <CheckCircle2 className="h-14 w-14" />}
                {confirmAnim === 'rejected' && <XCircle className="h-14 w-14" />}
                {confirmAnim === 'assigned' && <UserPlus className="h-14 w-14" />}
                <div className="font-bold text-lg">
                  {confirmAnim === 'approved' && 'CI Aprovada!'}
                  {confirmAnim === 'rejected' && 'CI Reprovada'}
                  {confirmAnim === 'assigned' && 'Distribuída ao comprador'}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
  );



  const modal = order && (
    <ReceiptModal
      open={openReceipt}
      onOpenChange={setOpenReceipt}
      orderId={order.id}
      quantidadeRestante={restante || Number(order.quantidade)}
    />
  );

  if (embedded) {
    return <>{body}{modal}</>;
  }
  return (
    <MainLayout>
      {body}
      {modal}
    </MainLayout>
  );
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="rounded-2xl border-border/60 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground font-semibold">
          {icon}{label}
        </div>
        <div className="mt-1 font-bold text-base truncate">{value}</div>
      </CardContent>
    </Card>
  );
}

function Field({ label, value, className, badgeClass, linkified }: { label: string; value: string; className?: string; badgeClass?: string; linkified?: boolean }) {
  return (
    <div className={className}>
      <div className="text-xs text-muted-foreground">{label}</div>
      {badgeClass ? (
        <Badge variant="outline" className={badgeClass}>{value}</Badge>
      ) : (
        <div className="font-medium whitespace-pre-wrap break-words">
          {linkified ? linkify(value) : value}
        </div>
      )}
    </div>
  );
}

function ContactRow({
  icon, label, value, href, copyable, onCopy,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
  href: string | null;
  copyable?: boolean;
  onCopy?: (v: string) => void;
}) {
  const empty = !value;
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border bg-card/40 px-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-muted-foreground shrink-0">{icon}</span>
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
          {empty ? (
            <div className="text-sm text-muted-foreground">—</div>
          ) : href ? (
            <a
              href={href}
              target={href.startsWith('http') ? '_blank' : undefined}
              rel="noopener noreferrer"
              className="text-sm font-medium text-primary hover:underline break-all"
            >
              {value}
            </a>
          ) : (
            <div className="text-sm font-medium break-all">{value}</div>
          )}
        </div>
      </div>
      {!empty && copyable && (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0"
          onClick={() => onCopy?.(value!)}
          aria-label={`Copiar ${label.toLowerCase()}`}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
