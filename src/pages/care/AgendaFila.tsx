import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Check,
  CirclePause,
  CirclePlay,
  Copy,
  ExternalLink,
  PhoneCall,
  QrCode,
  Ticket,
  X,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const APPOINTMENT_LABELS: Record<string, string> = {
  scheduled: "Agendado",
  confirmed: "Confirmado",
  checked_in: "Check-in",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Não compareceu",
};
const TICKET_LABELS: Record<string, string> = {
  waiting: "Aguardando",
  called: "Chamado",
  checked_in: "Check-in",
  in_service: "Em atendimento",
  waiting_supervision: "Aguardando supervisão",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Não compareceu",
  transferred: "Transferido",
  paused: "Pausado",
};
const SESSION_LABELS: Record<string, string> = {
  open: "Aberta",
  paused: "Pausada",
  closed: "Encerrada",
};

type Clinic = {
  id: string;
  organization_id: string;
  name: string;
  code: string;
};
type Service = { id: string; clinic_id: string; name: string; code?: string };
type Session = {
  id: string;
  clinic_id: string;
  organization_id: string;
  service_date: string;
  status: string;
  public_token?: string;
  entry_mode?: string;
  max_capacity?: number;
  concurrent_capacity?: number;
  starts_at?: string | null;
  ends_at?: string | null;
  clinic?: { name: string } | null;
  service?: { name: string } | null;
};

