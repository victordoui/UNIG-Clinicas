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

export default function Especialidades() {
  const queryClient = useQueryClient();
  const { clinicCodes, unigRole } = useAuth();
  const [active, setActive] = useState<Specialty>("odonto");
  const [clinicId, setClinicId] = useState("");
  const [patientId, setPatientId] = useState("");
  const [tooth, setTooth] = useState("");
  const [condition, setCondition] = useState("");
  const [notes, setNotes] = useState("");
  const [complaint, setComplaint] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [plan, setPlan] = useState("");
  const [protocolName, setProtocolName] = useState("");

  const availableSpecialties = useMemo(
    () => (Object.keys(SETTINGS) as Specialty[]).filter((specialty) =>
      unigRole === "super_admin" || clinicCodes.includes(SETTINGS[specialty].code),
    ),
    [clinicCodes, unigRole],
  );

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
      ]);
      for (const result of [
        clinicResult,
        patientResult,
        odontogramResult,
        physioResult,
        protocolResult,
      ])
        if (result.error) throw result.error;
      return {
        clinics: (clinicResult.data ?? []) as Clinic[],
        patients: (patientResult.data ?? []) as Patient[],
        odontograms: odontogramResult.data ?? [],
        physio: physioResult.data ?? [],
        protocols: protocolResult.data ?? [],
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
    setCondition("");
    setNotes("");
    setComplaint("");
    setDiagnosis("");
    setPlan("");
    setProtocolName("");
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
        if (tooth && condition) {
          const { error: entryError } = await (supabase as any)
            .from("dental_odontogram_entries")
            .insert({
              odontogram_id: data.id,
              tooth_code: tooth,
              condition,
              notes: notes || null,
              recorded_by: auth.user?.id,
            });
          if (entryError) throw entryError;
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
            <h1 className="text-2xl font-bold">Especialidades clínicas</h1>
            <p className="text-sm text-muted-foreground">
              Registros especializados separados pela clínica selecionada.
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
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
