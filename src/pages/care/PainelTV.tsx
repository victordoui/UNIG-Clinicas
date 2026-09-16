import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  Clock3,
  Info,
  Flower2,
  Megaphone,
  UsersRound,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import unigSymbol from "@/assets/unig-clinicas-symbol.png";
import campaignDemo from "@/assets/campaign-demo-preventive-care.png";
import { CampaignArtwork } from "@/components/care/CampaignArtwork";
import { useTvInsertion } from "@/hooks/useTvInsertion";
import campaignHealth from "@/assets/campaign-demo-health.png";
import campaignWelcome from "@/assets/campaign-demo-welcome.png";

type Clinic = { id: string; name: string; code: string; organization_id?: string };
type QueueSession = {
  id: string;
  clinic_id: string;
  service_date: string;
  status: string;
  clinic?: { name: string; code: string } | null;
};
type QueueTicket = {
  id: string;
  queue_session_id: string;
  ticket_number: number;
  priority: string;
  status: string;
  service_box: string | null;
  called_at: string | null;
  created_at: string;
};
type Campaign = {
  organization_id?: string;
  starts_at?: string | null;
  ends_at?: string | null;
  id: string;
  title: string;
  message: string;
  media_url: string | null;
  media_type: string;
  status: string;
  display_seconds: number;
  priority: number;
  display_mode: "integrated" | "fullscreen";
  media_fit: "cover" | "contain";
};
const missingDisplayColumns = (error: { code?: string; message?: string } | null) => error?.code === "42703" || Boolean(error?.message?.includes("display_mode"));

const TODAY = new Date().toLocaleDateString("en-CA");
const PRIORITY_WEIGHT: Record<string, number> = {
  urgent: 0,
  priority: 1,
  normal: 2,
};
const PREFIX_BY_CLINIC: Record<string, string> = {
  ODONTO: "O",
  FISIO: "F",
  VET: "V",
  ESTETICA: "E",
};
const SIMULATION_KEY = "unig-recepcao-simulacao";
const DEMO_CLINIC: Clinic = {
  id: "simulacao-odonto",
  name: "Clínica de Odontologia · Simulação",
  code: "ODONTO",
};

type ReceptionSimulation = {
  active: boolean;
  queueOpen: boolean;
  current: number | null;
  queue: number[];
  announced: number | null;
  updatedAt: string;
};

