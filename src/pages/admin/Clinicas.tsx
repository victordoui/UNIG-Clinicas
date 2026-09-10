import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, ClipboardList, Plus, Power, Stethoscope } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type Organization = { id: string; display_name: string; legal_name: string; is_active: boolean };
type Unit = { id: string; organization_id: string; code: string; name: string; city: string | null; state: string | null; is_active: boolean };
type Clinic = { id: string; organization_id: string; unit_id: string; code: string; name: string; specialty: string | null; is_active: boolean };
type Service = { id: string; clinic_id: string; code: string; name: string; duration_minutes: number | null; is_active: boolean };

const useClinicalCatalog = () => useQuery({
  queryKey: ['clinical-administration-catalog'],
  queryFn: async () => {
    const [organizations, units, clinics, services] = await Promise.all([
      supabase.from('organizations').select('id, display_name, legal_name, is_active').order('display_name'),
      supabase.from('units').select('id, organization_id, code, name, city, state, is_active').order('name'),
      supabase.from('clinics').select('id, organization_id, unit_id, code, name, specialty, is_active').order('name'),
      supabase.from('clinic_services').select('id, clinic_id, code, name, duration_minutes, is_active').order('name'),
    ]);
    for (const result of [organizations, units, clinics, services]) if (result.error) throw result.error;
    return {
      organizations: (organizations.data ?? []) as unknown as Organization[],
      units: (units.data ?? []) as unknown as Unit[],
      clinics: (clinics.data ?? []) as unknown as Clinic[],
      services: (services.data ?? []) as unknown as Service[],
    };
  },
});

