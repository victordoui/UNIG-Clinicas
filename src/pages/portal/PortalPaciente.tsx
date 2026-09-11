import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  Download,
  FileHeart,
  History,
  QrCode,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type PortalData = {
  patient_id: string;
  full_name: string;
  preferred_name: string | null;
  record_number: string;
  next_appointment_at: string | null;
  next_clinic_name: string | null;
  next_service_name: string | null;
};

export default function PortalPaciente() {
  const portal = useQuery({
    queryKey: ["patient-portal"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_my_patient_portal" as never,
      );
      if (error) throw error;
      return (Array.isArray(data) ? data[0] : data) as PortalData | null;
    },
  });
  const appointments = useQuery({
    queryKey: ["patient-portal-appointments"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_my_patient_appointments" as never,
      );
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
  const documents = useQuery({
    queryKey: ["patient-portal-documents"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_my_patient_documents" as never,
      );
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
  const data = portal.data;
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <p className="text-sm font-medium text-primary">Portal do paciente</p>
          <h1 className="text-2xl font-bold">
            Olá{data?.full_name ? `, ${data.full_name.split(" ")[0]}` : ""} 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe somente seus horários, histórico e documentos autorizados.
          </p>
        </div>
        {portal.isError ? (
          <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            Sua conta ainda não está vinculada a um cadastro de paciente.
          </p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <ActionCard
                icon={QrCode}
                title="Entrar na fila"
                description="Use o QR da clínica"
                disabled
              />
              <ActionCard
                icon={CalendarDays}
                title="Agenda"
                description={
                  data?.next_appointment_at
                    ? new Date(data.next_appointment_at).toLocaleString("pt-BR")
                    : "Nenhum próximo atendimento"
                }
              />
              <ActionCard
                icon={History}
                title="Histórico"
                description={`${appointments.data?.filter((item) => new Date(item.scheduled_at) < new Date()).length ?? 0} agendamento(s)`}
              />
              <ActionCard
                icon={FileHeart}
                title="Documentos"
                description={`${documents.data?.length ?? 0} disponível(is)`}
              />
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Minha agenda</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {appointments.data?.length ? (
                  appointments.data.map((item) => (
                    <div
                      key={item.appointment_id}
                      className="rounded border p-3 text-sm"
                    >
                      <strong>
                        {new Date(item.scheduled_at).toLocaleString("pt-BR")}
                      </strong>{" "}
                      · {item.clinic_name}
                      {item.service_name ? ` · ${item.service_name}` : ""}
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {item.reason || "Atendimento"} · {item.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhum agendamento disponível.
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Meus documentos</CardTitle>
                <CardDescription>
                  Arquivos liberados para seu cadastro.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {documents.data?.length ? (
                  documents.data.map((item) => (
                    <div
                      key={item.document_id}
                      className="flex items-center justify-between rounded border p-3 text-sm"
                    >
                      <span>
                        {item.file_name}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {new Date(item.created_at).toLocaleDateString(
                            "pt-BR",
                          )}
                        </span>
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          const { data: signed } = await supabase.storage
                            .from("clinical-documents")
                            .createSignedUrl(item.storage_path, 60);
                          if (signed?.signedUrl)
                            window.open(
                              signed.signedUrl,
                              "_blank",
                              "noopener,noreferrer",
                            );
                        }}
                      >
                        <Download className="mr-1 h-3 w-3" />
                        Abrir
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhum documento disponível.
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Meu cadastro</CardTitle>
                <CardDescription>
                  Dados básicos usados para localizar seu atendimento.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Nome</p>
                  <p className="font-medium">{data?.full_name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Prontuário</p>
                  <p className="font-mono text-sm">
                    {data?.record_number ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Próximo atendimento
                  </p>
                  <p className="font-medium">
                    {data?.next_clinic_name
                      ? `${data.next_clinic_name}${data.next_service_name ? ` · ${data.next_service_name}` : ""}`
                      : "Nenhum agendamento próximo"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  );
}

function ActionCard({
  icon: Icon,
  title,
  description,
  disabled = false,
}: {
  icon: typeof QrCode;
  title: string;
  description: string;
  disabled?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <div className="rounded-lg bg-primary/10 p-2">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
          {disabled && (
            <Button variant="link" className="h-auto px-0 text-xs" disabled>
              Disponível pelo QR
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
