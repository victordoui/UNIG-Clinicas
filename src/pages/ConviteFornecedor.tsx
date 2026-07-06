import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Truck, ShieldCheck, AlertTriangle, Loader2, Mail, Lock, XCircle, Clock, CheckCircle2,
} from "lucide-react";
import { TIPO_FORNECEDOR_LABEL } from "@/lib/supplierLabels";

type State =
  | { kind: "loading" }
  | { kind: "valid"; invitation: any }
  | { kind: "error"; code: "expired" | "used" | "cancelled" | "invalid" | "error" };

const schema = z.object({
  nome_empresa: z.string().trim().min(2, "Informe o nome").max(180),
  cnpj: z.string().trim().max(20).optional(),
  nome_responsavel: z.string().trim().min(2, "Informe o responsável").max(120),
  telefone: z.string().trim().min(8, "Telefone inválido").max(20),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  password2: z.string(),
  aceite_termos: z.literal(true, { errorMap: () => ({ message: "Aceite os termos para continuar" }) }),
}).refine((d) => d.password === d.password2, { path: ["password2"], message: "Senhas não conferem" });

export default function ConviteFornecedor() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    nome_empresa: "", cnpj: "", nome_responsavel: "", telefone: "",
    password: "", password2: "", aceite_termos: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!token) { setState({ kind: "error", code: "invalid" }); return; }
    (async () => {
      const { data, error } = await supabase.functions.invoke("get-supplier-invitation", { body: { token } });
      if (error) { setState({ kind: "error", code: "error" }); return; }
      if (!data?.ok) { setState({ kind: "error", code: data?.code ?? "invalid" }); return; }
      setState({ kind: "valid", invitation: data.invitation });
      setForm((f) => ({
        ...f,
        nome_empresa: data.invitation.nome_empresa ?? "",
        cnpj: data.invitation.cnpj ?? "",
      }));
    })();
  }, [token]);

  const submit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.errors.forEach((e) => { errs[e.path[0] as string] = e.message; });
      setErrors(errs);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("accept-supplier-invitation", {
        body: { token, ...parsed.data },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Auto-login
      await supabase.auth.signInWithPassword({ email: data.email, password: parsed.data.password });
      toast({ title: "Acesso criado!", description: "Bem-vindo ao Portal do Fornecedor." });
      navigate("/portal-fornecedor");
    } catch (e: any) {
      toast({ title: "Erro", description: e.message ?? "Não foi possível criar o acesso.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (state.kind === "loading") {
    return <Centered><Loader2 className="h-8 w-8 animate-spin text-primary" /></Centered>;
  }

  if (state.kind === "error") {
    const meta = {
      expired:  { icon: Clock, title: "Convite expirado", msg: "Este convite passou da validade. Solicite um novo à UNIG." },
      used:     { icon: CheckCircle2, title: "Convite já utilizado", msg: "O acesso já foi criado com este convite. Faça login para entrar no portal." },
      cancelled:{ icon: XCircle, title: "Convite cancelado", msg: "Este convite foi cancelado pela UNIG. Entre em contato para mais informações." },
      invalid:  { icon: AlertTriangle, title: "Convite inválido", msg: "O link informado não é válido. Verifique se copiou corretamente." },
      error:    { icon: AlertTriangle, title: "Não foi possível validar", msg: "Tente novamente em instantes." },
    }[state.code];
    const Icon = meta.icon;
    return (
      <Centered>
        <Card className="max-w-md w-full rounded-2xl">
          <CardContent className="py-10 text-center space-y-4">
            <div className="mx-auto h-14 w-14 rounded-full bg-muted flex items-center justify-center">
              <Icon className="h-7 w-7 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold">{meta.title}</h2>
            <p className="text-muted-foreground text-sm">{meta.msg}</p>
            <Button variant="outline" asChild><Link to="/auth">Ir para o login</Link></Button>
          </CardContent>
        </Card>
      </Centered>
    );
  }

  const inv = state.invitation;

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center gap-3 justify-center">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Truck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">UNIG Facilities</p>
            <p className="font-bold">Portal do Fornecedor</p>
          </div>
        </div>

        {/* Aviso */}
        <Card className="rounded-2xl border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex gap-3">
            <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-foreground">
              <strong>Atenção:</strong> este cadastro cria apenas o acesso inicial ao Portal do Fornecedor.
              Para participar de cotações, enviar propostas e receber pedidos, será necessário completar
              o cadastro e aguardar a aprovação da UNIG.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Cadastro inicial do fornecedor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Dados do convite */}
            <div className="rounded-xl border bg-muted/30 p-4 space-y-2">
              <div className="text-xs font-semibold uppercase text-muted-foreground">Dados do convite</div>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <Field label="E-mail" icon={Mail} value={inv.email} locked />
                <Field label="Tipo esperado" value={TIPO_FORNECEDOR_LABEL[inv.tipo_fornecedor] ?? inv.tipo_fornecedor} />
                {inv.categoria_esperada && <Field label="Categoria esperada" value={inv.categoria_esperada} />}
                <Field label="Validade" value={new Date(inv.expires_at).toLocaleDateString("pt-BR")} />
              </div>
            </div>

            {/* Dados básicos */}
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase text-muted-foreground">Dados básicos para criar acesso</div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label>Nome da empresa / Fantasia *</Label>
                  <Input value={form.nome_empresa} onChange={(e) => setForm({ ...form, nome_empresa: e.target.value })} />
                  {errors.nome_empresa && <p className="text-xs text-destructive mt-1">{errors.nome_empresa}</p>}
                </div>
                <div>
                  <Label>CNPJ</Label>
                  <Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} placeholder="Obrigatório se Pessoa Jurídica" />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label>Nome do responsável *</Label>
                  <Input value={form.nome_responsavel} onChange={(e) => setForm({ ...form, nome_responsavel: e.target.value })} />
                  {errors.nome_responsavel && <p className="text-xs text-destructive mt-1">{errors.nome_responsavel}</p>}
                </div>
                <div>
                  <Label>Telefone / WhatsApp *</Label>
                  <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="(11) 99999-9999" />
                  {errors.telefone && <p className="text-xs text-destructive mt-1">{errors.telefone}</p>}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label>Criar senha *</Label>
                  <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                  {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
                </div>
                <div>
                  <Label>Confirmar senha *</Label>
                  <Input type="password" value={form.password2} onChange={(e) => setForm({ ...form, password2: e.target.value })} />
                  {errors.password2 && <p className="text-xs text-destructive mt-1">{errors.password2}</p>}
                </div>
              </div>

              <label className="flex items-start gap-2 cursor-pointer text-sm">
                <Checkbox checked={form.aceite_termos} onCheckedChange={(v) => setForm({ ...form, aceite_termos: !!v })} />
                <span>
                  Li e aceito os <a href="#" className="text-primary underline">termos iniciais</a> de uso do Portal do Fornecedor.
                </span>
              </label>
              {errors.aceite_termos && <p className="text-xs text-destructive">{errors.aceite_termos}</p>}
            </div>

            <Button className="w-full" size="lg" onClick={submit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar acesso ao Portal do Fornecedor
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Já tem acesso? <Link to="/auth" className="text-primary underline">Entrar</Link>
        </p>
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">{children}</div>;
}

function Field({ label, value, icon: Icon, locked }: { label: string; value: string; icon?: any; locked?: boolean }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" />} {label}
      </div>
      <div className="flex items-center gap-1 font-medium">
        {value} {locked && <Lock className="h-3 w-3 text-muted-foreground" />}
      </div>
    </div>
  );
}
