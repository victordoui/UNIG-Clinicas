import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Monitor,
  Play,
  Radio,
  Sparkles,
  UserRound,
  UsersRound,
  Volume2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReceptionAttendanceDrawer, type ReceptionDraft } from "@/components/reception/ReceptionAttendanceDrawer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { canRecallReceptionTicket, formatQueueTicketCode, formatReceptionClinicLabel, getActiveReceptionClinicId } from "@/lib/queueReception";

type Ticket = { id?: string; code: string; patient: string; wait: number; status?: string };
type QueueStatus = "open" | "paused" | "closing" | "closed" | null;
const RECEPTION_SERVICE_POINT = "Recepção · PC 05";

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
};

export default function RecepcaoOperacional() {
  const { activeClinicCode, user } = useAuth();
  const navigate = useNavigate();
  const clinicLabel = formatReceptionClinicLabel(activeClinicCode);
  const [queueOpen, setQueueOpen] = useState(false);
  const [queueStatus, setQueueStatus] = useState<QueueStatus>(null);
  const [queue, setQueue] = useState<Ticket[]>([]);
  const [current, setCurrent] = useState<Ticket | null>(null);
  const [serviceStarted, setServiceStarted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [serviceStartedAt, setServiceStartedAt] = useState<number | null>(null);
  const [lastCall, setLastCall] = useState("");
  const [announcement, setAnnouncement] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [receptionSessionId, setReceptionSessionId] = useState<string | null>(null);
  const [usingRemoteQueue, setUsingRemoteQueue] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    if (!serviceStarted || !current) return;
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [serviceStarted, current]);

  useEffect(() => {
    if (!announcement) return;
    const timer = window.setTimeout(() => setAnnouncement(false), 1800);
    return () => window.clearTimeout(timer);
  }, [announcement]);

  const loadRemoteQueue = async () => {
    if (!user || !activeClinicCode) return;
    // A recepção tem acesso à fila, mas não precisa (nem deve precisar) da
    // permissão ampla clinic.read. O escopo ativo já é carregado no login.
    const { data: scopes, error: scopeError } = await supabase
      .from("user_clinic_scopes")
      .select("clinic_id,clinic:clinics(code)")
      .is("revoked_at", null);
    const clinicId = getActiveReceptionClinicId(scopes, activeClinicCode);
    if (scopeError || !clinicId) return;
    // Uma conta autenticada com escopo válido sempre deve ver o estado remoto,
    // inclusive quando ainda não há sessão de fila nem senhas emitidas.
    setUsingRemoteQueue(true);
    const { data: queueSession, error: sessionError } = await supabase
      .from("queue_sessions")
      .select("id,status")
      .eq("clinic_id", clinicId)
      .in("status", ["open", "paused", "closing"])
      .order("opened_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (sessionError) return;
    if (!queueSession) {
      setQueueOpen(false);
      setQueueStatus(null);
      setQueue([]);
      setCurrent(null);
      setReceptionSessionId(null);
      setServiceStarted(false);
      setServiceStartedAt(null);
      return;
    }
    const { data: tickets, error: ticketError } = await supabase
      .from("queue_tickets")
      .select("id,ticket_number,ticket_code,status,created_at,patient:patients(person:persons(full_name))")
      .eq("queue_session_id", queueSession.id)
      .in("status", ["waiting", "called", "checked_in", "in_service"])
      .order("ticket_number");
    if (ticketError) return;
    const mapped = (tickets ?? []).map((ticket: any) => ({
      id: ticket.id,
      code: ticket.ticket_code ?? formatQueueTicketCode(activeClinicCode, ticket.ticket_number),
      patient: ticket.patient?.person?.full_name ?? "Paciente",
      wait: Math.max(0, Math.round((Date.now() - new Date(ticket.created_at).getTime()) / 60_000)),
      status: ticket.status,
    }));
    const { data: activeReception, error: receptionError } = await supabase
      .from("reception_sessions")
      .select("id,queue_ticket_id,started_at")
      .eq("clinic_id", clinicId)
      .is("ended_at", null)
      .maybeSingle();
    const receptionTicket = !receptionError && activeReception
      ? mapped.find((ticket: Ticket) => ticket.id === activeReception.queue_ticket_id)
      : undefined;
    const active = receptionTicket ?? mapped.find((ticket: any) => ["called", "checked_in", "in_service"].includes(ticket.status));
    setQueueOpen(queueSession.status === "open");
    setQueueStatus(queueSession.status as QueueStatus);
    setQueue(mapped.filter((ticket: any) => ticket.status === "waiting"));
    if (active) {
      setCurrent(active);
      setLastCall(active.code);
      setServiceStarted(Boolean(receptionTicket));
      setReceptionSessionId(activeReception?.id ?? null);
      setServiceStartedAt(activeReception?.started_at ? new Date(activeReception.started_at).getTime() : null);
    } else {
      setCurrent(null);
      setReceptionSessionId(null);
      setServiceStarted(false);
      setServiceStartedAt(null);
    }
  };

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    void (async () => {
      await loadRemoteQueue();
      if (!user || !activeClinicCode || cancelled) return;
      const { data: scopes } = await supabase
        .from("user_clinic_scopes")
        .select("clinic_id,clinic:clinics(code)")
        .is("revoked_at", null);
      const clinicId = getActiveReceptionClinicId(scopes, activeClinicCode);
      if (!clinicId || cancelled) return;
      channel = supabase.channel(`reception-queue-${clinicId}`)
        .on("postgres_changes", {
          event: "INSERT", schema: "public", table: "queue_events",
          filter: `clinic_id=eq.${clinicId}`,
        }, () => void loadRemoteQueue())
        .subscribe();
    })();
    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [user?.id, activeClinicCode]);

  const next = queue[0];
  const calledTotal = 12 - queue.length;
  const averageWait = useMemo(
    () => (queue.length ? Math.round(queue.reduce((sum, item) => sum + item.wait, 0) / queue.length) : 0),
    [queue],
  );

  const advanceQueue = () => {
    if (!next || !queueOpen) return;
    const time = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    if (current) {
      setHistory((items) => [`${time}  Atendimento ${current.code} finalizado`, ...items].slice(0, 4));
    }
    setCurrent(next);
    setQueue((items) => items.slice(1));
    setLastCall(next.code);
    setElapsed(0);
    setServiceStarted(false);
    setServiceStartedAt(null);
    setAnnouncement(true);
    setHistory((items) => [`${time}  ${next.code} chamado no painel da TV`, ...items].slice(0, 4));
  };

  const callNext = async () => {
    if (serviceStarted) {
      setDrawerOpen(true);
      return;
    }
    if (usingRemoteQueue) {
      if (current) {
        toast({ title: "Há uma senha em chamada", description: "Inicie ou rechame a senha atual antes de chamar outra.", variant: "destructive" });
        return;
      }
      if (!next?.id) {
        toast({ title: "Não há próxima senha para chamar", variant: "destructive" });
        return;
      }
      const { error } = await supabase.rpc("transition_queue_ticket", {
        target_ticket_id: next.id,
        target_status: "called",
        target_service_box: RECEPTION_SERVICE_POINT,
      });
      if (error) {
        toast({ title: "Não foi possível chamar a próxima senha", description: error.message, variant: "destructive" });
        return;
      }
      await loadRemoteQueue();
      return;
    }
    advanceQueue();
  };

  const recallCurrent = async () => {
    if (!current) return;
    if (usingRemoteQueue && (!current.id || !canRecallReceptionTicket(current.status))) {
      toast({ title: "Esta senha não pode ser chamada novamente", description: "Apenas senhas chamadas, em check-in ou em atendimento podem ser repetidas.", variant: "destructive" });
      return;
    }
    if (usingRemoteQueue && current.id) {
      const { error } = await supabase.rpc("recall_reception_ticket", { target_ticket_id: current.id });
      if (error) {
        toast({ title: "Não foi possível repetir o chamado", description: error.message, variant: "destructive" });
        return;
      }
    }
    const time = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    setLastCall(current.code);
    setAnnouncement(true);
    setHistory((items) => [`${time}  ${current.code} chamado novamente no painel da TV`, ...items].slice(0, 4));
    toast({ title: `Senha ${current.code} chamada novamente` });
  };

  const startAttendance = async () => {
    if (!current || serviceStarted) return;
    if (usingRemoteQueue && current.id) {
      const { data, error } = await supabase.rpc("start_reception_session", {
        target_ticket_id: current.id,
        target_workstation_id: "PC 05",
      });
      if (error) {
        toast({ title: "Não foi possível iniciar o atendimento", description: error.message, variant: "destructive" });
        return;
      }
      setReceptionSessionId(data?.id ?? null);
    }
    setServiceStarted(true);
    setElapsed(0);
    setServiceStartedAt(Date.now());
    setDrawerOpen(true);
    setHistory((items) => [`${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}  Atendimento ${current.code} iniciado por Gisele`, ...items].slice(0, 4));
  };

  const saveAttendance = async (draft: ReceptionDraft) => {
    if (usingRemoteQueue && receptionSessionId) {
      const { error } = await supabase.rpc("save_reception_session", {
        target_session_id: receptionSessionId, target_reason: draft.reason, target_observation: draft.notes,
        target_tags: draft.tags, target_destination: draft.destination, target_call_next: draft.callNext,
      });
      if (error) throw error;
    }
    setHistory((items) => [`${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}  Andamento de ${current?.code} salvo`, ...items].slice(0, 4));
  };

  const finishAttendance = async (draft: ReceptionDraft) => {
    if (!current) return;
    if (usingRemoteQueue && receptionSessionId) {
      const { error } = await supabase.rpc("finish_reception_session", {
        target_session_id: receptionSessionId, target_reason: draft.reason, target_observation: draft.notes,
        target_tags: draft.tags, target_destination: draft.destination, target_call_next: draft.callNext,
      });
      if (error) throw error;
    }
    const finished = current;
    setServiceStarted(false);
    setDrawerOpen(false);
    setHistory((items) => [`${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}  ${finished.code} encaminhado para ${draft.destination}`, ...items].slice(0, 4));
    if (usingRemoteQueue) { setReceptionSessionId(null); await loadRemoteQueue(); }
    else if (draft.callNext) advanceQueue();
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-[1500px] space-y-5 pb-8">
        <header className="flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-[#004d48] via-[#00685f] to-[#004d48] px-4 py-5 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/15"><Radio className="h-6 w-6" /></div>
            <div>
              <p className="text-sm font-semibold text-emerald-100">UNIG Clínicas · Operação em tempo real</p>
              <h1 className="text-xl font-black tracking-tight sm:text-2xl">Recepção · {clinicLabel}</h1>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Monitor className="h-5 w-5 text-emerald-200" />
            <span><strong>Computador 05</strong><br /><span className="text-emerald-100">Gisele · Recepção</span></span>
            <Badge className="border-0 bg-white/15 px-3 py-1.5 text-white hover:bg-white/15">PC 05</Badge>
          </div>
        </header>

        <section className="grid gap-4 xl:grid-cols-[1.55fr_repeat(4,0.62fr)]">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3"><span className={`h-3 w-3 rounded-full ${queueOpen ? "bg-emerald-500 shadow-[0_0_0_5px_rgba(16,185,129,.14)]" : "bg-slate-400"}`} /><div><h2 className="font-bold text-slate-900">{queueOpen ? "Fila aberta" : queueStatus === "closing" ? "Fila em encerramento" : queueStatus === "paused" ? "Fila pausada" : "Fila fechada"}</h2><p className="text-sm text-slate-600">{queueOpen ? "Fila compartilhada com os demais acessos desta clínica" : "A abertura e a gestão da fila são feitas na página Fila."}</p></div></div>
              <Button onClick={() => navigate("/fila")} variant={queueOpen ? "outline" : "default"} className={queueOpen ? "min-h-11 border-emerald-300 text-emerald-800 hover:bg-emerald-100" : "min-h-11 bg-emerald-700 hover:bg-emerald-800"}>Ver fila<ArrowRight className="ml-2 h-4 w-4" /></Button>
            </div>
          </div>
          <Metric icon={<UsersRound />} label="Aguardando" value={queue.length} />
          <Metric icon={<UserRound />} label="Em recepção" value={current ? 1 : 0} />
          <Metric icon={<Volume2 />} label="Chamados" value={calledTotal} />
          <Metric icon={<CheckCircle2 />} label="Concluídos" value={18} />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.55fr_0.95fr]">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-start justify-between"><div><p className="text-sm font-semibold text-emerald-700">ATENDIMENTO NA RECEPÇÃO</p><h2 className="text-xl font-bold text-slate-900">Paciente atual</h2></div><Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">{serviceStarted ? "Cronômetro ativo" : "Aguardando início"}</Badge></div>
            {current ? (
              <>
                <div className="grid gap-4 md:grid-cols-[1.25fr_0.75fr]">
                  <div className="rounded-xl bg-slate-50 p-5"><p className="text-sm font-semibold text-slate-500">SENHA</p><div className="mt-1 flex flex-col items-start gap-2 sm:flex-row sm:items-end sm:gap-4"><strong className="text-5xl font-black tracking-tight text-[#005d55]">{current.code}</strong><span className="text-xl font-bold text-slate-900 sm:mb-1 sm:border-l sm:pl-4">{current.patient}</span></div><p className="mt-3 text-sm text-slate-500">{current.wait ? `Aguardando há ${current.wait} min` : "Senha em atendimento"}</p></div>
                  <div className="rounded-xl bg-emerald-50 p-5"><div className="flex items-center gap-2 text-sm font-semibold text-emerald-800"><Clock3 className="h-5 w-5" /> TEMPO DE ATENDIMENTO</div><p className="mt-2 text-5xl font-black tracking-tight text-[#005d55]">{formatTime(elapsed)}</p><p className="mt-2 text-sm text-emerald-800">{serviceStarted ? "Em atendimento" : "Paciente chamado; aguarde a chegada"}</p></div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3"><Button onClick={startAttendance} disabled={serviceStarted} variant="outline" className="min-h-11 border-emerald-200 text-emerald-800 sm:min-h-16"><Play className="mr-2 h-5 w-5" />Iniciar atendimento</Button><Button onClick={() => setDrawerOpen(true)} disabled={!serviceStarted} variant="outline" className="min-h-11 border-emerald-200 text-emerald-800 sm:min-h-16"><CheckCircle2 className="mr-2 h-5 w-5" />Abrir atendimento</Button><Button onClick={recallCurrent} variant="outline" className="min-h-11 border-amber-300 text-amber-900 hover:bg-amber-50 sm:min-h-16"><Volume2 className="mr-2 h-5 w-5" />Chamar novamente</Button></div>
              </>
            ) : (
              <div className="grid min-h-48 place-items-center rounded-xl bg-slate-50 p-6 text-center text-slate-500"><div><p>Nenhum paciente em atendimento.</p><p className="mt-1 text-sm">{next ? `A senha ${next.code} está pronta para ser chamada.` : "Não há senha aguardando na fila."}</p></div></div>
            )}
            <div className="sticky bottom-0 z-20 -mx-2 mt-4 bg-white/95 px-2 py-3 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:py-0"><Button onClick={() => void callNext()} disabled={!next || !queueOpen || (usingRemoteQueue && Boolean(current))} className="min-h-11 w-full bg-[#006d62] text-base hover:bg-[#00574f] sm:min-h-16"><BellRing className="mr-2 h-5 w-5" />Chamar próximo</Button>{!next && <p className="mt-2 text-center text-sm text-slate-500">Gere uma nova senha na fila para habilitar o chamado.</p>}</div>
            <p className="mt-4 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800"><Volume2 className="h-4 w-4" />Ao chamar o próximo, o painel anuncia a senha com som e atualiza automaticamente.</p>
          </div>

          <aside className={`overflow-hidden rounded-2xl border bg-[#004d48] p-5 text-white shadow-sm transition ${announcement ? "ring-4 ring-amber-300" : ""}`}>
            <div className="flex items-center justify-between"><div className="flex items-center gap-2 font-bold"><Monitor className="h-5 w-5" />Painel da TV</div><span className="flex items-center gap-1 text-xs text-emerald-200"><span className="h-2 w-2 rounded-full bg-emerald-300" />Sincronizado</span></div>
            <p className="mt-1 text-sm text-emerald-100">Prévia ao vivo do que o público vê</p>
            <div className="mt-5 rounded-xl border border-white/15 bg-[#003e3a] p-5"><p className="text-xs font-bold tracking-[.2em] text-emerald-200">UNIG CLÍNICAS · {activeClinicCode?.trim().toUpperCase() ?? "SEM CLÍNICA"}</p><div className="my-7 grid grid-cols-2 divide-x divide-white/20"><div><p className="text-sm text-emerald-100">Senha atual</p><strong className="text-5xl font-black">{lastCall}</strong></div><div className="pl-5"><p className="text-sm text-emerald-100">Próxima</p><strong className="text-5xl font-black">{next?.code ?? "—"}</strong></div></div><div className="flex items-center gap-2 rounded-lg bg-emerald-500/20 px-3 py-2 text-sm text-emerald-100"><Volume2 className={`h-5 w-5 ${announcement ? "animate-pulse text-amber-200" : ""}`} />{announcement ? `Chamando ${lastCall}…` : "Anúncio sonoro ativo"}</div></div>
          </aside>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-emerald-700">FILA DE ESPERA</p><h2 className="text-xl font-bold">Próximos pacientes</h2></div><span className="text-sm text-slate-500">Média: {averageWait || "—"} min</span></div><div className="mt-4 divide-y rounded-xl border">{queue.map((ticket, index) => <div key={ticket.code} className={`grid grid-cols-[auto_auto_1fr_auto] items-center gap-x-3 gap-y-1 px-4 py-3 ${index === 0 ? "bg-amber-50" : ""}`}><span className="row-span-2 grid h-7 w-7 place-items-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-800">{index + 1}</span><strong className="text-[#005d55]">{ticket.code}</strong><span className="truncate font-medium">{ticket.patient}</span><span className="row-span-2 text-sm text-slate-500">{ticket.wait} min</span><span className="col-start-2 text-xs text-slate-500">Aguardando</span>{index === 0 && <ChevronRight className="col-start-3 row-start-2 h-5 w-5 justify-self-end text-emerald-700" />}</div>)}{!queue.length && <p className="p-5 text-center text-slate-500">Não há senhas aguardando.</p>}</div></div>
          <div className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-emerald-700" /><div><p className="text-sm font-semibold text-emerald-700">ATIVIDADE RECENTE</p><h2 className="text-xl font-bold">Rastreabilidade da recepção</h2></div></div><ol className="mt-5 space-y-4">{history.map((item, index) => <li key={`${item}-${index}`} className="flex gap-3 text-sm text-slate-700"><span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />{item}</li>)}</ol></div>
        </section>
      </div>
      <ReceptionAttendanceDrawer open={drawerOpen} ticket={current} startedAt={serviceStarted ? serviceStartedAt : null} clinicLabel={clinicLabel} onOpenChange={setDrawerOpen} onSave={saveAttendance} onFinish={finishAttendance} />
    </MainLayout>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return <div className="rounded-2xl border bg-white p-4 shadow-sm"><div className="flex items-center gap-2 text-sm text-slate-500"><span className="text-emerald-700">{icon}</span>{label}</div><p className="mt-2 text-3xl font-black text-slate-900">{value}</p></div>;
}
