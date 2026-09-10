import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GraduationCap, Save, Star } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export default function Supervisoes() {
  const qc = useQueryClient(); const [clinicId, setClinicId] = useState(''); const [studentId, setStudentId] = useState(''); const [supervisionId, setSupervisionId] = useState(''); const [score, setScore] = useState(''); const [feedback, setFeedback] = useState('');
  const data = useQuery({ queryKey: ['clinical-supervisions'], queryFn: async () => {
    const [clinics, assignments, profiles, supervisions, evaluations] = await Promise.all([
      supabase.from('clinics').select('id,organization_id,name').eq('is_active', true),
      supabase.from('user_roles').select('user_id,role:roles(code)').eq('is_active', true),
      supabase.from('profiles').select('id,full_name,email').limit(500),
      supabase.from('student_supervisions').select('id,clinic_id,student_user_id,supervisor_user_id,status,started_at,created_at,clinic:clinics(name)').order('created_at', { ascending: false }).limit(40),
      supabase.from('evaluations').select('id,supervision_id,score,feedback,submitted_at').order('created_at', { ascending: false }).limit(40),
    ]);
    for (const result of [clinics, assignments, profiles, supervisions, evaluations]) if (result.error) throw result.error;
    const profileById = new Map((profiles.data ?? []).map((profile: any) => [profile.id, profile]));
    return { clinics: clinics.data ?? [], students: (assignments.data ?? []).filter((item: any) => item.role?.code === 'student').map((item: any) => ({ ...item, profile: profileById.get(item.user_id) })), supervisions: supervisions.data ?? [], evaluations: evaluations.data ?? [] };
  }});
  const refresh = () => qc.invalidateQueries({ queryKey: ['clinical-supervisions'] });
  const create = useMutation({ mutationFn: async () => {
    const clinic = (data.data?.clinics as any[]).find((item) => item.id === clinicId); if (!clinic || !studentId) throw new Error('Selecione clínica e estudante.');
    const { data: auth } = await supabase.auth.getUser(); if (!auth.user) throw new Error('Sessão expirada.');
    const { error } = await (supabase.from('student_supervisions') as any).insert({ organization_id: clinic.organization_id, clinic_id: clinicId, student_user_id: studentId, supervisor_user_id: auth.user.id, status: 'in_progress', started_at: new Date().toISOString(), created_by: auth.user.id, updated_by: auth.user.id }); if (error) throw error;
  }, onSuccess: () => { refresh(); toast({ title: 'Supervisão iniciada' }); }, onError: (error: Error) => toast({ title: 'Não foi possível iniciar', description: error.message, variant: 'destructive' }) });
  const evaluate = useMutation({ mutationFn: async () => { const { data: auth } = await supabase.auth.getUser(); if (!auth.user || !supervisionId) throw new Error('Selecione uma supervisão.'); const { error } = await (supabase.from('evaluations') as any).upsert({ supervision_id: supervisionId, evaluator_user_id: auth.user.id, score: Number(score), feedback, submitted_at: new Date().toISOString() }, { onConflict: 'supervision_id,evaluator_user_id' }); if (error) throw error; }, onSuccess: () => { refresh(); setScore(''); setFeedback(''); toast({ title: 'Avaliação registrada' }); }, onError: (error: Error) => toast({ title: 'Não foi possível avaliar', description: error.message, variant: 'destructive' }) });
  const submit = (action: () => void) => (event: FormEvent) => { event.preventDefault(); action(); }; const students = (data.data?.students as any[]) ?? []; const supervisions = (data.data?.supervisions as any[]) ?? [];
  return <MainLayout><div className="space-y-6"><div className="flex gap-3"><div className="rounded-lg bg-primary/10 p-2"><GraduationCap className="h-6 w-6 text-primary" /></div><div><h1 className="text-2xl font-bold">Supervisões clínicas</h1><p className="text-sm text-muted-foreground">Acompanhe atuação discente e registre avaliações vinculadas à prática.</p></div></div><div className="grid gap-5 lg:grid-cols-2"><Card><CardHeader><CardTitle className="text-base">Iniciar supervisão</CardTitle><CardDescription>O usuário autenticado é registrado como supervisor.</CardDescription></CardHeader><CardContent><form onSubmit={submit(() => create.mutate())} className="space-y-3"><Picker label="Clínica" value={clinicId} setValue={setClinicId} options={(data.data?.clinics as any[]) ?? []} text={(item: any) => item.name}/><Picker label="Estudante" value={studentId} setValue={setStudentId} options={students} text={(item: any) => item.profile?.full_name ?? item.profile?.email ?? item.user_id}/><Button disabled={!clinicId || !studentId || create.isPending}><Save className="mr-1 h-4 w-4" />Iniciar</Button></form></CardContent></Card><Card><CardHeader><CardTitle className="text-base">Avaliar estudante</CardTitle><CardDescription>A avaliação é atribuída ao supervisor autenticado.</CardDescription></CardHeader><CardContent><form onSubmit={submit(() => evaluate.mutate())} className="space-y-3"><Picker label="Supervisão" value={supervisionId} setValue={setSupervisionId} options={supervisions} text={(item: any) => `${item.clinic?.name ?? 'Clínica'} · ${item.status}`}/><div className="space-y-1"><Label>Nota (0 a 100)</Label><Input type="number" min="0" max="100" step="0.01" value={score} onChange={(event) => setScore(event.target.value)} required /></div><div className="space-y-1"><Label>Feedback</Label><Textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} rows={3} /></div><Button disabled={!supervisionId || !score || evaluate.isPending}><Star className="mr-1 h-4 w-4" />Registrar avaliação</Button></form></CardContent></Card></div><Card><CardHeader><CardTitle className="text-base">Supervisões registradas</CardTitle></CardHeader><CardContent className="space-y-2">{supervisions.length ? supervisions.map((item: any) => <div key={item.id} className="flex items-center justify-between rounded border p-3 text-sm"><span>{item.clinic?.name ?? 'Clínica'} · estudante {item.student_user_id.slice(0, 8)}</span><Badge>{item.status}</Badge></div>) : <p className="text-sm text-muted-foreground">Nenhuma supervisão registrada.</p>}</CardContent></Card></div></MainLayout>;
}

function Picker({ label, value, setValue, options, text }: { label: string; value: string; setValue: (value: string) => void; options: any[]; text: (item: any) => string }) { return <div className="space-y-1"><Label>{label}</Label><Select value={value} onValueChange={setValue}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{options.map((item) => <SelectItem key={item.id ?? item.user_id} value={item.id ?? item.user_id}>{text(item)}</SelectItem>)}</SelectContent></Select></div>; }
