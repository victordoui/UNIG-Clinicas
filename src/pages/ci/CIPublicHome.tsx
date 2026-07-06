import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bot, FileText, Copy, ArrowRight, Plus, ListChecks, ChevronRight,
  Clock, CheckCircle2, Hourglass, ClipboardList, Sparkles, FileSignature,
  Info, BookOpen, CheckCircle, Upload,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useCIList } from '@/hooks/useCI';
import { CIStatusBadge } from '@/components/ci/CIStatusBadge';
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';
import { CoverBanner } from '@/components/profile/CoverBanner';
import { CoverEditor } from '@/components/profile/CoverEditor';
import { useProfileCover } from '@/hooks/useProfileCover';
import { getCtaStyle } from '@/lib/coverPresets';
import { CoverKpiCard as KpiCard } from '@/components/dashboard/CoverKpiCard';

function greet() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

const FINAL_STATUSES = ['finalizada', 'cancelada', 'reprovada'];
const WAITING_STATUSES = [
  'aguardando_aprovacao', 'aguardando_coordenador', 'aguardando_gerente',
  'aguardando_conselho', 'aguardando_validacao_tecnica', 'aguardando_validacao_regulatoria',
];

const STEPS = [
  { n: 1, label: 'Criada', desc: 'Solicitação registrada pelo solicitante' },
  { n: 2, label: 'Análise', desc: 'Em análise pela equipe de Facilities' },
  { n: 3, label: 'Aprovação', desc: 'Aguardando aprovação da(s) alçada(s)' },
  { n: 4, label: 'Cotação', desc: 'Em cotação com fornecedores' },
  { n: 5, label: 'Finalizada', desc: 'CI finalizada e processo concluído' },
];

