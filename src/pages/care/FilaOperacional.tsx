import { useEffect, useState } from "react";
import { CirclePlay, CirclePause, ClipboardList, Copy, QrCode, RefreshCw, Ticket, Trash2, UsersRound } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type QueueSession = {
  id: string; status: "open" | "paused" | "closing" | "closed"; service_date: string;
  entry_mode?: "manual" | "qr" | "both"; max_capacity?: number | null;
  concurrent_capacity?: number | null; starts_at?: string | null; ends_at?: string | null;
};
type ClinicMeta = { id: string; organization_id: string; name: string; queue_qr_token?: string | null };

const statusLabel = { open: "Fila aberta", paused: "Fila pausada", closing: "Em encerramento", closed: "Fila encerrada" };

export default function FilaOperacional() {
  const { activeClinicCode, setActiveClinicCode, unigRole } = useAuth();
  const [queue, setQueue] = useState<QueueSession | null>(null);
  const [clinicName, setClinicName] = useState<string | null>(null);
  const [clinicMeta, setClinicMeta] = useState<ClinicMeta | null>(null);
  const [waiting, setWaiting] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availableClinics, setAvailableClinics] = useState<Array<{ code: string; name: string }>>([]);
  const canManage = ["super_admin", "administrador", "gestor_unidade", "atendimento"].includes(unigRole);

  const load = async () => {
    setLoading(true);
    if (!activeClinicCode) {
      setQueue(null);
      setClinicName(null);
      setClinicMeta(null);
      setWaiting(0);
      setLoading(false);
      return;
    }
    const { data: scopes } = await supabase
      .from("user_clinic_scopes")
      .select("clinic_id,clinic:clinics(code,name),user_role:user_roles(organization_id)")
      .is("revoked_at", null);
    const scope = (scopes ?? []).find((item: any) => item.clinic?.code === activeClinicCode) as any;
    const directClinic = scope ? null : await (supabase.from("clinics") as any)
      .select("id,organization_id,name,queue_qr_token")
      .eq("code", activeClinicCode)
      .maybeSingle();
    const clinic = scope
      ? { id: scope.clinic_id, organization_id: scope.user_role?.organization_id, name: scope.clinic?.name ?? activeClinicCode, queue_qr_token: null }
      : directClinic?.data;
    if (!clinic?.id || !clinic.organization_id) {
      setLoading(false);
      return;
    }
    setClinicName(clinic.name);
    setClinicMeta(clinic);
    const { data: session, error: sessionError } = await (supabase.from("queue_sessions") as any)
      .select("id,status,service_date,entry_mode,max_capacity,concurrent_capacity,starts_at,ends_at")
      .eq("clinic_id", clinic.id)
      .in("status", ["open", "paused", "closing"])
      .order("opened_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (sessionError) {
      toast({ title: "Não foi possível carregar a fila", description: sessionError.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    setQueue(session as QueueSession | null);
    if (session) {
      const { count } = await supabase.from("queue_tickets").select("id", { count: "exact", head: true }).eq("queue_session_id", session.id).eq("status", "waiting");
      setWaiting(count ?? 0);
    } else setWaiting(0);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [activeClinicCode]);

  useEffect(() => {
    if (!clinicMeta?.id) return;
    const channel = supabase.channel(`queue-operation-${clinicMeta.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "queue_events",
        filter: `clinic_id=eq.${clinicMeta.id}`,
      }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [clinicMeta?.id]);

  useEffect(() => {
    if (activeClinicCode) return;
    void (async () => {
      const { data } = await supabase.from("clinics").select("code,name").eq("is_active", true).order("name");
      setAvailableClinics((data ?? []) as Array<{ code: string; name: string }>);
    })();
  }, [activeClinicCode]);

  const setStatus = async (targetStatus: "open" | "paused" | "closing" | "closed") => {
    if (!queue) return;
    setSaving(true);
    const { error } = await supabase.rpc("transition_queue_session", { target_session_id: queue.id, target_status: targetStatus });
    setSaving(false);
    if (error && targetStatus === "open" && error.message.includes("closed -> open")) {
      const { error: reopenError } = await supabase.functions.invoke("queue-transition", {
        body: { sessionId: queue.id, targetStatus },
      });
      if (!reopenError) {
        toast({ title: "Atendimento reaberto" });
        await load();
        return;
      }
      toast({ title: "Não foi possível reabrir a fila", description: reopenError.message, variant: "destructive" });
      return;
    }
    if (error) {
      toast({ title: "Não foi possível alterar a fila", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: targetStatus === "open" ? "Atendimento iniciado" : "Fila atualizada" });
    await load();
  };

  const startQueue = async () => {
    if (queue) return void setStatus("open");
    let targetClinic = clinicMeta;
    if (!targetClinic && activeClinicCode) {
      const { data: scopes, error: scopeError } = await supabase
        .from("user_clinic_scopes")
        .select("clinic_id,clinic:clinics(code,name),user_role:user_roles(organization_id)")
        .is("revoked_at", null);
      const scope = (scopes ?? []).find((item: any) => item.clinic?.code === activeClinicCode) as any;
      if (!scopeError && scope?.clinic_id && scope?.user_role?.organization_id) {
        targetClinic = {
          id: scope.clinic_id,
          organization_id: scope.user_role.organization_id,
          name: scope.clinic?.name ?? activeClinicCode,
        };
        setClinicMeta(targetClinic);
      }
    }
    if (!targetClinic) {
      toast({ title: "Não foi possível identificar a clínica", description: "Atualize a sessão e tente novamente.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.rpc("open_clinic_queue" as never, {
      target_clinic_id: targetClinic.id,
    } as never);
    setSaving(false);
    if (error) {
      toast({ title: "Não foi possível iniciar a fila", description: error.message, variant: "destructive" });
      await load();
      return;
    }
    toast({ title: "Fila iniciada", description: "O QR Code está pronto para os clientes entrarem." });
    await load();
  };

  const changeQr = async (revoke: boolean) => {
    if (!clinicMeta) return;
    setSaving(true);
    const { error } = await supabase.rpc("rotate_clinic_queue_qr_token" as never, { target_clinic_id: clinicMeta.id, revoke_token: revoke } as never);
    setSaving(false);
    if (error) {
      toast({ title: "Não foi possível atualizar o QR Code", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: revoke ? "QR Code excluído" : "Novo QR Code criado" });
    await load();
  };

  const qrLink = clinicMeta?.queue_qr_token ? `${window.location.origin}/fila/qr/${clinicMeta.queue_qr_token}` : null;
  const formatTime = (value?: string | null) => value ? new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "Sem limite";
  const entryLabel = queue?.entry_mode === "manual" ? "Somente manual" : queue?.entry_mode === "qr" ? "Somente QR" : "Manual + QR";

  return <MainLayout><div className="mx-auto max-w-5xl space-y-6">
    <div className="flex gap-3"><div className="rounded-lg bg-primary/10 p-2"><ClipboardList className="h-6 w-6 text-primary" /></div><div><h1 className="text-2xl font-bold">Fila de atendimento</h1><p className="text-sm text-muted-foreground">Controle a sessão operacional da sua clínica.</p></div></div>
    <Card className="border-primary/20"><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>{clinicName ?? "Fila da clínica"}</CardTitle><CardDescription>Uma fila compartilhada somente pelos profissionais e recepcionistas desta clínica.</CardDescription></div>{queue && <Badge variant={queue.status === "open" ? "default" : "secondary"}>{statusLabel[queue.status]}</Badge>}</div></CardHeader><CardContent className="space-y-5">
      {loading ? <p className="text-sm text-muted-foreground">Carregando operação…</p> : !activeClinicCode ? <div className="rounded-lg border border-dashed p-5"><p className="mb-3 text-sm text-muted-foreground">Selecione a clínica cuja fila você deseja administrar.</p><select aria-label="Selecionar clínica para fila" className="h-11 w-full max-w-md rounded-md border bg-background px-3 text-sm" defaultValue="" onChange={(event) => setActiveClinicCode(event.target.value || null)}><option value="" disabled>Selecione uma clínica</option>{availableClinics.map((clinic) => <option key={clinic.code} value={clinic.code}>{clinic.name}</option>)}</select></div> : !queue ? <><p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">Nenhuma fila de atendimento está aberta nesta clínica.</p>{canManage && <Button disabled={saving} onClick={() => void startQueue()}><CirclePlay className="mr-2 h-4 w-4" />Abrir fila</Button>}</> : <><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-muted/60 p-4"><UsersRound className="mb-2 h-5 w-5 text-primary" /><p className="text-2xl font-bold">{waiting}</p><p className="text-sm text-muted-foreground">senhas aguardando</p></div><div className="rounded-xl bg-muted/60 p-4"><Ticket className="mb-2 h-5 w-5 text-primary" /><p className="text-sm font-semibold">Sessão operacional</p><p className="text-sm text-muted-foreground">A abertura será refletida apenas para os acessos desta clínica.</p></div></div>
      {!canManage ? <p className="text-sm text-muted-foreground">Seu acesso permite acompanhar a situação da fila.</p> : <div className="flex flex-wrap gap-2">{queue.status === "paused" && <Button disabled={saving} onClick={() => void startQueue()}><CirclePlay className="mr-2 h-4 w-4" />Retomar fila</Button>}{queue.status === "closed" && <Button disabled={saving} onClick={() => void startQueue()}><CirclePlay className="mr-2 h-4 w-4" />Reabrir atendimento</Button>}{queue.status === "open" && <Button variant="outline" disabled={saving} onClick={() => void setStatus("paused")}><CirclePause className="mr-2 h-4 w-4" />Pausar fila</Button>}{queue.status === "open" && <Button variant="outline" disabled={saving} onClick={() => void setStatus("closing")}>Encerrar novas entradas</Button>}{queue.status === "closing" && <Button variant="outline" disabled={saving} onClick={() => void setStatus("closed")}>Fechar definitivamente</Button>}{queue.status === "paused" && <Button variant="outline" disabled={saving} onClick={() => void setStatus("closed")}>Encerrar fila</Button>}</div>}
      <section className="rounded-xl border bg-muted/30 p-4"><div className="mb-3 flex items-center gap-2"><Ticket className="h-4 w-4 text-primary" /><div><p className="font-semibold">Configuração da operação</p><p className="text-xs text-muted-foreground">Informações que ficavam na antiga aba Fila da Agenda.</p></div></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Info label="Entrada" value={entryLabel} /><Info label="Capacidade máxima" value={queue.max_capacity ? `${queue.max_capacity} pessoas` : "Não definida"} /><Info label="Atendimentos simultâneos" value={queue.concurrent_capacity ? String(queue.concurrent_capacity) : "1"} /><Info label="Horário" value={`${formatTime(queue.starts_at)} — ${formatTime(queue.ends_at)}`} /></div></section>
      <div className="rounded-xl border bg-muted/30 p-4 text-center"><div className="mb-2 flex items-center justify-center gap-2 font-semibold"><QrCode className="h-4 w-4 text-primary" />QR Code fixo da clínica</div>{qrLink ? <><QRCodeSVG className="mx-auto rounded bg-white p-2" size={156} value={qrLink} includeMargin /><p className="mt-3 text-sm text-muted-foreground">Este é o mesmo QR em todos os dias. Ele só permite entrada quando a fila estiver aberta.</p><div className="mt-3 flex flex-wrap justify-center gap-2"><Button size="sm" variant="outline" onClick={() => { void navigator.clipboard.writeText(qrLink); toast({ title: "Link da fila copiado" }); }}><Copy className="mr-2 h-3.5 w-3.5" />Copiar link</Button>{canManage && <Button size="sm" variant="outline" disabled={saving} onClick={() => void changeQr(false)}><RefreshCw className="mr-2 h-3.5 w-3.5" />Gerar novo</Button>}{canManage && <Button size="sm" variant="outline" disabled={saving} onClick={() => void changeQr(true)}><Trash2 className="mr-2 h-3.5 w-3.5" />Excluir QR</Button>}</div></> : <div><p className="py-3 text-sm text-muted-foreground">Nenhum QR Code ativo para esta clínica.</p>{canManage && <Button size="sm" disabled={saving} onClick={() => void changeQr(false)}><RefreshCw className="mr-2 h-3.5 w-3.5" />Criar QR Code</Button>}</div>}</div></>}
    </CardContent></Card>
  </div></MainLayout>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border bg-background p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>;
}
