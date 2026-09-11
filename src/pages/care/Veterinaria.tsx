import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Cat, PawPrint } from 'lucide-react';
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
  const data = useQuery({
    queryKey: ['veterinary'],
    queryFn: async () => {
      const [clinics, animals, persons, consultations] = await Promise.all([
        supabase.from('clinics').select('id,name,organization_id').eq('code', 'VET').eq('is_active', true),
        (supabase as any).from('animals').select('id,clinic_id,name,species,breed,sex,microchip_number,animal_guardians(person:persons(full_name))').is('archived_at', null).order('name'),
        (supabase as any).from('persons').select('id,full_name').is('archived_at', null).order('full_name').limit(500),
        (supabase as any).from('veterinary_consultations').select('id,animal_id,chief_complaint,diagnosis,created_at').order('created_at', { ascending: false }).limit(12),
      ]);
      if (clinics.error) throw clinics.error;
      if (animals.error) throw animals.error;
      if (persons.error) throw persons.error;
      if (consultations.error) throw consultations.error;
      return { clinics: (clinics.data ?? []) as Clinic[], animals: animals.data ?? [], persons: persons.data ?? [], consultations: consultations.data ?? [] };
    },
  });
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
      </div>
    </MainLayout>
  );
}
