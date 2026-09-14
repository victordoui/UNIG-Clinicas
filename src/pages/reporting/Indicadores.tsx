import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  Clock3,
  FlaskConical,
  GraduationCap,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Clinic = { id: string; name: string; code: string };
type Counts = {
  patients: number;
  appointments: number;
  waiting: number;
  encounters: number;
  procedures: number;
  exams: number;
  supervisions: number;
};
type ServiceSummary = {
  label: string;
  total: number;
  completed: number;
  cancelled: number;
};
type AcademicSummary = {
  label: string;
  total: number;
  active: number;
  completed: number;
};
type OperationalAnalytics = {
  kpis: {
    appointments: number;
    completed_appointments: number;
    no_shows: number;
    queue_entries: number;
    queue_completed: number;
    guest_entries: number;
    average_wait_minutes: number;
  };
  daily: Array<{
    date: string;
    appointments: number;
    completed: number;
    queue_entries: number;
    no_shows: number;
  }>;
  funnel: {
    joined: number;
    called: number;
    checked_in: number;
    completed: number;
    no_show: number;
  };
  wait_by_hour: Array<{ hour: number; average_wait_minutes: number }>;
};

const metrics = [
  {
    key: "patients",
    label: "Pacientes ativos",
    icon: Users,
    description: "Cadastros disponíveis para atendimento",
  },
  {
    key: "appointments",
    label: "Agendamentos",
    icon: CalendarDays,
    description: "Agendamentos em aberto",
  },
  {
    key: "waiting",
    label: "Aguardando na fila",
    icon: Clock3,
    description: "Senhas ainda não concluídas",
  },
  {
    key: "encounters",
    label: "Atendimentos concluídos",
    icon: Activity,
    description: "Encontros clínicos finalizados",
  },
  {
    key: "procedures",
    label: "Procedimentos planejados",
    icon: Activity,
    description: "Condutas clínicas em acompanhamento",
  },
  {
    key: "exams",
    label: "Exames solicitados",
    icon: FlaskConical,
    description: "Solicitações aguardando resultado",
  },
  {
    key: "supervisions",
    label: "Supervisões ativas",
    icon: GraduationCap,
    description: "Acompanhamentos acadêmico-clínicos",
  },
] as const;

