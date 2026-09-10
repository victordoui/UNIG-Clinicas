import { useQuery } from '@tanstack/react-query';
import { Activity, CalendarDays, ClipboardList, FileText, FlaskConical, PawPrint, ShieldCheck, Stethoscope, Users, ArrowRight, Clock3 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { UnigRole } from '@/lib/unigRoles';

const ROLE_LABELS: Record<UnigRole, string> = {
  super_admin: 'Super Admin', administrador: 'Administração', gestor_unidade: 'Gestão da clínica', professor: 'Profissional clínico',
  coordenacao: 'Supervisão acadêmica', aluno: 'Estudante', atendimento: 'Recepção', financeiro: 'Auditoria', operador_espacos: 'Equipe clínica', secretaria: 'Equipe clínica', visitante: 'Acesso limitado',
};

const ROLE_DESCRIPTIONS: Record<UnigRole, string> = {
  super_admin: 'Visão geral da operação e dos controles institucionais.', administrador: 'Acompanhe a operação e mantenha a configuração da organização.', gestor_unidade: 'Acompanhe a capacidade, agenda e indicadores da sua clínica.', professor: 'Conduza atendimentos e acompanhe procedimentos dos pacientes.', coordenacao: 'Acompanhe supervisões, avaliações e a jornada acadêmica clínica.', aluno: 'Consulte sua agenda de prática e registre atividades supervisionadas.', atendimento: 'Organize a chegada dos pacientes, agenda e fila de atendimento.', financeiro: 'Consulte indicadores e a trilha de auditoria da operação.', operador_espacos: 'Acompanhe a operação clínica e os horários disponíveis.', secretaria: 'Apoie a operação das clínicas e o atendimento aos pacientes.', visitante: 'Seu acesso aguarda a atribuição de um papel institucional.',
};

async function loadSummary() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
  const [patients, appointments, queue, encounters, procedures, exams, supervisions] = await Promise.all([
    supabase.from('patients').select('id', { count: 'exact', head: true }),
    supabase.from('appointments').select('id', { count: 'exact', head: true }).gte('scheduled_at', startOfDay).lt('scheduled_at', endOfDay),
    supabase.from('queue_tickets').select('id', { count: 'exact', head: true }).eq('status', 'waiting'),
    supabase.from('encounters').select('id', { count: 'exact', head: true }).eq('status', 'in_progress'),
    supabase.from('clinical_procedures').select('id', { count: 'exact', head: true }).eq('status', 'planned'),
    supabase.from('exam_orders').select('id', { count: 'exact', head: true }).in('status', ['requested', 'collected']),
    supabase.from('student_supervisions').select('id', { count: 'exact', head: true }).in('status', ['planned', 'in_progress']),
  ]);
  return {
    patients: patients.count ?? 0, appointments: appointments.count ?? 0, queue: queue.count ?? 0, encounters: encounters.count ?? 0,
    procedures: procedures.count ?? 0, exams: exams.count ?? 0, supervisions: supervisions.count ?? 0,
    errors: [patients, appointments, queue, encounters, procedures, exams, supervisions].filter((item) => item.error).length,
  };
}

const actions = [
  { title: 'Pacientes', description: 'Cadastros e prontuários', icon: Users, to: '/pacientes' },
  { title: 'Agenda e fila', description: 'Consultas e chegada', icon: CalendarDays, to: '/agenda-fila' },
  { title: 'Atendimentos', description: 'Evoluções clínicas', icon: Stethoscope, to: '/atendimentos' },
  { title: 'Supervisões', description: 'Acompanhamento acadêmico', icon: ShieldCheck, to: '/supervisoes' },
  { title: 'Veterinária', description: 'Animais e tutores', icon: PawPrint, to: '/veterinaria' },
  { title: 'Procedimentos e exames', description: 'Condutas e solicitações', icon: FlaskConical, to: '/procedimentos-exames' },
];

export default function Index() {
  const { unigRole, profile } = useAuth();
  const summary = useQuery({ queryKey: ['unig-clinicas-summary'], queryFn: loadSummary, staleTime: 30_000 });
  const label = ROLE_LABELS[unigRole] ?? ROLE_LABELS.visitante;
  const description = ROLE_DESCRIPTIONS[unigRole] ?? ROLE_DESCRIPTIONS.visitante;
  const firstName = profile?.full_name?.split(' ')[0] ?? 'equipe';
  const metrics = [
    { label: 'Pacientes ativos', value: summary.data?.patients ?? '—', icon: Users, to: '/pacientes' },
    { label: 'Agenda de hoje', value: summary.data?.appointments ?? '—', icon: CalendarDays, to: '/agenda-fila' },
    { label: 'Aguardando na fila', value: summary.data?.queue ?? '—', icon: Clock3, to: '/agenda-fila' },
    { label: 'Em atendimento', value: summary.data?.encounters ?? '—', icon: Activity, to: '/atendimentos' },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <section className="rounded-2xl bg-gradient-to-br from-primary-900 via-primary-700 to-primary-500 p-6 text-white shadow-sm md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3"><Badge className="border-white/20 bg-white/15 text-white hover:bg-white/20">{label}</Badge><div><h1 className="text-2xl font-bold md:text-3xl">Olá, {firstName}.</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/85">{description}</p></div></div>
            <Button asChild variant="secondary" className="w-fit bg-white text-primary-900 hover:bg-white/90"><a href="/indicadores-clinicos">Ver indicadores <ArrowRight className="ml-2 h-4 w-4" /></a></Button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => <a key={metric.label} href={metric.to} className="group"><Card className="h-full transition-colors group-hover:border-primary/40"><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">{metric.label}</p><p className="mt-1 text-3xl font-bold text-foreground">{metric.value}</p></div><div className="rounded-xl bg-primary/10 p-3 text-primary"><metric.icon className="h-5 w-5" /></div></CardContent></Card></a>)}
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
          <Card><CardHeader><CardTitle>Módulos clínicos</CardTitle><CardDescription>Acesse rapidamente as áreas do UNIG Clínicas.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2">{actions.map((action) => <a key={action.to} href={action.to} className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:border-primary/40 hover:bg-primary/5"><div className="rounded-lg bg-primary/10 p-2 text-primary"><action.icon className="h-4 w-4" /></div><div className="min-w-0"><p className="truncate text-sm font-semibold">{action.title}</p><p className="truncate text-xs text-muted-foreground">{action.description}</p></div><ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" /></a>)}</CardContent></Card>
          <Card><CardHeader><CardTitle>Resumo operacional</CardTitle><CardDescription>Dados atualizados do ambiente.</CardDescription></CardHeader><CardContent className="space-y-3 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Procedimentos planejados</span><span className="font-semibold">{summary.data?.procedures ?? '—'}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Exames solicitados</span><span className="font-semibold">{summary.data?.exams ?? '—'}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Supervisões ativas</span><span className="font-semibold">{summary.data?.supervisions ?? '—'}</span></div>{summary.data?.errors ? <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Alguns indicadores estão limitados pelo escopo do seu perfil.</p> : null}{summary.isLoading ? <p className="text-xs text-muted-foreground">Carregando indicadores…</p> : null}</CardContent></Card>
        </section>

        <Card className="border-primary/15 bg-primary/5"><CardContent className="flex gap-3 p-4 text-sm"><ClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><p className="text-muted-foreground"><span className="font-semibold text-foreground">Próximo passo:</span> use os acessos rápidos da tela de entrada para validar o sistema com cada papel institucional.</p><FileText className="ml-auto hidden h-5 w-5 text-primary/70 sm:block" /></CardContent></Card>
      </div>
    </MainLayout>
  );
}
