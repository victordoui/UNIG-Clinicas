import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, GraduationCap, Save, Send, Star, XCircle } from 'lucide-react';
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
import { useAuth } from '@/hooks/useAuth';

const STATUS_LABELS: Record<string, string> = { planned: 'Planejada', in_progress: 'Em andamento', completed: 'Concluída', cancelled: 'Cancelada' };
const NOTE_STATUS_LABELS: Record<string, string> = { draft: 'Rascunho', submitted: 'Enviada', under_review: 'Em revisão', changes_requested: 'Correção solicitada', approved: 'Aprovada' };

export default function Supervisoes() {
  const qc = useQueryClient();
  const { unigRole } = useAuth();
  const canManage = ['super_admin', 'administrador', 'gestor_unidade', 'coordenacao', 'professor'].includes(unigRole);
  const [clinicId, setClinicId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [supervisionId, setSupervisionId] = useState('');
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [reviewFeedback, setReviewFeedback] = useState('');

  const data = useQuery({ queryKey: ['clinical-supervisions'], queryFn: async () => {
    const [clinics, assignments, profiles, supervisions, evaluations, notes] = await Promise.all([
      supabase.from('clinics').select('id,organization_id,name').eq('is_active', true),
      supabase.from('user_roles').select('user_id,role:roles(code)').eq('is_active', true),
      supabase.from('profiles').select('id,full_name,email').limit(500),
      (supabase.from('student_supervisions') as any).select('id,clinic_id,student_user_id,supervisor_user_id,status,started_at,completed_at,created_at,clinic:clinics(name)').order('created_at', { ascending: false }).limit(40),
      (supabase.from('evaluations') as any).select('id,supervision_id,evaluator_user_id,score,feedback,submitted_at,created_at').order('created_at', { ascending: false }).limit(40),
      (supabase.from('clinical_notes') as any).select('id,encounter_id,note_type,content,workflow_status,authored_at,review_feedback').order('authored_at', { ascending: false }).limit(40),
    ]);
    for (const result of [clinics, assignments, profiles, supervisions, evaluations, notes]) if (result.error) throw result.error;
    const profileById = new Map((profiles.data ?? []).map((profile: any) => [profile.id, profile]));
    const students = (assignments.data ?? []).filter((item: any) => item.role?.code === 'student').map((item: any) => ({ ...item, profile: profileById.get(item.user_id) }));
    return {
      clinics: clinics.data ?? [], students,
      supervisions: (supervisions.data ?? []).map((item: any) => ({ ...item, student: profileById.get(item.student_user_id), supervisor: profileById.get(item.supervisor_user_id) })),
      evaluations: (evaluations.data ?? []).map((item: any) => ({ ...item, evaluator: profileById.get(item.evaluator_user_id) })),
      notes: notes.data ?? [],
    };
  }});

  const refresh = () => qc.invalidateQueries({ queryKey: ['clinical-supervisions'] });
  const create = useMutation({ mutationFn: async () => {
    const clinic = (data.data?.clinics as any[]).find((item) => item.id === clinicId);
    if (!clinic || !studentId) throw new Error('Selecione clínica e estudante.');
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error('Sessão expirada.');
    const { error } = await (supabase.from('student_supervisions') as any).insert({ organization_id: clinic.organization_id, clinic_id: clinicId, student_user_id: studentId, supervisor_user_id: auth.user.id, status: 'in_progress', started_at: new Date().toISOString(), created_by: auth.user.id, updated_by: auth.user.id });
    if (error) throw error;
  }, onSuccess: () => { refresh(); toast({ title: 'Supervisão iniciada' }); }, onError: (error: Error) => toast({ title: 'Não foi possível iniciar', description: error.message, variant: 'destructive' }) });
  const updateStatus = useMutation({ mutationFn: async ({ id, status }: { id: string; status: 'completed' | 'cancelled' }) => { const { data: auth } = await supabase.auth.getUser(); const { error } = await (supabase.from('student_supervisions') as any).update({ status, completed_at: status === 'completed' ? new Date().toISOString() : null, updated_by: auth.user?.id }).eq('id', id); if (error) throw error; }, onSuccess: () => { refresh(); toast({ title: 'Status da supervisão atualizado' }); }, onError: (error: Error) => toast({ title: 'Não foi possível atualizar', description: error.message, variant: 'destructive' }) });
  const evaluate = useMutation({ mutationFn: async () => { const { data: auth } = await supabase.auth.getUser(); if (!auth.user || !supervisionId) throw new Error('Selecione uma supervisão.'); const numericScore = Number(score); if (numericScore < 0 || numericScore > 100) throw new Error('A nota deve estar entre 0 e 100.'); const { error } = await (supabase.from('evaluations') as any).upsert({ supervision_id: supervisionId, evaluator_user_id: auth.user.id, score: numericScore, feedback: feedback.trim() || null, rubric: { registro: numericScore >= 70 ? 'adequado' : 'em desenvolvimento' }, submitted_at: new Date().toISOString() }, { onConflict: 'supervision_id,evaluator_user_id' }); if (error) throw error; }, onSuccess: () => { refresh(); setScore(''); setFeedback(''); toast({ title: 'Avaliação registrada' }); }, onError: (error: Error) => toast({ title: 'Não foi possível avaliar', description: error.message, variant: 'destructive' }) });
  const reviewNote = useMutation({ mutationFn: async ({ id, status }: { id: string; status: 'under_review' | 'approved' | 'changes_requested' }) => { const { error } = await supabase.rpc('transition_clinical_note' as never, { target_note_id: id, target_status: status, target_feedback: reviewFeedback.trim() || null } as never); if (error) throw error; }, onSuccess: () => { refresh(); setReviewFeedback(''); toast({ title: 'Evolução atualizada' }); }, onError: (error: Error) => toast({ title: 'Não foi possível revisar', description: error.message, variant: 'destructive' }) });
  const submit = (action: () => void) => (event: FormEvent) => { event.preventDefault(); action(); };
  const clinics = (data.data?.clinics as any[]) ?? [];
  const students = (data.data?.students as any[]) ?? [];
  const supervisions = (data.data?.supervisions as any[]) ?? [];
  const evaluations = (data.data?.evaluations as any[]) ?? [];
  const notes = (data.data?.notes as any[]) ?? [];
  const supervisionEvaluations = (id: string) => evaluations.filter((item) => item.supervision_id === id);

  return <MainLayout><div className="space-y-6"><div className="flex gap-3"><div className="rounded-lg bg-primary/10 p-2"><GraduationCap className="h-6 w-6 text-primary" /></div><div><h1 className="text-2xl font-bold">Supervisões clínicas</h1><p className="text-sm text-muted-foreground">Acompanhe a prática discente e mova cada evolução por um ciclo explícito de revisão.</p></div></div>{!canManage && <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">Seu papel tem acesso de consulta às supervisões atribuídas.</p>}
    <div className="grid gap-5 lg:grid-cols-2"><Card><CardHeader><CardTitle className="text-base">Iniciar supervisão</CardTitle><CardDescription>O usuário autenticado é registrado como supervisor.</CardDescription></CardHeader><CardContent><form onSubmit={submit(() => create.mutate())} className="space-y-3"><Picker label="Clínica" value={clinicId} setValue={setClinicId} options={clinics} text={(item: any) => item.name} /><Picker label="Estudante" value={studentId} setValue={setStudentId} options={students} text={(item: any) => item.profile?.full_name ?? item.profile?.email ?? item.user_id} /><Button disabled={!canManage || !clinicId || !studentId || create.isPending}><Save className="mr-1 h-4 w-4" />Iniciar</Button></form></CardContent></Card><Card><CardHeader><CardTitle className="text-base">Avaliar estudante</CardTitle><CardDescription>A avaliação fica vinculada ao supervisor autenticado.</CardDescription></CardHeader><CardContent><form onSubmit={submit(() => evaluate.mutate())} className="space-y-3"><Picker label="Supervisão" value={supervisionId} setValue={setSupervisionId} options={supervisions.filter((item) => item.status !== 'cancelled')} text={(item: any) => `${item.clinic?.name ?? 'Clínica'} · ${item.student?.full_name ?? 'Estudante'} · ${STATUS_LABELS[item.status] ?? item.status}`} /><div className="space-y-1"><Label>Nota (0 a 100)</Label><Input type="number" min="0" max="100" step="0.01" value={score} onChange={(event) => setScore(event.target.value)} required /></div><div className="space-y-1"><Label>Feedback</Label><Textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} rows={3} /></div><Button disabled={!canManage || !supervisionId || !score || evaluate.isPending}><Star className="mr-1 h-4 w-4" />Registrar avaliação</Button></form></CardContent></Card></div>
    <Card><CardHeader><CardTitle className="text-base">Pendências de evolução</CardTitle><CardDescription>As ações de revisão são autorizadas no servidor e preservam o conteúdo original.</CardDescription></CardHeader><CardContent className="space-y-3"><div className="space-y-1"><Label>Comentário para solicitação de correção (opcional)</Label><Input value={reviewFeedback} onChange={(event) => setReviewFeedback(event.target.value)} placeholder="Explique o ajuste necessário" /></div>{notes.filter((note) => ['submitted', 'under_review'].includes(note.workflow_status)).length ? notes.filter((note) => ['submitted', 'under_review'].includes(note.workflow_status)).map((note) => <div key={note.id} className="rounded border p-3"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-muted-foreground">{new Date(note.authored_at).toLocaleString('pt-BR')} · {note.note_type}</span><Badge variant={note.workflow_status === 'under_review' ? 'default' : 'outline'}>{NOTE_STATUS_LABELS[note.workflow_status]}</Badge></div><p className="line-clamp-4 whitespace-pre-wrap text-sm">{note.content}</p>{canManage && <div className="mt-3 flex flex-wrap gap-2">{note.workflow_status === 'submitted' && <Button size="sm" variant="outline" onClick={() => reviewNote.mutate({ id: note.id, status: 'under_review' })}><Send className="mr-1 h-3 w-3" />Assumir revisão</Button>}{note.workflow_status === 'under_review' && <><Button size="sm" onClick={() => reviewNote.mutate({ id: note.id, status: 'approved' })}><CheckCircle2 className="mr-1 h-3 w-3" />Aprovar</Button><Button size="sm" variant="outline" onClick={() => reviewNote.mutate({ id: note.id, status: 'changes_requested' })}><XCircle className="mr-1 h-3 w-3" />Solicitar correção</Button></>}</div>}</div>) : <p className="py-3 text-sm text-muted-foreground">Nenhuma evolução aguardando supervisão.</p>}</CardContent></Card>
    <Card><CardHeader><CardTitle className="text-base">Supervisões registradas</CardTitle></CardHeader><CardContent className="space-y-2">{supervisions.length ? supervisions.map((item) => <div key={item.id} className="flex flex-col gap-3 rounded border p-3 text-sm md:flex-row md:items-center"><div className="flex-1"><p className="font-medium">{item.clinic?.name ?? 'Clínica'} · {item.student?.full_name ?? 'Estudante'}</p><p className="text-xs text-muted-foreground">Supervisor: {item.supervisor?.full_name ?? '—'} · Início: {item.started_at ? new Date(item.started_at).toLocaleString('pt-BR') : '—'}</p>{supervisionEvaluations(item.id).map((evaluation) => <p key={evaluation.id} className="mt-1 text-xs text-muted-foreground">Avaliação: <span className="font-semibold">{evaluation.score ?? '—'}</span>/100{evaluation.feedback ? ` · ${evaluation.feedback}` : ''}</p>)}</div><Badge variant={item.status === 'cancelled' ? 'destructive' : 'outline'}>{STATUS_LABELS[item.status] ?? item.status}</Badge>{['planned', 'in_progress'].includes(item.status) && <div className="flex gap-1"><Button size="sm" variant="outline" disabled={!canManage} onClick={() => updateStatus.mutate({ id: item.id, status: 'completed' })}><CheckCircle2 className="mr-1 h-3 w-3" />Concluir</Button><Button size="sm" variant="ghost" disabled={!canManage} onClick={() => updateStatus.mutate({ id: item.id, status: 'cancelled' })}><XCircle className="mr-1 h-3 w-3" />Cancelar</Button></div>}</div>) : <p className="text-sm text-muted-foreground">Nenhuma supervisão registrada.</p>}</CardContent></Card>
  </div></MainLayout>;
}

function Picker({ label, value, setValue, options, text }: { label: string; value: string; setValue: (value: string) => void; options: any[]; text: (item: any) => string }) { return <div className="space-y-1"><Label>{label}</Label><Select value={value} onValueChange={setValue}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{options.map((item) => <SelectItem key={item.id ?? item.user_id} value={item.id ?? item.user_id}>{text(item)}</SelectItem>)}</SelectContent></Select></div>; }