export default function AdminClinicas() {
  const catalog = useClinicalCatalog();
  const queryClient = useQueryClient();
  const [unitForm, setUnitForm] = useState({ organization_id: '', code: '', name: '', city: '', state: '' });
  const [clinicForm, setClinicForm] = useState({ organization_id: '', unit_id: '', code: '', name: '', specialty: '' });
  const [serviceForm, setServiceForm] = useState({ clinic_id: '', code: '', name: '', duration_minutes: '30' });
  const data = catalog.data;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['clinical-administration-catalog'] });
  const write = useMutation({
    mutationFn: async ({ table, payload }: { table: 'units' | 'clinics' | 'clinic_services'; payload: Record<string, unknown> }) => {
      const { error } = await (supabase.from(table) as any).insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { refresh(); toast({ title: 'Cadastro salvo' }); },
    onError: (error: Error) => toast({ title: 'Não foi possível salvar', description: error.message, variant: 'destructive' }),
  });
  const toggle = useMutation({
    mutationFn: async ({ table, id, is_active }: { table: 'units' | 'clinics' | 'clinic_services'; id: string; is_active: boolean }) => {
      const { error } = await (supabase.from(table) as any).update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { refresh(); toast({ title: 'Status atualizado' }); },
    onError: (error: Error) => toast({ title: 'Não foi possível atualizar', description: error.message, variant: 'destructive' }),
  });

  const clinicsByUnit = useMemo(() => new Map(data?.units.map((unit) => [unit.id, unit.name]) ?? []), [data?.units]);
  const clinicById = useMemo(() => new Map(data?.clinics.map((clinic) => [clinic.id, clinic.name]) ?? []), [data?.clinics]);
  const unitsForClinic = data?.units.filter((unit) => !clinicForm.organization_id || unit.organization_id === clinicForm.organization_id) ?? [];

  const submitUnit = (event: FormEvent) => { event.preventDefault(); write.mutate({ table: 'units', payload: { ...unitForm, city: unitForm.city || null, state: unitForm.state || null } }); };
  const submitClinic = (event: FormEvent) => { event.preventDefault(); write.mutate({ table: 'clinics', payload: { ...clinicForm, specialty: clinicForm.specialty || null } }); };
  const submitService = (event: FormEvent) => { event.preventDefault(); write.mutate({ table: 'clinic_services', payload: { ...serviceForm, duration_minutes: Number(serviceForm.duration_minutes) || null } }); };

  return <MainLayout>
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2"><Stethoscope className="h-6 w-6 text-primary" /></div>
        <div><h1 className="text-2xl font-bold">Administração clínica</h1><p className="text-sm text-muted-foreground">Estruture unidades, clínicas e os serviços disponibilizados para atendimento.</p></div>
      </div>
      {catalog.isLoading && <p className="text-sm text-muted-foreground">Carregando cadastros clínicos…</p>}
      {catalog.isError && <Card className="border-destructive"><CardContent className="pt-6 text-sm text-destructive">Não foi possível carregar os cadastros. Confirme que sua conta possui acesso administrativo.</CardContent></Card>}
      {data && <Tabs defaultValue="units" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 max-w-xl"><TabsTrigger value="units">Unidades</TabsTrigger><TabsTrigger value="clinics">Clínicas</TabsTrigger><TabsTrigger value="services">Serviços</TabsTrigger></TabsList>
        <TabsContent value="units" className="space-y-4">
          <Card><CardHeader><CardTitle className="text-base flex gap-2 items-center"><Plus className="h-4 w-4" />Nova unidade</CardTitle><CardDescription>Uma unidade pode reunir diversas clínicas universitárias.</CardDescription></CardHeader><CardContent><form onSubmit={submitUnit} className="grid gap-3 md:grid-cols-5"><div className="md:col-span-2 space-y-1"><Label>Organização</Label><Select value={unitForm.organization_id} onValueChange={(organization_id) => setUnitForm({ ...unitForm, organization_id })}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{data.organizations.map((organization) => <SelectItem key={organization.id} value={organization.id}>{organization.display_name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1"><Label>Código</Label><Input required value={unitForm.code} onChange={(e) => setUnitForm({ ...unitForm, code: e.target.value.toUpperCase() })} placeholder="CAMPUS-01" /></div><div className="space-y-1"><Label>Nome</Label><Input required value={unitForm.name} onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })} /></div><div className="flex items-end"><Button className="w-full" disabled={write.isPending || !unitForm.organization_id}>Salvar</Button></div><div className="space-y-1"><Label>Cidade</Label><Input value={unitForm.city} onChange={(e) => setUnitForm({ ...unitForm, city: e.target.value })} /></div><div className="space-y-1"><Label>UF</Label><Input maxLength={2} value={unitForm.state} onChange={(e) => setUnitForm({ ...unitForm, state: e.target.value.toUpperCase() })} /></div></form></CardContent></Card>
          <CatalogTable rows={data.units} empty="Nenhuma unidade cadastrada." columns={['Código', 'Unidade', 'Localidade']} render={(unit) => <><TableCell className="font-mono text-xs">{unit.code}</TableCell><TableCell className="font-medium">{unit.name}</TableCell><TableCell>{[unit.city, unit.state].filter(Boolean).join('/') || '—'}</TableCell></>} onToggle={(unit) => toggle.mutate({ table: 'units', id: unit.id, is_active: !unit.is_active })} />
        </TabsContent>
        <TabsContent value="clinics" className="space-y-4">
          <Card><CardHeader><CardTitle className="text-base flex gap-2 items-center"><Plus className="h-4 w-4" />Nova clínica</CardTitle><CardDescription>Cadastre as clínicas iniciais e futuras sem alterar a estrutura do sistema.</CardDescription></CardHeader><CardContent><form onSubmit={submitClinic} className="grid gap-3 md:grid-cols-5"><div className="space-y-1"><Label>Organização</Label><Select value={clinicForm.organization_id} onValueChange={(organization_id) => setClinicForm({ ...clinicForm, organization_id, unit_id: '' })}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{data.organizations.map((organization) => <SelectItem key={organization.id} value={organization.id}>{organization.display_name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1"><Label>Unidade</Label><Select value={clinicForm.unit_id} onValueChange={(unit_id) => setClinicForm({ ...clinicForm, unit_id })}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{unitsForClinic.map((unit) => <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1"><Label>Código</Label><Input required value={clinicForm.code} onChange={(e) => setClinicForm({ ...clinicForm, code: e.target.value.toUpperCase() })} placeholder="ODONTO" /></div><div className="space-y-1"><Label>Nome</Label><Input required value={clinicForm.name} onChange={(e) => setClinicForm({ ...clinicForm, name: e.target.value })} placeholder="Clínica de Odontologia" /></div><div className="space-y-1"><Label>Especialidade</Label><Input value={clinicForm.specialty} onChange={(e) => setClinicForm({ ...clinicForm, specialty: e.target.value })} placeholder="Odontologia" /></div><div className="md:col-span-5"><Button disabled={write.isPending || !clinicForm.unit_id}>Salvar clínica</Button></div></form></CardContent></Card>
          <CatalogTable rows={data.clinics} empty="Nenhuma clínica cadastrada." columns={['Código', 'Clínica', 'Unidade', 'Especialidade']} render={(clinic) => <><TableCell className="font-mono text-xs">{clinic.code}</TableCell><TableCell className="font-medium">{clinic.name}</TableCell><TableCell>{clinicsByUnit.get(clinic.unit_id) ?? '—'}</TableCell><TableCell>{clinic.specialty ?? '—'}</TableCell></>} onToggle={(clinic) => toggle.mutate({ table: 'clinics', id: clinic.id, is_active: !clinic.is_active })} />
        </TabsContent>
        <TabsContent value="services" className="space-y-4">
          <Card><CardHeader><CardTitle className="text-base flex gap-2 items-center"><Plus className="h-4 w-4" />Novo serviço</CardTitle><CardDescription>Serviços formam a base para a futura agenda e fila.</CardDescription></CardHeader><CardContent><form onSubmit={submitService} className="grid gap-3 md:grid-cols-4"><div className="space-y-1"><Label>Clínica</Label><Select value={serviceForm.clinic_id} onValueChange={(clinic_id) => setServiceForm({ ...serviceForm, clinic_id })}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{data.clinics.filter((clinic) => clinic.is_active).map((clinic) => <SelectItem key={clinic.id} value={clinic.id}>{clinic.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1"><Label>Código</Label><Input required value={serviceForm.code} onChange={(e) => setServiceForm({ ...serviceForm, code: e.target.value.toUpperCase() })} placeholder="AVALIACAO" /></div><div className="space-y-1"><Label>Nome</Label><Input required value={serviceForm.name} onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })} placeholder="Avaliação inicial" /></div><div className="space-y-1"><Label>Duração (minutos)</Label><Input type="number" min="5" value={serviceForm.duration_minutes} onChange={(e) => setServiceForm({ ...serviceForm, duration_minutes: e.target.value })} /></div><div className="md:col-span-4"><Button disabled={write.isPending || !serviceForm.clinic_id}>Salvar serviço</Button></div></form></CardContent></Card>
          <CatalogTable rows={data.services} empty="Nenhum serviço cadastrado." columns={['Código', 'Serviço', 'Clínica', 'Duração']} render={(service) => <><TableCell className="font-mono text-xs">{service.code}</TableCell><TableCell className="font-medium">{service.name}</TableCell><TableCell>{clinicById.get(service.clinic_id) ?? '—'}</TableCell><TableCell>{service.duration_minutes ? `${service.duration_minutes} min` : '—'}</TableCell></>} onToggle={(service) => toggle.mutate({ table: 'clinic_services', id: service.id, is_active: !service.is_active })} />
        </TabsContent>
      </Tabs>}
    </div>
  </MainLayout>;
}

function CatalogTable<T extends { id: string; is_active: boolean }>({ rows, empty, columns, render, onToggle }: { rows: T[]; empty: string; columns: string[]; render: (row: T) => React.ReactNode; onToggle: (row: T) => void }) {
  return <Card><CardContent className="pt-5"><Table><TableHeader><TableRow>{columns.map((column) => <TableHead key={column}>{column}</TableHead>)}<TableHead>Status</TableHead><TableHead className="text-right">Ação</TableHead></TableRow></TableHeader><TableBody>{rows.length === 0 ? <TableRow><TableCell colSpan={columns.length + 2} className="py-8 text-center text-muted-foreground">{empty}</TableCell></TableRow> : rows.map((row) => <TableRow key={row.id}>{render(row)}<TableCell><Badge variant={row.is_active ? 'default' : 'secondary'}>{row.is_active ? 'Ativo' : 'Inativo'}</Badge></TableCell><TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => onToggle(row)} title={row.is_active ? 'Desativar' : 'Ativar'}><Power className="h-4 w-4" /></Button></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>;
}
