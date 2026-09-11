import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Flower2, SmilePlus, Stethoscope } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";

type Specialty = "odonto" | "fisio" | "estetica";
type Clinic = {
  id: string;
  name: string;
  code: string;
  organization_id: string;
};
type Patient = {
  id: string;
  record_number: string;
  person?: { full_name: string } | null;
};

const SETTINGS = {
  odonto: {
    label: "Odontologia",
    code: "ODONTO",
    Icon: SmilePlus,
    description: "Odontograma e registros por dente.",
  },
  fisio: {
    label: "Fisioterapia",
    code: "FISIO",
    Icon: Activity,
    description: "Avaliação funcional e plano terapêutico.",
  },
  estetica: {
    label: "Estética",
    code: "ESTETICA",
    Icon: Flower2,
    description: "Protocolos e sessões com consentimento de imagem.",
  },
};

const MODULE_CONTEXT: Record<string, { specialty: Specialty; title: string; description: string }> = {
  odontogram: { specialty: "odonto", title: "Odontograma", description: "Registre dentes, faces, achados e condutas recomendadas." },
  anamnesis: { specialty: "odonto", title: "Anamnese odontológica", description: "Concentre os dados clínicos e observações iniciais do paciente." },
  "treatment-plans": { specialty: "odonto", title: "Planos de tratamento", description: "Acompanhe achados, procedimentos recomendados e execução." },
  "physio-assessment": { specialty: "fisio", title: "Avaliação fisioterapêutica", description: "Registre queixa, diagnóstico e plano terapêutico." },
  "physio-functional": { specialty: "fisio", title: "Avaliação funcional", description: "Organize os dados funcionais do paciente." },
  "physio-plans": { specialty: "fisio", title: "Planos terapêuticos", description: "Planeje a jornada terapêutica e seus objetivos." },
  "physio-sessions": { specialty: "fisio", title: "Sessões e evoluções", description: "Acompanhe as sessões e o progresso funcional." },
  "physio-discharge": { specialty: "fisio", title: "Reavaliações e alta", description: "Registre reavaliações e desfechos terapêuticos." },
  "aesthetic-assessment": { specialty: "estetica", title: "Prontuários e anamnese", description: "Registre o contexto clínico da avaliação estética." },
  "aesthetic-evaluation": { specialty: "estetica", title: "Avaliação estética", description: "Organize a avaliação facial, corporal ou capilar." },
  "aesthetic-protocols": { specialty: "estetica", title: "Protocolos e sessões", description: "Cadastre protocolos e acompanhe suas sessões." },
  "aesthetic-photos": { specialty: "estetica", title: "Registro fotográfico", description: "Área preparada para evolução visual com consentimento." },
};

