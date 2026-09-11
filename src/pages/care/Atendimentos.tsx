import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardPenLine,
  Play,
  Save,
  Send,
  SquareCheckBig,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

export default function Atendimentos() {
  const qc = useQueryClient();
  const { activeClinicCode } = useAuth();
  const [clinic, setClinic] = useState("");
  const [patient, setPatient] = useState("");
  const [encounter, setEncounter] = useState("");
  const [note, setNote] = useState("");
  const [noteType, setNoteType] = useState<
    "evolution" | "assessment" | "procedure"
  >("evolution");
  const [history, setHistory] = useState("");
  const [allergies, setAllergies] = useState("");
  const [medications, setMedications] = useState("");
  const data = useQuery({
    queryKey: ["clinical-workspace"],
    queryFn: async () => {
      const [clinics, patients, encounters, notes] = await Promise.all([
        supabase
          .from("clinics")
          .select("id,organization_id,name,code")
          .eq("is_active", true),
        supabase
          .from("patients")
          .select("id,record_number,person:persons(full_name)")
          .eq("status", "active"),
        supabase
          .from("encounters")
          .select(
            "id,organization_id,clinic_id,patient_id,status,started_at,clinic:clinics(name,code),patient:patients(record_number,person:persons(full_name))",
          )
          .order("started_at", { ascending: false })
          .limit(30),
        (supabase.from("clinical_notes") as any)
          .select(
            "id,encounter_id,note_type,content,authored_at,signed_at,workflow_status,review_feedback",
          )
          .order("authored_at", { ascending: false })
          .limit(50),
        (supabase.from("clinical_procedures") as any)
          .select(
            "id,patient_id,encounter_id,name,status,created_at,performed_at",
          )
          .is("archived_at", null)
          .order("created_at", { ascending: false })
          .limit(80),
        (supabase.from("exam_orders") as any)
          .select(
            "id,patient_id,encounter_id,exam_name,status,requested_at,completed_at,result_summary",
          )
          .order("requested_at", { ascending: false })
          .limit(80),
        (supabase.from("documents") as any)
          .select(
            "id,patient_id,encounter_id,document_type,file_name,created_at,archived_at",
          )
          .is("archived_at", null)
          .order("created_at", { ascending: false })
          .limit(80),
        (supabase.from("student_supervisions") as any)
          .select("id,encounter_id,status,created_at")
          .order("created_at", { ascending: false })
          .limit(80),
      ]);
      for (const r of [
        clinics,
        patients,
        encounters,
        notes,
        procedures,
        exams,
        documents,
        supervisions,
      ])
        if (r.error) throw r.error;
      return {
        clinics: clinics.data ?? [],
        patients: patients.data ?? [],
        encounters: encounters.data ?? [],
        notes: notes.data ?? [],
        procedures: procedures.data ?? [],
        exams: exams.data ?? [],
        documents: documents.data ?? [],
        supervisions: supervisions.data ?? [],
      };
    },
  });
  const refresh = () =>
    qc.invalidateQueries({ queryKey: ["clinical-workspace"] });
  const begin = useMutation({
    mutationFn: async () => {
      const c = (data.data?.clinics as any[]).find((x) => x.id === clinic);
      const { data: row, error } = await (supabase.from("encounters") as any)
        .insert({
          organization_id: c.organization_id,
          clinic_id: clinic,
          patient_id: patient,
          status: "in_progress",
        })
        .select("id")
        .single();
      if (error) throw error;
      return row.id;
    },
    onSuccess: (id) => {
      refresh();
      setEncounter(id);
      toast({ title: "Atendimento iniciado" });
    },
    onError: (e: Error) =>
      toast({
        title: "Erro ao iniciar atendimento",
        description: e.message,
        variant: "destructive",
      }),
  });
  const addNote = useMutation({
    mutationFn: async () => {
      const content =
        noteType === "assessment"
          ? `ANAMNESE E AVALIAÇÃO\n\nQueixa/observações: ${note.trim()}\n\nAntecedentes: ${history.trim() || "Não informado"}\n\nAlergias: ${allergies.trim() || "Não informado"}\n\nMedicações em uso: ${medications.trim() || "Não informado"}`
          : note;
      const { error } = await supabase.rpc(
        "create_clinical_note" as never,
        {
          target_encounter_id: encounter,
          target_note_type: noteType,
          note_content: content,
          correction_of: null,
          correction_reason: null,
        } as never,
      );
      if (error) throw error;
    },
    onSuccess: () => {
      refresh();
      setNote("");
      setHistory("");
      setAllergies("");
      setMedications("");
      toast({
        title:
          noteType === "assessment"
            ? "Anamnese registrada"
            : "Evolução registrada",
      });
    },
    onError: (e: Error) =>
      toast({
        title: "Não foi possível registrar",
        description: e.message,
        variant: "destructive",
      }),
  });
  const transitionNote = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "submitted" }) => {
      const { error } = await supabase.rpc(
        "transition_clinical_note" as never,
        {
          target_note_id: id,
          target_status: status,
          target_feedback: null,
        } as never,
      );
      if (error) throw error;
    },
    onSuccess: () => {
      refresh();
      toast({ title: "Evolução enviada para supervisão" });
    },
    onError: (e: Error) =>
      toast({
        title: "Não foi possível enviar",
        description: e.message,
        variant: "destructive",
      }),
  });
  const complete = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.from("encounters") as any)
        .update({ status: "completed", ended_at: new Date().toISOString() })
        .eq("id", encounter);
      if (error) throw error;
    },
    onSuccess: () => {
      refresh();
      toast({ title: "Atendimento concluído" });
    },
    onError: (e: Error) =>
      toast({
        title: "Erro ao concluir",
        description: e.message,
        variant: "destructive",
      }),
  });
  const visibleClinics = useMemo(
    () =>
      ((data.data?.clinics as any[]) ?? []).filter(
        (item: any) => !activeClinicCode || item.code === activeClinicCode,
      ),
    [activeClinicCode, data.data?.clinics],
  );
  const visibleEncounters = useMemo(
    () =>
      ((data.data?.encounters as any[]) ?? []).filter(
        (item: any) =>
          !activeClinicCode || item.clinic?.code === activeClinicCode,
      ),
    [activeClinicCode, data.data?.encounters],
  );
  useEffect(() => {
    if (clinic && !visibleClinics.some((item: any) => item.id === clinic))
      setClinic("");
    if (
      encounter &&
      !visibleEncounters.some((item: any) => item.id === encounter)
    )
      setEncounter("");
  }, [clinic, encounter, visibleClinics, visibleEncounters]);
  const submit = (fn: () => void) => (e: FormEvent) => {
    e.preventDefault();
    fn();
  };
  const selected = visibleEncounters.find((x) => x.id === encounter);
  const notes =
    (data.data?.notes as any[])?.filter((x) => x.encounter_id === encounter) ??
    [];
  const patientProcedures = ((data.data?.procedures as any[]) ?? []).filter(
    (x) => x.patient_id === selected?.patient_id,
  );
  const patientExams = ((data.data?.exams as any[]) ?? []).filter(
    (x) => x.patient_id === selected?.patient_id,
  );
  const patientDocuments = ((data.data?.documents as any[]) ?? []).filter(
    (x) => x.patient_id === selected?.patient_id,
  );
  const encounterSupervisions = (
    (data.data?.supervisions as any[]) ?? []
  ).filter((x) => x.encounter_id === selected?.id);
  const workflowLabels: Record<string, string> = {
    draft: "Rascunho",
    submitted: "Enviada",
    under_review: "Em revisão",
    changes_requested: "Correção solicitada",
    approved: "Aprovada",
  };
  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <ClipboardPenLine className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Atendimentos</h1>
            <p className="text-sm text-muted-foreground">
              Registre evoluções clínicas com trilha de autoria, rascunho e
              envio seguro para supervisão.
            </p>
          </div>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Iniciar atendimento</CardTitle>
              <CardDescription>
                Selecione clínica e paciente para criar o encontro clínico.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={submit(() => begin.mutate())}
                className="space-y-3"
              >
                <Picker
                  label="Clínica"
                  value={clinic}
                  onValue={setClinic}
                  options={visibleClinics}
                  text={(x: any) => x.name}
                />
                <Picker
                  label="Paciente"
                  value={patient}
                  onValue={setPatient}
                  options={(data.data?.patients as any[]) ?? []}
                  text={(x: any) =>
                    `${x.record_number} — ${x.person?.full_name ?? ""}`
                  }
                />
                <Button disabled={!clinic || !patient || begin.isPending}>
                  <Play className="mr-1 h-4 w-4" />
                  Iniciar
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evolução</CardTitle>
              <CardDescription>
                O registro nasce como rascunho. Depois de conferir, envie-o para
                supervisão.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={submit(() => addNote.mutate())}
                className="space-y-3"
              >
                <Picker
                  label="Atendimento"
                  value={encounter}
                  onValue={setEncounter}
                  options={visibleEncounters.filter(
                    (x: any) => x.status === "in_progress",
                  )}
                  text={(x: any) =>
                    `${x.patient?.person?.full_name ?? "Paciente"} — ${x.clinic?.name ?? ""}`
                  }
                />
                <div className="space-y-1">
                  <Label>Tipo de registro</Label>
                  <Select
                    value={noteType}
                    onValueChange={(value: "evolution" | "assessment" | "procedure") =>
                      setNoteType(value)
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="evolution">Evolução</SelectItem>
                      <SelectItem value="assessment">Anamnese e avaliação</SelectItem>
                      <SelectItem value="procedure">Registro de procedimento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>{noteType === "assessment" ? "Queixa principal e observações" : "Registro da evolução"}</Label>
                  <Textarea
                    required
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={noteType === "assessment" ? 3 : 5}
                    placeholder={noteType === "assessment" ? "Descreva a queixa principal e os achados iniciais..." : "Descreva a evolução do atendimento..."}
                  />
                </div>
                {noteType === "assessment" && (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1"><Label>Antecedentes</Label><Textarea value={history} onChange={(e) => setHistory(e.target.value)} rows={3} /></div>
                    <div className="space-y-1"><Label>Alergias</Label><Textarea value={allergies} onChange={(e) => setAllergies(e.target.value)} rows={3} /></div>
                    <div className="space-y-1"><Label>Medicações em uso</Label><Textarea value={medications} onChange={(e) => setMedications(e.target.value)} rows={3} /></div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    disabled={!encounter || !note.trim() || addNote.isPending}
                  >
                    <Save className="mr-1 h-4 w-4" />
                    {noteType === "assessment" ? "Salvar anamnese" : "Salvar rascunho"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!encounter || complete.isPending}
                    onClick={() => complete.mutate()}
                  >
                    <SquareCheckBig className="mr-1 h-4 w-4" />
                    Concluir
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Atendimentos recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {visibleEncounters.length ? (
                visibleEncounters.map((x) => (
                  <button
                    key={x.id}
                    onClick={() => setEncounter(x.id)}
                    className="grid w-full grid-cols-3 rounded border p-3 text-left text-sm hover:bg-muted"
                  >
                    <span className="font-medium">
                      {x.patient?.person?.full_name}
                    </span>
                    <span>{x.clinic?.name}</span>
                    <Badge
                      variant={
                        x.status === "completed" ? "secondary" : "default"
                      }
                    >
                      {x.status}
                    </Badge>
                  </button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum atendimento iniciado nesta clínica.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        {selected && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Histórico do atendimento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {notes.length ? (
                  notes.map((n) => (
                    <div key={n.id} className="rounded border p-3">
                      <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          {new Date(n.authored_at).toLocaleString("pt-BR")} ·{" "}
                          {n.note_type}
                        </span>
                        <Badge
                          variant={
                            n.workflow_status === "approved"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {workflowLabels[n.workflow_status] ?? "Rascunho"}
                        </Badge>
                      </div>
                      <p className="whitespace-pre-wrap text-sm">{n.content}</p>
                      {["draft", "changes_requested"].includes(
                        n.workflow_status ?? "draft",
                      ) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-3"
                          disabled={transitionNote.isPending}
                          onClick={() =>
                            transitionNote.mutate({
                              id: n.id,
                              status: "submitted",
                            })
                          }
                        >
                          <Send className="mr-1 h-3 w-3" />
                          Enviar para supervisão
                        </Button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Sem evoluções registradas.
                  </p>
                )}
              </CardContent>
            </Card>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Procedimentos e exames do paciente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {patientProcedures.length || patientExams.length ? (
                    <>
                      {patientProcedures.map((item) => (
                        <div key={item.id} className="rounded border p-2">
                          Procedimento: {item.name}{" "}
                          <Badge variant="outline" className="ml-1">
                            {item.status}
                          </Badge>
                        </div>
                      ))}
                      {patientExams.map((item) => (
                        <div key={item.id} className="rounded border p-2">
                          Exame: {item.exam_name}{" "}
                          <Badge variant="outline" className="ml-1">
                            {item.status}
                          </Badge>
                          {item.result_summary && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {item.result_summary}
                            </p>
                          )}
                        </div>
                      ))}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Sem procedimentos ou exames vinculados.
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Documentos e supervisão
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {patientDocuments.length || encounterSupervisions.length ? (
                    <>
                      {patientDocuments.map((item) => (
                        <div key={item.id} className="rounded border p-2">
                          {item.file_name}{" "}
                          <Badge variant="outline" className="ml-1">
                            {item.document_type}
                          </Badge>
                        </div>
                      ))}
                      {encounterSupervisions.map((item) => (
                        <div key={item.id} className="rounded border p-2">
                          Supervisão{" "}
                          <Badge variant="outline" className="ml-1">
                            {item.status}
                          </Badge>
                        </div>
                      ))}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Sem documentos ou supervisões vinculados.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
function Picker({
  label,
  value,
  onValue,
  options,
  text,
}: {
  label: string;
  value: string;
  onValue: (v: string) => void;
  options: any[];
  text: (x: any) => string;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onValue}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione" />
        </SelectTrigger>
        <SelectContent>
          {options.map((x) => (
            <SelectItem key={x.id} value={x.id}>
              {text(x)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
