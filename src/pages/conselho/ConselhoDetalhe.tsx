import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import {
  useCouncilProposal, useCastCouncilVote, useOpenCouncilVoting, useCouncilMembers, useIsCouncilMember,
  type CouncilVoteValue,
} from '@/hooks/useCouncil';
import { useAuth } from '@/hooks/useAuth';
import {
  ArrowLeft, Image as ImageIcon, Share2, MoreVertical, ThumbsUp, ThumbsDown, FileEdit,
  HeartHandshake, DollarSign, AlarmClock, FileSpreadsheet, FileText as FileTextIcon,
} from 'lucide-react';
import { formatBRL } from '@/lib/purchaseLabels';
import { exportCouncilProposalPDF, exportCouncilProposalExcel } from '@/lib/councilExport';
import { useToast } from '@/hooks/use-toast';
import { CouncilStatusChip } from '@/components/conselho/CouncilStatusChip';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

import { IOSPriorityBadge } from '@/components/conselho/ios/IOSPriorityBadge';
import { IOSSupplierCard } from '@/components/conselho/ios/IOSSupplierCard';
import { IOSImpactRow } from '@/components/conselho/ios/IOSImpactRow';
import { IOSAttachmentCard } from '@/components/conselho/ios/IOSAttachmentCard';
import { IOSStickyActionBar } from '@/components/conselho/ios/IOSStickyActionBar';
import { ApproveConfirmModal } from '@/components/conselho/ios/ApproveConfirmModal';
import { derivePriorityFromAge } from '@/components/conselho/ios/iosPriority';
import { CouncilVoteTimeline } from '@/components/conselho/CouncilVoteTimeline';

function initials(name: string | null | undefined, fallback: string) {
  const n = (name ?? '').trim();
  if (!n) return fallback;
  const parts = n.split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || fallback;
}