async function countRows(query: any) {
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export default function Indicadores() {
  const [clinicId, setClinicId] = useState("all");
  const [periodDays, setPeriodDays] = useState("30");
  const { activeClinicCode } = useAuth();
  const report = useQuery({
    queryKey: ["clinical-indicators", clinicId],
    queryFn: async (): Promise<{
      clinics: Clinic[];
      counts: Counts;
      services: ServiceSummary[];
      academic: AcademicSummary[];
    }> => {
      const { data: clinicRows, error: clinicError } = await supabase
        .from("clinics")
        .select("id,name,code")
        .eq("is_active", true)
        .order("name");
      if (clinicError) throw clinicError;
      const clinics = (clinicRows ?? []) as Clinic[];
      const selected = clinicId !== "all" ? clinicId : null;
      let appointmentsReportQuery: any = (supabase as any)
        .from("appointments")
        .select("id,status,clinic_service:clinic_services(name)");
      let supervisionsReportQuery: any = (supabase as any)
        .from("student_supervisions")
        .select("id,status,clinic:clinics(name)");
      if (selected) {
        appointmentsReportQuery = appointmentsReportQuery.eq(
          "clinic_id",
          selected,
        );
        supervisionsReportQuery = supervisionsReportQuery.eq(
          "clinic_id",
          selected,
        );
      }
      const [appointmentsReport, supervisionsReport] = await Promise.all([
        appointmentsReportQuery.limit(5000),
        supervisionsReportQuery.limit(5000),
      ]);
      if (appointmentsReport.error) throw appointmentsReport.error;
      if (supervisionsReport.error) throw supervisionsReport.error;
      const serviceMap = new Map<string, ServiceSummary>();
      for (const item of appointmentsReport.data ?? []) {
        const label = item.clinic_service?.name ?? "Sem serviço definido";
        const row = serviceMap.get(label) ?? {
          label,
          total: 0,
          completed: 0,
          cancelled: 0,
        };
        row.total += 1;
        if (item.status === "completed") row.completed += 1;
        if (item.status === "cancelled" || item.status === "no_show")
          row.cancelled += 1;
        serviceMap.set(label, row);
      }
      const academicMap = new Map<string, AcademicSummary>();
      for (const item of supervisionsReport.data ?? []) {
        const label = item.clinic?.name ?? "Clínica sem identificação";
        const row = academicMap.get(label) ?? {
          label,
          total: 0,
          active: 0,
          completed: 0,
        };
        row.total += 1;
        if (["planned", "in_progress"].includes(item.status)) row.active += 1;
        if (item.status === "completed") row.completed += 1;
        academicMap.set(label, row);
      }
      const services = [...serviceMap.values()].sort(
        (left, right) => right.total - left.total,
      );
      const academic = [...academicMap.values()].sort(
        (left, right) => right.total - left.total,
      );

      if (!selected) {
        const [
          patients,
          appointments,
          waiting,
          encounters,
          procedures,
          exams,
          supervisions,
        ] = await Promise.all([
          countRows(
            supabase
              .from("patients")
              .select("id", { count: "exact", head: true })
              .eq("status", "active"),
          ),
          countRows(
            supabase
              .from("appointments")
              .select("id", { count: "exact", head: true })
              .in("status", ["scheduled", "confirmed", "checked_in"]),
          ),
          countRows(
            supabase
              .from("queue_tickets")
              .select("id", { count: "exact", head: true })
              .in("status", ["waiting", "called", "in_service"]),
          ),
          countRows(
            supabase
              .from("encounters")
              .select("id", { count: "exact", head: true })
              .eq("status", "completed"),
          ),
          countRows(
            (supabase as any)
              .from("clinical_procedures")
              .select("id", { count: "exact", head: true })
              .eq("status", "planned"),
          ),
          countRows(
            (supabase as any)
              .from("exam_orders")
              .select("id", { count: "exact", head: true })
              .in("status", ["requested", "collected"]),
          ),
          countRows(
            (supabase as any)
              .from("student_supervisions")
              .select("id", { count: "exact", head: true })
              .in("status", ["planned", "in_progress"]),
          ),
        ]);
        return {
          clinics,
          counts: {
            patients,
            appointments,
            waiting,
            encounters,
            procedures,
            exams,
            supervisions,
          },
          services,
          academic,
        };
      }

      const [links, sessions] = await Promise.all([
        (supabase.from("patient_clinic_links") as any)
          .select("patient_id")
          .eq("clinic_id", selected),
        supabase
          .from("queue_sessions")
          .select("id")
          .eq("clinic_id", selected)
          .in("status", ["open", "paused"]),
      ]);
      if (links.error) throw links.error;
      if (sessions.error) throw sessions.error;
      const patientIds = (links.data ?? []).map(
        (row: { patient_id: string }) => row.patient_id,
      );
      const sessionIds = (sessions.data ?? []).map(
        (row: { id: string }) => row.id,
      );
      const [
        patients,
        appointments,
        waiting,
        encounters,
        procedures,
        exams,
        supervisions,
      ] = await Promise.all([
        patientIds.length
          ? countRows(
              supabase
                .from("patients")
                .select("id", { count: "exact", head: true })
                .in("id", patientIds)
                .eq("status", "active"),
            )
          : 0,
        countRows(
          supabase
            .from("appointments")
            .select("id", { count: "exact", head: true })
            .eq("clinic_id", selected)
            .in("status", ["scheduled", "confirmed", "checked_in"]),
        ),
        sessionIds.length
          ? countRows(
              supabase
                .from("queue_tickets")
                .select("id", { count: "exact", head: true })
                .in("queue_session_id", sessionIds)
                .in("status", ["waiting", "called", "in_service"]),
            )
          : 0,
        countRows(
          supabase
            .from("encounters")
            .select("id", { count: "exact", head: true })
            .eq("clinic_id", selected)
            .eq("status", "completed"),
        ),
        countRows(
          (supabase as any)
            .from("clinical_procedures")
            .select("id", { count: "exact", head: true })
            .eq("clinic_id", selected)
            .eq("status", "planned"),
        ),
        countRows(
          (supabase as any)
            .from("exam_orders")
            .select("id", { count: "exact", head: true })
            .eq("clinic_id", selected)
            .in("status", ["requested", "collected"]),
        ),
        countRows(
          (supabase as any)
            .from("student_supervisions")
            .select("id", { count: "exact", head: true })
            .eq("clinic_id", selected)
            .in("status", ["planned", "in_progress"]),
        ),
      ]);
      return {
        clinics,
        counts: {
          patients,
          appointments,
          waiting,
          encounters,
          procedures,
          exams,
          supervisions,
        },
        services,
        academic,
      };
    },
  });
  const feedbackSummary = useQuery({
    queryKey: ["clinic-feedback-summary", clinicId],
    retry: false,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)(
        "get_clinic_feedback_summary",
        { target_clinic_id: clinicId === "all" ? null : clinicId },
      );
      if (error) throw error;
      return (data ?? []) as Array<{
        clinic_id: string;
        clinic_name: string;
        response_count: number;
        average_service: number;
        average_organization: number;
        average_wait: number;
        average_structure: number;
        average_overall: number;
      }>;
    },
  });
  const operationalAnalytics = useQuery({
    queryKey: ["clinic-operational-analytics", clinicId, periodDays],
    queryFn: async (): Promise<OperationalAnalytics> => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - (Number(periodDays) - 1));
      const { data, error } = await (supabase.rpc as any)(
        "get_clinic_operational_analytics",
        {
          target_clinic_id: clinicId === "all" ? null : clinicId,
          date_from: start.toISOString().slice(0, 10),
          date_to: end.toISOString().slice(0, 10),
        },
      );
      if (error) throw error;
      return data as OperationalAnalytics;
    },
  });
  const previousOperationalAnalytics = useQuery({
    queryKey: ["clinic-operational-analytics-previous", clinicId, periodDays],
    queryFn: async (): Promise<OperationalAnalytics> => {
      const period = Number(periodDays);
      const end = new Date();
      end.setDate(end.getDate() - period);
      const start = new Date(end);
      start.setDate(start.getDate() - (period - 1));
      const { data, error } = await (supabase.rpc as any)(
        "get_clinic_operational_analytics",
        {
          target_clinic_id: clinicId === "all" ? null : clinicId,
          date_from: start.toISOString().slice(0, 10),
          date_to: end.toISOString().slice(0, 10),
        },
      );
      if (error) throw error;
      return data as OperationalAnalytics;
    },
  });
  const counts = report.data?.counts;
  const analytics = operationalAnalytics.data;
  const previousAnalytics = previousOperationalAnalytics.data;
  const changeLabel = (current: number | undefined, previous: number | undefined, inverse = false) => {
    if (current === undefined || previous === undefined) return "sem comparação";
    if (previous === 0) return current === 0 ? "sem variação" : "novo no período";
    const change = Math.round(((current - previous) / previous) * 100);
    const isPositive = inverse ? change <= 0 : change >= 0;
    return `${change > 0 ? "+" : ""}${change}% vs. anterior${isPositive ? "" : " · atenção"}`;
  };
  const funnelData = analytics
    ? [
        { label: "Entraram", value: analytics.funnel.joined },
        { label: "Chamados", value: analytics.funnel.called },
        { label: "Chegaram", value: analytics.funnel.checked_in },
        { label: "Concluídos", value: analytics.funnel.completed },
        { label: "Faltas", value: analytics.funnel.no_show },
      ]
    : [];
  const operationalAlerts = [
    analytics && analytics.kpis.average_wait_minutes > 30
      ? { title: "Espera acima da meta", detail: `A espera média é de ${analytics.kpis.average_wait_minutes} min no período selecionado.` }
      : null,
    analytics && analytics.kpis.appointments > 0 && (analytics.kpis.no_shows / analytics.kpis.appointments) >= 0.1
      ? { title: "Faltas em atenção", detail: `${Math.round((analytics.kpis.no_shows / analytics.kpis.appointments) * 100)}% dos agendamentos/senhas resultaram em falta.` }
      : null,
    feedbackSummary.data?.some((item) => item.response_count >= 3 && Number(item.average_overall) < 4)
      ? { title: "Satisfação abaixo do alvo", detail: "Há clínica com média geral abaixo de 4,0 nas avaliações disponíveis." }
      : null,
    counts && counts.waiting >= 10
      ? { title: "Fila em atenção", detail: `${counts.waiting} senha(s) aguardam ou estão em atendimento no escopo atual.` }
      : null,
  ].filter(Boolean) as Array<{ title: string; detail: string }>;
  useEffect(() => {
    if (!activeClinicCode || !report.data?.clinics?.length) return;
    const activeClinic = report.data.clinics.find(
      (clinic) => clinic.code === activeClinicCode,
    );
    if (activeClinic) setClinicId(activeClinic.id);
  }, [activeClinicCode, report.data?.clinics]);

  const exportCsv = () => {
    if (!counts) return;
    const scope =
      clinicId === "all"
        ? "Todas as clínicas visíveis"
        : (report.data?.clinics.find((clinic) => clinic.id === clinicId)
            ?.name ?? "Clínica");
    const lines = [
      ["Indicador", "Quantidade"],
      ...metrics.map((metric) => [metric.label, String(counts[metric.key])]),
      [],
      ["Relatório por serviço"],
      ["Serviço", "Agendamentos", "Concluídos", "Cancelados / faltas"],
      ...(report.data?.services ?? []).map((item) => [
        item.label,
        String(item.total),
        String(item.completed),
        String(item.cancelled),
      ]),
      [],
      ["Relatório acadêmico"],
      ["Clínica", "Supervisões", "Ativas", "Concluídas"],
      ...(report.data?.academic ?? []).map((item) => [
        item.label,
        String(item.total),
        String(item.active),
        String(item.completed),
      ]),
      [],
      ["Escopo", scope],
      ["Gerado em", new Date().toLocaleString("pt-BR")],
    ].map((row) =>
      row.map((value) => `"${value.replaceAll('"', '""')}"`).join(";"),
    );
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${lines.join("\n")}`], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `indicadores-unig-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Indicadores clínicos</h1>
            <p className="text-sm text-muted-foreground">
              Visão operacional agregada ou filtrada por clínica. Esta página
              não exibe conteúdo de prontuário.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
            <div className="w-full space-y-1 md:w-[260px]">
              <Label>Escopo dos indicadores</Label>
              <Select value={clinicId} onValueChange={setClinicId}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as clínicas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    Todas as clínicas visíveis
                  </SelectItem>
                  {(report.data?.clinics ?? []).map((clinic) => (
                    <SelectItem key={clinic.id} value={clinic.id}>
                      {clinic.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full space-y-1 md:w-[160px]">
              <Label>Período</Label>
              <Select value={periodDays} onValueChange={setPeriodDays}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 dias</SelectItem>
                  <SelectItem value="30">30 dias</SelectItem>
                  <SelectItem value="90">90 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="outline"
              className="mt-auto"
              disabled={!counts}
              onClick={exportCsv}
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <Card key={metric.key}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">
                      {metric.label}
                    </CardTitle>
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {report.isLoading ? "—" : counts?.[metric.key]}
                  </div>
                  <CardDescription className="mt-1 text-xs">
                    {metric.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold">Análise operacional</h2>
            <p className="text-sm text-muted-foreground">Demanda, capacidade e espera no período selecionado. Os dados são agregados por clínica.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Entradas na fila", analytics?.kpis.queue_entries, previousAnalytics?.kpis.queue_entries, false],
              ["Tempo médio de espera", analytics ? `${analytics.kpis.average_wait_minutes} min` : undefined, previousAnalytics?.kpis.average_wait_minutes, true],
              ["Visitantes sem conta", analytics?.kpis.guest_entries, previousAnalytics?.kpis.guest_entries, false],
              ["Faltas / no-show", analytics?.kpis.no_shows, previousAnalytics?.kpis.no_shows, true],
            ].map(([label, value, previous, inverse]) => (
              <Card key={String(label)}><CardContent className="p-5"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-bold">{operationalAnalytics.isLoading ? "—" : value ?? 0}</p><p className="mt-1 text-xs text-muted-foreground">{previousOperationalAnalytics.isLoading ? "Comparando…" : changeLabel(typeof value === "string" ? Number.parseInt(value, 10) : value as number | undefined, previous as number | undefined, Boolean(inverse))}</p></CardContent></Card>
            ))}
          </div>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4 text-amber-600" />Alertas operacionais</CardTitle><CardDescription>Limites iniciais para priorização de gestão; devem ser calibrados por clínica.</CardDescription></CardHeader>
            <CardContent className="space-y-2">{operationalAlerts.length ? operationalAlerts.map((alert) => <div key={alert.title} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm"><p className="font-medium text-amber-900">{alert.title}</p><p className="mt-1 text-amber-800">{alert.detail}</p></div>) : <p className="text-sm text-muted-foreground">Nenhum alerta nos limites atuais para o período selecionado.</p>}</CardContent>
          </Card>
          {operationalAnalytics.isError ? (
            <Card><CardContent className="p-5 text-sm text-muted-foreground">Os gráficos serão habilitados assim que a atualização de indicadores estiver disponível para esta conta.</CardContent></Card>
          ) : (
            <div className="grid gap-5 xl:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-base">Demanda e atendimentos</CardTitle><CardDescription>Volume diário de agendamentos, conclusões e entradas na fila.</CardDescription></CardHeader>
                <CardContent className="h-[280px] p-3 sm:p-5">
                  <ResponsiveContainer width="100%" height="100%"><LineChart data={analytics?.daily ?? []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tickFormatter={(value) => new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} minTickGap={28} /><YAxis allowDecimals={false} /><Tooltip labelFormatter={(value) => new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR")} /><Line type="monotone" dataKey="appointments" name="Agendamentos" stroke="#0f766e" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="completed" name="Concluídos" stroke="#16a34a" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="queue_entries" name="Entradas na fila" stroke="#d97706" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Funil da fila</CardTitle><CardDescription>Da emissão da senha à conclusão do atendimento.</CardDescription></CardHeader>
                <CardContent className="h-[280px] p-3 sm:p-5">
                  <ResponsiveContainer width="100%" height="100%"><BarChart data={funnelData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" tick={{ fontSize: 12 }} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" name="Quantidade" fill="#0f766e" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="xl:col-span-2">
                <CardHeader><CardTitle className="text-base">Espera média por hora de chegada</CardTitle><CardDescription>Identifique os horários que precisam de reforço de equipe ou capacidade.</CardDescription></CardHeader>
                <CardContent className="h-[260px] p-3 sm:p-5">
                  <ResponsiveContainer width="100%" height="100%"><BarChart data={analytics?.wait_by_hour ?? []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="hour" tickFormatter={(value) => `${value}h`} /><YAxis allowDecimals={false} /><Tooltip labelFormatter={(value) => `${value}h`} formatter={(value) => [`${value} min`, "Espera média"]} /><Bar dataKey="average_wait_minutes" name="Espera média" fill="#0891b2" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </section>
        <div className="grid gap-5 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Relatório por serviço</CardTitle>
              <CardDescription>
                Agendamentos, conclusões e ausências no escopo selecionado.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {report.data?.services?.length ? (
                report.data.services.map((item) => (
                  <div
                    key={item.label}
                    className="grid grid-cols-[1fr_auto_auto_auto] gap-3 rounded border p-3 text-sm"
                  >
                    <span className="font-medium">{item.label}</span>
                    <span title="Agendamentos">{item.total} ag.</span>
                    <span className="text-emerald-700">
                      {item.completed} concl.
                    </span>
                    <span className="text-muted-foreground">
                      {item.cancelled} aus.
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Não há agendamentos visíveis neste escopo.
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Relatório acadêmico</CardTitle>
              <CardDescription>
                Supervisões clínicas por unidade de atendimento.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {report.data?.academic?.length ? (
                report.data.academic.map((item) => (
                  <div
                    key={item.label}
                    className="grid grid-cols-[1fr_auto_auto_auto] gap-3 rounded border p-3 text-sm"
                  >
                    <span className="font-medium">{item.label}</span>
                    <span>{item.total} total</span>
                    <span className="text-primary">{item.active} ativas</span>
                    <span className="text-emerald-700">
                      {item.completed} concl.
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Não há supervisões visíveis neste escopo.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Satisfação pós-atendimento</CardTitle>
            <CardDescription>
              Médias agregadas por clínica. Comentários e identificação do
              paciente não são exibidos neste painel.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {feedbackSummary.isError ? (
              <p className="text-sm text-muted-foreground">
                O indicador será habilitado após a atualização segura do banco
                de dados.
              </p>
            ) : feedbackSummary.data?.length ? (
              feedbackSummary.data.map((item) => (
                <div
                  key={item.clinic_id}
                  className="grid gap-2 rounded border p-3 text-sm sm:grid-cols-[1fr_auto_auto_auto_auto_auto] sm:items-center"
                >
                  <span className="font-medium">{item.clinic_name}</span>
                  <span>{item.response_count} resposta(s)</span>
                  <span title="Média geral">Geral {item.average_overall}★</span>
                  <span title="Atendimento">Atend. {item.average_service}★</span>
                  <span title="Organização">Org. {item.average_organization}★</span>
                  <span title="Tempo de espera e estrutura">Espera {item.average_wait}★ · Estrutura {item.average_structure}★</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Ainda não há avaliações no escopo selecionado.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leitura operacional</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Os indicadores são filtrados pelas permissões RLS da conta
            autenticada. Para exportações formais, defina período, escopo de
            clínica e regras de anonimização antes da publicação.
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