function readSimulation(): ReceptionSimulation | null {
  try {
    const value = window.localStorage.getItem(SIMULATION_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as ReceptionSimulation;
    return parsed.active ? parsed : null;
  } catch {
    return null;
  }
}

function simulatedTicket(number: number, status: QueueTicket["status"]): QueueTicket {
  return {
    id: `simulated-${number}`,
    queue_session_id: "simulated-session",
    ticket_number: number,
    priority: "normal",
    status,
    service_box: "Recepção",
    called_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
}

function formatTicket(
  ticket: QueueTicket | undefined,
  clinic: Clinic | undefined,
) {
  if (!ticket) return "—";
  const prefix =
    PREFIX_BY_CLINIC[clinic?.code?.toUpperCase() ?? ""] ??
    clinic?.code?.slice(0, 1).toUpperCase() ??
    "U";
  return `${prefix}-${String(ticket.ticket_number).padStart(3, "0")}`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
    .format(date)
    .replace(".", "");
}

export default function PainelTV() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const simulationEnabled = searchParams.get("simulation") === "1";
  const [clinicId, setClinicId] = useState(searchParams.get("clinic") ?? "");
  const [now, setNow] = useState(() => new Date());
  const [campaignIndex, setCampaignIndex] = useState(0);
  const [campaignVisible, setCampaignVisible] = useState(false);
  const [forcedCampaignId, setForcedCampaignId] = useState<string | null>(null);
  const handledInsertion = useRef<string | null>(null);
  const [testActive, setTestActive] = useState(Boolean(searchParams.get("testCampaign")));
  const [simulation, setSimulation] = useState<ReceptionSimulation | null>(
    () => (simulationEnabled ? readSimulation() : null),
  );
  const [announcementSignal, setAnnouncementSignal] = useState<string | null>(
    null,
  );
  const [announcementPulse, setAnnouncementPulse] = useState(false);
  const demoCampaigns = [campaignDemo, campaignHealth, campaignWelcome];
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastAnnouncementRef = useRef<string | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ["queue-tv", TODAY],
    refetchInterval: 5000,
    queryFn: async () => {
      const [clinics, sessions, tickets] = await Promise.all([
        supabase
          .from("clinics")
          .select("id,name,code,organization_id")
          .eq("is_active", true)
          .order("name"),
        supabase
          .from("queue_sessions")
          .select("id,clinic_id,service_date,status,clinic:clinics(name,code)")
          .in("status", ["open", "paused", "closing"]),
        supabase
          .from("queue_tickets")
          .select(
            "id,queue_session_id,ticket_number,priority,status,service_box,called_at,created_at",
          )
          .in("status", ["waiting", "called", "in_service"])
          .order("created_at", { ascending: true })
          .limit(100),
      ]);
      for (const result of [clinics, sessions, tickets])
        if (result.error) throw result.error;
      return {
        clinics: (clinics.data ?? []) as Clinic[],
        sessions: (sessions.data ?? []) as QueueSession[],
        tickets: (tickets.data ?? []) as QueueTicket[],
      };
    },
  });
  const { data: campaignRows = [], isLoading: isCampaignsLoading } = useQuery({
    queryKey: ["tv-campaigns"],
    refetchInterval: 5000,
    queryFn: async () => {
      let result = await (supabase
        .from("tv_campaigns" as any) as any)
        .select("id,organization_id,starts_at,ends_at,title,message,media_url,media_type,status,display_seconds,priority,display_mode,media_fit")
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });
      if (missingDisplayColumns(result.error)) result = await (supabase
        .from("tv_campaigns" as any) as any)
        .select("id,organization_id,starts_at,ends_at,title,message,media_url,media_type,status,display_seconds,priority")
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });
      if (result.error) throw result.error;
      return (result.data ?? []).map((campaign: any) => ({ ...campaign, display_mode: campaign.display_mode ?? "integrated", media_fit: campaign.media_fit ?? "cover" })) as Campaign[];
    },
  });

  const clinics = data?.clinics ?? [];
  const availableClinics = simulation ? [DEMO_CLINIC, ...clinics] : clinics;
  const selectedClinicId =
    clinicId && availableClinics.some((clinic) => clinic.id === clinicId)
      ? clinicId
      : (simulation ? DEMO_CLINIC.id : (clinics[0]?.id ?? ""));
  const selectedClinic = availableClinics.find(
    (clinic) => clinic.id === selectedClinicId,
  );
  const isSimulation = Boolean(simulation && selectedClinicId === DEMO_CLINIC.id);
  const insertion = useTvInsertion(selectedClinicId);
  const sessions = useMemo(
    () =>
      data?.sessions.filter(
        (session) => session.clinic_id === selectedClinicId,
      ) ?? [],
    [data?.sessions, selectedClinicId],
  );
  const sessionIds = useMemo(
    () => new Set(sessions.map((session) => session.id)),
    [sessions],
  );
  const tickets = useMemo(
    () =>
      (data?.tickets ?? []).filter((ticket) =>
        sessionIds.has(ticket.queue_session_id),
      ),
    [data?.tickets, sessionIds],
  );
  const realCurrent = tickets
    .filter(
      (ticket) => ticket.status === "called" || ticket.status === "in_service",
    )
    .sort((a, b) => (b.called_at ?? "").localeCompare(a.called_at ?? ""))[0];
  const realWaiting = useMemo(
    () =>
      tickets
        .filter((ticket) => ticket.status === "waiting")
        .sort(
          (a, b) =>
            (PRIORITY_WEIGHT[a.priority] ?? 2) -
              (PRIORITY_WEIGHT[b.priority] ?? 2) ||
            a.ticket_number - b.ticket_number,
        ),
    [tickets],
  );
  const current = isSimulation && simulation?.current
    ? simulatedTicket(simulation.current, "called")
    : realCurrent;
  const waiting = isSimulation
    ? (simulation?.queue ?? []).map((number) => simulatedTicket(number, "waiting"))
    : realWaiting;
  const next = waiting[0];
  const remaining = waiting.slice(1, 4);
  const averageWait = waiting.length
    ? Math.max(
        1,
        Math.round(
          waiting.reduce(
            (total, ticket) =>
              total +
              (now.getTime() - new Date(ticket.created_at).getTime()) / 60000,
            0,
          ) / waiting.length,
        ),
      )
    : 0;
  const queueOpen = isSimulation ? Boolean(simulation?.queueOpen) : sessions.some((session) => session.status === "open");
  const testCampaignId = searchParams.get("testCampaign");
  const testCampaign = campaignRows.find((campaign) => campaign.id === testCampaignId);
  const publishedCampaigns = campaignRows.filter(campaign => campaign.status === "published"
    && (!selectedClinic?.organization_id || campaign.organization_id === selectedClinic.organization_id)
    && (!campaign.starts_at || Date.parse(campaign.starts_at) <= now.getTime())
    && (!campaign.ends_at || Date.parse(campaign.ends_at) > now.getTime()));
  const activeCampaign = testActive && testCampaign
    ? testCampaign
    : publishedCampaigns.find(campaign => campaign.id === forcedCampaignId) ?? publishedCampaigns[campaignIndex % publishedCampaigns.length];
  const isShowingCampaign = Boolean(activeCampaign) && (testActive || campaignVisible);
  const campaignFullscreen = isShowingCampaign && (
    searchParams.get("mode") === "fullscreen" ||
    activeCampaign?.display_mode === "fullscreen"
  );
  const mediaFitClass = activeCampaign?.media_fit === "contain" ? "object-contain" : "object-cover";
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    document.title = "Painel TV · UNIG Clínicas";
    return () => {
      window.clearInterval(timer);
      document.title = "UNIG Clínicas";
    };
  }, []);
  useEffect(() => {
    if (!testActive) return;
    if (!testCampaign) {
      if (!isCampaignsLoading) setTestActive(false);
      return;
    }
    const timeout = window.setTimeout(
      () => setTestActive(false),
      Math.max(5, testCampaign.display_seconds) * 1000,
    );
    return () => window.clearTimeout(timeout);
  }, [isCampaignsLoading, testActive, testCampaign]);
  useEffect(() => {
    if (testActive || !publishedCampaigns.length) return;
    const seconds = campaignVisible ? Math.max(5, activeCampaign?.display_seconds ?? 12) : 30;
    const timeout = window.setTimeout(
      () => {
        if (campaignVisible) { setCampaignIndex(index => (index + 1) % publishedCampaigns.length); setForcedCampaignId(null); }
        setCampaignVisible(visible => !visible);
      },
      seconds * 1000,
    );
    return () => window.clearTimeout(timeout);
  }, [activeCampaign?.id, activeCampaign?.display_seconds, campaignVisible, publishedCampaigns.length, testActive, announcementSignal, current?.id, current?.called_at]);
  useEffect(() => {
    setCampaignVisible(false);
    setForcedCampaignId(null);
  }, [selectedClinicId, current?.id, current?.called_at, announcementSignal]);
  useEffect(() => {
    const request = insertion.data;
    if (!request || handledInsertion.current === request.request_id || Date.parse(request.expires_at) <= Date.now()) return;
    if (current?.called_at && Date.parse(current.called_at) > Date.parse(request.requested_at)) {
      handledInsertion.current = request.request_id;
      return;
    }
    if (!publishedCampaigns.some(campaign => campaign.id === request.campaign_id)) return;
    handledInsertion.current = request.request_id;
    setForcedCampaignId(request.campaign_id);
    setCampaignVisible(true);
  }, [insertion.data, publishedCampaigns, current?.called_at]);
  const ensureAudio = useCallback(async () => {
    const AudioContextConstructor = window.AudioContext;
    const context = audioContextRef.current ?? new AudioContextConstructor();
    audioContextRef.current = context;
    try {
      await context.resume();
      return context.state === "running";
    } catch {
      return false;
    }
  }, []);
  const playAnnouncement = () => {
    const context = audioContextRef.current;
    if (!context || context.state !== "running") return;
    const start = context.currentTime;
    const masterGain = context.createGain();
    masterGain.gain.setValueAtTime(0.3, start);
    masterGain.connect(context.destination);
    [
      { frequency: 523.25, offset: 0, duration: 0.18 },
      { frequency: 659.25, offset: 0.22, duration: 0.18 },
      { frequency: 783.99, offset: 0.5, duration: 0.32 },
    ].forEach(({ frequency, offset, duration }) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, start + offset);
      gain.gain.setValueAtTime(0.0001, start + offset);
      gain.gain.exponentialRampToValueAtTime(0.72, start + offset + 0.015);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        start + offset + duration,
      );
      oscillator.connect(gain).connect(masterGain);
      oscillator.start(start + offset);
      oscillator.stop(start + offset + duration + 0.02);
    });
  };
  useEffect(() => {
    if (!simulationEnabled) {
      setSimulation(null);
      return;
    }
    const refreshSimulation = () => setSimulation(readSimulation());
    window.addEventListener("storage", refreshSimulation);
    const interval = window.setInterval(refreshSimulation, 800);
    return () => {
      window.removeEventListener("storage", refreshSimulation);
      window.clearInterval(interval);
    };
  }, [simulationEnabled]);
  useEffect(() => {
    const startAudioOnFirstInteraction = () => {
      void ensureAudio();
    };
    void ensureAudio();
    window.addEventListener("pointerdown", startAudioOnFirstInteraction, {
      once: true,
    });
    window.addEventListener("keydown", startAudioOnFirstInteraction, {
      once: true,
    });
    return () => {
      window.removeEventListener("pointerdown", startAudioOnFirstInteraction);
      window.removeEventListener("keydown", startAudioOnFirstInteraction);
    };
  }, [ensureAudio]);
  useEffect(() => {
    const announcementKey = isSimulation
      ? simulation?.updatedAt
      : announcementSignal;
    if (!announcementKey) return;
    const previous = lastAnnouncementRef.current;
    lastAnnouncementRef.current = announcementKey;
    if (!isSimulation || previous) {
      setAnnouncementPulse(true);
      const timer = window.setTimeout(() => setAnnouncementPulse(false), 2800);
      void ensureAudio().then((audioReady) => {
        if (audioReady) playAnnouncement();
      });
      return () => window.clearTimeout(timer);
    }
  }, [announcementSignal, ensureAudio, isSimulation, simulation?.updatedAt]);
  useEffect(() => {
    if (selectedClinicId && selectedClinicId !== searchParams.get("clinic"))
      setSearchParams(previous => { const next = new URLSearchParams(previous); next.set("clinic", selectedClinicId); return next; }, { replace: true });
  }, [selectedClinicId, searchParams, setSearchParams]);
  useEffect(() => {
    if (!selectedClinicId) return;
    const channel = supabase
      .channel(`queue-events-tv-${selectedClinicId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "queue_events",
          filter: `clinic_id=eq.${selectedClinicId}`,
        },
        (payload) => {
          const event = payload.new as {
            id?: string;
            event_type?: string;
            created_at?: string;
          };
          if (
            event.event_type === "ticket.called" ||
            event.event_type === "reception.recalled"
          ) {
            setAnnouncementSignal(
              `${event.id ?? "event"}:${event.created_at ?? Date.now()}`,
            );
          }
          void queryClient.invalidateQueries({ queryKey: ["queue-tv", TODAY] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, selectedClinicId]);

  return (
    <main className={campaignFullscreen ? "min-h-screen bg-[#003E3A] text-white" : "tv-display min-h-screen bg-[#003E3A] text-white"}>
      <div className={campaignFullscreen ? "min-h-screen" : "mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1680px] flex-col gap-4 lg:min-h-[calc(100vh-2.5rem)] lg:gap-5"}>
        {!campaignFullscreen && <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <img src={unigSymbol} alt="" className="h-10 w-10 shrink-0 object-contain lg:h-12 lg:w-12" />
              <div className="min-w-0 text-white">
                <p className="whitespace-nowrap text-xl font-extrabold leading-none tracking-tight lg:text-2xl">UNIG Clínicas</p>
                <p className="tv-brand-tagline">Saúde, Ensino e Vida Real</p>
              </div>
            </div>
            <p className="tv-header-label">PAINEL DE<br />CHAMADA</p>
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-4 lg:gap-6">
            <Select
              value={selectedClinicId}
              onValueChange={(value) => setClinicId(value)}
            >
              <SelectTrigger className="h-9 min-w-0 max-w-[280px] flex-1 rounded-lg border border-white/10 bg-white/[0.07] px-3 text-sm font-semibold text-white shadow-none focus:ring-1 focus:ring-[#52E4CA] lg:h-10 lg:max-w-[320px] lg:text-base">
                <Flower2 className="tv-clinic-icon" aria-hidden="true" />
                <SelectValue placeholder="Selecione a clínica" />
              </SelectTrigger>
              <SelectContent>
                {availableClinics.map((clinic) => (
                  <SelectItem key={clinic.id} value={clinic.id}>
                    {clinic.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="hidden text-right sm:block">
              <p className="text-3xl font-extrabold leading-none tracking-tight lg:text-4xl">
                {now.toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <p className="mt-1 text-[11px] capitalize text-white/65 lg:text-xs">
                {formatDate(now)}
              </p>
            </div>
          </div>
        </header>}

        {isLoading && !simulation ? (
          <div className="grid flex-1 gap-5 lg:grid-cols-[1.7fr_1fr]">
            <div className="animate-pulse rounded-2xl bg-white/10" />
            <div className="animate-pulse rounded-2xl bg-white/10" />
          </div>
        ) : error && !simulation ? (
          <div className="flex flex-1 items-center justify-center rounded-2xl border border-red-200/20 bg-red-500/15 p-8 text-center">
            <div>
              <p className="font-semibold">Não foi possível carregar a fila.</p>
              <p className="mt-2 text-sm text-white/70">
                Verifique o acesso da conta e tente novamente.
              </p>
            </div>
          </div>
        ) : !selectedClinic ? (
          <div className="flex flex-1 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] p-10 text-center text-white/70">
            Nenhuma clínica disponível para este acesso.
          </div>
        ) : (
          <>
            {isSimulation && (
              <div className="rounded-xl border border-[#52e4ca]/40 bg-[#087A70]/40 px-4 py-3 text-sm font-semibold text-[#D7FFF7]">
                Modo de simulação ativo · a chamada é recebida da tela Recepção neste navegador.
              </div>
            )}
            {isShowingCampaign ? (
              <section key={activeCampaign?.id ?? `demo-${campaignIndex}`} className={`tv-campaign-enter relative flex-1 overflow-hidden bg-[#004e48] shadow-2xl shadow-black/25 ${campaignFullscreen ? "min-h-screen rounded-none border-0" : "min-h-[520px] rounded-2xl border border-white/15"}`}>
                <CampaignArtwork mediaUrl={activeCampaign ? activeCampaign.media_url : demoCampaigns[campaignIndex % demoCampaigns.length]} mediaType={activeCampaign?.media_type} title={activeCampaign?.title ?? ""} message={activeCampaign?.message ?? ""} fit={activeCampaign?.media_fit ?? "cover"} />
              </section>
            ) : <section className="tv-call-enter tv-call-grid grid flex-1 gap-5 lg:grid-cols-[1.7fr_1fr]">
              <div className="tv-current relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#005D55] to-[#004943]">
                <div className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.32em] text-[#8DEBDD] sm:text-lg">
                  Senha atual
                </div>
                <div className="tv-number-row">
                  <span className="tv-megaphone"><Megaphone aria-hidden="true" /></span>
                  <p key={announcementSignal ?? "initial"} className={`tv-current-number ${announcementPulse ? "tv-ticket-pulse" : ""}`}>
                    {formatTicket(current, selectedClinic)}
                  </p>
                  <p className="sr-only">
                    {current?.status === "in_service"
                      ? "Em atendimento"
                      : current
                        ? "Chamando agora"
                        : "Aguardando chamada"}
                  </p>
                </div>
                <div className="tv-destination flex items-center justify-center gap-3 rounded-xl bg-[#08A899]">
                  <ArrowRight className="h-7 w-7 shrink-0" />
                  <span>
                    Dirija-se à <strong>{current?.service_box || "Recepção"}</strong>
                  </span>
                </div>
              </div>
              <div className="tv-next rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#007F73] to-[#00665D]">
                <div className="text-sm font-bold uppercase tracking-[0.32em] text-[#B1F4E8] sm:text-lg">
                  Próxima senha
                </div>
                <div className="flex min-h-[275px] items-center justify-center">
                  <p className="tv-next-number">
                    {formatTicket(next, selectedClinic)}
                  </p>
                </div>
              </div>
            </section>}

            {!campaignFullscreen && <section className="tv-summary grid gap-5 rounded-2xl border border-white/[0.08] bg-gradient-to-r from-[#00564F] to-[#004A45] p-5 shadow-xl shadow-black/15 sm:p-6 lg:grid-cols-[1.35fr_1fr] lg:p-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/90 sm:text-sm">
                  Demais senhas
                </p>
                <div className="mt-4 grid grid-cols-3 gap-3 sm:gap-5">
                  {remaining.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="flex min-h-[74px] items-center justify-center rounded-xl border border-white/[0.08] bg-[#087A70] px-2 shadow-inner sm:min-h-[100px]"
                    >
                      <span className="text-[clamp(1.3rem,3.5vw,3rem)] font-black">
                        {formatTicket(ticket, selectedClinic)}
                      </span>
                    </div>
                  ))}
                  {remaining.length === 0 && (
                    <div className="col-span-3 flex min-h-[74px] items-center justify-center rounded-xl border border-dashed border-white/20 text-sm text-white/60 sm:min-h-[100px]">
                      Nenhuma outra senha aguardando
                    </div>
                  )}
                </div>
              </div>
              <div className="border-t border-white/20 pt-4 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                <div className="grid gap-2 text-sm sm:text-base">
                  <div className="flex items-center gap-3 border-b border-white/15 py-2">
                    <UsersRound className="h-6 w-6 text-[#B1F4E8]" />
                    <span className="flex-1 text-white/85">
                      Pessoas aguardando
                    </span>
                    <strong className="text-2xl sm:text-3xl">
                      {waiting.length}
                    </strong>
                  </div>
                  <div className="flex items-center gap-3 border-b border-white/15 py-2">
                    <Clock3 className="h-6 w-6 text-[#B1F4E8]" />
                    <span className="flex-1 text-white/85">
                      Tempo médio de espera
                    </span>
                    <strong className="text-xl sm:text-2xl">
                      {averageWait ? `${averageWait} min` : "—"}
                    </strong>
                  </div>
                  <div className="flex items-center gap-3 py-2">
                    <Activity className="h-6 w-6 text-[#B1F4E8]" />
                    <span className="flex-1 text-white/85">Fila</span>
                    <span
                      className={`rounded-full border px-4 py-1.5 font-bold ${queueOpen ? "border-[#0AD2B5] bg-[#008F80]/60 text-[#B1F4E8]" : "border-white/20 bg-white/10 text-white/70"}`}
                    >
                      <span
                        className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${queueOpen ? "bg-[#28F0C8]" : "bg-white/40"}`}
                      />
                      {queueOpen ? "Aberta" : "Fechada"}
                    </span>
                  </div>
                </div>
              </div>
            </section>}
          </>
        )}

        {!campaignFullscreen && <footer className="tv-footer"><span><Info aria-hidden="true" />Painel de informações da UNIG Clínicas<span>•</span>Atualização automática a cada 5 segundos</span><span>Saúde, Ensino e Vida Real</span></footer>}
      </div>
    </main>
  );
}
