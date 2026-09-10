import { FormEvent, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, UserRound } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type Organization = { id: string; display_name: string };
type Clinic = { id: string; name: string; organization_id: string };
type Patient = {
  id: string;
  person_id: string;
  organization_id: string;
  record_number: string;
  status: string;
  person: { full_name: string; preferred_name: string | null; document_number: string | null; birth_date: string | null; phone: string | null } | null;
};

const EMPTY_FORM = {
  organization_id: '', clinic_id: '', full_name: '', preferred_name: '', document_number: '',
  birth_date: '', phone: '', email: '', record_number: '',
};

export default function Pacientes() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [form, setForm] = useState(EMPTY_FORM);
  const queryClient = useQueryClient();
  const catalog = useQuery({
    queryKey: ['patient-catalog'],
    queryFn: async () => {
      const [organizations, clinics, patients] = await Promise.all([
        supabase.from('organizations').select('id, display_name').order('display_name'),
        supabase.from('clinics').select('id, name, organization_id').eq('is_active', true).order('name'),
        supabase.from('patients').select('id, person_id, organization_id, record_number, status, person:persons(full_name, preferred_name, document_number, birth_date, phone)').order('created_at', { ascending: false }).limit(200),
      ]);
      if (organizations.error) throw organizations.error;
      if (clinics.error) throw clinics.error;
      if (patients.error) throw patients.error;
      return {
        organizations: (organizations.data ?? []) as unknown as Organization[],
        clinics: (clinics.data ?? []) as unknown as Clinic[],
        patients: (patients.data ?? []) as unknown as Patient[],
      };
    },
  });
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('register_patient' as never, {
        target_organization_id: form.organization_id,
        target_clinic_id: form.clinic_id,
        patient_full_name: form.full_name,
        patient_record_number: form.record_number,
        patient_preferred_name: form.preferred_name || null,
        patient_document_number: form.document_number || null,
        patient_birth_date: form.birth_date || null,
        patient_phone: form.phone || null,
        patient_email: form.email || null,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-catalog'] });
      setForm(EMPTY_FORM);
      toast({ title: 'Paciente cadastrado' });
    },
    onError: (error: Error) => toast({ title: 'Não foi possível cadastrar', description: error.message, variant: 'destructive' }),
  });
  const visible = useMemo(
    () => (catalog.data?.patients ?? []).filter((patient) => `${patient.person?.full_name} ${patient.record_number} ${patient.person?.document_number ?? ''}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())),
    [catalog.data?.patients, search],
  );
  const submit = (event: FormEvent) => { event.preventDefault(); save.mutate(); };
  const availableClinics = catalog.data?.clinics.filter((clinic) => !form.organization_id || clinic.organization_id === form.organization_id) ?? [];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2"><UserRound className="h-6 w-6 text-primary" /></div>
          <div><h1 className="text-2xl font-bold">Pacientes</h1><p className="text-sm text-muted-foreground">Cadastro mestre de pessoas e vínculo assistencial, preparado para agenda e prontuário.</p></div>
        </div>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Plus className="h-4 w-4" />Novo paciente</CardTitle><CardDescription>O vínculo com a clínica define quem poderá consultar este cadastro.</CardDescription></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid gap-3 md:grid-cols-4">
              <div className="space-y-1 md:col-span-2"><Label>Organização</Label><Select value={form.organization_id} onValueChange={(organization_id) => setForm({ ...form, organization_id, clinic_id: '' })}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{catalog.data?.organizations.map((organization) => <SelectItem key={organization.id} value={organization.id}>{organization.display_name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1 md:col-span-2"><Label>Clínica responsável</Label><Select value={form.clinic_id} onValueChange={(clinic_id) => setForm({ ...form, clinic_id })}><SelectTrigger><SelectValue placeholder="Selecione a clínica" /></SelectTrigger><SelectContent>{availableClinics.map((clinic) => <SelectItem key={clinic.id} value={clinic.id}>{clinic.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1"><Label>Prontuário / matrícula clínica</Label><Input required value={form.record_number} onChange={(e) => setForm({ ...form, record_number: e.target.value.toUpperCase() })} placeholder="PAC-0001" /></div>
              <div className="space-y-1"><Label>Nome completo</Label><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div className="space-y-1"><Label>Nome social</Label><Input value={form.preferred_name} onChange={(e) => setForm({ ...form, preferred_name: e.target.value })} /></div>
              <div className="space-y-1"><Label>CPF/Documento</Label><Input value={form.document_number} onChange={(e) => setForm({ ...form, document_number: e.target.value })} /></div>
              <div className="space-y-1"><Label>Nascimento</Label><Input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} /></div>
              <div className="space-y-1"><Label>Telefone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="space-y-1"><Label>E-mail</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="md:col-span-4"><Button disabled={save.isPending || !form.organization_id || !form.clinic_id}>Cadastrar paciente</Button></div>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Cadastros</CardTitle><div className="relative max-w-md"><Search className="absolute left-3 top-2.5 h-4 w-4" /><Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, prontuário ou documento" /></div></CardHeader>
          <CardContent><Table><TableHeader><TableRow><TableHead>Prontuário</TableHead><TableHead>Paciente</TableHead><TableHead>Documento</TableHead><TableHead>Contato</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{catalog.isLoading ? <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Carregando…</TableCell></TableRow> : visible.length === 0 ? <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Nenhum paciente encontrado.</TableCell></TableRow> : visible.map((patient) => <TableRow key={patient.id}><TableCell className="font-mono text-xs">{patient.record_number}</TableCell><TableCell><div className="font-medium">{patient.person?.full_name}</div>{patient.person?.preferred_name && <div className="text-xs text-muted-foreground">{patient.person.preferred_name}</div>}</TableCell><TableCell>{patient.person?.document_number ?? '—'}</TableCell><TableCell>{patient.person?.phone ?? '—'}</TableCell><TableCell><Badge variant={patient.status === 'active' ? 'default' : 'secondary'}>{patient.status === 'active' ? 'Ativo' : patient.status}</Badge></TableCell></TableRow>)}</TableBody></Table></CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
