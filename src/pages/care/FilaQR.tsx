import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Loader2, LogIn, QrCode, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [joining, setJoining] = useState(false);
  const [ticketNumber, setTicketNumber] = useState<number | null>(null);

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
    navigate("/auth");
  };
  const joinQueue = async () => {
    if (!token) return;
    setJoining(true);
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
              O QR identifica uma sessão específica. Nenhuma informação clínica
              é exibida nesta tela.
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
                {ticketNumber ? (
                  <div className="rounded-xl border bg-primary/5 p-6 text-center">
                    <p className="text-sm text-muted-foreground">Sua senha</p>
                    <p className="mt-2 text-6xl font-black tracking-tight text-primary">
                      {ticketNumber}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Acompanhe a chamada no painel da clínica.
                    </p>
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
                          : "Para entrar, identifique-se com sua conta. O vínculo com a clínica será validado no servidor."}
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
                    ) : (
                      <Button
                        className="w-full"
                        onClick={continueToLogin}
                        disabled={queue.status !== "open"}
                      >
                        <LogIn className="mr-2 h-4 w-4" />
                        Identificar e continuar
                      </Button>
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
