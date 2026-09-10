import { useQuery } from '@tanstack/react-query';
import { Activity, CalendarDays, Clock3, FlaskConical, GraduationCap, Users } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

const metrics = [
  { key: 'patients', label: 'Pacientes ativos', icon: Users, description: 'Cadastros disponíveis para atendimento' },
  { key: 'appointments', label: 'Agendamentos', icon: CalendarDays, description: 'Agendamentos em aberto' },
  { key: 'waiting', label: 'Aguardando na fila', icon: Clock3, description: 'Senhas ainda não concluídas' },
  { key: 'encounters', label: 'Atendimentos concluídos', icon: Activity, description: 'Encontros clínicos finalizados' },
  { key: 'procedures', label: 'Procedimentos planejados', icon: Activity, description: 'Condutas clínicas em acompanhamento' },
  { key: 'exams', label: 'Exames solicitados', icon: FlaskConical, description: 'Solicitações aguardando resultado' },
  { key: 'supervisions', label: 'Supervisões ativas', icon: GraduationCap, description: 'Acompanhamentos acadêmico-clínicos' },
] as const;

export default function Indicadores(){
 const report=useQuery({queryKey:['clinical-indicators'],queryFn:async()=>{
  const [patients,appointments,waiting,encounters,procedures,exams,supervisions]=await Promise.all([
   supabase.from('patients').select('id',{count:'exact',head:true}).eq('status','active'),
   supabase.from('appointments').select('id',{count:'exact',head:true}).in('status',['scheduled','confirmed','checked_in']),
   supabase.from('queue_tickets').select('id',{count:'exact',head:true}).in('status',['waiting','called','in_service']),
   supabase.from('encounters').select('id',{count:'exact',head:true}).eq('status','completed'),
   (supabase as any).from('clinical_procedures').select('id',{count:'exact',head:true}).eq('status','planned'),
   (supabase as any).from('exam_orders').select('id',{count:'exact',head:true}).in('status',['requested','collected']),
   (supabase as any).from('student_supervisions').select('id',{count:'exact',head:true}).in('status',['planned','in_progress'])
  ]);for(const r of [patients,appointments,waiting,encounters,procedures,exams,supervisions])if(r.error)throw r.error;return{patients:patients.count??0,appointments:appointments.count??0,waiting:waiting.count??0,encounters:encounters.count??0,procedures:procedures.count??0,exams:exams.count??0,supervisions:supervisions.count??0};
 }});
 return <MainLayout><div className="space-y-6"><div><h1 className="text-2xl font-bold">Indicadores clínicos</h1><p className="text-sm text-muted-foreground">Visão operacional agregada. Esta página não exibe conteúdo de prontuário.</p></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(m=>{const Icon=m.icon;return <Card key={m.key}><CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-sm font-medium">{m.label}</CardTitle><Icon className="h-4 w-4 text-primary"/></div></CardHeader><CardContent><div className="text-3xl font-bold">{report.isLoading?'—':report.data?.[m.key]}</div><CardDescription className="mt-1 text-xs">{m.description}</CardDescription></CardContent></Card>})}</div><Card><CardHeader><CardTitle className="text-base">Leitura operacional</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Os indicadores são filtrados pelas permissões RLS da conta autenticada. Para exportações formais e indicadores institucionais, a próxima evolução deve definir período, escopo de clínica e regras de anonimização.</CardContent></Card></div></MainLayout>;
}
