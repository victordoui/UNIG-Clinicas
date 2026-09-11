import { useMutation, useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  Download,
  FileHeart,
  History,
  QrCode,
  Star,
} from "lucide-react";
import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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
  const [selectedFeedbackAppointment, setSelectedFeedbackAppointment] =
    useState("");
  const [serviceScore, setServiceScore] = useState("5");
  const [organizationScore, setOrganizationScore] = useState("5");
  const [waitScore, setWaitScore] = useState("5");
  const [structureScore, setStructureScore] = useState("5");
  const [feedbackComment, setFeedbackComment] = useState("");
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
  const notifications = useQuery({
    queryKey: ["patient-portal-notifications"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("notifications") as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
  const feedbackCandidates = useQuery({
    queryKey: ["patient-feedback-candidates"],
    retry: false,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)(
        "get_my_feedback_candidates",
      );
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
  const submitFeedback = useMutation({
    mutationFn: async () => {
      if (!selectedFeedbackAppointment) {
        throw new Error("Selecione o atendimento que deseja avaliar.");
      }
      const { error } = await (supabase.rpc as any)(
        "submit_my_appointment_feedback",
        {
          target_appointment_id: selectedFeedbackAppointment,
          target_service_score: Number(serviceScore),
          target_organization_score: Number(organizationScore),
          target_wait_score: Number(waitScore),
          target_structure_score: Number(structureScore),
          target_comment: feedbackComment.trim() || null,
        },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      setSelectedFeedbackAppointment("");
      setFeedbackComment("");
      feedbackCandidates.refetch();
      toast({ title: "Avaliação enviada", description: "Obrigado pelo seu retorno." });
    },
    onError: (error: Error) =>
      toast({
        title: "Não foi possível enviar a avaliação",
        description: error.message,
        variant: "destructive",
      }),
  });
  const data = portal.data;
  const feedbackOptions = (feedbackCandidates.data ?? []).filter(
    (item) => !item.feedback_submitted,
  );
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
                <CardTitle className="flex items-center gap-2 text-base">
                  <Star className="h-4 w-4 text-primary" />
                  Avalie seu atendimento
                </CardTitle>
                <CardDescription>
                  Sua resposta é vinculada somente a um atendimento concluído e
                  os indicadores da gestão são exibidos de forma agregada.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {feedbackCandidates.isError ? (
                  <p className="rounded bg-muted p-3 text-sm text-muted-foreground">
                    A avaliação será disponibilizada após a atualização segura
                    do banco de dados.
                  </p>
                ) : feedbackOptions.length ? (
                  <form
                    className="space-y-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      submitFeedback.mutate();
                    }}
                  >
                    <div className="space-y-1">
                      <Label htmlFor="feedback-appointment">Atendimento</Label>
                      <select
                        id="feedback-appointment"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={selectedFeedbackAppointment}
                        onChange={(event) =>
                          setSelectedFeedbackAppointment(event.target.value)
                        }
                        required
                      >
                        <option value="">Selecione um atendimento concluído</option>
                        {feedbackOptions.map((item) => (
                          <option key={item.appointment_id} value={item.appointment_id}>
                            {new Date(item.scheduled_at).toLocaleDateString("pt-BR")} · {item.clinic_name}
                            {item.service_name ? ` · ${item.service_name}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <RatingField label="Atendimento" value={serviceScore} onChange={setServiceScore} />
                      <RatingField label="Organização" value={organizationScore} onChange={setOrganizationScore} />
                      <RatingField label="Tempo de espera" value={waitScore} onChange={setWaitScore} />
                      <RatingField label="Estrutura" value={structureScore} onChange={setStructureScore} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="feedback-comment">Comentário opcional</Label>
                      <Textarea
                        id="feedback-comment"
                        value={feedbackComment}
                        onChange={(event) => setFeedbackComment(event.target.value)}
                        maxLength={1500}
                        placeholder="Conte como foi sua experiência."
                      />
                    </div>
                    <Button disabled={submitFeedback.isPending}>
                      <Star className="mr-1 h-4 w-4" />
                      Enviar avaliação
                    </Button>
                  </form>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Não há atendimentos concluídos aguardando avaliação.
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
                          else
                            toast({
                              title: "Não foi possível abrir o documento",
                              description:
                                "Verifique se o arquivo continua disponível para o seu cadastro.",
                              variant: "destructive",
                            });
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
                <CardTitle className="text-base">Meus avisos</CardTitle>
                <CardDescription>
                  Notificações direcionadas à sua conta.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {notifications.data?.length ? (
                  notifications.data.map((item) => (
                    <div key={item.id} className="rounded border p-3 text-sm">
                      <div className="flex justify-between gap-3">
                        <strong>{item.title ?? "Aviso"}</strong>
                        {!item.read_at && (
                          <span className="text-xs text-primary">Novo</span>
                        )}
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        {item.message ??
                          item.body ??
                          item.content ??
                          "Sem detalhes adicionais."}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhum aviso disponível.
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

function RatingField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <select
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {[5, 4, 3, 2, 1].map((score) => (
          <option key={score} value={score}>
            {score} {score === 1 ? "estrela" : "estrelas"}
          </option>
        ))}
      </select>
    </div>
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