export default function ConselhoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, unigRole, isSuperAdmin } = useAuth();
  const { data, isLoading } = useCouncilProposal(id);
  const { data: members = [] } = useCouncilMembers();
  const isMember = useIsCouncilMember();
  const cast = useCastCouncilVote();
  const open = useOpenCouncilVoting();
  const [voteDialog, setVoteDialog] = useState<{ open: boolean; voto?: CouncilVoteValue; isReview?: boolean }>({ open: false });
  const [comentario, setComentario] = useState('');
  const [approveOpen, setApproveOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const { toast } = useToast();

  if (isLoading || !data) {
    return <MainLayout><p className="text-sm text-ios-gray">Carregando…</p></MainLayout>;
  }
  const { proposal, quotes, votes } = data;
  const myVote = votes.find(v => v.membro_user_id === user?.id);
  const canOpen =
    (isSuperAdmin || unigRole === 'administrador' || unigRole === 'gerente_geral' || proposal.created_by === user?.id) &&
    proposal.status === 'rascunho';

  const sortedQuotes = [...quotes].sort((a, b) => Number(a.total) - Number(b.total));
  const bestQuote = sortedQuotes[0];
  const worstTotal = sortedQuotes.length > 0 ? Number(sortedQuotes[sortedQuotes.length - 1].total) : 0;
  const economyPct = bestQuote && worstTotal > 0
    ? Math.round(((worstTotal - Number(bestQuote.total)) / worstTotal) * 100)
    : 0;
  const economyTotal = bestQuote ? worstTotal - Number(bestQuote.total) : 0;
  const tituloDisplay = proposal.titulo.replace(/^\[DEMO\]\s*/, '');
  const canVote = proposal.status === 'em_votacao' && isMember;
  const priority = derivePriorityFromAge(proposal.created_at);
  const area = proposal.location?.trim() || 'Geral';

  const solicitante = members.find(m => m.user_id === proposal.created_by) ?? members[0];
  const solicitanteNome = solicitante?.nome_exibicao?.trim() || 'Solicitante';
  const tempo = formatDistanceToNow(new Date(proposal.created_at), { addSuffix: true, locale: ptBR });

  const justificativa = proposal.justificativa?.trim() || 'Sem justificativa registrada.';
  const justifShort = justificativa.length > 140 ? justificativa.slice(0, 140) + '…' : justificativa;

  const effectiveSelectedId = selectedQuoteId ?? bestQuote?.id ?? null;

  const handleVote = async () => {
    if (!voteDialog.voto) return;
    const finalComment = voteDialog.isReview && comentario
      ? `[Revisão solicitada] ${comentario}`
      : (comentario || undefined);
    await cast.mutateAsync({ proposalId: proposal.id, voto: voteDialog.voto, comentario: finalComment });
    setVoteDialog({ open: false });
    setComentario('');
  };

  const handleApprove = async () => {
    await cast.mutateAsync({ proposalId: proposal.id, voto: 'aprovado' });
  };

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      await exportCouncilProposalPDF(proposal, quotes, votes, members);
      toast({ title: 'PDF gerado' });
    } catch (e: any) {
      toast({ title: 'Erro ao gerar PDF', description: e?.message ?? '', variant: 'destructive' });
    } finally { setExporting(false); }
  };
  const handleExportExcel = () => {
    try {
      exportCouncilProposalExcel(proposal, quotes, votes, members);
      toast({ title: 'Excel gerado' });
    } catch (e: any) {
      toast({ title: 'Erro ao gerar Excel', description: e?.message ?? '', variant: 'destructive' });
    }
  };

  // Impactos derivados da prioridade
  const urgenciaTone = priority === 'alta' ? 'red' : priority === 'media' ? 'orange' : 'green';
  const urgenciaText = priority === 'alta'
    ? 'Necessidade alta. Substituição prioritária.'
    : priority === 'media'
    ? 'Necessidade média. Substituição recomendada.'
    : 'Necessidade baixa. Sem urgência imediata.';

  return (
    <MainLayout>
      <div className="min-h-full bg-ios-bg -mx-3 sm:-mx-6 lg:-mx-8 px-3 sm:px-6 lg:px-8 pb-40 lg:pb-8 animate-fade-in">
        <div className="max-w-2xl lg:max-w-5xl mx-auto space-y-5 pt-1">
          {/* Top bar iOS */}
          <div className="flex items-center justify-between -mx-1">
            <button
              type="button"
              onClick={() => navigate('/conselho')}
              className="inline-flex items-center gap-1 text-ios-blue text-[15px] font-medium px-1 active:opacity-60"
            >
              <ArrowLeft className="h-5 w-5" /> Voltar
            </button>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: tituloDisplay, url: window.location.href }).catch(() => {});
                  } else {
                    navigator.clipboard?.writeText(window.location.href);
                    toast({ title: 'Link copiado' });
                  }
                }}
                aria-label="Compartilhar"
                className="h-10 w-10 rounded-full flex items-center justify-center text-ios-blue active:scale-95 transition"
              >
                <Share2 className="h-5 w-5" />
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="Mais"
                    className="h-10 w-10 rounded-full flex items-center justify-center text-ios-text active:scale-95 transition"
                  >
                    <MoreVertical className="h-5 w-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportPDF} disabled={exporting}>
                    <FileTextIcon className="h-4 w-4 mr-2" />Exportar PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportExcel}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />Exportar Excel
                  </DropdownMenuItem>
                  {canVote && (
                    <DropdownMenuItem onClick={() => setVoteDialog({ open: true, voto: 'rejeitado' })}>
                      <ThumbsDown className="h-4 w-4 mr-2" />Reprovar proposta
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Imagem hero */}
          <div className="rounded-[20px] overflow-hidden h-[220px] bg-gradient-to-br from-muted to-muted/40 shadow-ios-card">
            {proposal.imagem_url ? (
              <img src={proposal.imagem_url} alt={tituloDisplay} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="h-12 w-12 text-muted-foreground/40" />
              </div>
            )}
          </div>

          {/* Bloco principal */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <IOSPriorityBadge priority={priority} />
              <CouncilStatusChip status={proposal.status} />
            </div>
            <div>
              <h1 className="text-[24px] font-bold tracking-tight leading-tight text-ios-text">
                {tituloDisplay}
              </h1>
              <p className="text-[13px] text-ios-gray mt-1">Área: {area}</p>
            </div>

            {bestQuote && (
              <div className="flex items-end justify-between gap-3 flex-wrap">
                <p className="text-[32px] font-bold tabular-nums text-ios-text leading-none">
                  {formatBRL(Number(bestQuote.total))}
                </p>
                {economyPct > 0 && (
                  <div className="text-right">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-ios-green/15 text-ios-green text-[12px] font-bold">
                      Economia: {economyPct}%
                    </span>
                    <p className="text-[11px] text-ios-gray mt-1">Menor fornecedor</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Solicitante */}
          <div className="flex items-center gap-3 py-1">
            <Avatar className="h-9 w-9 shrink-0">
              {solicitante?.foto_url && <AvatarImage src={solicitante.foto_url} alt={solicitanteNome} />}
              <AvatarFallback className="text-[11px] font-semibold bg-ios-blue/10 text-ios-blue">
                {initials(solicitanteNome, 'SO')}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] text-ios-gray leading-tight">Solicitado por:</p>
              <p className="text-[14px] font-semibold text-ios-text leading-tight truncate">{solicitanteNome}</p>
            </div>
            <p className="text-[12px] text-ios-gray shrink-0">{tempo}</p>
          </div>

          {/* Justificativa */}
          <section className="space-y-2">
            <h2 className="text-[15px] font-semibold text-ios-text">Justificativa</h2>
            <p className="text-[14px] leading-relaxed text-ios-text/85">
              {showFull ? justificativa : justifShort}
              {justificativa.length > 140 && (
                <button
                  type="button"
                  onClick={() => setShowFull(s => !s)}
                  className="ml-1 text-ios-blue font-medium"
                >
                  {showFull ? 'Ver menos' : 'Ver mais'}
                </button>
              )}
            </p>
          </section>

          {/* Fornecedores */}
          {quotes.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-[15px] font-semibold text-ios-text">Fornecedores</h2>

              {/* Comparativo visual lado a lado */}
              {sortedQuotes.length > 1 && (
                <div className="bg-ios-card rounded-ios shadow-ios-card p-4 space-y-2.5">
                  <p className="text-[12px] text-ios-gray">Comparativo de totais</p>
                  {sortedQuotes.map((q, idx) => {
                    const pct = worstTotal > 0 ? (Number(q.total) / worstTotal) * 100 : 0;
                    const isBest = idx === 0;
                    return (
                      <div key={q.id} className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-[12px]">
                          <span className={cn('truncate font-medium', isBest ? 'text-ios-green' : 'text-ios-text')}>
                            {isBest && '★ '}{q.fornecedor}
                          </span>
                          <span className="tabular-nums font-semibold shrink-0">{formatBRL(Number(q.total))}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn('h-full transition-all', isBest ? 'bg-ios-green' : 'bg-ios-blue/70')}
                            style={{ width: `${Math.max(8, pct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="grid grid-cols-1 gap-2.5">
                {sortedQuotes.map((q, idx) => (
                  <IOSSupplierCard
                    key={q.id}
                    nome={q.fornecedor}
                    valorUnit={formatBRL(Number(q.valor_unit))}
                    qtd={Number(q.qtd)}
                    frete={Number(q.frete) > 0 ? formatBRL(Number(q.frete)) : 'R$ -'}
                    total={formatBRL(Number(q.total))}
                    condicao={q.condicoes}
                    selected={effectiveSelectedId === q.id}
                    isBest={idx === 0}
                    onSelect={() => setSelectedQuoteId(q.id)}
                  />
                ))}
              </div>

              {economyTotal > 0 && (
                <div className="bg-ios-card rounded-ios shadow-ios-card p-4 flex items-center justify-between">
                  <p className="text-[14px] font-semibold text-ios-text">Economia total</p>
                  <p className="text-[20px] font-bold tabular-nums text-ios-green">{formatBRL(economyTotal)}</p>
                </div>
              )}
            </section>
          )}

          {/* Timeline de votação */}
          {(proposal.status === 'em_votacao' || proposal.status === 'aprovada' || proposal.status === 'reprovada') && members.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-semibold text-ios-text">Votação do conselho</h2>
                <span className="text-[12px] text-ios-gray tabular-nums">
                  {votes.length}/{proposal.total_membros} votos
                </span>
              </div>
              <div className="bg-ios-card rounded-ios shadow-ios-card p-4">
                <CouncilVoteTimeline votes={votes} members={members} totalMembros={proposal.total_membros} />
              </div>
            </section>
          )}

          {/* Impactos */}
          <section className="space-y-1">
            <h2 className="text-[15px] font-semibold text-ios-text mb-1">Impactos</h2>
            <div className="bg-ios-card rounded-ios shadow-ios-card px-4 py-2 divide-y divide-border/40">
              <IOSImpactRow
                icon={HeartHandshake}
                title="Operacional"
                description="Melhora a ergonomia e conforto da equipe."
                tone="green"
              />
              <IOSImpactRow
                icon={DollarSign}
                title="Financeiro"
                description={economyPct > 0
                  ? `Menor preço entre os fornecedores analisados (economia de ${economyPct}%).`
                  : 'Custo dentro do esperado para a categoria.'}
                tone="green"
              />
              <IOSImpactRow
                icon={AlarmClock}
                title="Urgência"
                description={urgenciaText}
                tone={urgenciaTone}
              />
            </div>
          </section>

          {/* Anexos */}
          {quotes.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-[15px] font-semibold text-ios-text">Anexos e documentos</h2>
              <IOSAttachmentCard
                name="Cotação completa.pdf"
                size="1.2 MB"
                onDownload={handleExportPDF}
                disabled={exporting}
              />
            </section>
          )}

          {canOpen && (
            <Button
              className="hidden lg:flex w-full h-12 rounded-full bg-ios-blue hover:bg-ios-blue/90 text-white font-semibold"
              onClick={() => open.mutate(proposal.id)}
              disabled={open.isPending}
            >
              Abrir para votação
            </Button>
          )}

          {myVote && (
            <p className="text-[12px] text-ios-gray text-center pt-1">
              Você já votou: <strong className="capitalize text-ios-text">{myVote.voto}</strong>. Pode alterar seu voto.
            </p>
          )}

          {/* Ações desktop */}
          {canVote && (
            <div className="hidden lg:grid grid-cols-3 gap-3 pt-2">
              <Button
                size="lg"
                className="bg-ios-blue hover:bg-ios-blue/90 text-white shadow-md h-14 text-base font-semibold rounded-full"
                onClick={() => setApproveOpen(true)}
              >
                <ThumbsUp className="h-5 w-5 mr-2" />
                Aprovar
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 text-base font-semibold border-2 border-ios-blue text-ios-blue hover:bg-ios-blue/5 rounded-full"
                onClick={() => setVoteDialog({ open: true, voto: 'abstencao', isReview: true })}
              >
                <FileEdit className="h-5 w-5 mr-2" />
                Solicitar ajuste
              </Button>
              <Button
                size="lg"
                className="bg-ios-red hover:bg-ios-red/90 text-white shadow-md h-14 text-base font-semibold rounded-full"
                onClick={() => setVoteDialog({ open: true, voto: 'rejeitado' })}
              >
                <ThumbsDown className="h-5 w-5 mr-2" />
                Reprovar
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Sticky bar mobile */}
      {canVote && (
        <div className="lg:hidden">
          <IOSStickyActionBar
            onAdjust={() => setVoteDialog({ open: true, voto: 'abstencao', isReview: true })}
            onApprove={() => setApproveOpen(true)}
          />
        </div>
      )}
      {!canVote && canOpen && (
        <div className="lg:hidden fixed inset-x-0 bottom-[64px] z-[60] px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] bg-ios-card/95 backdrop-blur-xl border-t border-border/40 shadow-ios-bar">
          <div className="max-w-2xl mx-auto">
            <Button
              className="w-full h-12 rounded-full bg-ios-blue hover:bg-ios-blue/90 text-white font-semibold"
              onClick={() => open.mutate(proposal.id)}
              disabled={open.isPending}
            >
              Abrir para votação
            </Button>
          </div>
        </div>
      )}

      {/* Modal de aprovação swipe */}
      <ApproveConfirmModal
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title={tituloDisplay}
        valueLabel={bestQuote ? formatBRL(Number(bestQuote.total)) : '—'}
        onApprove={handleApprove}
      />

      {/* Dialog para reprovar / ajuste */}
      <Dialog open={voteDialog.open} onOpenChange={o => setVoteDialog({ ...voteDialog, open: o })}>
        <DialogContent className="max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-ios-lg">
          <DialogHeader>
            <DialogTitle>
              {voteDialog.isReview
                ? 'Solicitar ajuste da proposta'
                : `Confirmar voto: ${
                    voteDialog.voto === 'aprovado' ? 'Aprovar' :
                    voteDialog.voto === 'rejeitado' ? 'Reprovar' : 'Abster'
                  }`}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            value={comentario}
            onChange={e => setComentario(e.target.value)}
            placeholder={voteDialog.isReview
              ? 'Descreva os pontos a serem ajustados (obrigatório)…'
              : 'Comentário (opcional)'}
            rows={4}
          />
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto rounded-full" onClick={() => setVoteDialog({ open: false })}>
              Cancelar
            </Button>
            <Button
              className="w-full sm:w-auto rounded-full bg-ios-blue hover:bg-ios-blue/90"
              onClick={handleVote}
              disabled={cast.isPending || (voteDialog.isReview && !comentario.trim())}
            >
              {voteDialog.isReview ? 'Enviar solicitação' : 'Confirmar voto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