export default function Especialidades() {
  const queryClient = useQueryClient();
  const { clinicCodes, activeClinicCode, unigRole } = useAuth();
  const [searchParams] = useSearchParams();
  const [active, setActive] = useState<Specialty>("odonto");
  const [clinicId, setClinicId] = useState("");
  const [patientId, setPatientId] = useState("");
  const [tooth, setTooth] = useState("");
  const [surface, setSurface] = useState("");
  const [condition, setCondition] = useState("");
  const [notes, setNotes] = useState("");
  const [treatmentPlanTitle, setTreatmentPlanTitle] = useState("");
  const [recommendedProcedure, setRecommendedProcedure] = useState("");
  const [complaint, setComplaint] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [plan, setPlan] = useState("");
  const [protocolName, setProtocolName] = useState("");
  const [assessmentId, setAssessmentId] = useState("");
  const [sessionGoals, setSessionGoals] = useState("");
  const [exercisePlan, setExercisePlan] = useState("");
  const moduleContext = MODULE_CONTEXT[searchParams.get("module") ?? ""];

  const availableSpecialties = useMemo(
    () => (Object.keys(SETTINGS) as Specialty[]).filter((specialty) =>
      (unigRole === "super_admin" || clinicCodes.includes(SETTINGS[specialty].code)) &&
      (!activeClinicCode || SETTINGS[specialty].code === activeClinicCode),
    ),
    [activeClinicCode, clinicCodes, unigRole],
  );

  useEffect(() => {
    if (moduleContext && availableSpecialties.includes(moduleContext.specialty)) {
      setActive(moduleContext.specialty);
      setClinicId("");
    }
  }, [moduleContext, availableSpecialties]);

  useEffect(() => {
    if (availableSpecialties.length && !availableSpecialties.includes(active)) {
      setActive(availableSpecialties[0]);
      setClinicId("");
    }
  }, [active, availableSpecialties]);

  const workspace = useQuery({
    queryKey: ["specialty-workspace"],
    queryFn: async () => {
      const [
        clinicResult,
        patientResult,
        odontogramResult,
        physioResult,
        protocolResult,
        dentalPlansResult,
        physioSessionsResult,
      ] = await Promise.all([
        supabase
          .from("clinics")
          .select("id,name,code,organization_id")
          .eq("is_active", true)
          .order("name"),
        supabase
          .from("patients")
          .select("id,record_number,person:persons(full_name)")
          .is("archived_at", null)
          .order("record_number")
          .limit(500),
        (supabase as any)
          .from("dental_odontograms")
          .select("id,patient_id,notes,updated_at")
          .eq("status", "active")
          .order("updated_at", { ascending: false })
          .limit(8),
        (supabase as any)
          .from("physiotherapy_assessments")
          .select(
            "id,patient_id,chief_complaint,physiotherapy_diagnosis,status,updated_at",
          )
          .order("updated_at", { ascending: false })
          .limit(8),
        (supabase as any)
          .from("aesthetic_protocols")
          .select("id,name,description,active,updated_at")
          .eq("active", true)
          .order("updated_at", { ascending: false })
          .limit(8),
        (supabase as any)
          .from("dental_treatment_plans")
          .select("id,title,status,patient_id,notes,updated_at,items:dental_treatment_plan_items(id,tooth_code,surface,finding,recommended_procedure,status)")
          .order("updated_at", { ascending: false })
          .limit(8),
        (supabase as any)
          .from("physiotherapy_sessions")
          .select("id,assessment_id,session_number,status,goals,exercise_plan,session_date")
          .order("session_date", { ascending: false })
          .limit(20),
      ]);
      for (const result of [
        clinicResult,
        patientResult,
        odontogramResult,
        physioResult,
        protocolResult,
        dentalPlansResult,
        physioSessionsResult,
      ])
        if (result.error) throw result.error;
      return {
        clinics: (clinicResult.data ?? []) as Clinic[],
        patients: (patientResult.data ?? []) as Patient[],
        odontograms: odontogramResult.data ?? [],
        physio: physioResult.data ?? [],
        protocols: protocolResult.data ?? [],
        dentalPlans: dentalPlansResult.data ?? [],
        physioSessions: physioSessionsResult.data ?? [],
      };
    },
  });
  const clinics = useMemo(
    () =>
      (workspace.data?.clinics ?? []).filter(
        (clinic) => clinic.code === SETTINGS[active].code,
      ),
    [workspace.data?.clinics, active],
  );
  const selectedClinic = clinics.find((clinic) => clinic.id === clinicId);
  const reset = () => {
    setPatientId("");
    setTooth("");
    setSurface("");
    setCondition("");
    setNotes("");
    setTreatmentPlanTitle("");
    setRecommendedProcedure("");
    setComplaint("");
    setDiagnosis("");
    setPlan("");
    setProtocolName("");
    setAssessmentId("");
    setSessionGoals("");
    setExercisePlan("");
  };
  const patientLabel = (id: string) => {
    const patient = workspace.data?.patients.find((item) => item.id === id);
    return patient
      ? `${patient.record_number} · ${patient.person?.full_name ?? "Paciente"}`
      : "Paciente";
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!selectedClinic) throw new Error("Selecione a clínica.");
      const { data: auth } = await supabase.auth.getUser();
      const actor = { created_by: auth.user?.id, updated_by: auth.user?.id };
      if (active === "odonto") {
        if (!patientId) throw new Error("Selecione o paciente.");
        const { data, error } = await (supabase as any)
          .from("dental_odontograms")
          .insert({
            organization_id: selectedClinic.organization_id,
            clinic_id: selectedClinic.id,
            patient_id: patientId,
            notes: notes || null,
            ...actor,
          })
          .select("id")
          .single();
        if (error) throw error;
        let odontogramEntryId: string | null = null;
        if (tooth && condition) {
          const { data: entry, error: entryError } = await (supabase as any)
            .from("dental_odontogram_entries")
            .insert({
              odontogram_id: data.id,
              tooth_code: tooth,
              surface: surface || null,
              condition,
              notes: notes || null,
              recorded_by: auth.user?.id,
            })
            .select("id")
            .single();
          if (entryError) throw entryError;
          odontogramEntryId = entry.id;
        }
        if (treatmentPlanTitle.trim() && recommendedProcedure.trim()) {
          const { data: treatmentPlan, error: planError } = await (supabase as any)
            .from("dental_treatment_plans")
            .insert({
              organization_id: selectedClinic.organization_id,
              clinic_id: selectedClinic.id,
              patient_id: patientId,
              odontogram_id: data.id,
              title: treatmentPlanTitle.trim(),
              notes: notes || null,
              ...actor,
            })
            .select("id")
            .single();
          if (planError) throw planError;
          const { error: itemError } = await (supabase as any)
            .from("dental_treatment_plan_items")
            .insert({
              treatment_plan_id: treatmentPlan.id,
              odontogram_entry_id: odontogramEntryId,
              tooth_code: tooth || "Não informado",
              surface: surface || null,
              finding: condition || null,
              recommended_procedure: recommendedProcedure.trim(),
              notes: notes || null,
              ...actor,
            });
          if (itemError) throw itemError;
        }
      } else if (active === "fisio") {
        if (!patientId) throw new Error("Selecione o paciente.");
        const { error } = await (supabase as any)
          .from("physiotherapy_assessments")
          .insert({
            organization_id: selectedClinic.organization_id,
            clinic_id: selectedClinic.id,
            patient_id: patientId,
            chief_complaint: complaint || null,
            physiotherapy_diagnosis: diagnosis || null,
            therapeutic_plan: plan || null,
            functional_assessment: { notes },
            ...actor,
          });
        if (error) throw error;
      } else {
        if (!protocolName.trim())
          throw new Error("Informe o nome do protocolo.");
        const { error } = await (supabase as any)
          .from("aesthetic_protocols")
          .insert({
            organization_id: selectedClinic.organization_id,
            clinic_id: selectedClinic.id,
            name: protocolName.trim(),
            description: notes || null,
            ...actor,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["specialty-workspace"] });
      reset();
      toast({ title: "Registro salvo com sucesso" });
    },
    onError: (error: Error) =>
      toast({
        title: "Não foi possível salvar",
        description: error.message,
        variant: "destructive",
      }),
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate();
  };
  const registerPhysioSession = useMutation({
    mutationFn: async () => {
      if (!assessmentId) throw new Error("Selecione uma avaliação.");
      const sessions = (workspace.data?.physioSessions ?? []).filter((session: any) => session.assessment_id === assessmentId);
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from("physiotherapy_sessions").insert({ assessment_id: assessmentId, session_number: sessions.length + 1, status: "completed", goals: sessionGoals || null, exercise_plan: exercisePlan || null, created_by: auth.user?.id });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["specialty-workspace"] }); setAssessmentId(""); setSessionGoals(""); setExercisePlan(""); toast({ title: "Sessão registrada" }); },
    onError: (error: Error) => toast({ title: "Não foi possível registrar a sessão", description: error.message, variant: "destructive" }),
  });
  const current = SETTINGS[active];
  const Icon = current.Icon;
  const recent =
    active === "odonto"
      ? workspace.data?.odontograms
      : active === "fisio"
        ? workspace.data?.physio
        : workspace.data?.protocols;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Stethoscope className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{moduleContext?.title ?? "Especialidades clínicas"}</h1>
            <p className="text-sm text-muted-foreground">
              {moduleContext?.description ?? "Registros especializados separados pela clínica selecionada."}
            </p>
          </div>
        </div>
        <Tabs
          value={active}
          onValueChange={(value) => {
            setActive(value as Specialty);
            setClinicId("");
            reset();
          }}
        >
          <TabsList className="grid h-auto w-full" style={{ gridTemplateColumns: `repeat(${Math.max(availableSpecialties.length, 1)}, minmax(0, 1fr))` }}>
            {availableSpecialties.map((specialty) => (
              <TabsTrigger key={specialty} value={specialty}>{SETTINGS[specialty].label}</TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value={active} className="mt-5">
            <div className="grid gap-5 lg:grid-cols-[400px_1fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    {current.label}
                  </CardTitle>
                  <CardDescription>{current.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={submit} className="space-y-3">
                    <div className="space-y-1">
                      <Label>Clínica</Label>
                      <Select value={clinicId} onValueChange={setClinicId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {clinics.map((clinic) => (
                            <SelectItem key={clinic.id} value={clinic.id}>
                              {clinic.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {active !== "estetica" && (
                      <div className="space-y-1">
                        <Label>Paciente</Label>
                        <Select value={patientId} onValueChange={setPatientId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {workspace.data?.patients.map((patient) => (
                              <SelectItem key={patient.id} value={patient.id}>
                                {patient.record_number} ·{" "}
                                {patient.person?.full_name ?? "Paciente"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {active === "odonto" && (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label>Dente</Label>
                            <Input
                              value={tooth}
                              onChange={(event) => setTooth(event.target.value)}
                              placeholder="Ex.: 16"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>Face</Label>
                            <Input
                              value={surface}
                              onChange={(event) => setSurface(event.target.value)}
                              placeholder="Ex.: oclusal"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>Condição</Label>
                            <Input
                              value={condition}
                              onChange={(event) =>
                                setCondition(event.target.value)
                              }
                              placeholder="Ex.: cárie"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label>Observações</Label>
                          <Textarea
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                          />
                        </div>
                        <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                          <p className="text-sm font-semibold text-primary">Vincular a um plano de tratamento</p>
                          <div className="space-y-1">
                            <Label>Plano</Label>
                            <Input value={treatmentPlanTitle} onChange={(event) => setTreatmentPlanTitle(event.target.value)} placeholder="Ex.: Reabilitação do quadrante superior" />
                          </div>
                          <div className="space-y-1">
                            <Label>Procedimento recomendado</Label>
                            <Input value={recommendedProcedure} onChange={(event) => setRecommendedProcedure(event.target.value)} placeholder="Ex.: Restauração em resina" />
                          </div>
                          <p className="text-xs text-muted-foreground">Ao preencher os dois campos, o achado ficará associado ao plano e ao procedimento recomendado.</p>
                        </div>
                      </>
                    )}
                    {active === "fisio" && (
                      <>
                        <div className="space-y-1">
                          <Label>Queixa principal</Label>
                          <Textarea
                            value={complaint}
                            onChange={(event) =>
                              setComplaint(event.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Diagnóstico fisioterapêutico</Label>
                          <Textarea
                            value={diagnosis}
                            onChange={(event) =>
                              setDiagnosis(event.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Plano terapêutico</Label>
                          <Textarea
                            value={plan}
                            onChange={(event) => setPlan(event.target.value)}
                          />
                        </div>
                      </>
                    )}
                    {active === "estetica" && (
                      <>
                        <div className="space-y-1">
                          <Label>Nome do protocolo</Label>
                          <Input
                            value={protocolName}
                            onChange={(event) =>
                              setProtocolName(event.target.value)
                            }
                            placeholder="Ex.: Limpeza de pele"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Descrição</Label>
                          <Textarea
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                          />
                        </div>
                      </>
                    )}
                    <Button
                      disabled={
                        !clinicId ||
                        (active !== "estetica" && !patientId) ||
                        save.isPending
                      }
                    >
                      {active === "estetica"
                        ? "Cadastrar protocolo"
                        : "Registrar avaliação"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Registros recentes
                  </CardTitle>
                  <CardDescription>
                    Visíveis apenas conforme a permissão da clínica.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(recent as any[])?.map((item) => (
                    <div key={item.id} className="rounded-lg border p-3">
                      <div className="flex justify-between gap-2">
                        <p className="font-medium">
                          {active === "estetica"
                            ? item.name
                            : patientLabel(item.patient_id)}
                        </p>
                        {item.status && (
                          <Badge variant="outline">{item.status}</Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.notes ||
                          item.chief_complaint ||
                          item.physiotherapy_diagnosis ||
                          item.description ||
                          "Registro clínico."}
                      </p>
                    </div>
                  ))}
                  {!recent?.length && (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      Nenhum registro disponível neste escopo.
                    </p>
                  )}
                </CardContent>
              </Card>
              {active === "fisio" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Linha do tempo terapêutica</CardTitle>
                    <CardDescription>Avaliação → sessões → reavaliação → alta.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 rounded-lg border p-3">
                      <div className="space-y-1"><Label>Avaliação</Label><Select value={assessmentId} onValueChange={setAssessmentId}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{(workspace.data?.physio as any[])?.map((assessment) => <SelectItem key={assessment.id} value={assessment.id}>{patientLabel(assessment.patient_id)} · {assessment.physiotherapy_diagnosis || "Avaliação"}</SelectItem>)}</SelectContent></Select></div>
                      <div className="space-y-1"><Label>Objetivos da sessão</Label><Textarea value={sessionGoals} onChange={(event) => setSessionGoals(event.target.value)} /></div>
                      <div className="space-y-1"><Label>Exercícios e condutas</Label><Textarea value={exercisePlan} onChange={(event) => setExercisePlan(event.target.value)} /></div>
                      <Button onClick={() => registerPhysioSession.mutate()} disabled={!assessmentId || registerPhysioSession.isPending}>Registrar sessão concluída</Button>
                    </div>
                    {(workspace.data?.physioSessions as any[])?.map((session) => <div key={session.id} className="rounded-lg border-l-4 border-primary bg-muted/40 p-3"><p className="font-medium">Sessão {session.session_number} · {session.status}</p><p className="mt-1 text-sm text-muted-foreground">{session.goals || session.exercise_plan || "Sem observações."}</p></div>)}
                    {!workspace.data?.physioSessions?.length && <p className="text-sm text-muted-foreground">Registre a primeira sessão após criar uma avaliação.</p>}
                  </CardContent>
                </Card>
              )}
              {active === "odonto" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Planos de tratamento</CardTitle>
                    <CardDescription>Achado → procedimento recomendado → execução clínica.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(workspace.data?.dentalPlans as any[])?.map((treatmentPlan) => (
                      <div key={treatmentPlan.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium">{treatmentPlan.title}</p>
                          <Badge variant="outline">{treatmentPlan.status}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{patientLabel(treatmentPlan.patient_id)}</p>
                        {(treatmentPlan.items ?? []).map((item: any) => (
                          <p key={item.id} className="mt-2 rounded bg-muted px-2 py-1 text-sm">Dente {item.tooth_code}{item.surface ? ` · ${item.surface}` : ""} → {item.recommended_procedure}</p>
                        ))}
                      </div>
                    ))}
                    {!workspace.data?.dentalPlans?.length && <p className="py-4 text-center text-sm text-muted-foreground">Nenhum plano odontológico registrado.</p>}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
