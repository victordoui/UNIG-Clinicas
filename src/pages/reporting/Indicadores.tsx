import { useQuery } from "@tanstack/react-query";
import {
  Activity,
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
  const counts = report.data?.counts;
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
