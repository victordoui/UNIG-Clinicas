import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Loader2, LogIn, QrCode, ShieldCheck, UserPlus } from "lucide-react";
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

export default function FilaQR() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [queue, setQueue] = useState<PublicQueue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [joining, setJoining] = useState(false);
  const [ticketNumber, setTicketNumber] = useState<number | null>(null);
  const [joiningAsGuest, setJoiningAsGuest] = useState(false);
  const [guest, setGuest] = useState({ fullName: "", phone: "", birthDate: "", email: "" });
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
        setError("Esta fila não está aberta ou o QR Code expirou.");
      else setQueue((Array.isArray(data) ? data[0] : data) as PublicQueue);
      setLoading(false);
    };
    void load();
    return () => {
      active = false;
    };
  }, [token]);

  const continueToLogin = () => {
    if (token) window.sessionStorage.setItem("unig-pending-queue-token", token);
    if (guest.email.trim()) window.sessionStorage.setItem("unig-pending-guest-email", guest.email.trim().toLocaleLowerCase());
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
    else
      setTicketNumber(
        (Array.isArray(data)
          ? data[0]?.ticket_number
          : (data as { ticket_number?: number })?.ticket_number) ?? null,
      );
    setJoining(false);
  };
  const joinAsGuest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    const validationError = validateGuestQueueEntry({ fullName: guest.fullName, phone: guest.phone, email: guest.email, consent: acceptedTerms });
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
      setTicketNumber(issuedTicket?.ticket_number ?? null);
      if (issuedTicket?.ticket_id && guest.email.trim()) {
        const { error: emailError } = await (supabase.rpc as any)("attach_guest_email_to_ticket", { target_ticket_id: issuedTicket.ticket_id, guest_email: guest.email.trim() });
        if (emailError) setActionError("Senha emitida, mas não foi possível preparar o vínculo por e-mail. Procure a recepção.");
      }
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
                    <div className="rounded-xl border bg-primary/5 p-6 text-center">
                      <p className="text-sm text-muted-foreground">Sua senha</p>
                      <p className="mt-2 text-6xl font-black tracking-tight text-primary">
                        {ticketNumber}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Acompanhe a chamada no painel da clínica.
                      </p>
                    </div>
                    {!user && (
                      <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4 text-left">
                        <p className="font-semibold">Quer facilitar os próximos atendimentos?</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Crie sua conta com o mesmo e-mail para acompanhar agenda, documentos e avisos. Após a confirmação, o cadastro de visitante será vinculado automaticamente.
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
                        <div className="space-y-1.5">
                          <Label htmlFor="guest-email">E-mail <span className="font-normal text-muted-foreground">(opcional, para criar sua conta depois)</span></Label>
                          <Input id="guest-email" type="email" inputMode="email" autoComplete="email" value={guest.email} onChange={(event) => setGuest((value) => ({ ...value, email: event.target.value }))} placeholder="voce@exemplo.com" />
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
