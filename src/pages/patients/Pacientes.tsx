import { FormEvent, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Settings2, UserRound } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  const [preferencePatient, setPreferencePatient] = useState<Patient | null>(null);
  const [preferences, setPreferences] = useState({ channels: ['phone'] as string[], language: 'pt-BR', accessibilityNotes: '', remindersEnabled: true });
  const queryClient = useQueryClient();
  const catalog = useQuery({
    queryKey: ['patient-catalog'],
    queryFn: async () => {
      const [organizations, clinics, patients, preferenceRows] = await Promise.all([
        supabase.from('organizations').select('id, display_name').order('display_name'),
        supabase.from('clinics').select('id, name, organization_id').eq('is_active', true).order('name'),
        supabase.from('patients').select('id, person_id, organization_id, record_number, status, person:persons(full_name, preferred_name, document_number, birth_date, phone)').order('created_at', { ascending: false }).limit(200),
        (supabase.from('patient_contact_preferences') as any).select('patient_id, preferred_channels, preferred_language, accessibility_notes, reminders_enabled'),
      ]);
      if (organizations.error) throw organizations.error;
      if (clinics.error) throw clinics.error;
      if (patients.error) throw patients.error;
      if (preferenceRows.error) throw preferenceRows.error;
      return {
        organizations: (organizations.data ?? []) as unknown as Organization[],
        clinics: (clinics.data ?? []) as unknown as Clinic[],
        patients: (patients.data ?? []) as unknown as Patient[],
        preferencesByPatient: new Map((preferenceRows.data ?? []).map((item: any) => [item.patient_id, item])),
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
  const savePreferences = useMutation({
    mutationFn: async () => {
      if (!preferencePatient) return;
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await (supabase.from('patient_contact_preferences') as any).upsert({
        patient_id: preferencePatient.id,
        organization_id: preferencePatient.organization_id,
        preferred_channels: preferences.channels,
        preferred_language: preferences.language,
        accessibility_notes: preferences.accessibilityNotes.trim() || null,
        reminders_enabled: preferences.remindersEnabled,
        updated_by: auth.user?.id,
      }, { onConflict: 'patient_id' });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['patient-catalog'] }); setPreferencePatient(null); toast({ title: 'Preferências atualizadas' }); },
    onError: (error: Error) => toast({ title: 'Não foi possível salvar preferências', description: error.message, variant: 'destructive' }),
  });
  const visible = useMemo(
    () => (catalog.data?.patients ?? []).filter((patient) => `${patient.person?.full_name} ${patient.record_number} ${patient.person?.document_number ?? ''}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())),
    [catalog.data?.patients, search],
  );
  const submit = (event: FormEvent) => { event.preventDefault(); save.mutate(); };
  const availableClinics = catalog.data?.clinics.filter((clinic) => !form.organization_id || clinic.organization_id === form.organization_id) ?? [];
  const openPreferences = (patient: Patient) => {
    const current = catalog.data?.preferencesByPatient.get(patient.id);
    setPreferencePatient(patient);
    setPreferences({ channels: current?.preferred_channels?.length ? current.preferred_channels : ['phone'], language: current?.preferred_language ?? 'pt-BR', accessibilityNotes: current?.accessibility_notes ?? '', remindersEnabled: current?.reminders_enabled ?? true });
  };
  const toggleChannel = (channel: string) => setPreferences((current) => ({ ...current, channels: current.channels.includes(channel) ? current.channels.filter((item) => item !== channel) : [...current.channels, channel] }));

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
              <div className="space-y-1"><Label>Nome completo</Label><Input required autoComplete="name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div className="space-y-1"><Label>Nome social</Label><Input autoComplete="nickname" value={form.preferred_name} onChange={(e) => setForm({ ...form, preferred_name: e.target.value })} /></div>
              <div className="space-y-1"><Label>CPF/Documento</Label><Input inputMode="numeric" autoComplete="off" value={form.document_number} onChange={(e) => setForm({ ...form, document_number: e.target.value })} /></div>
              <div className="space-y-1"><Label>Nascimento</Label><Input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} /></div>
              <div className="space-y-1"><Label>Telefone</Label><Input type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="space-y-1"><Label>E-mail</Label><Input type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="md:col-span-4"><Button className="h-11 w-full sm:w-auto" disabled={save.isPending || !form.organization_id || !form.clinic_id}>{save.isPending ? 'Cadastrando…' : 'Cadastrar paciente'}</Button></div>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Cadastros</CardTitle><div className="relative max-w-md"><Search className="absolute left-3 top-2.5 h-4 w-4" /><Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, prontuário ou documento" /></div></CardHeader>
          <CardContent>
            <div className="hidden md:block"><Table><TableHeader><TableRow><TableHead>Prontuário</TableHead><TableHead>Paciente</TableHead><TableHead>Documento</TableHead><TableHead>Contato</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Preferências</TableHead></TableRow></TableHeader><TableBody>{catalog.isLoading ? <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Carregando…</TableCell></TableRow> : visible.length === 0 ? <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Nenhum paciente encontrado.</TableCell></TableRow> : visible.map((patient) => <TableRow key={patient.id}><TableCell className="font-mono text-xs">{patient.record_number}</TableCell><TableCell><div className="font-medium">{patient.person?.full_name}</div>{patient.person?.preferred_name && <div className="text-xs text-muted-foreground">{patient.person.preferred_name}</div>}</TableCell><TableCell>{patient.person?.document_number ?? '—'}</TableCell><TableCell>{patient.person?.phone ?? '—'}</TableCell><TableCell><Badge variant={patient.status === 'active' ? 'default' : 'secondary'}>{patient.status === 'active' ? 'Ativo' : patient.status}</Badge></TableCell><TableCell className="text-right"><Button size="sm" variant="ghost" onClick={() => openPreferences(patient)}><Settings2 className="mr-1 h-4 w-4" />Editar</Button></TableCell></TableRow>)}</TableBody></Table></div>
            <div className="space-y-3 md:hidden">{catalog.isLoading ? <p className="py-8 text-center text-sm text-muted-foreground">Carregando…</p> : visible.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Nenhum paciente encontrado.</p> : visible.map((patient) => <article key={patient.id} className="rounded-xl border p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-xs text-muted-foreground">{patient.record_number}</p><p className="mt-1 font-semibold">{patient.person?.preferred_name ?? patient.person?.full_name ?? 'Paciente'}</p>{patient.person?.preferred_name && <p className="text-xs text-muted-foreground">{patient.person.full_name}</p>}</div><Badge variant={patient.status === 'active' ? 'default' : 'secondary'}>{patient.status === 'active' ? 'Ativo' : patient.status}</Badge></div><dl className="mt-3 grid grid-cols-2 gap-2 text-xs"><div><dt className="text-muted-foreground">Documento</dt><dd className="mt-0.5 font-medium">{patient.person?.document_number ?? '—'}</dd></div><div><dt className="text-muted-foreground">Contato</dt><dd className="mt-0.5 font-medium">{patient.person?.phone ?? '—'}</dd></div></dl><Button className="mt-3 min-h-11 w-full" variant="outline" onClick={() => openPreferences(patient)}><Settings2 className="mr-2 h-4 w-4" />Preferências de contato</Button></article>)}</div>
          </CardContent>
        </Card>
      </div>
      <Dialog open={!!preferencePatient} onOpenChange={(open) => !open && setPreferencePatient(null)}><DialogContent><DialogHeader><DialogTitle>Preferências de contato</DialogTitle><DialogDescription>{preferencePatient?.person?.full_name ?? 'Paciente'} · informações administrativas, sem conteúdo clínico.</DialogDescription></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label>Canais permitidos</Label><div className="flex flex-wrap gap-2">{[{ id: 'phone', label: 'Telefone' }, { id: 'whatsapp', label: 'WhatsApp' }, { id: 'email', label: 'E-mail' }, { id: 'sms', label: 'SMS' }].map((channel) => <label key={channel.id} className="flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm"><input type="checkbox" checked={preferences.channels.includes(channel.id)} onChange={() => toggleChannel(channel.id)} />{channel.label}</label>)}</div></div><div className="space-y-1"><Label>Idioma preferido</Label><Select value={preferences.language} onValueChange={(language) => setPreferences((current) => ({ ...current, language }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pt-BR">Português (Brasil)</SelectItem><SelectItem value="en">English</SelectItem><SelectItem value="es">Español</SelectItem></SelectContent></Select></div><div className="space-y-1"><Label>Necessidade de acessibilidade</Label><Input value={preferences.accessibilityNotes} onChange={(event) => setPreferences((current) => ({ ...current, accessibilityNotes: event.target.value }))} placeholder="Ex.: comunicação em letra ampliada" /></div><label className="flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm"><input type="checkbox" checked={preferences.remindersEnabled} onChange={(event) => setPreferences((current) => ({ ...current, remindersEnabled: event.target.checked }))} />Receber lembretes de agenda</label></div><DialogFooter><Button variant="outline" onClick={() => setPreferencePatient(null)}>Cancelar</Button><Button disabled={savePreferences.isPending || preferences.channels.length === 0} onClick={() => savePreferences.mutate()}>Salvar preferências</Button></DialogFooter></DialogContent></Dialog>
    </MainLayout>
  );
}
