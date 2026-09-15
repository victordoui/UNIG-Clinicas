import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, Loader2, LogIn, MapPin, QrCode, ShieldCheck, UserPlus, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { validateGuestQueueEntry } from "@/lib/queueGuestValidation";

type PublicQueue = {
  session_id: string;
  clinic_name: string;
  service_name: string | null;
  service_date: string;
  status: "open" | "paused";
  entry_mode: string;
  starts_at: string | null;
  ends_at: string | null;
  max_capacity: number;
};

type PublicTicketStatus = {
  ticket_id: string;
  ticket_number: number;
  ticket_code: string;
  status: string;
  service_box: string | null;
  called_at: string | null;
  people_ahead: number;
};

const ticketStatusLabel: Record<string, string> = {
  waiting: "Aguardando chamada",
  called: "Você foi chamado",
  checked_in: "Chegada confirmada",
  in_service: "Em atendimento",
  waiting_supervision: "Aguardando supervisão",
  completed: "Atendimento concluído",
  cancelled: "Senha cancelada",
  no_show: "Chamada encerrada",
  transferred: "Encaminhado",
  paused: "Atendimento pausado",
};

export default function FilaQR() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [queue, setQueue] = useState<PublicQueue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [joining, setJoining] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [ticketNumber, setTicketNumber] = useState<number | null>(null);
  const [ticketStatus, setTicketStatus] = useState<PublicTicketStatus | null>(null);
  const [joiningAsGuest, setJoiningAsGuest] = useState(false);
  const [guest, setGuest] = useState({ fullName: "", phone: "", birthDate: "" });
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!token) {
        setError("QR Code inválido.");
        setLoading(false);
        return;
      }
      const { data, error: queryError } = await supabase.rpc(
        "get_public_queue_session" as never,
        { target_token: token } as never,
      );
      if (!active) return;
      if (queryError) setError("Não foi possível consultar esta fila.");
      else if (!data || (Array.isArray(data) && data.length === 0))
        setError("Este QR Code não é mais válido ou a fila está fechada. Leia o QR atual exibido na página Fila.");
      else setQueue((Array.isArray(data) ? data[0] : data) as PublicQueue);
      setLoading(false);
    };
    void load();
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (!token) return;
    try {
      const saved = window.sessionStorage.getItem(`unig-queue-ticket-${token}`);
      if (!saved) return;
      const parsed = JSON.parse(saved) as { ticketId?: string; ticketNumber?: number };
      if (parsed.ticketId && parsed.ticketNumber) {
        setTicketId(parsed.ticketId);
        setTicketNumber(parsed.ticketNumber);
      }
    } catch {
      // Uma sessão antiga ou inválida não impede uma nova entrada na fila.
    }
  }, [token]);

  useEffect(() => {
    if (!token || !ticketId) return;
    let active = true;
    const loadTicketStatus = async () => {
      const { data, error: statusError } = await supabase.rpc(
        "get_public_queue_ticket_status" as never,
        { target_token: token, target_ticket_id: ticketId } as never,
      );
      if (!active || statusError) return;
      const status = (Array.isArray(data) ? data[0] : data) as PublicTicketStatus | undefined;
      if (status) setTicketStatus({ ...status, people_ahead: Number(status.people_ahead ?? 0) });
    };
    void loadTicketStatus();
    const interval = window.setInterval(loadTicketStatus, 3000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [ticketId, token]);

  const rememberTicket = (issuedTicket: { ticket_number?: number; ticket_id?: string }) => {
    const issuedNumber = issuedTicket.ticket_number ?? null;
    const issuedId = issuedTicket.ticket_id ?? null;
    setTicketNumber(issuedNumber);
    setTicketId(issuedId);
    if (token && issuedId && issuedNumber) {
      window.sessionStorage.setItem(
        `unig-queue-ticket-${token}`,
        JSON.stringify({ ticketId: issuedId, ticketNumber: issuedNumber }),
      );
    }
  };

  const continueToLogin = () => {
    if (token) window.sessionStorage.setItem("unig-pending-queue-token", token);
    navigate("/auth");
  };
  const joinQueue = async () => {
    if (!token) return;
    setJoining(true);
    setActionError("");
    const { data, error: joinError } = await supabase.rpc(
      "join_queue_as_patient" as never,
      { target_token: token } as never,
    );
    if (joinError) setError(joinError.message);
    else rememberTicket(Array.isArray(data) ? data[0] : (data as { ticket_number?: number; ticket_id?: string }));
    setJoining(false);
  };
  const joinAsGuest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    const validationError = validateGuestQueueEntry({ fullName: guest.fullName, phone: guest.phone, email: "", consent: acceptedTerms });
    if (validationError) {
      setActionError(validationError);
      return;
    }
    setJoining(true);
    setActionError("");
    const { data, error: joinError } = await supabase.rpc(
      "join_queue_as_guest" as never,
      {
        target_token: token,
        guest_full_name: guest.fullName,
        guest_phone: guest.phone,
        guest_birth_date: guest.birthDate || null,
        accepted_data_terms: acceptedTerms,
        accepted_policy_version: "2026-09",
      } as never,
    );
    if (joinError) setActionError(joinError.message);
    else {
      const issuedTicket = Array.isArray(data) ? data[0] : (data as { ticket_number?: number; ticket_id?: string });
      rememberTicket(issuedTicket ?? {});
    }
    setJoining(false);
  };

  return (
    <main className="min-h-screen bg-[#01312E] px-4 py-10 text-white">
      <div className="mx-auto flex max-w-lg flex-col items-center gap-5">
        <div className="flex items-center gap-2 text-white/80">
          <QrCode className="h-6 w-6" />
          <span className="font-semibold tracking-wide">UNIG Clínicas</span>
        </div>
        <Card className="w-full text-foreground">
          <CardHeader className="text-center">
            <CardTitle>Entrar na fila</CardTitle>
            <CardDescription>
              O QR identifica esta clínica. Ele permite entrar somente quando a
              fila do dia estiver aberta. Nenhuma informação clínica é exibida nesta tela.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading || authLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="rounded-lg bg-destructive/10 p-4 text-center text-sm text-destructive">
                {error}
              </div>
            ) : queue ? (
              <>
                {actionError && (
                  <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                    {actionError}
                  </div>
                )}
                {ticketNumber ? (
                  <div className="space-y-4">
                    <div className={`rounded-xl border p-6 text-center ${ticketStatus?.status === "called" ? "border-amber-400 bg-amber-50" : "bg-primary/5"}`}>
                      <p className="text-sm text-muted-foreground">Sua senha</p>
                      <p className="mt-2 text-6xl font-black tracking-tight text-primary">
                        {ticketStatus?.ticket_code || String(ticketNumber).padStart(3, "0")}
                      </p>
                      <p className={`mt-3 text-lg font-bold ${ticketStatus?.status === "called" ? "text-amber-800" : "text-foreground"}`}>
                        {ticketStatusLabel[ticketStatus?.status ?? "waiting"] ?? "Acompanhando sua senha"}
                      </p>
                      {ticketStatus?.status === "waiting" && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {ticketStatus.people_ahead > 0
                            ? `${ticketStatus.people_ahead} ${ticketStatus.people_ahead === 1 ? "pessoa está" : "pessoas estão"} à sua frente.`
                            : "Você é o próximo da fila. Aguarde a chamada."}
                        </p>
                      )}
                      {ticketStatus?.status === "called" && (
                        <div className="mt-4 space-y-2 rounded-lg bg-white p-4 text-left shadow-sm">
                          <p className="flex items-center gap-2 font-semibold text-amber-900"><Volume2 className="h-5 w-5" />Sua senha está sendo chamada agora</p>
                          <p className="flex items-center gap-2 text-base"><MapPin className="h-5 w-5 text-primary" />Dirija-se a <strong>{ticketStatus.service_box || "Recepção"}</strong></p>
                        </div>
                      )}
                      {ticketStatus?.status === "completed" && (
                        <p className="mt-3 flex items-center justify-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="h-5 w-5" />Atendimento finalizado.</p>
                      )}
                      {!ticketStatus && <p className="mt-2 text-sm text-muted-foreground">Acompanhando a chamada automaticamente…</p>}
                    </div>
                    {!user && (
                      <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4 text-left">
                        <p className="font-semibold">Quer facilitar os próximos atendimentos?</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Crie sua conta para acompanhar agenda, documentos e avisos. A recepção poderá vincular este atendimento ao seu cadastro.
                        </p>
                        <Button className="mt-3 w-full" variant="outline" onClick={continueToLogin}>
                          <UserPlus className="mr-2 h-4 w-4" />Criar minha conta
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="rounded-xl border bg-primary/5 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">{queue.clinic_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {queue.service_name || "Atendimento clínico"} ·{" "}
                            {new Date(
                              `${queue.service_date}T12:00:00`,
                            ).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <Badge
                          variant={
                            queue.status === "open" ? "default" : "secondary"
                          }
                        >
                          {queue.status === "open"
                            ? "Fila aberta"
                            : "Fila pausada"}
                        </Badge>
                      </div>
                      {queue.starts_at && (
                        <p className="mt-3 text-xs text-muted-foreground">
                          Janela:{" "}
                          {new Date(queue.starts_at).toLocaleTimeString(
                            "pt-BR",
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                          {queue.ends_at
                            ? `–${new Date(queue.ends_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                            : ""}{" "}
                          · capacidade {queue.max_capacity}
                        </p>
                      )}
                    </div>
                    <div className="flex items-start gap-3 rounded-lg border p-3 text-sm">
                      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <p>
                        {user
                          ? "Sua identidade será validada com o cadastro de paciente da clínica."
                          : "Use sua conta ou entre como visitante com nome e celular. Seus dados ficam vinculados somente a esta clínica."}
                      </p>
                    </div>
                    {user ? (
                      <Button
                        className="w-full"
                        onClick={() => void joinQueue()}
                        disabled={queue.status !== "open" || joining}
                      >
                        <LogIn className="mr-2 h-4 w-4" />
                        {joining ? "Entrando…" : "Confirmar entrada na fila"}
                      </Button>
                    ) : joiningAsGuest ? (
                      <form className="space-y-4" onSubmit={joinAsGuest}>
                        <div className="space-y-1.5">
                          <Label htmlFor="guest-full-name">Nome completo</Label>
                          <Input id="guest-full-name" autoComplete="name" value={guest.fullName} onChange={(event) => setGuest((value) => ({ ...value, fullName: event.target.value }))} placeholder="Como devemos chamar você" required />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="guest-phone">Celular com DDD</Label>
                          <Input id="guest-phone" type="tel" inputMode="tel" autoComplete="tel" value={guest.phone} onChange={(event) => setGuest((value) => ({ ...value, phone: event.target.value }))} placeholder="(21) 99999-9999" required />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="guest-birth-date">Data de nascimento <span className="font-normal text-muted-foreground">(opcional)</span></Label>
                          <Input id="guest-birth-date" type="date" autoComplete="bday" value={guest.birthDate} onChange={(event) => setGuest((value) => ({ ...value, birthDate: event.target.value }))} />
                        </div>
                        <label className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-sm leading-snug">
                          <input type="checkbox" className="mt-0.5 h-4 w-4" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} required />
                          <span>Autorizo o uso destes dados para registrar minha entrada na fila e para contato sobre este atendimento.</span>
                        </label>
                        <Button className="h-11 w-full" type="submit" disabled={queue.status !== "open" || joining || !acceptedTerms}>
                          {joining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
                          {joining ? "Emitindo senha…" : "Emitir senha de visitante"}
                        </Button>
                        <Button className="w-full" type="button" variant="ghost" onClick={() => setJoiningAsGuest(false)} disabled={joining}>Voltar</Button>
                      </form>
                    ) : (
                      <div className="space-y-3">
                        <Button className="h-11 w-full" onClick={continueToLogin} disabled={queue.status !== "open"}>
                          <LogIn className="mr-2 h-4 w-4" />Já tenho conta
                        </Button>
                        <Button className="h-11 w-full" variant="outline" onClick={() => setJoiningAsGuest(true)} disabled={queue.status !== "open"}>
                          <UserPlus className="mr-2 h-4 w-4" />Entrar como visitante
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </>
            ) : null}
            <Button variant="ghost" className="w-full" asChild>
              <Link to="/auth">Já tenho uma conta</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
