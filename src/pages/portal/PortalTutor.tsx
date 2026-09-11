import { useMutation, useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  Cat,
  Download,
  FileHeart,
  Plus,
  ShieldCheck,
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

type Animal = {
  animal_id: string;
  name: string;
  species: string;
  breed: string | null;
  last_consultation_at: string | null;
};

export default function PortalTutor() {
  const [selectedFeedbackConsultation, setSelectedFeedbackConsultation] =
    useState("");
  const [serviceScore, setServiceScore] = useState("5");
  const [organizationScore, setOrganizationScore] = useState("5");
  const [waitScore, setWaitScore] = useState("5");
  const [structureScore, setStructureScore] = useState("5");
  const [feedbackComment, setFeedbackComment] = useState("");
  const animals = useQuery({
    queryKey: ["tutor-portal-animals"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_my_tutor_animals" as never,
      );
      if (error) throw error;
      return (data ?? []) as Animal[];
    },
  });
  const journey = useQuery({
    queryKey: ["tutor-portal-journey"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_my_tutor_clinical_journey" as never,
      );
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
  const notifications = useQuery({
    queryKey: ["tutor-portal-notifications"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("notifications") as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
  const documents = useQuery({
    queryKey: ["tutor-portal-documents"],
    retry: false,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)(
        "get_my_tutor_documents",
      );
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
  const feedbackCandidates = useQuery({
    queryKey: ["tutor-feedback-candidates"],
    retry: false,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)(
        "get_my_tutor_feedback_candidates",
      );
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
  const submitFeedback = useMutation({
    mutationFn: async () => {
      if (!selectedFeedbackConsultation) {
        throw new Error("Selecione a consulta que deseja avaliar.");
      }
      const { error } = await (supabase.rpc as any)(
        "submit_my_tutor_consultation_feedback",
        {
          target_consultation_id: selectedFeedbackConsultation,
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
      setSelectedFeedbackConsultation("");
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
  const feedbackOptions = (feedbackCandidates.data ?? []).filter(
    (item) => !item.feedback_submitted,
  );
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <p className="text-sm font-medium text-primary">Portal do tutor</p>
          <h1 className="text-2xl font-bold">Meus animais</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe consultas e vacinas dos animais vinculados à sua conta.
          </p>
        </div>
        {animals.isError ? (
          <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            Sua conta ainda não está vinculada como tutor.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Somente seus vínculos são exibidos
              </div>
              <Button disabled>
                <Plus className="mr-1 h-4 w-4" />
                Cadastrar animal
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(animals.data ?? []).map((animal) => (
                <Card key={animal.animal_id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Cat className="h-5 w-5 text-primary" />
                      {animal.name}
                    </CardTitle>
                    <CardDescription>
                      {animal.species}
                      {animal.breed ? ` · ${animal.breed}` : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarDays className="h-4 w-4" />
                      Última consulta:{" "}
                      {animal.last_consultation_at
                        ? new Date(
                            animal.last_consultation_at,
                          ).toLocaleDateString("pt-BR")
                        : "Nenhuma registrada"}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {animals.data?.length === 0 && (
                <Card className="sm:col-span-2 lg:col-span-3">
                  <CardContent className="py-10 text-center text-sm text-muted-foreground">
                    Nenhum animal vinculado à sua conta.
                  </CardContent>
                </Card>
              )}
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Histórico clínico dos animais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {journey.data?.length ? (
                  journey.data.map((event, index) => (
                    <div
                      key={`${event.animal_id}-${event.event_date}-${index}`}
                      className="rounded border p-3 text-sm"
                    >
                      <strong>{event.animal_name}</strong> ·{" "}
                      {event.event_type === "vacina" ? "Vacinação" : "Consulta"}{" "}
                      · {new Date(event.event_date).toLocaleDateString("pt-BR")}
                      <p className="mt-1">{event.title}</p>
                      {event.details && (
                        <p className="text-xs text-muted-foreground">
                          {event.details}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma consulta ou vacina disponível.
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Star className="h-4 w-4 text-primary" />
                  Avalie a consulta veterinária
                </CardTitle>
                <CardDescription>
                  A avaliação é permitida apenas para consultas dos animais
                  vinculados à sua conta.
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
                      <Label htmlFor="tutor-feedback-consultation">Consulta</Label>
                      <select
                        id="tutor-feedback-consultation"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={selectedFeedbackConsultation}
                        onChange={(event) =>
                          setSelectedFeedbackConsultation(event.target.value)
                        }
                        required
                      >
                        <option value="">Selecione uma consulta</option>
                        {feedbackOptions.map((item) => (
                          <option key={item.consultation_id} value={item.consultation_id}>
                            {new Date(item.consultation_at).toLocaleDateString("pt-BR")} · {item.animal_name} · {item.clinic_name}
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
                      <Label htmlFor="tutor-feedback-comment">Comentário opcional</Label>
                      <Textarea
                        id="tutor-feedback-comment"
                        value={feedbackComment}
                        onChange={(event) => setFeedbackComment(event.target.value)}
                        maxLength={1500}
                        placeholder="Conte como foi a experiência do atendimento."
                      />
                    </div>
                    <Button disabled={submitFeedback.isPending}>
                      <Star className="mr-1 h-4 w-4" />
                      Enviar avaliação
                    </Button>
                  </form>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Não há consultas aguardando avaliação.
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileHeart className="h-4 w-4" />
                  Documentos dos animais
                </CardTitle>
                <CardDescription>
                  Laudos, receitas e arquivos liberados para seus animais
                  vinculados.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {documents.isError ? (
                  <p className="rounded bg-muted p-3 text-sm text-muted-foreground">
                    Os documentos veterinários serão disponibilizados após a
                    atualização segura do banco de dados.
                  </p>
                ) : documents.data?.length ? (
                  documents.data.map((item) => (
                    <div
                      key={item.document_id}
                      className="flex flex-col gap-2 rounded border p-3 text-sm sm:flex-row sm:items-center"
                    >
                      <span className="flex-1">
                        <strong>{item.file_name}</strong>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {item.animal_name} ·{" "}
                          {new Date(item.created_at).toLocaleDateString(
                            "pt-BR",
                          )}
                        </span>
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          const { data: signed, error } = await supabase.storage
                            .from("animal-documents")
                            .createSignedUrl(item.storage_path, 60);
                          if (error || !signed?.signedUrl) return;
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
                    Nenhum documento disponível para seus animais.
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Meus avisos</CardTitle>
                <CardDescription>
                  Notificações direcionadas à sua conta de tutor.
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