export default function AgendaFila() {
  const qc = useQueryClient();
  const { unigRole, activeClinicCode } = useAuth();
  const [searchParams] = useSearchParams();
  const requestedSection = searchParams.get("section");
  const defaultTab = requestedSection === "fila" ? "fila" : "agenda";
  const canManage = [
    "super_admin",
    "administrador",
    "gestor_unidade",
    "atendimento",
  ].includes(unigRole);
  const [clinic, setClinic] = useState("");
  const [patient, setPatient] = useState("");
  const [when, setWhen] = useState("");
  const [duration, setDuration] = useState("30");
  const [reason, setReason] = useState("");
  const [session, setSession] = useState("");
  const [service, setService] = useState("");
  const [entryMode, setEntryMode] = useState("both");
  const [maxCapacity, setMaxCapacity] = useState("100");
  const [concurrentCapacity, setConcurrentCapacity] = useState("1");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [agendaView, setAgendaView] = useState<"day" | "week" | "month" | "list">("day");
  const [agendaDate, setAgendaDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [checkInQuery, setCheckInQuery] = useState("");

  const data = useQuery({
    queryKey: ["care-operation"],
    queryFn: async () => {
      const [clinics, services, patients, appointments, sessions, tickets] =
        await Promise.all([
          supabase
            .from("clinics")
            .select("id,organization_id,name,code")
            .eq("is_active", true),
          (supabase.from("clinic_services") as any)
            .select("id,clinic_id,name,code")
            .eq("is_active", true)
            .order("name"),
          supabase
            .from("patients")
            .select("id,record_number,person:persons(full_name,document_number)")
            .eq("status", "active"),
          supabase
            .from("appointments")
            .select(
              "id,scheduled_at,status,reason,clinic:clinics(name,code),patient:patients(record_number,person:persons(full_name,document_number))",
            )
            .order("scheduled_at")
            .limit(50),
          (supabase.from("queue_sessions") as any)
            .select(
              "id,clinic_id,organization_id,service_date,status,public_token,entry_mode,max_capacity,concurrent_capacity,starts_at,ends_at,clinic:clinics(name),service:clinic_services(name)",
            )
            .order("service_date", { ascending: false })
            .limit(30),
          supabase
            .from("queue_tickets")
            .select(
              "id,queue_session_id,ticket_number,priority,status,called_at,completed_at,patient:patients(record_number,person:persons(full_name))",
            )
            .order("created_at", { ascending: false })
            .limit(50),
        ]);
      for (const result of [
        clinics,
        services,
        patients,
        appointments,
        sessions,
        tickets,
      ])
        if (result.error) throw result.error;
      return {
        clinics: clinics.data ?? [],
        services: services.data ?? [],
        patients: patients.data ?? [],
        appointments: appointments.data ?? [],
        sessions: sessions.data ?? [],
        tickets: tickets.data ?? [],
      };
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["care-operation"] });
  useEffect(() => {
    const channel = supabase
      .channel(`queue-events-agenda-${clinic || "all"}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "queue_events",
          ...(clinic ? { filter: `clinic_id=eq.${clinic}` } : {}),
        },
        refresh,
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [clinic]);

  const schedule = useMutation({
    mutationFn: async () => {
      const c = (data.data?.clinics as Clinic[]).find(
        (item) => item.id === clinic,
      );
      if (!c || !patient || !when)
        throw new Error("Selecione clínica, paciente e horário.");
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await (supabase.from("appointments") as any).insert({
        organization_id: c.organization_id,
        clinic_id: clinic,
        patient_id: patient,
        scheduled_at: new Date(when).toISOString(),
        duration_minutes: Number(duration),
        reason: reason.trim() || "Atendimento clínico",
        created_by: auth.user?.id,
        updated_by: auth.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      refresh();
      setReason("");
      toast({ title: "Agendamento criado" });
    },
    onError: (e: Error) =>
      toast({
        title: "Erro ao agendar",
        description: e.message,
        variant: "destructive",
      }),
  });

  const updateAppointment = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      const payload: Record<string, unknown> = {
        status,
        updated_by: auth.user?.id,
      };
      if (status === "cancelled") {
        payload.cancelled_at = new Date().toISOString();
        payload.cancelled_by = auth.user?.id;
      }
      const { error } = await (supabase.from("appointments") as any)
        .update(payload)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (e: Error) =>
      toast({
        title: "Não foi possível atualizar a agenda",
        description: e.message,
        variant: "destructive",
      }),
  });

  const openSession = useMutation({
    mutationFn: async () => {
      const c = (data.data?.clinics as Clinic[]).find(
        (item) => item.id === clinic,
      );
      if (!c) throw new Error("Selecione a clínica.");
      const { data: auth } = await supabase.auth.getUser();
      const payload = {
        organization_id: c.organization_id,
        clinic_id: clinic,
        clinic_service_id: service || null,
        service_date: new Date().toISOString().slice(0, 10),
        status: "open",
        entry_mode: entryMode,
        max_capacity: Number(maxCapacity),
        concurrent_capacity: Number(concurrentCapacity),
        starts_at: startsAt ? new Date(startsAt).toISOString() : null,
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        created_by: auth.user?.id,
        updated_by: auth.user?.id,
      };
      const existing = sessions.find(
        (item) =>
          item.clinic_id === clinic &&
          item.service_date === payload.service_date,
      );
      if (existing?.status === "closed")
        throw new Error(
          "A fila de hoje já foi encerrada e não pode ser reaberta.",
        );
      if (existing?.status === "paused") {
        const { error } = await supabase.rpc(
          "transition_queue_session" as never,
          { target_session_id: existing.id, target_status: "open" } as never,
        );
        if (error) throw error;
      }
      const { error } = existing
        ? await (supabase.from("queue_sessions") as any)
            .update({
              ...payload,
              status: existing.status === "paused" ? "open" : existing.status,
            })
            .eq("id", existing.id)
        : await (supabase.from("queue_sessions") as any).insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      refresh();
      toast({
        title: "Fila aberta para hoje",
        description:
          entryMode === "manual"
            ? "Entrada manual ativada."
            : "Token e QR Code gerados para esta sessão.",
      });
    },
    onError: (e: Error) =>
      toast({
        title: "Não foi possível abrir a fila",
        description: e.message,
        variant: "destructive",
      }),
  });

  const updateSession = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.rpc(
        "transition_queue_session" as never,
        { target_session_id: id, target_status: status } as never,
      );
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (e: Error) =>
      toast({
        title: "Não foi possível atualizar a fila",
        description: e.message,
        variant: "destructive",
      }),
  });

  const issue = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc(
        "issue_queue_ticket" as never,
        {
          target_queue_session_id: session,
          target_patient_id: patient,
          ticket_priority: "normal",
          target_appointment_id: null,
        } as never,
      );
      if (error) throw error;
    },
    onSuccess: () => {
      refresh();
      toast({ title: "Senha emitida" });
    },
    onError: (e: Error) =>
      toast({
        title: "Erro ao emitir senha",
        description: e.message,
        variant: "destructive",
      }),
  });

  const updateTicket = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.rpc(
        "transition_queue_ticket" as never,
        { target_ticket_id: id, target_status: status } as never,
      );
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (e: Error) =>
      toast({
        title: "Não foi possível atualizar a senha",
        description: e.message,
        variant: "destructive",
      }),
  });

  const submit = (fn: () => void) => (event: FormEvent) => {
    event.preventDefault();
    fn();
  };
  const clinics = (data.data?.clinics as Clinic[]) ?? [];
  const services = (data.data?.services as Service[]) ?? [];
  const patients = (data.data?.patients as any[]) ?? [];
  const appointments = (data.data?.appointments as any[]) ?? [];
  const sessions = (data.data?.sessions as Session[]) ?? [];
  const tickets = (data.data?.tickets as any[]) ?? [];
  const selectedSession = sessions.find((item) => item.id === session);
  const scopedAppointments = useMemo(() => {
    const base = activeClinicCode
      ? appointments.filter((item) => item.clinic?.code === activeClinicCode)
      : appointments;
    if (agendaView === "list") return base;

    const selected = new Date(`${agendaDate}T00:00:00`);
    const start = new Date(selected);
    const end = new Date(selected);
    if (agendaView === "day") end.setDate(end.getDate() + 1);
    if (agendaView === "week") {
      start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
      end.setTime(start.getTime());
      end.setDate(end.getDate() + 7);
    }
    if (agendaView === "month") {
      start.setDate(1);
      end.setMonth(end.getMonth() + 1, 1);
    }
    return base.filter((item) => {
      const scheduled = new Date(item.scheduled_at);
      return scheduled >= start && scheduled < end;
    });
  }, [activeClinicCode, agendaDate, agendaView, appointments]);
  const checkInMatches = useMemo(() => {
    const normalized = checkInQuery.trim().toLocaleLowerCase();
    if (normalized.length < 2) return [];
    return appointments
      .filter((item) => !activeClinicCode || item.clinic?.code === activeClinicCode)
      .filter((item) => ["scheduled", "confirmed"].includes(item.status))
      .filter((item) => {
        const patientInfo = item.patient;
        return [
          patientInfo?.person?.full_name,
          patientInfo?.record_number,
          patientInfo?.person?.document_number,
        ].some((value) => String(value ?? "").toLocaleLowerCase().includes(normalized));
      });
  }, [activeClinicCode, appointments, checkInQuery]);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <CalendarDays className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Agenda e fila</h1>
            <p className="text-sm text-muted-foreground">
              Acompanhe horários, chegada e andamento do atendimento sem expor o
              conteúdo do prontuário.
            </p>
          </div>
        </div>
        {!canManage && (
          <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            Seu papel tem acesso de consulta. Operações de agenda e fila ficam
            disponíveis para a equipe de recepção e gestão.
          </p>
        )}
        <Tabs key={defaultTab} defaultValue={defaultTab}>
          <TabsList>
            <TabsTrigger value="agenda">Agenda</TabsTrigger>
            <TabsTrigger value="fila">Fila</TabsTrigger>
          </TabsList>
          <TabsContent value="agenda" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Check-in rápido</CardTitle>
                <CardDescription>
                  Localize o agendamento por nome, prontuário ou CPF/documento e registre a chegada.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  value={checkInQuery}
                  onChange={(event) => setCheckInQuery(event.target.value)}
                  placeholder="Nome, prontuário ou CPF/documento"
                  aria-label="Localizar paciente para check-in"
                />
                {checkInQuery.trim().length >= 2 && (
                  <div className="space-y-2">
                    {checkInMatches.length ? checkInMatches.map((item) => (
                      <div key={item.id} className="flex flex-col gap-2 rounded border p-3 text-sm sm:flex-row sm:items-center">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{item.patient?.person?.full_name ?? item.patient?.record_number}</p>
                          <p className="text-xs text-muted-foreground">{item.patient?.record_number} · {item.clinic?.name} · {new Date(item.scheduled_at).toLocaleString("pt-BR")}</p>
                        </div>
                        <Button size="sm" disabled={!canManage || updateAppointment.isPending} onClick={() => updateAppointment.mutate({ id: item.id, status: "checked_in" })}>
                          <Check className="mr-1 h-3 w-3" />Registrar chegada
                        </Button>
                      </div>
                    )) : <p className="text-sm text-muted-foreground">Nenhum agendamento em aberto encontrado para esta clínica.</p>}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Novo agendamento</CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={submit(() => schedule.mutate())}
                  className="grid gap-3 md:grid-cols-4"
                >
                  <Picker
                    label="Clínica"
                    value={clinic}
                    onValue={setClinic}
                    options={clinics}
                    labelOf={(item: Clinic) => item.name}
                  />
                  <Picker
                    label="Paciente"
                    value={patient}
                    onValue={setPatient}
                    options={patients}
                    labelOf={(item: any) =>
                      `${item.record_number} — ${item.person?.full_name ?? ""}`
                    }
                  />
                  <div className="space-y-1">
                    <Label>Data e hora</Label>
                    <Input
                      required
                      type="datetime-local"
                      value={when}
                      onChange={(event) => setWhen(event.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Duração (minutos)</Label>
                    <Input
                      required
                      type="number"
                      min="5"
                      max="480"
                      value={duration}
                      onChange={(event) => setDuration(event.target.value)}
                    />
                  </div>
                  <div className="md:col-span-3 space-y-1">
                    <Label>Motivo</Label>
                    <Input
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder="Consulta, retorno ou avaliação"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      className="w-full"
                      disabled={
                        !canManage ||
                        !clinic ||
                        !patient ||
                        !when ||
                        schedule.isPending
                      }
                    >
                      Agendar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-base">Agenda operacional</CardTitle>
                    <CardDescription>
                      Visualize os horários da clínica por período e acompanhe a chegada.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {(["day", "week", "month", "list"] as const).map((view) => (
                      <Button
                        key={view}
                        type="button"
                        size="sm"
                        variant={agendaView === view ? "default" : "outline"}
                        onClick={() => setAgendaView(view)}
                      >
                        {{ day: "Dia", week: "Semana", month: "Mês", list: "Lista" }[view]}
                      </Button>
                    ))}
                    {agendaView !== "list" && (
                      <Input
                        aria-label="Data de referência da agenda"
                        type="date"
                        value={agendaDate}
                        onChange={(event) => setAgendaDate(event.target.value)}
                        className="w-[155px]"
                      />
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {scopedAppointments.length ? (
                    scopedAppointments.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col gap-3 rounded border p-3 text-sm md:flex-row md:items-center"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">
                            {item.patient?.person?.full_name ??
                              item.patient?.record_number}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(item.scheduled_at).toLocaleString(
                              "pt-BR",
                            )}{" "}
                            · {item.clinic?.name} ·{" "}
                            {item.reason ?? "Atendimento clínico"}
                          </p>
                        </div>
                        <Badge
                          variant={
                            item.status === "cancelled"
                              ? "destructive"
                              : "outline"
                          }
                        >
                          {APPOINTMENT_LABELS[item.status] ?? item.status}
                        </Badge>
                        <div className="flex flex-wrap gap-1">
                          {item.status === "scheduled" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!canManage}
                              onClick={() =>
                                updateAppointment.mutate({
                                  id: item.id,
                                  status: "confirmed",
                                })
                              }
                            >
                              <Check className="mr-1 h-3 w-3" />
                              Confirmar
                            </Button>
                          )}
                          {item.status === "confirmed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!canManage}
                              onClick={() =>
                                updateAppointment.mutate({
                                  id: item.id,
                                  status: "checked_in",
                                })
                              }
                            >
                              Check-in
                            </Button>
                          )}
                          {["scheduled", "confirmed", "checked_in"].includes(
                            item.status,
                          ) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={!canManage}
                              onClick={() =>
                                updateAppointment.mutate({
                                  id: item.id,
                                  status: "cancelled",
                                })
                              }
                            >
                              <X className="mr-1 h-3 w-3" />
                              Cancelar
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      Nenhum agendamento neste período.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="fila" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Operar fila</CardTitle>
                <CardDescription>
                  Abra a fila com capacidade controlada e gere um QR Code
                  vinculado à sessão — nunca à clínica por parâmetro editável.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5 lg:grid-cols-[1.1fr,0.9fr]">
                <div className="space-y-3">
                  <Picker
                    label="Clínica para hoje"
                    value={clinic}
                    onValue={setClinic}
                    options={clinics}
                    labelOf={(item: Clinic) => item.name}
                  />
                  <Picker
                    label="Serviço"
                    value={service}
                    onValue={setService}
                    options={services.filter(
                      (item) => item.clinic_id === clinic,
                    )}
                    labelOf={(item: Service) => item.name}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Picker
                      label="Entrada"
                      value={entryMode}
                      onValue={setEntryMode}
                      options={[
                        { id: "both", name: "Manual + QR" },
                        { id: "manual", name: "Somente manual" },
                        { id: "qr", name: "Somente QR" },
                      ]}
                      labelOf={(item: any) => item.name}
                    />
                    <div className="space-y-1">
                      <Label>Capacidade máxima</Label>
                      <Input
                        type="number"
                        min="1"
                        max="1000"
                        value={maxCapacity}
                        onChange={(event) => setMaxCapacity(event.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Atendimentos simultâneos</Label>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={concurrentCapacity}
                        onChange={(event) =>
                          setConcurrentCapacity(event.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Horário inicial</Label>
                      <Input
                        type="datetime-local"
                        value={startsAt}
                        onChange={(event) => setStartsAt(event.target.value)}
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label>Horário limite</Label>
                      <Input
                        type="datetime-local"
                        value={endsAt}
                        onChange={(event) => setEndsAt(event.target.value)}
                      />
                    </div>
                  </div>
                  <Button
                    disabled={!canManage || !clinic || openSession.isPending}
                    onClick={() => openSession.mutate()}
                  >
                    <CirclePlay className="mr-1 h-4 w-4" />
                    Abrir ou reabrir fila
                  </Button>
                  <div className="space-y-2 pt-2">
                    {sessions.slice(0, 8).map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col gap-2 rounded border p-2 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span>
                            {item.clinic?.name} · {item.service_date}
                            {item.service?.name
                              ? ` · ${item.service.name}`
                              : ""}
                          </span>
                          <Badge variant="outline">
                            {SESSION_LABELS[item.status] ?? item.status}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="text-muted-foreground">
                            Limite {item.max_capacity ?? "—"} · simultâneos{" "}
                            {item.concurrent_capacity ?? "—"}
                          </span>
                          {item.status === "open" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={!canManage}
                              onClick={() =>
                                updateSession.mutate({
                                  id: item.id,
                                  status: "paused",
                                })
                              }
                            >
                              <CirclePause className="h-3 w-3" />
                            </Button>
                          )}
                          {item.status === "paused" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={!canManage}
                              onClick={() =>
                                updateSession.mutate({
                                  id: item.id,
                                  status: "open",
                                })
                              }
                            >
                              <CirclePlay className="h-3 w-3" />
                            </Button>
                          )}
                          {item.status !== "closed" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={!canManage}
                              onClick={() =>
                                updateSession.mutate({
                                  id: item.id,
                                  status: "closed",
                                })
                              }
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                          {item.public_token &&
                            item.entry_mode !== "manual" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  void navigator.clipboard?.writeText(
                                    `${window.location.origin}/fila/qr/${item.public_token}`,
                                  );
                                  toast({ title: "Link do QR copiado" });
                                }}
                              >
                                <Copy className="mr-1 h-3 w-3" />
                                QR
                              </Button>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  {selectedSession?.public_token &&
                  selectedSession.entry_mode !== "manual" ? (
                    <div className="rounded-xl border bg-primary-50 p-4 text-center">
                      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <QrCode className="h-5 w-5 text-primary" />
                      </div>
                      <p className="font-semibold">Entrada segura por QR</p>
                      <p className="mb-4 text-xs text-muted-foreground">
                        {selectedSession.clinic?.name ?? "Clínica"} · sessão de{" "}
                        {selectedSession.service_date}
                      </p>
                      <div className="mx-auto w-fit rounded-lg bg-white p-3">
                        <QRCodeSVG
                          value={`${window.location.origin}/fila/qr/${selectedSession.public_token}`}
                          size={168}
                          includeMargin
                        />
                      </div>
                      <div className="mt-3 flex justify-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            void navigator.clipboard?.writeText(
                              `${window.location.origin}/fila/qr/${selectedSession.public_token}`,
                            );
                            toast({ title: "Link do QR copiado" });
                          }}
                        >
                          <Copy className="mr-1 h-3 w-3" />
                          Copiar link
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <a
                            href={`/fila/qr/${selectedSession.public_token}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <ExternalLink className="mr-1 h-3 w-3" />
                            Abrir
                          </a>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                      Selecione uma fila com entrada QR para visualizar o
                      código.
                    </div>
                  )}
                  <form
                    onSubmit={submit(() => issue.mutate())}
                    className="space-y-3"
                  >
                    <Picker
                      label="Fila aberta"
                      value={session}
                      onValue={setSession}
                      options={sessions.filter(
                        (item) => item.status === "open",
                      )}
                      labelOf={(item: Session) =>
                        `${item.clinic?.name} — ${item.service_date}${item.service?.name ? ` · ${item.service.name}` : ""}`
                      }
                    />
                    <Picker
                      label="Paciente"
                      value={patient}
                      onValue={setPatient}
                      options={patients}
                      labelOf={(item: any) =>
                        `${item.record_number} — ${item.person?.full_name ?? ""}`
                      }
                    />
                    <Button
                      disabled={
                        !canManage || !session || !patient || issue.isPending
                      }
                    >
                      <Ticket className="mr-1 h-4 w-4" />
                      Emitir senha manual
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Senhas recentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tickets.length ? (
                    tickets.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col gap-3 rounded border p-3 text-sm md:flex-row md:items-center"
                      >
                        <span className="font-mono font-semibold">
                          #{item.ticket_number}
                        </span>
                        <span className="flex-1">
                          {item.patient?.person?.full_name ??
                            item.patient?.record_number}
                        </span>
                        <Badge
                          variant={
                            item.status === "cancelled"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {TICKET_LABELS[item.status] ?? item.status}
                        </Badge>
                        <div className="flex flex-wrap gap-1">
                          {item.status === "waiting" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!canManage}
                              onClick={() =>
                                updateTicket.mutate({
                                  id: item.id,
                                  status: "called",
                                })
                              }
                            >
                              <PhoneCall className="mr-1 h-3 w-3" />
                              Chamar
                            </Button>
                          )}
                          {item.status === "called" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!canManage}
                              onClick={() =>
                                updateTicket.mutate({
                                  id: item.id,
                                  status: "checked_in",
                                })
                              }
                            >
                              Check-in
                            </Button>
                          )}
                          {["called", "checked_in"].includes(item.status) && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!canManage}
                              onClick={() =>
                                updateTicket.mutate({
                                  id: item.id,
                                  status: "in_service",
                                })
                              }
                            >
                              Iniciar
                            </Button>
                          )}
                          {item.status === "in_service" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!canManage}
                              onClick={() =>
                                updateTicket.mutate({
                                  id: item.id,
                                  status: "completed",
                                })
                              }
                            >
                              <Check className="mr-1 h-3 w-3" />
                              Concluir
                            </Button>
                          )}
                          {["waiting", "called", "checked_in"].includes(
                            item.status,
                          ) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={!canManage}
                              onClick={() =>
                                updateTicket.mutate({
                                  id: item.id,
                                  status: "cancelled",
                                })
                              }
                            >
                              <X className="mr-1 h-3 w-3" />
                              Cancelar
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      Nenhuma senha emitida.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

function Picker({
  label,
  value,
  onValue,
  options,
  labelOf,
}: {
  label: string;
  value: string;
  onValue: (value: string) => void;
  options: any[];
  labelOf: (item: any) => string;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onValue}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione" />
        </SelectTrigger>
        <SelectContent>
          {options.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {labelOf(item)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
