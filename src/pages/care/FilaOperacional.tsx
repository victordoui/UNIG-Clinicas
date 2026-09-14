import { useEffect, useState } from "react";
import { CirclePlay, CirclePause, ClipboardList, Ticket, UsersRound } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type QueueSession = { id: string; status: "open" | "paused" | "closed"; service_date: string };

const statusLabel = { open: "Fila aberta", paused: "Fila pausada", closed: "Fila encerrada" };

export default function FilaOperacional() {
  const { activeClinicCode, unigRole } = useAuth();
  const [queue, setQueue] = useState<QueueSession | null>(null);
  const [clinicName, setClinicName] = useState<string | null>(null);
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
      setWaiting(0);
      setLoading(false);
      return;
    }
    const { data: clinic, error: clinicError } = await supabase.from("clinics").select("id,name").eq("code", activeClinicCode).maybeSingle();
    if (clinicError || !clinic) {
      setLoading(false);
      return;
    }
    setClinicName(clinic.name);
    const { data: session, error: sessionError } = await supabase.from("queue_sessions").select("id,status,service_date").eq("clinic_id", clinic.id).eq("service_date", today).maybeSingle();
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

  return <MainLayout><div className="mx-auto max-w-5xl space-y-6">
    <div className="flex gap-3"><div className="rounded-lg bg-primary/10 p-2"><ClipboardList className="h-6 w-6 text-primary" /></div><div><h1 className="text-2xl font-bold">Fila de atendimento</h1><p className="text-sm text-muted-foreground">Controle a única fila diária da sua clínica.</p></div></div>
    <Card className="border-primary/20"><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>{clinicName ? `${clinicName} · hoje` : "Fila da clínica"}</CardTitle><CardDescription>Uma fila compartilhada somente pelos profissionais e recepcionistas desta clínica.</CardDescription></div>{queue && <Badge variant={queue.status === "open" ? "default" : "secondary"}>{statusLabel[queue.status]}</Badge>}</div></CardHeader><CardContent className="space-y-5">
      {loading ? <p className="text-sm text-muted-foreground">Carregando operação…</p> : !activeClinicCode ? <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">Seu acesso não possui uma clínica ativa.</p> : !queue ? <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">Não há uma sessão de fila criada para hoje nesta clínica.</p> : <><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-muted/60 p-4"><UsersRound className="mb-2 h-5 w-5 text-primary" /><p className="text-2xl font-bold">{waiting}</p><p className="text-sm text-muted-foreground">senhas aguardando</p></div><div className="rounded-xl bg-muted/60 p-4"><Ticket className="mb-2 h-5 w-5 text-primary" /><p className="text-sm font-semibold">Sessão do dia</p><p className="text-sm text-muted-foreground">A abertura será refletida apenas para os acessos desta clínica.</p></div></div>
      {!canManage ? <p className="text-sm text-muted-foreground">Seu acesso permite acompanhar a situação da fila.</p> : <div className="flex flex-wrap gap-2">{queue.status !== "open" && <Button disabled={saving} onClick={() => void setStatus("open")}><CirclePlay className="mr-2 h-4 w-4" />{queue.status === "closed" ? "Reabrir atendimento" : "Iniciar atendimento"}</Button>}{queue.status === "open" && <Button variant="outline" disabled={saving} onClick={() => void setStatus("paused")}><CirclePause className="mr-2 h-4 w-4" />Pausar fila</Button>}{queue.status !== "closed" && <Button variant="outline" disabled={saving} onClick={() => void setStatus("closed")}>Encerrar fila</Button>}</div>}</>}
    </CardContent></Card>
  </div></MainLayout>;
}
