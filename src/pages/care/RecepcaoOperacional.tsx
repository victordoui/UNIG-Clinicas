import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
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
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Ticket = { code: string; patient: string; wait: number };

const initialQueue: Ticket[] = [
  { code: "O-013", patient: "João Lima", wait: 18 },
  { code: "O-014", patient: "Carla Menezes", wait: 11 },
  { code: "O-015", patient: "Rafael Souza", wait: 7 },
  { code: "O-016", patient: "Beatriz Alves", wait: 4 },
];
const SIMULATION_KEY = "unig-recepcao-simulacao";

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
};

export default function RecepcaoOperacional() {
  const [queueOpen, setQueueOpen] = useState(true);
  const [queue, setQueue] = useState(initialQueue);
  const [current, setCurrent] = useState<Ticket | null>({
    code: "O-012",
    patient: "Mariana Costa",
    wait: 0,
  });
  const [serviceStarted, setServiceStarted] = useState(true);
  const [elapsed, setElapsed] = useState(222);
  const [lastCall, setLastCall] = useState("O-012");
  const [announcement, setAnnouncement] = useState(false);
  const [history, setHistory] = useState([
    "08:01  Gisele abriu a fila",
    "08:07  Senha O-011 chamada",
    "08:08  Paciente compareceu à recepção",
    "08:09  Atendimento iniciado por Gisele",
  ]);

  useEffect(() => {
    const payload = {
      active: true,
      queueOpen,
      current: current ? Number(current.code.replace(/\D/g, "")) : null,
      queue: queue.map((item) => Number(item.code.replace(/\D/g, ""))),
      announced: Number(lastCall.replace(/\D/g, "")),
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(SIMULATION_KEY, JSON.stringify(payload));
  }, [current, lastCall, queue, queueOpen]);

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

  const next = queue[0];
  const calledTotal = 12 - queue.length;
  const averageWait = useMemo(
    () => (queue.length ? Math.round(queue.reduce((sum, item) => sum + item.wait, 0) / queue.length) : 0),
    [queue],
  );

  const callNext = () => {
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
    setAnnouncement(true);
    setHistory((items) => [`${time}  ${next.code} chamado no painel da TV`, ...items].slice(0, 4));
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-[1500px] space-y-5 pb-8">
        <header className="flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-[#004d48] via-[#00685f] to-[#004d48] px-6 py-5 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/15"><Radio className="h-6 w-6" /></div>
            <div>
              <p className="text-sm font-semibold text-emerald-100">UNIG Clínicas · Operação em tempo real</p>
              <h1 className="text-2xl font-black tracking-tight">Recepção · Clínica de Odontologia</h1>
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
              <div className="flex items-center gap-3"><span className={`h-3 w-3 rounded-full ${queueOpen ? "bg-emerald-500 shadow-[0_0_0_5px_rgba(16,185,129,.14)]" : "bg-slate-400"}`} /><div><h2 className="font-bold text-slate-900">{queueOpen ? "Fila aberta" : "Fila encerrada"}</h2><p className="text-sm text-slate-600">{queueOpen ? "Atendimento ao público disponível" : "Novas senhas temporariamente indisponíveis"}</p></div></div>
              <Button onClick={() => setQueueOpen((value) => !value)} variant={queueOpen ? "outline" : "default"} className={queueOpen ? "border-emerald-300 text-emerald-800 hover:bg-emerald-100" : "bg-emerald-700 hover:bg-emerald-800"}>{queueOpen ? "Encerrar fila" : "Abrir fila"}</Button>
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
            {current ? <><div className="grid gap-4 md:grid-cols-[1.25fr_0.75fr]"><div className="rounded-xl bg-slate-50 p-5"><p className="text-sm font-semibold text-slate-500">SENHA</p><div className="mt-1 flex items-end gap-4"><strong className="text-5xl font-black tracking-tight text-[#005d55]">{current.code}</strong><span className="mb-1 border-l pl-4 text-xl font-bold text-slate-900">{current.patient}</span></div><p className="mt-3 text-sm text-slate-500">Prontuário 102458 · Convênio UNIG</p></div><div className="rounded-xl bg-emerald-50 p-5"><div className="flex items-center gap-2 text-sm font-semibold text-emerald-800"><Clock3 className="h-5 w-5" /> TEMPO DE ATENDIMENTO</div><p className="mt-2 text-5xl font-black tracking-tight text-[#005d55]">{formatTime(elapsed)}</p><p className="mt-2 text-sm text-emerald-800">{serviceStarted ? "Em atendimento" : "Paciente chamado; aguarde a chegada"}</p></div></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3"><Button onClick={() => setServiceStarted(true)} disabled={serviceStarted} variant="outline" className="h-auto min-h-16 border-emerald-200 text-emerald-800"><Play className="mr-2 h-5 w-5" />Iniciar atendimento</Button><Button onClick={() => { setServiceStarted(false); setHistory((items) => [`${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}  Atendimento ${current.code} finalizado`, ...items].slice(0, 4)); }} disabled={!serviceStarted} variant="outline" className="h-auto min-h-16 border-emerald-200 text-emerald-800"><CheckCircle2 className="mr-2 h-5 w-5" />Finalizar</Button><Button onClick={callNext} disabled={!next || !queueOpen} className="h-auto min-h-16 bg-[#006d62] text-base hover:bg-[#00574f]"><BellRing className="mr-2 h-5 w-5" />Chamar próximo</Button></div></> : <div className="grid min-h-48 place-items-center rounded-xl bg-slate-50 text-slate-500">Nenhum paciente em atendimento.</div>}
            <p className="mt-4 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800"><Volume2 className="h-4 w-4" />Ao chamar o próximo, o painel anuncia a senha com som e atualiza automaticamente.</p>
          </div>

          <aside className={`overflow-hidden rounded-2xl border bg-[#004d48] p-5 text-white shadow-sm transition ${announcement ? "ring-4 ring-amber-300" : ""}`}>
            <div className="flex items-center justify-between"><div className="flex items-center gap-2 font-bold"><Monitor className="h-5 w-5" />Painel da TV</div><span className="flex items-center gap-1 text-xs text-emerald-200"><span className="h-2 w-2 rounded-full bg-emerald-300" />Sincronizado</span></div>
            <p className="mt-1 text-sm text-emerald-100">Prévia ao vivo do que o público vê</p>
            <div className="mt-5 rounded-xl border border-white/15 bg-[#003e3a] p-5"><p className="text-xs font-bold tracking-[.2em] text-emerald-200">UNIG CLÍNICAS · ODONTOLOGIA</p><div className="my-7 grid grid-cols-2 divide-x divide-white/20"><div><p className="text-sm text-emerald-100">Senha atual</p><strong className="text-5xl font-black">{lastCall}</strong></div><div className="pl-5"><p className="text-sm text-emerald-100">Próxima</p><strong className="text-5xl font-black">{next?.code ?? "—"}</strong></div></div><div className="flex items-center gap-2 rounded-lg bg-emerald-500/20 px-3 py-2 text-sm text-emerald-100"><Volume2 className={`h-5 w-5 ${announcement ? "animate-pulse text-amber-200" : ""}`} />{announcement ? `Chamando ${lastCall}…` : "Anúncio sonoro ativo"}</div></div>
          </aside>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-emerald-700">FILA DE ESPERA</p><h2 className="text-xl font-bold">Próximos pacientes</h2></div><span className="text-sm text-slate-500">Média: {averageWait || "—"} min</span></div><div className="mt-4 divide-y rounded-xl border">{queue.map((ticket, index) => <div key={ticket.code} className={`flex items-center gap-4 px-4 py-3 ${index === 0 ? "bg-amber-50" : ""}`}><span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-800">{index + 1}</span><strong className="w-16 text-[#005d55]">{ticket.code}</strong><span className="flex-1 font-medium">{ticket.patient}</span><span className="text-sm text-slate-500">{ticket.wait} min</span>{index === 0 && <ChevronRight className="h-5 w-5 text-emerald-700" />}</div>)}{!queue.length && <p className="p-5 text-center text-slate-500">Não há senhas aguardando.</p>}</div></div>
          <div className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-emerald-700" /><div><p className="text-sm font-semibold text-emerald-700">ATIVIDADE RECENTE</p><h2 className="text-xl font-bold">Rastreabilidade da recepção</h2></div></div><ol className="mt-5 space-y-4">{history.map((item, index) => <li key={`${item}-${index}`} className="flex gap-3 text-sm text-slate-700"><span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />{item}</li>)}</ol></div>
        </section>
      </div>
    </MainLayout>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return <div className="rounded-2xl border bg-white p-4 shadow-sm"><div className="flex items-center gap-2 text-sm text-slate-500"><span className="text-emerald-700">{icon}</span>{label}</div><p className="mt-2 text-3xl font-black text-slate-900">{value}</p></div>;
}
