import { useEffect, useState } from "react";
import { CirclePlay, CirclePause, ClipboardList, Copy, QrCode, Ticket, UsersRound } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type QueueSession = { id: string; status: "open" | "paused" | "closed"; service_date: string; public_token?: string | null };
type ClinicMeta = { id: string; organization_id: string; name: string };

const statusLabel = { open: "Fila aberta", paused: "Fila pausada", closed: "Fila encerrada" };

export default function FilaOperacional() {
  const { activeClinicCode, unigRole } = useAuth();
  const [queue, setQueue] = useState<QueueSession | null>(null);
  const [clinicName, setClinicName] = useState<string | null>(null);
  const [clinicMeta, setClinicMeta] = useState<ClinicMeta | null>(null);
  const [waiting, setWaiting] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const canManage = ["super_admin", "administrador", "gestor_unidade", "atendimento"].includes(unigRole);
  const today = new Date().toISOString().slice(0, 10);

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
    const { data: clinic, error: clinicError } = await supabase.from("clinics").select("id,organization_id,name").eq("code", activeClinicCode).maybeSingle();
    if (clinicError || !clinic) {
      setLoading(false);
      return;
    }
    setClinicName(clinic.name);
    setClinicMeta(clinic);
    const { data: session, error: sessionError } = await (supabase.from("queue_sessions") as any).select("id,status,service_date,public_token").eq("clinic_id", clinic.id).eq("service_date", today).maybeSingle();
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

  useEffect(() => {
    void load();
    const channel = supabase.channel(`queue-operation-${activeClinicCode ?? "odonto"}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "queue_events" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [activeClinicCode]);

  const setStatus = async (targetStatus: "open" | "paused" | "closed") => {
    if (!queue) return;
    setSaving(true);
    const { error } = await supabase.rpc("transition_queue_session", { target_session_id: queue.id, target_status: targetStatus });
    setSaving(false);
    if (error) {
      toast({ title: "Não foi possível alterar a fila", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: targetStatus === "open" ? "Atendimento iniciado" : "Fila atualizada" });
    await load();
  };

  const startQueue = async () => {
    if (queue) return void setStatus("open");
    if (!clinicMeta) return;
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("queue_sessions").insert({
      organization_id: clinicMeta.organization_id,
      clinic_id: clinicMeta.id,
      service_date: today,
      status: "open",
      created_by: auth.user?.id ?? null,
      updated_by: auth.user?.id ?? null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Não foi possível iniciar a fila", description: error.message, variant: "destructive" });
      await load();
      return;
    }
    toast({ title: "Fila iniciada", description: "O QR Code está pronto para os clientes entrarem." });
    await load();
  };

  return <MainLayout><div className="mx-auto max-w-5xl space-y-6">
    <div className="flex gap-3"><div className="rounded-lg bg-primary/10 p-2"><ClipboardList className="h-6 w-6 text-primary" /></div><div><h1 className="text-2xl font-bold">Fila de atendimento</h1><p className="text-sm text-muted-foreground">Controle a única fila diária da sua clínica.</p></div></div>
    <Card className="border-primary/20"><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>{clinicName ? `${clinicName} · hoje` : "Fila da clínica"}</CardTitle><CardDescription>Uma fila compartilhada somente pelos profissionais e recepcionistas desta clínica.</CardDescription></div>{queue && <Badge variant={queue.status === "open" ? "default" : "secondary"}>{statusLabel[queue.status]}</Badge>}</div></CardHeader><CardContent className="space-y-5">
      {loading ? <p className="text-sm text-muted-foreground">Carregando operação…</p> : !activeClinicCode ? <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">Seu acesso não possui uma clínica ativa.</p> : !queue ? <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">Não há uma sessão de fila criada para hoje nesta clínica.</p> : <><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-muted/60 p-4"><UsersRound className="mb-2 h-5 w-5 text-primary" /><p className="text-2xl font-bold">{waiting}</p><p className="text-sm text-muted-foreground">senhas aguardando</p></div><div className="rounded-xl bg-muted/60 p-4"><Ticket className="mb-2 h-5 w-5 text-primary" /><p className="text-sm font-semibold">Sessão do dia</p><p className="text-sm text-muted-foreground">A abertura será refletida apenas para os acessos desta clínica.</p></div></div>
      {!canManage ? <p className="text-sm text-muted-foreground">Seu acesso permite acompanhar a situação da fila.</p> : <div className="flex flex-wrap gap-2">{queue.status !== "open" && <Button disabled={saving} onClick={() => void startQueue()}><CirclePlay className="mr-2 h-4 w-4" />{queue.status === "closed" ? "Reabrir atendimento" : "Iniciar atendimento"}</Button>}{queue.status === "open" && <Button variant="outline" disabled={saving} onClick={() => void setStatus("paused")}><CirclePause className="mr-2 h-4 w-4" />Pausar fila</Button>}{queue.status !== "closed" && <Button variant="outline" disabled={saving} onClick={() => void setStatus("closed")}>Encerrar fila</Button>}</div>}
      {queue.status === "open" && queue.public_token && <div className="rounded-xl border bg-muted/30 p-4 text-center"><div className="mb-3 flex items-center justify-center gap-2 font-semibold"><QrCode className="h-4 w-4 text-primary" />Entrada do cliente</div><QRCodeSVG className="mx-auto rounded bg-white p-2" size={156} value={`${window.location.origin}/fila/qr/${queue.public_token}`} includeMargin /><p className="mt-3 text-sm text-muted-foreground">O cliente acessa este QR Code já logado para entrar na fila.</p><Button className="mt-3" size="sm" variant="outline" onClick={() => { void navigator.clipboard.writeText(`${window.location.origin}/fila/qr/${queue.public_token}`); toast({ title: "Link da fila copiado" }); }}><Copy className="mr-2 h-3.5 w-3.5" />Copiar link do cliente</Button></div>}</>}
    </CardContent></Card>
  </div></MainLayout>;
}
