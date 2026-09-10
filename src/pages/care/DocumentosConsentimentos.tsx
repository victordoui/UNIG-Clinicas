import { ChangeEvent, FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, Download, FileCheck2, FileUp, ShieldCheck, Undo2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const CONSENT_LABELS: Record<string, string> = { pending: 'Pendente', granted: 'Concedido', revoked: 'Revogado', expired: 'Expirado' };

export default function DocumentosConsentimentos() {
  const qc = useQueryClient();
  const [patientId, setPatientId] = useState('');
  const [consentType, setConsentType] = useState('atendimento_clinico');
  const [file, setFile] = useState<File | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const data = useQuery({ queryKey: ['clinical-documents'], queryFn: async () => {
    const [patients, consents, documents] = await Promise.all([
      supabase.from('patients').select('id,organization_id,record_number,person:persons(full_name)').eq('status', 'active'),
      supabase.from('consents').select('id,patient_id,consent_type,status,granted_at,revoked_at,expires_at,version,created_at,patient:patients(record_number,person:persons(full_name))').order('created_at', { ascending: false }).limit(40),
      (supabase.from('documents') as any).select('id,patient_id,document_type,file_name,mime_type,file_size,storage_path,created_at,archived_at,patient:patients(record_number,person:persons(full_name))').is('archived_at', null).order('created_at', { ascending: false }).limit(40),
    ]);
    for (const result of [patients, consents, documents]) if (result.error) throw result.error;
    return { patients: patients.data ?? [], consents: consents.data ?? [], documents: documents.data ?? [] };
  }});
  const refresh = () => qc.invalidateQueries({ queryKey: ['clinical-documents'] });
  const grantConsent = useMutation({ mutationFn: async () => {
    const patient = (data.data?.patients as any[]).find((item) => item.id === patientId);
    if (!patient) throw new Error('Selecione um paciente.');
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await (supabase.from('consents') as any).insert({ organization_id: patient.organization_id, patient_id: patientId, consent_type: consentType.trim(), status: 'granted', granted_at: new Date().toISOString(), created_by: auth.user?.id, updated_by: auth.user?.id });
    if (error) throw error;
  }, onSuccess: () => { refresh(); toast({ title: 'Consentimento registrado' }); }, onError: (error: Error) => toast({ title: 'Não foi possível registrar', description: error.message, variant: 'destructive' }) });
  const updateConsent = useMutation({ mutationFn: async ({ id, status }: { id: string; status: 'revoked' | 'expired' }) => {
    const { data: auth } = await supabase.auth.getUser();
    const payload: Record<string, unknown> = { status, updated_by: auth.user?.id };
    if (status === 'revoked') payload.revoked_at = new Date().toISOString();
    if (status === 'expired') payload.expires_at = new Date().toISOString();
    const { error } = await (supabase.from('consents') as any).update(payload).eq('id', id);
    if (error) throw error;
  }, onSuccess: () => { refresh(); toast({ title: 'Status do consentimento atualizado' }); }, onError: (error: Error) => toast({ title: 'Não foi possível atualizar', description: error.message, variant: 'destructive' }) });
  const upload = useMutation({ mutationFn: async () => {
    const patient = (data.data?.patients as any[]).find((item) => item.id === patientId);
    if (!patient || !file) throw new Error('Selecione paciente e arquivo.');
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${patient.organization_id}/${patientId}/${crypto.randomUUID()}-${safeName}`;
    const { error: storageError } = await supabase.storage.from('clinical-documents').upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false });
    if (storageError) throw storageError;
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await (supabase.from('documents') as any).insert({ organization_id: patient.organization_id, patient_id: patientId, document_type: 'attachment', file_name: file.name, mime_type: file.type || 'application/octet-stream', storage_path: path, file_size: file.size, created_by: auth.user?.id });
    if (error) throw error;
  }, onSuccess: () => { refresh(); setFile(null); toast({ title: 'Documento privado anexado' }); }, onError: (error: Error) => toast({ title: 'Não foi possível anexar', description: error.message, variant: 'destructive' }) });
  const archive = useMutation({ mutationFn: async (id: string) => {
    const { error } = await (supabase.from('documents') as any).update({ archived_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  }, onSuccess: () => { refresh(); toast({ title: 'Documento arquivado' }); }, onError: (error: Error) => toast({ title: 'Não foi possível arquivar', description: error.message, variant: 'destructive' }) });
  const openDocument = async (item: any) => {
    setOpeningId(item.id);
    const opened = window.open('', '_blank', 'noopener,noreferrer');
    const { data: signed, error } = await supabase.storage.from('clinical-documents').createSignedUrl(item.storage_path, 60);
    setOpeningId(null);
    if (error || !signed?.signedUrl) { opened?.close(); toast({ title: 'Não foi possível abrir o documento', description: error?.message, variant: 'destructive' }); return; }
    if (opened) opened.location.href = signed.signedUrl;
  };
  const submit = (action: () => void) => (event: FormEvent) => { event.preventDefault(); action(); };
  const patients = (data.data?.patients as any[]) ?? [];
  const consents = (data.data?.consents as any[]) ?? [];
  const documents = (data.data?.documents as any[]) ?? [];
  return <MainLayout><div className="space-y-6"><div className="flex gap-3"><div className="rounded-lg bg-primary/10 p-2"><FileCheck2 className="h-6 w-6 text-primary" /></div><div><h1 className="text-2xl font-bold">Documentos e consentimentos</h1><p className="text-sm text-muted-foreground">Arquivos ficam em armazenamento privado; arquivar remove da operação sem apagar a evidência.</p></div></div><div className="grid gap-5 lg:grid-cols-2"><Card><CardHeader><CardTitle className="text-base">Novo consentimento</CardTitle><CardDescription>Registre a versão e a concessão do paciente.</CardDescription></CardHeader><CardContent><form onSubmit={submit(() => grantConsent.mutate())} className="space-y-3"><PatientPicker patients={patients} value={patientId} onChange={setPatientId} /><div className="space-y-1"><Label>Tipo</Label><Input value={consentType} onChange={(event) => setConsentType(event.target.value)} required /></div><Button disabled={!patientId || grantConsent.isPending}><ShieldCheck className="mr-1 h-4 w-4" />Conceder consentimento</Button></form></CardContent></Card><Card><CardHeader><CardTitle className="text-base">Anexo clínico</CardTitle><CardDescription>O arquivo é enviado para o bucket privado da organização.</CardDescription></CardHeader><CardContent><form onSubmit={submit(() => upload.mutate())} className="space-y-3"><PatientPicker patients={patients} value={patientId} onChange={setPatientId} /><div className="space-y-1"><Label>Arquivo</Label><Input type="file" onChange={(event: ChangeEvent<HTMLInputElement>) => setFile(event.target.files?.[0] ?? null)} required /></div><Button disabled={!patientId || !file || upload.isPending}><FileUp className="mr-1 h-4 w-4" />Anexar documento</Button></form></CardContent></Card></div><Card><CardHeader><CardTitle className="text-base">Consentimentos recentes</CardTitle></CardHeader><CardContent className="space-y-2">{consents.length ? consents.map((item) => <div key={item.id} className="flex flex-col gap-2 rounded border p-3 text-sm md:flex-row md:items-center"><span className="flex-1">{item.patient?.person?.full_name ?? item.patient?.record_number} · {item.consent_type} · v{item.version}</span><Badge variant={item.status === 'revoked' || item.status === 'expired' ? 'destructive' : 'outline'}>{CONSENT_LABELS[item.status] ?? item.status}</Badge>{['granted', 'pending'].includes(item.status) && <div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => updateConsent.mutate({ id: item.id, status: 'revoked' })}><Undo2 className="mr-1 h-3 w-3" />Revogar</Button><Button size="sm" variant="ghost" onClick={() => updateConsent.mutate({ id: item.id, status: 'expired' })}>Expirar</Button></div>}</div>) : <p className="text-sm text-muted-foreground">Nenhum consentimento registrado.</p>}</CardContent></Card><Card><CardHeader><CardTitle className="text-base">Documentos recentes</CardTitle></CardHeader><CardContent className="space-y-2">{documents.length ? documents.map((item) => <div key={item.id} className="flex flex-col gap-2 rounded border p-3 text-sm md:flex-row md:items-center"><span className="flex-1">{item.file_name} · {item.patient?.person?.full_name ?? item.patient?.record_number}<span className="ml-2 text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString('pt-BR')}</span></span><div className="flex gap-1"><Button size="sm" variant="outline" disabled={openingId === item.id} onClick={() => openDocument(item)}><Download className="mr-1 h-3 w-3" />{openingId === item.id ? 'Abrindo…' : 'Abrir'}</Button><Button size="sm" variant="ghost" onClick={() => archive.mutate(item.id)}><Archive className="mr-1 h-3 w-3" />Arquivar</Button></div></div>) : <p className="text-sm text-muted-foreground">Nenhum documento anexado.</p>}</CardContent></Card></div></MainLayout>;
}

function PatientPicker({ patients, value, onChange }: { patients: any[]; value: string; onChange: (value: string) => void }) {
  return <div className="space-y-1"><Label>Paciente</Label><Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{patients.map((item) => <SelectItem key={item.id} value={item.id}>{item.record_number} — {item.person?.full_name ?? ''}</SelectItem>)}</SelectContent></Select></div>;
}
