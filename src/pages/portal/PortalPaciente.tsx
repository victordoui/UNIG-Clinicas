import { useQuery } from '@tanstack/react-query';
import { CalendarDays, FileHeart, History, QrCode } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

type PortalData = { patient_id: string; full_name: string; preferred_name: string | null; record_number: string; next_appointment_at: string | null; next_clinic_name: string | null; next_service_name: string | null };

export default function PortalPaciente() {
  const portal = useQuery({ queryKey: ['patient-portal'], queryFn: async () => {
    const { data, error } = await supabase.rpc('get_my_patient_portal' as never);
    if (error) throw error;
    return (Array.isArray(data) ? data[0] : data) as PortalData | null;
  }});
  const data = portal.data;
  return <MainLayout><div className="space-y-6"><div><p className="text-sm font-medium text-primary">Portal do paciente</p><h1 className="text-2xl font-bold">Olá{data?.full_name ? `, ${data.full_name.split(' ')[0]}` : ''} 👋</h1><p className="text-sm text-muted-foreground">Acompanhe seus atendimentos sem acessar dados de outras pessoas.</p></div>{portal.isError ? <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">Sua conta ainda não está vinculada a um cadastro de paciente.</p> : <><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><ActionCard icon={QrCode} title="Entrar na fila" description="Use o QR da clínica" disabled /><ActionCard icon={CalendarDays} title="Agenda" description={data?.next_appointment_at ? new Date(data.next_appointment_at).toLocaleString('pt-BR') : 'Nenhum próximo atendimento'} /><ActionCard icon={History} title="Histórico" description="Atendimentos realizados" /><ActionCard icon={FileHeart} title="Documentos" description="Termos e documentos" /></div><Card><CardHeader><CardTitle className="text-base">Meu cadastro</CardTitle><CardDescription>Dados básicos usados para localizar seu atendimento.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-3"><div><p className="text-xs text-muted-foreground">Nome</p><p className="font-medium">{data?.full_name ?? '—'}</p></div><div><p className="text-xs text-muted-foreground">Prontuário</p><p className="font-mono text-sm">{data?.record_number ?? '—'}</p></div><div><p className="text-xs text-muted-foreground">Próximo atendimento</p><p className="font-medium">{data?.next_clinic_name ? `${data.next_clinic_name}${data.next_service_name ? ` · ${data.next_service_name}` : ''}` : 'Nenhum agendamento próximo'}</p></div></CardContent></Card></>}</div></MainLayout>;
}

function ActionCard({ icon: Icon, title, description, disabled = false }: { icon: typeof QrCode; title: string; description: string; disabled?: boolean }) {
  return <Card><CardContent className="flex items-start gap-3 p-4"><div className="rounded-lg bg-primary/10 p-2"><Icon className="h-5 w-5 text-primary" /></div><div className="min-w-0"><p className="font-semibold">{title}</p><p className="text-xs text-muted-foreground">{description}</p>{disabled && <Button variant="link" className="h-auto px-0 text-xs" disabled>Disponível pelo QR</Button>}</div></CardContent></Card>;
}
