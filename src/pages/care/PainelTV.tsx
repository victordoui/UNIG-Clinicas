import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, ArrowLeft, Clock3, MonitorPlay, RefreshCw, Ticket, Users } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import unigSymbol from '@/assets/unig-clinicas-symbol.png';

type Clinic = { id: string; name: string; code: string };
type QueueSession = { id: string; clinic_id: string; service_date: string; status: string; clinic?: { name: string; code: string } | null };
type QueueTicket = { id: string; queue_session_id: string; ticket_number: number; priority: string; status: string; called_at: string | null };

const TODAY = new Date().toLocaleDateString('en-CA');
const STATUS_LABEL: Record<string, string> = { waiting: 'Aguardando', called: 'Chamado', in_service: 'Em atendimento' };
const PRIORITY_LABEL: Record<string, string> = { normal: 'Normal', priority: 'Prioridade', urgent: 'Urgente' };

export default function PainelTV() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [clinicId, setClinicId] = useState(searchParams.get('clinic') ?? '');
  const { data, isLoading, error, dataUpdatedAt } = useQuery({
    queryKey: ['queue-tv', TODAY],
    refetchInterval: 5000,
    queryFn: async () => {
      const [clinics, sessions, tickets] = await Promise.all([
        supabase.from('clinics').select('id,name,code').eq('is_active', true).order('name'),
        supabase.from('queue_sessions').select('id,clinic_id,service_date,status,clinic:clinics(name,code)').eq('service_date', TODAY).in('status', ['open', 'paused']),
        supabase.from('queue_tickets').select('id,queue_session_id,ticket_number,priority,status,called_at').in('status', ['waiting', 'called', 'in_service']).order('created_at', { ascending: true }).limit(100),
      ]);
      for (const result of [clinics, sessions, tickets]) if (result.error) throw result.error;
      return { clinics: (clinics.data ?? []) as Clinic[], sessions: (sessions.data ?? []) as QueueSession[], tickets: (tickets.data ?? []) as QueueTicket[] };
    },
  });

  const clinics = data?.clinics ?? [];
  const selectedClinicId = clinicId && clinics.some((clinic) => clinic.id === clinicId) ? clinicId : clinics[0]?.id ?? '';
  const selectedClinic = clinics.find((clinic) => clinic.id === selectedClinicId);
  const sessions = useMemo(() => data?.sessions.filter((session) => session.clinic_id === selectedClinicId) ?? [], [data?.sessions, selectedClinicId]);
  const sessionIds = useMemo(() => new Set(sessions.map((session) => session.id)), [sessions]);
  const tickets = useMemo(() => (data?.tickets ?? []).filter((ticket) => sessionIds.has(ticket.queue_session_id)), [data?.tickets, sessionIds]);
  const current = tickets.filter((ticket) => ticket.status === 'called' || ticket.status === 'in_service').sort((a, b) => (b.called_at ?? '').localeCompare(a.called_at ?? ''))[0];
  const waiting = tickets.filter((ticket) => ticket.status === 'waiting').sort((a, b) => (a.priority === 'urgent' ? -1 : a.priority === 'priority' ? -1 : 0) - (b.priority === 'urgent' ? -1 : b.priority === 'priority' ? -1 : 0) || a.ticket_number - b.ticket_number);
  const updatedLabel = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';

  useEffect(() => { document.title = 'Painel TV · UNIG Clínicas'; return () => { document.title = 'UNIG Clínicas'; }; }, []);
  useEffect(() => {
    if (selectedClinicId && selectedClinicId !== searchParams.get('clinic')) setSearchParams({ clinic: selectedClinicId }, { replace: true });
  }, [selectedClinicId, searchParams, setSearchParams]);

  return (
    <main className="min-h-screen bg-[#01413D] px-4 py-5 text-white md:px-8 md:py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.08] p-5 shadow-2xl md:flex-row md:items-center md:justify-between md:p-6">
          <div className="flex items-center gap-4">
            <img src={unigSymbol} alt="UNIG Clínicas" className="h-14 w-14 rounded-2xl bg-white/95 p-1.5 shadow-lg" />
            <div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9fe9dc]">Painel de chamada</p><h1 className="mt-1 text-2xl font-extrabold md:text-3xl">UNIG Clínicas</h1><p className="mt-1 text-sm text-white/65">Acompanhe a fila sem expor informações clínicas.</p></div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedClinicId} onValueChange={(value) => setClinicId(value)}>
              <SelectTrigger className="w-[230px] border-white/20 bg-white/10 text-white"><SelectValue placeholder="Selecione a clínica" /></SelectTrigger>
              <SelectContent>{clinics.map((clinic) => <SelectItem key={clinic.id} value={clinic.id}>{clinic.name}</SelectItem>)}</SelectContent>
            </Select>
            <Button asChild variant="ghost" className="text-white hover:bg-white/10 hover:text-white"><Link to="/agenda-fila"><ArrowLeft className="mr-2 h-4 w-4" />Operar fila</Link></Button>
          </div>
        </header>

        {isLoading ? <div className="grid gap-4 md:grid-cols-2"><div className="h-52 animate-pulse rounded-3xl bg-white/10" /><div className="h-52 animate-pulse rounded-3xl bg-white/10" /></div> : error ? <div className="rounded-3xl border border-red-200/20 bg-red-500/15 p-8 text-center"><p className="font-semibold">Não foi possível carregar a fila desta clínica.</p><p className="mt-2 text-sm text-white/70">Verifique o acesso da conta e tente novamente.</p></div> : !selectedClinic ? <div className="rounded-3xl border border-white/10 bg-white/[0.08] p-10 text-center text-white/70">Nenhuma clínica disponível para este acesso.</div> : <>
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/[0.08] p-5 md:col-span-2 md:p-8"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#9fe9dc]">Agora</p><h2 className="mt-2 text-3xl font-extrabold md:text-5xl">{current ? `Senha ${current.ticket_number}` : 'Aguardando chamada'}</h2></div><div className="rounded-2xl bg-[#08A899]/25 p-4"><MonitorPlay className="h-8 w-8 text-[#9fe9dc]" /></div></div><p className="mt-5 text-lg text-white/70">{current ? STATUS_LABEL[current.status] : 'A equipe chamará a próxima senha em instantes.'}</p>{current && <Badge className="mt-4 border-white/20 bg-white/10 text-white">{PRIORITY_LABEL[current.priority] ?? current.priority}</Badge>}</div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-1"><div className="rounded-3xl border border-white/10 bg-white/[0.08] p-5"><div className="flex items-center gap-2 text-white/65"><Users className="h-4 w-4" />Aguardando</div><p className="mt-2 text-4xl font-extrabold">{waiting.length}</p></div><div className="rounded-3xl border border-white/10 bg-white/[0.08] p-5"><div className="flex items-center gap-2 text-white/65"><Activity className="h-4 w-4" />Fila</div><p className="mt-2 text-lg font-bold">{sessions.length ? (sessions[0].status === 'open' ? 'Aberta' : 'Pausada') : 'Fechada'}</p></div></div>
          </section>
          <section className="rounded-3xl border border-white/10 bg-white/[0.08] p-5 md:p-8"><div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#9fe9dc]">Próximas senhas</p><h2 className="mt-1 text-2xl font-bold">{selectedClinic.name}</h2></div><div className="flex items-center gap-2 text-xs text-white/55"><RefreshCw className="h-3.5 w-3.5" />Atualizado às {updatedLabel}</div></div>{waiting.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{waiting.slice(0, 12).map((ticket) => <div key={ticket.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-4"><span className="flex items-center gap-2 text-white/60"><Ticket className="h-4 w-4" />Senha</span><span className="text-2xl font-extrabold">{ticket.ticket_number}</span></div>)}</div> : <div className="mt-5 rounded-2xl border border-dashed border-white/15 p-8 text-center text-white/60"><Clock3 className="mx-auto h-7 w-7 text-[#9fe9dc]" /><p className="mt-3">Não há pacientes aguardando nesta fila.</p></div>}</section>
        </>}
        <footer className="text-center text-xs text-white/45">Painel vinculado à clínica selecionada · Atualização automática a cada 5 segundos</footer>
      </div>
    </main>
  );
}
