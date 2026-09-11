import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Cat, PawPrint, BedDouble } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type Clinic = { id: string; name: string; organization_id: string };

export default function Veterinaria() {
  const qc = useQueryClient();
  const [clinicId, setClinicId] = useState('');
  const [name, setName] = useState('');
  const [species, setSpecies] = useState('Canina');
  const [breed, setBreed] = useState('');
  const [sex, setSex] = useState('unknown');
  const [microchip, setMicrochip] = useState('');
  const [guardianId, setGuardianId] = useState('');
  const [consultationAnimalId, setConsultationAnimalId] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [prescription, setPrescription] = useState('');
  const [weightAnimalId, setWeightAnimalId] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [vaccineAnimalId, setVaccineAnimalId] = useState('');
  const [vaccineName, setVaccineName] = useState('');
  const [vaccineDate, setVaccineDate] = useState(new Date().toISOString().slice(0, 10));
  const data = useQuery({
    queryKey: ['veterinary'],
    queryFn: async () => {
      const [clinics, animals, persons, consultations, weights, vaccinations, hospitalizations, hospitalizationTasks] = await Promise.all([
        supabase.from('clinics').select('id,name,organization_id').eq('code', 'VET').eq('is_active', true),
        (supabase as any).from('animals').select('id,clinic_id,name,species,breed,sex,microchip_number,animal_guardians(person:persons(full_name))').is('archived_at', null).order('name'),
        (supabase as any).from('persons').select('id,full_name').is('archived_at', null).order('full_name').limit(500),
        (supabase as any).from('veterinary_consultations').select('id,animal_id,chief_complaint,diagnosis,created_at').order('created_at', { ascending: false }).limit(12),
        (supabase as any).from('veterinary_weights').select('id,animal_id,weight_kg,measured_at').order('measured_at', { ascending: false }).limit(12),
        (supabase as any).from('veterinary_vaccinations').select('id,animal_id,vaccine_name,administered_at,next_due_at').order('administered_at', { ascending: false }).limit(12),
        (supabase as any).from('veterinary_hospitalizations').select('id,animal_id,box_code,status,admission_reason,admitted_at').in('status', ['admitted']).order('admitted_at', { ascending: false }),
        (supabase as any).from('veterinary_hospitalization_tasks').select('id,hospitalization_id,title,task_type,scheduled_at,status').in('status', ['planned']).order('scheduled_at').limit(30),
      ]);
      if (clinics.error) throw clinics.error;
      if (animals.error) throw animals.error;
      if (persons.error) throw persons.error;
      if (consultations.error) throw consultations.error;
      if (weights.error) throw weights.error;
      if (vaccinations.error) throw vaccinations.error;
      if (hospitalizations.error) throw hospitalizations.error;
      if (hospitalizationTasks.error) throw hospitalizationTasks.error;
      return { clinics: (clinics.data ?? []) as Clinic[], animals: animals.data ?? [], persons: persons.data ?? [], consultations: consultations.data ?? [], weights: weights.data ?? [], vaccinations: vaccinations.data ?? [], hospitalizations: hospitalizations.data ?? [], hospitalizationTasks: hospitalizationTasks.data ?? [] };
    },
  });
  const animalClinic = (animalId: string) => {
    const animal = ((data.data?.animals ?? []) as any[]).find((item) => item.id === animalId);
    const clinic = (data.data?.clinics ?? []).find((item) => item.id === animal?.clinic_id);
    if (!animal || !clinic) throw new Error('Selecione um animal válido.');
    return { animal, clinic };
  };
  const createWeight = useMutation({ mutationFn: async () => { const { animal, clinic } = animalClinic(weightAnimalId); const { data: auth } = await supabase.auth.getUser(); const { error } = await (supabase as any).from('veterinary_weights').insert({ organization_id: clinic.organization_id, clinic_id: clinic.id, animal_id: animal.id, weight_kg: Number(weightKg), created_by: auth.user?.id }); if (error) throw error; }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['veterinary'] }); setWeightKg(''); toast({ title: 'Peso registrado' }); }, onError: (error: Error) => toast({ title: 'Não foi possível registrar peso', description: error.message, variant: 'destructive' }) });
  const createVaccination = useMutation({ mutationFn: async () => { const { animal, clinic } = animalClinic(vaccineAnimalId); if (!vaccineName.trim()) throw new Error('Informe a vacina.'); const { data: auth } = await supabase.auth.getUser(); const { error } = await (supabase as any).from('veterinary_vaccinations').insert({ organization_id: clinic.organization_id, clinic_id: clinic.id, animal_id: animal.id, vaccine_name: vaccineName.trim(), administered_at: vaccineDate, created_by: auth.user?.id }); if (error) throw error; }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['veterinary'] }); setVaccineName(''); toast({ title: 'Vacinação registrada' }); }, onError: (error: Error) => toast({ title: 'Não foi possível registrar vacina', description: error.message, variant: 'destructive' }) });
  const createConsultation = useMutation({
    mutationFn: async () => {
      const animal = ((data.data?.animals ?? []) as any[]).find((item) => item.id === consultationAnimalId);
      if (!animal || !chiefComplaint.trim()) throw new Error('Informe o animal e a queixa principal.');
      const clinic = (data.data?.clinics ?? []).find((item) => item.id === animal.clinic_id);
      if (!clinic) throw new Error('Clínica veterinária inválida.');
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from('veterinary_consultations').insert({ organization_id: clinic.organization_id, clinic_id: clinic.id, animal_id: animal.id, chief_complaint: chiefComplaint.trim(), diagnosis: diagnosis.trim() || null, prescription: prescription.trim() || null, created_by: auth.user?.id, updated_by: auth.user?.id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['veterinary'] }); setConsultationAnimalId(''); setChiefComplaint(''); setDiagnosis(''); setPrescription(''); toast({ title: 'Consulta veterinária registrada' }); },
    onError: (error: Error) => toast({ title: 'Não foi possível registrar consulta', description: error.message, variant: 'destructive' }),
  });
  const create = useMutation({
    mutationFn: async () => {
      if (!name.trim() || !guardianId || !clinicId) throw new Error('Informe clínica, animal e tutor.');
      const clinic = (data.data?.clinics ?? []).find((item) => item.id === clinicId);
      if (!clinic) throw new Error('Clínica veterinária inválida.');
      const { data: auth } = await supabase.auth.getUser();
      const { data: animal, error } = await (supabase as any).from('animals').insert({
        organization_id: clinic.organization_id,
        clinic_id: clinic.id,
        name: name.trim(),
        species,
        breed: breed.trim() || null,
        sex,
        microchip_number: microchip.trim() || null,
        created_by: auth.user?.id,
      }).select('id').single();
      if (error) throw error;
      const { error: guardianError } = await (supabase as any).from('animal_guardians').insert({ animal_id: animal.id, person_id: guardianId, relationship: 'tutor', is_primary: true, created_by: auth.user?.id });
      if (guardianError) throw guardianError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['veterinary'] });
      setName(''); setBreed(''); setMicrochip(''); setGuardianId('');
      toast({ title: 'Animal cadastrado' });
    },
    onError: (error: Error) => toast({ title: 'Não foi possível cadastrar', description: error.message, variant: 'destructive' }),
  });
  const submit = (event: FormEvent) => { event.preventDefault(); create.mutate(); };
  const animals = (data.data?.animals as any[]) ?? [];
  const persons = (data.data?.persons as any[]) ?? [];
  const clinics = data.data?.clinics ?? [];
  const consultations = (data.data?.consultations as any[]) ?? [];
  const weights = (data.data?.weights as any[]) ?? [];
  const vaccinations = (data.data?.vaccinations as any[]) ?? [];
  const hospitalizations = (data.data?.hospitalizations as any[]) ?? [];
  const hospitalizationTasks = (data.data?.hospitalizationTasks as any[]) ?? [];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex gap-3"><div className="rounded-lg bg-primary/10 p-2"><PawPrint className="h-6 w-6 text-primary" /></div><div><h1 className="text-2xl font-bold">Clínica veterinária</h1><p className="text-sm text-muted-foreground">Cadastre animais e mantenha tutores vinculados ao cadastro mestre de pessoas.</p></div></div>
        <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
          <Card>
            <CardHeader><CardTitle className="text-base">Novo animal</CardTitle><CardDescription>O animal fica separado na clínica veterinária selecionada.</CardDescription></CardHeader>
            <CardContent><form onSubmit={submit} className="space-y-3">
              <div className="space-y-1"><Label>Clínica</Label><Select value={clinicId} onValueChange={setClinicId}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{clinics.map((clinic) => <SelectItem key={clinic.id} value={clinic.id}>{clinic.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1"><Label>Nome</Label><Input value={name} onChange={(event) => setName(event.target.value)} required /></div>
              <div className="space-y-1"><Label>Espécie</Label><Input value={species} onChange={(event) => setSpecies(event.target.value)} required /></div>
              <div className="space-y-1"><Label>Raça</Label><Input value={breed} onChange={(event) => setBreed(event.target.value)} /></div>
              <div className="space-y-1"><Label>Sexo</Label><Select value={sex} onValueChange={setSex}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="female">Fêmea</SelectItem><SelectItem value="male">Macho</SelectItem><SelectItem value="unknown">Não informado</SelectItem></SelectContent></Select></div>
              <div className="space-y-1"><Label>Microchip</Label><Input value={microchip} onChange={(event) => setMicrochip(event.target.value)} /></div>
              <div className="space-y-1"><Label>Tutor</Label><Select value={guardianId} onValueChange={setGuardianId}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{persons.map((person: any) => <SelectItem key={person.id} value={person.id}>{person.full_name}</SelectItem>)}</SelectContent></Select></div>
              <Button disabled={create.isPending || !guardianId || !clinicId}>Cadastrar animal</Button>
            </form></CardContent>
          </Card>
          <Card><CardHeader><CardTitle className="text-base">Animais cadastrados</CardTitle></CardHeader><CardContent className="space-y-2">{animals.length ? animals.map((animal: any) => <div key={animal.id} className="flex items-center justify-between rounded border p-3"><div className="flex items-center gap-3"><Cat className="h-5 w-5 text-primary" /><div><div className="font-medium">{animal.name}</div><div className="text-sm text-muted-foreground">{animal.species}{animal.breed ? ` · ${animal.breed}` : ''} · tutor {animal.animal_guardians?.[0]?.person?.full_name ?? '—'}</div></div></div><Badge variant="outline">{animal.sex === 'female' ? 'Fêmea' : animal.sex === 'male' ? 'Macho' : '—'}</Badge></div>) : <p className="text-sm text-muted-foreground">Nenhum animal cadastrado.</p>}</CardContent></Card>
        </div>
        <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
          <Card><CardHeader><CardTitle className="text-base">Consulta veterinária</CardTitle><CardDescription>Queixa, diagnóstico e prescrição vinculados ao animal.</CardDescription></CardHeader><CardContent><form onSubmit={(event) => { event.preventDefault(); createConsultation.mutate(); }} className="space-y-3"><div className="space-y-1"><Label>Animal</Label><Select value={consultationAnimalId} onValueChange={setConsultationAnimalId}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{animals.map((animal: any) => <SelectItem key={animal.id} value={animal.id}>{animal.name} · {animal.species}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1"><Label>Queixa principal</Label><Textarea value={chiefComplaint} onChange={(event) => setChiefComplaint(event.target.value)} required /></div><div className="space-y-1"><Label>Diagnóstico</Label><Textarea value={diagnosis} onChange={(event) => setDiagnosis(event.target.value)} /></div><div className="space-y-1"><Label>Prescrição</Label><Textarea value={prescription} onChange={(event) => setPrescription(event.target.value)} /></div><Button disabled={createConsultation.isPending || !consultationAnimalId || !chiefComplaint.trim()}>Registrar consulta</Button></form></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Consultas recentes</CardTitle></CardHeader><CardContent className="space-y-2">{consultations.length ? consultations.map((consultation: any) => { const animal = animals.find((item: any) => item.id === consultation.animal_id); return <div key={consultation.id} className="rounded border p-3"><div className="flex items-center justify-between gap-3"><p className="font-medium">{animal?.name ?? 'Animal'}</p><span className="text-xs text-muted-foreground">{new Date(consultation.created_at).toLocaleDateString('pt-BR')}</span></div><p className="mt-1 text-sm text-muted-foreground">{consultation.chief_complaint}</p>{consultation.diagnosis && <p className="mt-1 text-sm">Diagnóstico: {consultation.diagnosis}</p>}</div>; }) : <p className="text-sm text-muted-foreground">Nenhuma consulta registrada.</p>}</CardContent></Card>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><BedDouble className="h-4 w-4" />Internações ativas</CardTitle><CardDescription>Mapa dos boxes em uso na clínica veterinária.</CardDescription></CardHeader><CardContent className="space-y-2">{hospitalizations.length ? hospitalizations.map((stay: any) => <div key={stay.id} className="rounded border p-3 text-sm"><strong>Box {stay.box_code}</strong> · {animals.find((animal: any) => animal.id === stay.animal_id)?.name ?? 'Animal'}<span className="mt-1 block text-xs text-muted-foreground">{stay.admission_reason || 'Sem motivo informado'} · desde {new Date(stay.admitted_at).toLocaleString('pt-BR')}</span>{hospitalizationTasks.filter((task: any) => task.hospitalization_id === stay.id).map((task: any) => <p key={task.id} className="mt-2 rounded bg-muted px-2 py-1 text-xs">{new Date(task.scheduled_at).toLocaleString('pt-BR')} · {task.title}</p>)}</div>) : <p className="text-sm text-muted-foreground">Nenhuma internação ativa.</p>}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Peso e acompanhamento</CardTitle></CardHeader><CardContent className="space-y-3"><form onSubmit={(event) => { event.preventDefault(); createWeight.mutate(); }} className="flex flex-wrap gap-2"><Select value={weightAnimalId} onValueChange={setWeightAnimalId}><SelectTrigger className="min-w-[180px] flex-1"><SelectValue placeholder="Animal" /></SelectTrigger><SelectContent>{animals.map((animal: any) => <SelectItem key={animal.id} value={animal.id}>{animal.name}</SelectItem>)}</SelectContent></Select><Input className="w-28" type="number" min="0.01" step="0.001" placeholder="kg" value={weightKg} onChange={(event) => setWeightKg(event.target.value)} /><Button disabled={!weightAnimalId || !weightKg || createWeight.isPending}>Registrar peso</Button></form>{weights.map((item: any) => <p key={item.id} className="border-t pt-2 text-sm">{animals.find((animal: any) => animal.id === item.animal_id)?.name ?? 'Animal'} · <strong>{item.weight_kg} kg</strong> · {new Date(item.measured_at).toLocaleDateString('pt-BR')}</p>)}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Vacinação</CardTitle></CardHeader><CardContent className="space-y-3"><form onSubmit={(event) => { event.preventDefault(); createVaccination.mutate(); }} className="grid gap-2 sm:grid-cols-2"><Select value={vaccineAnimalId} onValueChange={setVaccineAnimalId}><SelectTrigger><SelectValue placeholder="Animal" /></SelectTrigger><SelectContent>{animals.map((animal: any) => <SelectItem key={animal.id} value={animal.id}>{animal.name}</SelectItem>)}</SelectContent></Select><Input placeholder="Vacina" value={vaccineName} onChange={(event) => setVaccineName(event.target.value)} /><Input type="date" value={vaccineDate} onChange={(event) => setVaccineDate(event.target.value)} /><Button disabled={!vaccineAnimalId || !vaccineName.trim() || createVaccination.isPending}>Registrar vacina</Button></form>{vaccinations.map((item: any) => <p key={item.id} className="border-t pt-2 text-sm">{animals.find((animal: any) => animal.id === item.animal_id)?.name ?? 'Animal'} · <strong>{item.vaccine_name}</strong> · {new Date(`${item.administered_at}T12:00:00`).toLocaleDateString('pt-BR')}</p>)}</CardContent></Card>
        </div>
      </div>
    </MainLayout>
  );
}
