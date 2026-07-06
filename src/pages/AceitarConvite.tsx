import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, AlertCircle, Loader2, ChevronLeft, ChevronRight, Info, Building2, Sparkles } from "lucide-react";
import { formatPhoneBR, phoneDigits } from "@/lib/masks";
import { INVITEE_TYPES, INVITEE_TYPE_LABEL } from "@/lib/invitationConstants";

interface InviteInfo {
  email: string;
  role_label: string;
  invitee_type: string;
  organization_name: string;
  expires_at: string;
}

type Status = "loading" | "invalid" | "expired" | "used" | "cancelled" | "ready" | "submitting" | "done";

const STEPS = ["Convite", "Identidade", "Institucional", "Contato", "Segurança", "Revisão"];

export default function AceitarConvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [step, setStep] = useState(0);

  // Identidade
  const [fullName, setFullName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [registration, setRegistration] = useState("");
  const [birthDate, setBirthDate] = useState("");
  // Institucional
  const [userType, setUserType] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [department, setDepartment] = useState("");
  const [unitCampus, setUnitCampus] = useState("");
  const [workLocation, setWorkLocation] = useState("");
  // Contato
  const [whatsapp, setWhatsapp] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  // Segurança
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [terms, setTerms] = useState(false);

  useEffect(() => {
    (async () => {
      if (!token) { setStatus("invalid"); setErrorMsg("Token ausente"); return; }
      const { data, error } = await supabase.functions.invoke("get-invitation", { body: { token } });
      if (error || !data?.valid) {
        const reason = data?.reason;
        if (reason === "expired") setStatus("expired");
        else if (reason === "used") setStatus("used");
        else if (reason === "cancelled") setStatus("cancelled");
        else setStatus("invalid");
        setErrorMsg(data?.error || error?.message || "Convite inválido");
        return;
      }
      setInfo(data);
      setUserType(data.invitee_type || "");
      setStatus("ready");
    })();
  }, [token]);

  const validatePassword = (p: string): string | null => {
    if (p.length < 12) return "Senha deve ter no mínimo 12 caracteres";
    if (!/[A-Z]/.test(p)) return "Inclua uma letra maiúscula";
    if (!/[a-z]/.test(p)) return "Inclua uma letra minúscula";
    if (!/[0-9]/.test(p)) return "Inclua um número";
    if (!/[^A-Za-z0-9]/.test(p)) return "Inclua um caractere especial";
    return null;
  };

  const canAdvance = () => {
    if (step === 1) return fullName.trim().length > 0;
    if (step === 4) return !validatePassword(password) && password === confirm && terms;
    return true;
  };

  const handleSubmit = async () => {
    setStatus("submitting");
    const { data, error } = await supabase.functions.invoke("accept-invitation", {
      body: {
        token,
        full_name: fullName.trim(),
        preferred_name: preferredName.trim(),
        registration,
        birth_date: birthDate || null,
        user_type: userType,
        job_role: jobRole,
        department,
        unit_campus: unitCampus,
        work_location: workLocation,
        whatsapp,
        personal_email: personalEmail,
        password,
        accept_terms: terms,
      },
    });
    if (error || !data?.success) {
      toast({ title: "Erro ao concluir cadastro", description: data?.error || error?.message, variant: "destructive" });
      setStatus("ready");
      return;
    }
    setStatus("done");
    setTimeout(() => navigate(`/auth?email=${encodeURIComponent(info?.email || "")}`), 2500);
  };

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (status === "invalid" || status === "expired" || status === "used" || status === "cancelled") {
    const titles: Record<string, string> = {
      invalid: "Convite inválido",
      expired: "Convite expirado",
      used: "Cadastro já realizado",
      cancelled: "Convite cancelado",
    };
    const msgs: Record<string, string> = {
      invalid: errorMsg || "Este link de convite não foi reconhecido.",
      expired: "O prazo deste convite encerrou. Solicite um novo link à administração.",
      used: "Este convite já foi utilizado. Faça login com seu e-mail e senha.",
      cancelled: "Este convite foi cancelado pela administração.",
    };
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" /> {titles[status]}
            </CardTitle>
            <CardDescription>{msgs[status]}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/auth"><Button variant="outline" className="w-full">Ir para login</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-5 w-5" /> Cadastro realizado com sucesso
            </CardTitle>
            <CardDescription>
              Seu acesso inicial foi criado como <Badge variant="outline">Visitante</Badge> e poderá ser revisado pela administração para liberação das permissões correspondentes. Redirecionando para o login...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-muted/30 p-4 py-8">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Header institucional */}
        <div className="rounded-2xl bg-gradient-primary text-white p-6 shadow-lg animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
              <Building2 className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-white/80">UNIG Facilities</p>
              <h1 className="text-xl md:text-2xl font-bold leading-tight">Cadastro de novo acesso</h1>
              <p className="text-sm text-white/90 mt-0.5 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Bem-vindo(a) ao {info?.organization_name || "sistema"}!
              </p>
            </div>
          </div>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          Etapa {step + 1} de {STEPS.length}: <strong className="text-foreground">{STEPS[step]}</strong>
        </div>
        <Progress value={progress} />

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Atenção:</strong> algumas informações deste cadastro serão usadas para identificação institucional e não poderão ser alteradas diretamente por você após o envio. Confira todos os dados antes de finalizar.
          </AlertDescription>
        </Alert>

        <Card className="animate-fade-in">
          <CardContent className="pt-6 space-y-4">
            {step === 0 && (
              <>
                <div className="space-y-2">
                  <Label>E-mail institucional</Label>
                  <Input value="" disabled placeholder={info?.email || ""} className="bg-muted placeholder:text-foreground/80" />
                  <p className="text-xs text-muted-foreground">Definido pelo convite — não editável.</p>
                </div>
                <div className="space-y-2">
                  <Label>Nível de acesso inicial</Label>
                  <div className="flex items-center gap-2"><Badge variant="outline">Visitante</Badge>
                    <span className="text-xs text-muted-foreground">bloqueado — definido pela política do sistema</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Status inicial</Label>
                  <Badge variant="outline" className="bg-amber-500/15 text-amber-700 border-amber-500/30">Aguardando validação administrativa</Badge>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div className="space-y-2"><Label>Nome completo *</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s'-]/g, ''))} autoCapitalize="words" required />
                </div>
                <div className="space-y-2"><Label>Como gostaria de ser chamado</Label>
                  <Input value={preferredName} onChange={(e) => setPreferredName(e.target.value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s'-]/g, ''))} autoCapitalize="words" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Matrícula</Label>
                    <Input value={registration} onChange={(e) => setRegistration(e.target.value.replace(/\D/g, ''))} inputMode="numeric" />
                  </div>
                  <div className="space-y-2"><Label>Data de nascimento</Label>
                    <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="space-y-2"><Label>Tipo de usuário</Label>
                  <Select value={userType} onValueChange={setUserType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {INVITEE_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Cargo</Label>
                    <Input value={jobRole} onChange={(e) => setJobRole(e.target.value)} />
                  </div>
                  <div className="space-y-2"><Label>Setor / Departamento</Label>
                    <Input value={department} onChange={(e) => setDepartment(e.target.value)} />
                  </div>
                  <div className="space-y-2"><Label>Unidade / Campus</Label>
                    <Input value={unitCampus} onChange={(e) => setUnitCampus(e.target.value)} />
                  </div>
                  <div className="space-y-2"><Label>Local de atuação</Label>
                    <Input value={workLocation} onChange={(e) => setWorkLocation(e.target.value)} placeholder="Bloco, andar, sala..." />
                  </div>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="space-y-2"><Label>Telefone / WhatsApp</Label>
                  <Input value={formatPhoneBR(whatsapp)} onChange={(e) => setWhatsapp(phoneDigits(e.target.value))} placeholder="(00) 00000-0000" inputMode="tel" maxLength={15} />
                </div>
                <div className="space-y-2"><Label>E-mail institucional</Label>
                  <Input value="" disabled placeholder={info?.email || ""} className="bg-muted placeholder:text-foreground/80" />
                </div>
                <div className="space-y-2"><Label>E-mail pessoal (opcional)</Label>
                  <Input type="email" value={personalEmail} onChange={(e) => setPersonalEmail(e.target.value)} />
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Criar senha *</Label>
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <div className="space-y-2"><Label>Confirmar senha *</Label>
                    <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Mínimo 12 caracteres, com maiúscula, minúscula, número e caractere especial.</p>
                {password && validatePassword(password) && <p className="text-xs text-destructive">{validatePassword(password)}</p>}
                {confirm && password !== confirm && <p className="text-xs text-destructive">Senhas não coincidem</p>}
                <div className="flex items-start gap-2 pt-2">
                  <Checkbox id="terms" checked={terms} onCheckedChange={(v) => setTerms(!!v)} />
                  <Label htmlFor="terms" className="text-sm font-normal cursor-pointer">
                    Li e aceito os termos de uso e a política de privacidade da plataforma.
                  </Label>
                </div>
              </>
            )}

            {step === 5 && (
              <>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Revise suas informações antes de concluir. Após o cadastro, somente foto de perfil, nome de preferência e telefone/WhatsApp poderão ser alterados diretamente por você. Alterações em cargo, setor, departamento, unidade, matrícula, e-mail institucional e nível de acesso dependerão de validação administrativa.
                  </AlertDescription>
                </Alert>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <Field label="E-mail institucional" value={info?.email} />
                  <Field label="Nível inicial" value="Visitante" />
                  <Field label="Nome completo" value={fullName} />
                  <Field label="Como gostaria de ser chamado" value={preferredName} />
                  <Field label="Matrícula" value={registration} />
                  <Field label="Data de nascimento" value={birthDate} />
                  <Field label="Tipo de usuário" value={INVITEE_TYPE_LABEL[userType] || userType} />
                  <Field label="Cargo" value={jobRole} />
                  <Field label="Setor / Departamento" value={department} />
                  <Field label="Unidade / Campus" value={unitCampus} />
                  <Field label="Local de atuação" value={workLocation} />
                  <Field label="WhatsApp" value={formatPhoneBR(whatsapp)} />
                  <Field label="E-mail pessoal" value={personalEmail} />
                </div>
              </>
            )}

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || status === "submitting"}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
              {step < STEPS.length - 1 ? (
                <Button onClick={() => setStep((s) => s + 1)} disabled={!canAdvance()} className="bg-gradient-primary text-white">
                  Avançar <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={status === "submitting"} className="bg-gradient-primary text-white">
                  {status === "submitting" ? "Enviando..." : "Concluir cadastro"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded border p-2 bg-muted/30">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium truncate">{value || "—"}</div>
    </div>
  );
}
