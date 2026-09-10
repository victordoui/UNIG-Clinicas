import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Check, CirclePause, CirclePlay, PhoneCall, Ticket, X } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

const APPOINTMENT_LABELS: Record<string, string> = { scheduled: 'Agendado', confirmed: 'Confirmado', checked_in: 'Check-in', completed: 'Concluído', cancelled: 'Cancelado', no_show: 'Não compareceu' };
const TICKET_LABELS: Record<string, string> = { waiting: 'Aguardando', called: 'Chamado', in_service: 'Em atendimento', completed: 'Concluído', cancelled: 'Cancelado', no_show: 'Não compareceu' };
const SESSION_LABELS: Record<string, string> = { open: 'Aberta', paused: 'Pausada', closed: 'Encerrada' };

export default function AgendaFila() {
  const qc = useQueryClient();
  const { unigRole } = useAuth();
  const canManage = ['super_admin', 'administrador', 'gestor_unidade', 'atendimento'].includes(unigRole);
  const [clinic, setClinic] = useState('');
  const [patient, setPatient] = useState('');
  const [when, setWhen] = useState('');
  const [duration, setDuration] = useState('30');
  const [reason, setReason] = useState('');
  const [session, setSession] = useState('');
  const data = useQuery({ queryKey: ['care-operation'], queryFn: async () => {
    const [clinics, patients, appointments, sessions, tickets] = await Promise.all([
      supabase.from('clinics').select('id,organization_id,name,code').eq('is_active', true),
      supabase.from('patients').select('id,record_number,person:persons(full_name)').eq('status', 'active'),
      supabase.from('appointments').select('id,scheduled_at,status,reason,clinic:clinics(name),patient:patients(record_number,person:persons(full_name))').order('scheduled_at').limit(50),
      supabase.from('queue_sessions').select('id,clinic_id,organization_id,service_date,status,clinic:clinics(name)').order('service_date', { ascending: false }).limit(30),
      supabase.from('queue_tickets').select('id,queue_session_id,ticket_number,priority,status,called_at,completed_at,patient:patients(record_number,person:persons(full_name))').order('created_at', { ascending: false }).limit(50),
    ]);
    for (const result of [clinics, patients, appointments, sessions, tickets]) if (result.error) throw result.error;
    return { clinics: clinics.data ?? [], patients: patients.data ?? [], appointments: appointments.data ?? [], sessions: sessions.data ?? [], tickets: tickets.data ?? [] };
  }});
  const refresh = () => qc.invalidateQueries({ queryKey: ['care-operation'] });
  const schedule = useMutation({ mutationFn: async () => {
    const c = (data.data?.clinics as any[]).find((item) => item.id === clinic);
    if (!c || !patient || !when) throw new Error('Selecione clínica, paciente e horário.');
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await (supabase.from('appointments') as any).insert({ organization_id: c.organization_id, clinic_id: clinic, patient_id: patient, scheduled_at: new Date(when).toISOString(), duration_minutes: Number(duration), reason: reason.trim() || 'Atendimento clínico', created_by: auth.user?.id, updated_by: auth.user?.id });
    if (error) throw error;
  }, onSuccess: () => { refresh(); setReason(''); toast({ title: 'Agendamento criado' }); }, onError: (e: Error) => toast({ title: 'Erro ao agendar', description: e.message, variant: 'destructive' }) });
  const updateAppointment = useMutation({ mutationFn: async ({ id, status }: { id: string; status: string }) => {
    const { data: auth } = await supabase.auth.getUser();
    const payload: Record<string, unknown> = { status, updated_by: auth.user?.id };
    if (status === 'cancelled') { payload.cancelled_at = new Date().toISOString(); payload.cancelled_by = auth.user?.id; }
    const { error } = await (supabase.from('appointments') as any).update(payload).eq('id', id);
    if (error) throw error;
  }, onSuccess: refresh, onError: (e: Error) => toast({ title: 'Não foi possível atualizar a agenda', description: e.message, variant: 'destructive' }) });
  const openSession = useMutation({ mutationFn: async () => {
    const c = (data.data?.clinics as any[]).find((item) => item.id === clinic);
    if (!c) throw new Error('Selecione a clínica.');
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await (supabase.from('queue_sessions') as any).upsert({ organization_id: c.organization_id, clinic_id: clinic, service_date: new Date().toISOString().slice(0, 10), status: 'open', created_by: auth.user?.id, updated_by: auth.user?.id }, { onConflict: 'clinic_id,service_date' });
    if (error) throw error;
  }, onSuccess: () => { refresh(); toast({ title: 'Fila aberta para hoje' }); }, onError: (e: Error) => toast({ title: 'Não foi possível abrir a fila', description: e.message, variant: 'destructive' }) });
  const updateSession = useMutation({ mutationFn: async ({ id, status }: { id: string; status: string }) => {
    const { error } = await (supabase.from('queue_sessions') as any).update({ status }).eq('id', id);
    if (error) throw error;
  }, onSuccess: refresh, onError: (e: Error) => toast({ title: 'Não foi possível atualizar a fila', description: e.message, variant: 'destructive' }) });
  const issue = useMutation({ mutationFn: async () => {
    const { error } = await supabase.rpc('issue_queue_ticket' as never, { target_queue_session_id: session, target_patient_id: patient, ticket_priority: 'normal', target_appointment_id: null } as never);
    if (error) throw error;
  }, onSuccess: () => { refresh(); toast({ title: 'Senha emitida' }); }, onError: (e: Error) => toast({ title: 'Erro ao emitir senha', description: e.message, variant: 'destructive' }) });
  const updateTicket = useMutation({ mutationFn: async ({ id, status }: { id: string; status: string }) => {
    const payload: Record<string, unknown> = { status };
    if (status === 'called') payload.called_at = new Date().toISOString();
    if (status === 'completed') payload.completed_at = new Date().toISOString();
    const { error } = await (supabase.from('queue_tickets') as any).update(payload).eq('id', id);
    if (error) throw error;
  }, onSuccess: refresh, onError: (e: Error) => toast({ title: 'Não foi possível atualizar a senha', description: e.message, variant: 'destructive' }) });
  const submit = (fn: () => void) => (event: FormEvent) => { event.preventDefault(); fn(); };
  const clinics = (data.data?.clinics as any[]) ?? [];
  const patients = (data.data?.patients as any[]) ?? [];
  const appointments = (data.data?.appointments as any[]) ?? [];
  const sessions = (data.data?.sessions as any[]) ?? [];
  const tickets = (data.data?.tickets as any[]) ?? [];
  return <MainLayout><div className="space-y-6"><div className="flex gap-3"><div className="rounded-lg bg-primary/10 p-2"><CalendarDays className="h-6 w-6 text-primary" /></div><div><h1 className="text-2xl font-bold">Agenda e fila</h1><p className="text-sm text-muted-foreground">Acompanhe horários, chegada e andamento do atendimento sem expor o conteúdo do prontuário.</p></div></div>{!canManage && <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">Seu papel tem acesso de consulta. Operações de agenda e fila ficam disponíveis para a equipe de recepção e gestão.</p>}<Tabs defaultValue="agenda"><TabsList><TabsTrigger value="agenda">Agenda</TabsTrigger><TabsTrigger value="fila">Fila</TabsTrigger></TabsList><TabsContent value="agenda" className="space-y-4"><Card><CardHeader><CardTitle className="text-base">Novo agendamento</CardTitle></CardHeader><CardContent><form onSubmit={submit(() => schedule.mutate())} className="grid gap-3 md:grid-cols-4"><Picker label="Clínica" value={clinic} onValue={setClinic} options={clinics} labelOf={(item: any) => item.name} /><Picker label="Paciente" value={patient} onValue={setPatient} options={patients} labelOf={(item: any) => `${item.record_number} — ${item.person?.full_name ?? ''}`} /><div className="space-y-1"><Label>Data e hora</Label><Input required type="datetime-local" value={when} onChange={(event) => setWhen(event.target.value)} /></div><div className="space-y-1"><Label>Duração (minutos)</Label><Input required type="number" min="5" max="480" value={duration} onChange={(event) => setDuration(event.target.value)} /></div><div className="md:col-span-3 space-y-1"><Label>Motivo</Label><Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Consulta, retorno ou avaliação" /></div><div className="flex items-end"><Button className="w-full" disabled={!canManage || !clinic || !patient || !when || schedule.isPending}>Agendar</Button></div></form></CardContent></Card><Card><CardHeader><CardTitle className="text-base">Próximos agendamentos</CardTitle></CardHeader><CardContent><div className="space-y-2">{appointments.length ? appointments.map((item) => <div key={item.id} className="flex flex-col gap-3 rounded border p-3 text-sm md:flex-row md:items-center"><div className="min-w-0 flex-1"><p className="font-medium">{item.patient?.person?.full_name ?? item.patient?.record_number}</p><p className="text-xs text-muted-foreground">{new Date(item.scheduled_at).toLocaleString('pt-BR')} · {item.clinic?.name} · {item.reason ?? 'Atendimento clínico'}</p></div><Badge variant={item.status === 'cancelled' ? 'destructive' : 'outline'}>{APPOINTMENT_LABELS[item.status] ?? item.status}</Badge><div className="flex flex-wrap gap-1">{item.status === 'scheduled' && <Button size="sm" variant="outline" disabled={!canManage} onClick={() => updateAppointment.mutate({ id: item.id, status: 'confirmed' })}><Check className="mr-1 h-3 w-3" />Confirmar</Button>}{item.status === 'confirmed' && <Button size="sm" variant="outline" disabled={!canManage} onClick={() => updateAppointment.mutate({ id: item.id, status: 'checked_in' })}>Check-in</Button>}{['scheduled', 'confirmed', 'checked_in'].includes(item.status) && <Button size="sm" variant="ghost" disabled={!canManage} onClick={() => updateAppointment.mutate({ id: item.id, status: 'cancelled' })}><X className="mr-1 h-3 w-3" />Cancelar</Button>}</div></div>) : <p className="py-4 text-center text-sm text-muted-foreground">Nenhum agendamento.</p>}</div></CardContent></Card></TabsContent><TabsContent value="fila" className="space-y-4"><Card><CardHeader><CardTitle className="text-base">Operar fila</CardTitle><CardDescription>Abra, pause ou encerre a fila da clínica e emita senhas para pacientes cadastrados.</CardDescription></CardHeader><CardContent className="grid gap-5 md:grid-cols-2"><div className="space-y-3"><Picker label="Clínica para hoje" value={clinic} onValue={setClinic} options={clinics} labelOf={(item: any) => item.name} /><Button disabled={!canManage || !clinic || openSession.isPending} onClick={() => openSession.mutate()}><CirclePlay className="mr-1 h-4 w-4" />Abrir ou reabrir fila</Button><div className="space-y-2 pt-2">{sessions.slice(0, 8).map((item) => <div key={item.id} className="flex items-center justify-between rounded border p-2 text-xs"><span>{item.clinic?.name} · {item.service_date}</span><div className="flex items-center gap-1"><Badge variant="outline">{SESSION_LABELS[item.status] ?? item.status}</Badge>{item.status === 'open' && <Button size="sm" variant="ghost" disabled={!canManage} onClick={() => updateSession.mutate({ id: item.id, status: 'paused' })}><CirclePause className="h-3 w-3" /></Button>}{item.status === 'paused' && <Button size="sm" variant="ghost" disabled={!canManage} onClick={() => updateSession.mutate({ id: item.id, status: 'open' })}><CirclePlay className="h-3 w-3" /></Button>}{item.status !== 'closed' && <Button size="sm" variant="ghost" disabled={!canManage} onClick={() => updateSession.mutate({ id: item.id, status: 'closed' })}><X className="h-3 w-3" /></Button>}</div></div>)}</div></div><form onSubmit={submit(() => issue.mutate())} className="space-y-3"><Picker label="Fila aberta" value={session} onValueChange={setSession} options={sessions.filter((item) => item.status === 'open')} labelOf={(item: any) => `${item.clinic?.name} — ${item.service_date}`} /><Picker label="Paciente" value={patient} onValueChange={setPatient} options={patients} labelOf={(item: any) => `${item.record_number} — ${item.person?.full_name ?? ''}`} /><Button disabled={!canManage || !session || !patient || issue.isPending}><Ticket className="mr-1 h-4 w-4" />Emitir senha</Button></form></CardContent></Card><Card><CardHeader><CardTitle className="text-base">Senhas recentes</CardTitle></CardHeader><CardContent><div className="space-y-2">{tickets.length ? tickets.map((item) => <div key={item.id} className="flex flex-col gap-3 rounded border p-3 text-sm md:flex-row md:items-center"><span className="font-mono font-semibold">#{item.ticket_number}</span><span className="flex-1">{item.patient?.person?.full_name ?? item.patient?.record_number}</span><Badge variant={item.status === 'cancelled' ? 'destructive' : 'secondary'}>{TICKET_LABELS[item.status] ?? item.status}</Badge><div className="flex gap-1">{item.status === 'waiting' && <Button size="sm" variant="outline" disabled={!canManage} onClick={() => updateTicket.mutate({ id: item.id, status: 'called' })}><PhoneCall className="mr-1 h-3 w-3" />Chamar</Button>}{item.status === 'called' && <Button size="sm" variant="outline" disabled={!canManage} onClick={() => updateTicket.mutate({ id: item.id, status: 'in_service' })}>Iniciar</Button>}{item.status === 'in_service' && <Button size="sm" variant="outline" disabled={!canManage} onClick={() => updateTicket.mutate({ id: item.id, status: 'completed' })}><Check className="mr-1 h-3 w-3" />Concluir</Button>}{['waiting', 'called'].includes(item.status) && <Button size="sm" variant="ghost" disabled={!canManage} onClick={() => updateTicket.mutate({ id: item.id, status: 'cancelled' })}><X className="mr-1 h-3 w-3" />Cancelar</Button>}</div></div>) : <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma senha emitida.</p>}</div></CardContent></Card></TabsContent></Tabs></div></MainLayout>;
}

function Picker({ label, value, onValue, options, labelOf }: { label: string; value: string; onValue: (value: string) => void; options: any[]; labelOf: (item: any) => string }) {
  return <div className="space-y-1"><Label>{label}</Label><Select value={value} onValueChange={onValue}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{options.map((item) => <SelectItem key={item.id} value={item.id}>{labelOf(item)}</SelectItem>)}</SelectContent></Select></div>;
}