export default function CIPublicHome() {
  const { profile } = useAuth();
  const { state: cover } = useProfileCover();
  const [coverEditorOpen, setCoverEditorOpen] = useState(false);
  const { data: list, isLoading } = useCIList({ mine: true });
  const minhas = list ?? [];

  const now = new Date();
  const thisMonth = (d: string) => {
    const dt = new Date(d);
    return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
  };

  const abertas = minhas.filter(c => !FINAL_STATUSES.includes(c.status));
  const finalizadasMes = minhas.filter(c => c.status === 'finalizada' && thisMonth(c.created_at));
  const aguardando = minhas.filter(c => WAITING_STATUSES.includes(c.status));
  const totalMes = minhas.filter(c => thisMonth(c.created_at));

  const firstName = (profile?.full_name || profile?.email || 'Solicitante').split(' ')[0];
  const recentes = minhas.slice(0, 4);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HERO BANNER */}
      <CoverBanner cover={cover} onEdit={() => setCoverEditorOpen(true)}>
        <div className="pt-4 px-4 pb-3 lg:pt-5 lg:px-6 lg:pb-4">
          <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4 xl:gap-6 min-w-0">
            {/* Left: text + CTAs */}
            <div className="relative space-y-3 max-w-xl min-w-0 flex-1">
              {(() => {
                const chipStyle: React.CSSProperties = {};
                const chipCls = '';
                return (
                  <>
                    <div className="flex items-center gap-2 text-white text-[11px] font-bold uppercase tracking-[0.18em]" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6), 0 2px 10px rgba(0,0,0,0.45)' }}>
                      <span className={cn('inline-flex items-center gap-1.5', chipCls)} style={chipStyle}>
                        <Sparkles className="h-3.5 w-3.5" /> Portal do Solicitante
                      </span>
                    </div>
                    <h1 className="text-2xl lg:text-4xl font-bold tracking-tight text-white leading-tight" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.7), 0 3px 14px rgba(0,0,0,0.5)' }}>
                      <span className={chipCls} style={chipStyle}>{greet()}, {firstName} 👋</span>
                    </h1>
                    <p className="text-white/95 text-[13px] lg:text-[14px] leading-snug" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6), 0 2px 10px rgba(0,0,0,0.45)' }}>
                      <span className={chipCls} style={chipStyle}>Abra, acompanhe e consulte suas Requisições de Compra — tudo registrado, rastreável e sem papel.</span>
                    </p>

                  </>
                );
              })()}
              <div className="flex flex-row flex-wrap gap-2 sm:gap-3">

                <Link to="/unigops/ci/formulario" className="flex-1 sm:flex-none">
                  <Button size="sm" className={cn('w-full sm:w-auto whitespace-nowrap', getCtaStyle(cover.ctaStyle).primaryClass)}>
                    <Plus className="h-4 w-4 mr-1.5" /> Abrir nova CI
                  </Button>
                </Link>
                <Link to="/unigops/ci/consulta" className="flex-1 sm:flex-none">
                  <Button size="sm" variant="outline" className={cn('w-full sm:w-auto whitespace-nowrap', getCtaStyle(cover.ctaStyle).secondaryClass)}>
                    <FileSignature className="h-4 w-4 mr-1.5" /> Minhas CIs
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right: KPI cards aligned to the buttons row */}
            <TooltipProvider delayDuration={150}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 w-full xl:w-auto xl:min-w-[480px] xl:max-w-[560px] min-w-0">
                <KpiCard
                  to="/unigops/ci/consulta"
                  label="Em andamento" subtitle="CIs ativas"
                  value={isLoading ? '…' : abertas.length}
                  icon={Clock} accent={cover.kpiAccent} tone="blue"
                  customTone={cover.kpiCustomTones?.blue}
                />
                <KpiCard
                  to="/unigops/ci/consulta"
                  label="Finalizadas" subtitle="este mês"
                  value={isLoading ? '…' : finalizadasMes.length}
                  icon={CheckCircle2} accent={cover.kpiAccent} tone="emerald"
                  customTone={cover.kpiCustomTones?.emerald}
                />
                <KpiCard
                  to="/unigops/ci/consulta"
                  label="Aguardando" subtitle="aprovações"
                  value={isLoading ? '…' : aguardando.length}
                  icon={Hourglass} accent={cover.kpiAccent} tone="orange"
                  customTone={cover.kpiCustomTones?.orange}
                />
                <KpiCard
                  to="/unigops/ci/consulta"
                  label="Total de CIs" subtitle="este mês"
                  value={isLoading ? '…' : totalMes.length}
                  icon={ClipboardList} accent={cover.kpiAccent} tone="violet"
                  customTone={cover.kpiCustomTones?.violet}
                />
              </div>
            </TooltipProvider>
          </div>
        </div>
      </CoverBanner>

      <CoverEditor open={coverEditorOpen} onOpenChange={setCoverEditorOpen} />

      {/* ABRIR NOVA REQUISIÇÃO + ANTES DE ABRIR */}
      <section className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 rounded-2xl border-slate-200/80 shadow-sm p-6">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-slate-900">Abrir uma nova requisição</h2>
            <p className="text-sm text-slate-500">Escolha a melhor forma para criar sua requisição de compra.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <ActionCard
              to="/unigops/ci/formulario"
              icon={<FileText className="h-6 w-6" />}
              title="Formulário manual"
              desc="Preencha os campos do formulário e detalhe sua solicitação."
              linkText="Preencher formulário"
              badge="RECOMENDADO"
              color="emerald"
            />
            <ActionCard
              to="/unigops/ci/chatbot"
              icon={<Bot className="h-6 w-6" />}
              title="Assistente por chatbot"
              desc="Converse com o assistente virtual e crie sua CI de forma guiada."
              linkText="Iniciar conversa"
              color="blue"
            />
            <ActionCard
              to="/unigops/ci/consulta"
              icon={<Copy className="h-6 w-6" />}
              title="Duplicar CI anterior"
              desc="Use como base uma CI já finalizada e ganhe tempo."
              linkText="Escolher CI anterior"
              color="violet"
            />
          </div>
        </Card>

        <Card className="rounded-2xl border-blue-200/60 bg-blue-50/40 shadow-sm p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Antes de abrir sua CI</h3>
              <p className="text-xs text-slate-500">Tenha em mãos as informações abaixo:</p>
            </div>
          </div>
          <ul className="space-y-2.5 text-[13px]">
            {[
              'Descrição detalhada do item ou serviço',
              'Justificativa e objetivo da solicitação',
              'Quantidade estimada',
              'Centro de custo (se aplicável)',
              'Anexos ou documentos relevantes',
            ].map((t) => (
              <li key={t} className="flex items-start gap-2 text-slate-700">
                <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 pt-4 border-t border-blue-200/60 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-blue-700">Sabia que…</p>
            <ul className="space-y-1.5 text-[12.5px] text-slate-700">
              <li className="flex items-start gap-2"><Upload className="h-3.5 w-3.5 text-blue-600 mt-0.5 shrink-0" /><span>Você pode cadastrar <strong>vários itens de uma só vez</strong> via importação em lote (CSV/TXT).</span></li>
              <li className="flex items-start gap-2"><ClipboardList className="h-3.5 w-3.5 text-blue-600 mt-0.5 shrink-0" /><span>Use <strong>modelos prontos</strong> para acelerar requisições recorrentes.</span></li>
            </ul>
          </div>
          <Link
            to="/unigops/ci/base-conhecimento"
            className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:underline"
          >
            <BookOpen className="h-4 w-4" /> Ver mais dicas na Base de Conhecimento
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Card>
      </section>

      {/* STATUS DAS REQUISIÇÕES + ÚLTIMAS CIS */}
      <section className="grid lg:grid-cols-2 gap-5">
        <Card className="rounded-2xl border-slate-200/80 shadow-sm p-6">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-slate-900">Status das requisições</h2>
            <p className="text-sm text-slate-500">Acompanhe o fluxo padrão de uma CI.</p>
          </div>
          <div className="flex items-start justify-between gap-1">
            {STEPS.map((s, i) => (
              <div key={s.n} className="flex-1 flex flex-col items-center text-center relative">
                <div className={cn(
                  'h-11 w-11 rounded-full flex items-center justify-center font-bold text-sm border-2 z-10 bg-white',
                  i === 0
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200'
                    : 'text-slate-400 border-slate-200',
                )}>
                  {i === 0 ? <FileSignature className="h-5 w-5" /> : s.n}
                </div>
                {i < STEPS.length - 1 && (
                  <div className="absolute top-[22px] left-1/2 right-0 -translate-y-1/2 w-full h-px border-t-2 border-dotted border-slate-200" />
                )}
                <div className={cn(
                  'mt-3 text-xs font-semibold',
                  i === 0 ? 'text-blue-700' : 'text-slate-700',
                )}>
                  {s.label}
                </div>
                <div className="text-[10.5px] text-slate-500 mt-1 leading-tight max-w-[110px]">
                  {s.desc}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Últimas CIs</h2>
            </div>
            <Link to="/unigops/ci/consulta" className="text-xs font-semibold text-blue-700 hover:underline inline-flex items-center gap-1">
              Ver todas <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : recentes.length === 0 ? (
            <div className="text-center py-8">
              <ListChecks className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500 mb-3">Você ainda não abriu nenhuma CI.</p>
              <Link to="/unigops/ci/chatbot">
                <Button size="sm"><Plus className="h-4 w-4 mr-1.5" /> Abrir minha primeira CI</Button>
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentes.map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/dashboard/ci/${c.id}`}
                    className="flex items-center gap-3 py-3 group hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors"
                  >
                    <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-[11px] text-blue-700">{c.protocol}</div>
                      <div className="text-sm text-slate-900 truncate group-hover:text-blue-700">
                        {c.subject}
                      </div>
                    </div>
                    <CIStatusBadge status={c.status} className="text-[10px]" />
                    <div className="text-[11px] text-slate-500 w-20 text-right tabular-nums hidden sm:block">
                      {new Date(c.created_at).toLocaleDateString('pt-BR')}
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}







function ActionCard({
  to, icon, title, desc, linkText, badge, color,
}: {
  to: string; icon: React.ReactNode; title: string; desc: string;
  linkText: string; badge?: string; color: 'blue' | 'emerald' | 'violet';
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white',
    emerald: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white',
    violet: 'bg-violet-50 text-violet-600 group-hover:bg-violet-600 group-hover:text-white',
  } as const;
  return (
    <Link
      to={to}
      className="group relative block rounded-2xl border border-slate-200/80 bg-white p-5 hover:shadow-lg hover:border-blue-300 hover:-translate-y-0.5 transition-all duration-300"
    >
      {badge && (
        <span className="absolute top-3 right-3 px-2 py-0.5 bg-blue-600 text-white text-[9px] font-bold uppercase tracking-wider rounded-full">
          {badge}
        </span>
      )}
      <div className={cn('h-12 w-12 rounded-2xl flex items-center justify-center mb-4 transition-colors', colors[color])}>
        {icon}
      </div>
      <h3 className="text-[15px] font-bold text-slate-900 mb-1">{title}</h3>
      <p className="text-xs text-slate-500 leading-relaxed mb-3">{desc}</p>
      <div className="flex items-center gap-1 text-xs font-semibold text-blue-700">
        {linkText} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
