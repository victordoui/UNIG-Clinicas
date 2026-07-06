import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ArrowLeft, ArrowRight, CheckCircle2, ShieldCheck, Building2, MapPin, Phone, Tags,
  Landmark, FileText, ClipboardList, Truck, Sparkles, Upload,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  SUPPLIER_CATEGORIES, SUPPLIER_PORTES, SUPPLIER_TIPOS, SUPPLIER_REGIMES,
  DEFAULT_DOCUMENT_TEMPLATES,
} from "@/lib/supplierLabels";

type WizardData = {
  // Step 1
  email: string;
  password: string;
  passwordConfirm: string;
  tipo_cadastro: "pj" | "pf" | "prestador" | "representante";
  // Step 2
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  inscricao_estadual: string;
  inscricao_municipal: string;
  tipo_fornecedor: string;
  porte: string;
  regime_tributario: string;
  // Step 3
  cep: string; logradouro: string; numero: string; complemento: string;
  bairro: string; cidade: string; uf: string; pais: string;
  // Step 4
  responsavel_comercial: string; cargo_comercial: string;
  telefone_comercial: string; email_comercial: string;
  responsavel_financeiro: string; telefone_financeiro: string; email_financeiro: string;
  responsavel_tecnico: string; telefone_tecnico: string; email_tecnico: string;
  // Step 5
  categorias: string[];
  // Step 6
  banco: string; agencia: string; conta: string; tipo_conta: string;
  chave_pix: string; titular: string; documento_titular: string;
  // Step 8 — terms
  termo_veracidade: boolean; termo_portal: boolean; termo_analise: boolean; termo_documentos: boolean;
};

const empty: WizardData = {
  email: "", password: "", passwordConfirm: "", tipo_cadastro: "pj",
  razao_social: "", nome_fantasia: "", cnpj: "",
  inscricao_estadual: "", inscricao_municipal: "",
  tipo_fornecedor: "", porte: "", regime_tributario: "",
  cep: "", logradouro: "", numero: "", complemento: "",
  bairro: "", cidade: "", uf: "", pais: "Brasil",
  responsavel_comercial: "", cargo_comercial: "",
  telefone_comercial: "", email_comercial: "",
  responsavel_financeiro: "", telefone_financeiro: "", email_financeiro: "",
  responsavel_tecnico: "", telefone_tecnico: "", email_tecnico: "",
  categorias: [],
  banco: "", agencia: "", conta: "", tipo_conta: "",
  chave_pix: "", titular: "", documento_titular: "",
  termo_veracidade: false, termo_portal: false, termo_analise: false, termo_documentos: false,
};

const STEPS = [
  { id: 1, label: "Acesso", icon: ShieldCheck },
  { id: 2, label: "Empresa", icon: Building2 },
  { id: 3, label: "Endereço", icon: MapPin },
  { id: 4, label: "Contatos", icon: Phone },
  { id: 5, label: "Categorias", icon: Tags },
  { id: 6, label: "Bancário", icon: Landmark },
  { id: 7, label: "Documentos", icon: FileText },
  { id: 8, label: "Revisão", icon: ClipboardList },
];

export default function CadastroFornecedor() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(empty);
  const [docFiles, setDocFiles] = useState<Record<string, { file: File | null; validade: string }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [emailLocked, setEmailLocked] = useState(false);

  // Carrega convite (se houver token) para travar e-mail
  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data: inv } = await supabase
        .from("user_invitations")
        .select("email")
        .eq("token", token)
        .maybeSingle();
      if (inv?.email) {
        setData((d) => ({ ...d, email: inv.email }));
        setEmailLocked(true);
      }
    })();
  }, [token]);

  const set = <K extends keyof WizardData>(k: K, v: WizardData[K]) => setData((d) => ({ ...d, [k]: v }));

  const canNext = useMemo(() => {
    switch (step) {
      case 1:
        return data.email && data.password.length >= 8 && data.password === data.passwordConfirm;
      case 2:
        return data.razao_social && data.cnpj && data.tipo_fornecedor && data.porte;
      case 3:
        return data.cep && data.logradouro && data.numero && data.cidade && data.uf;
      case 4:
        return data.responsavel_comercial && data.email_comercial && data.telefone_comercial;
      case 5:
        return data.categorias.length > 0;
      case 6:
        return data.banco && data.agencia && data.conta && data.titular;
      case 7: {
        const mandatory = DEFAULT_DOCUMENT_TEMPLATES.filter((d) => d.obrigatorio);
        return mandatory.every((m) => docFiles[m.tipo]?.file);
      }
      case 8:
        return data.termo_veracidade && data.termo_portal && data.termo_analise && data.termo_documentos;
    }
    return false;
  }, [step, data, docFiles]);

  const submit = async () => {
    setSubmitting(true);
    try {
      // 1) cria usuário (signUp) se não autenticado
      let userId: string | null = null;
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        userId = session.user.id;
      } else {
        const { data: signed, error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: { emailRedirectTo: `${window.location.origin}/portal-fornecedor` },
        });
        if (error) throw error;
        userId = signed.user?.id ?? null;
      }
      if (!userId) throw new Error("Não foi possível criar o usuário.");

      // 2) cria supplier (status em_analise)
      const supplierPayload = {
        razao_social: data.razao_social,
        nome_fantasia: data.nome_fantasia || data.razao_social,
        cnpj: data.cnpj,
        inscricao_estadual: data.inscricao_estadual || null,
        inscricao_municipal: data.inscricao_municipal || null,
        tipo_fornecedor: data.tipo_fornecedor,
        porte: data.porte,
        regime_tributario: data.regime_tributario || null,
        cep: data.cep, logradouro: data.logradouro, numero: data.numero,
        complemento: data.complemento || null, bairro: data.bairro,
        cidade: data.cidade, uf: data.uf, pais: data.pais || "Brasil",
        responsavel_comercial: data.responsavel_comercial,
        cargo_comercial: data.cargo_comercial || null,
        telefone_comercial: data.telefone_comercial,
        email_comercial: data.email_comercial,
        responsavel_financeiro: data.responsavel_financeiro || null,
        telefone_financeiro: data.telefone_financeiro || null,
        email_financeiro: data.email_financeiro || null,
        responsavel_tecnico: data.responsavel_tecnico || null,
        telefone_tecnico: data.telefone_tecnico || null,
        email_tecnico: data.email_tecnico || null,
        categorias: data.categorias,
        email: data.email_comercial || data.email,
        ativo: false,
        status: "em_analise" as const,
        submitted_at: new Date().toISOString(),
        created_by: userId,
        // organization_id virá do convite / processamento interno
        organization_id: "00000000-0000-0000-0000-000000000000",
      };

      // salva rascunho com tudo (admin processará e moverá para suppliers oficial via review)
      const { error: draftErr } = await supabase
        .from("supplier_registration_drafts")
        .upsert({
          user_id: userId,
          invitation_token: token || null,
          current_step: 8,
          submitted: true,
          data: { supplier: supplierPayload, bank: {
            banco: data.banco, agencia: data.agencia, conta: data.conta,
            tipo_conta: data.tipo_conta || null, chave_pix: data.chave_pix || null,
            titular: data.titular, documento_titular: data.documento_titular || null,
          }, documents: Object.entries(docFiles).map(([tipo, v]) => ({
            tipo, validade: v.validade || null, file_name: v.file?.name ?? null,
          })) } as any,
        }, { onConflict: "user_id" });
      if (draftErr) throw draftErr;

      setDone(true);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro ao enviar cadastro", description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6">
        <Card className="max-w-lg w-full">
          <CardContent className="p-8 text-center space-y-4">
            <div className="h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold">Cadastro enviado com sucesso</h1>
            <p className="text-sm text-muted-foreground">
              A equipe da UNIG analisará suas informações e documentos. Você poderá acompanhar o andamento pelo Portal do Fornecedor.
            </p>
            <Button onClick={() => navigate("/portal-fornecedor")} className="mt-4">
              Acessar Portal do Fornecedor
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progress = Math.round((step / STEPS.length) * 100);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-card border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Truck className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Portal do Fornecedor</p>
            <h1 className="font-semibold text-sm">Cadastro do Fornecedor</h1>
          </div>
          <Badge variant="outline">Etapa {step} de {STEPS.length}</Badge>
        </div>
        <div className="max-w-4xl mx-auto px-4 pb-4">
          <Progress value={progress} className="h-2" />
          <div className="hidden md:flex justify-between mt-2 text-[10px] text-muted-foreground">
            {STEPS.map((s) => (
              <span key={s.id} className={step >= s.id ? "text-primary font-medium" : ""}>
                {s.id}. {s.label}
              </span>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <Card>
          <CardContent className="p-6 space-y-5">
            {/* STEP 1 */}
            {step === 1 && (
              <>
                <Header icon={ShieldCheck} title="Acesso" desc="Crie seu acesso ao Portal do Fornecedor." />
                <Alert>
                  <Sparkles className="h-4 w-4" />
                  <AlertTitle>Atenção</AlertTitle>
                  <AlertDescription>
                    Seu acesso inicial permite apenas completar o cadastro e acompanhar a análise. A participação em cotações depende da aprovação da UNIG.
                  </AlertDescription>
                </Alert>
                <div className="grid md:grid-cols-2 gap-4">
                  <Box label="E-mail principal *">
                    <Input value={data.email} disabled={emailLocked}
                      onChange={(e) => set("email", e.target.value)} />
                  </Box>
                  <Box label="Tipo de cadastro *">
                    <Select value={data.tipo_cadastro} onValueChange={(v: any) => set("tipo_cadastro", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pj">Pessoa Jurídica</SelectItem>
                        <SelectItem value="pf">Pessoa Física</SelectItem>
                        <SelectItem value="prestador">Prestador de Serviço</SelectItem>
                        <SelectItem value="representante">Representante</SelectItem>
                      </SelectContent>
                    </Select>
                  </Box>
                  <Box label="Senha (mínimo 8 caracteres) *">
                    <Input type="password" value={data.password} onChange={(e) => set("password", e.target.value)} />
                  </Box>
                  <Box label="Confirmar senha *">
                    <Input type="password" value={data.passwordConfirm} onChange={(e) => set("passwordConfirm", e.target.value)} />
                  </Box>
                </div>
              </>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <>
                <Header icon={Building2} title="Dados da empresa" desc="Informe os dados cadastrais oficiais." />
                <div className="grid md:grid-cols-2 gap-4">
                  <Box label="Razão Social *"><Input value={data.razao_social} onChange={(e) => set("razao_social", e.target.value)} /></Box>
                  <Box label="Nome Fantasia"><Input value={data.nome_fantasia} onChange={(e) => set("nome_fantasia", e.target.value)} /></Box>
                  <Box label="CNPJ *"><Input value={data.cnpj} onChange={(e) => set("cnpj", e.target.value)} /></Box>
                  <Box label="Inscrição Estadual"><Input value={data.inscricao_estadual} onChange={(e) => set("inscricao_estadual", e.target.value)} /></Box>
                  <Box label="Inscrição Municipal"><Input value={data.inscricao_municipal} onChange={(e) => set("inscricao_municipal", e.target.value)} /></Box>
                  <Box label="Tipo de fornecedor *">
                    <Select value={data.tipo_fornecedor} onValueChange={(v) => set("tipo_fornecedor", v)}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{SUPPLIER_TIPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </Box>
                  <Box label="Porte *">
                    <Select value={data.porte} onValueChange={(v) => set("porte", v)}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{SUPPLIER_PORTES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </Box>
                  <Box label="Regime tributário">
                    <Select value={data.regime_tributario} onValueChange={(v) => set("regime_tributario", v)}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{SUPPLIER_REGIMES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </Box>
                </div>
              </>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <>
                <Header icon={MapPin} title="Endereço" desc="Endereço fiscal da empresa." />
                <div className="grid md:grid-cols-3 gap-4">
                  <Box label="CEP *"><Input value={data.cep} onChange={(e) => set("cep", e.target.value)} /></Box>
                  <Box label="Logradouro *" className="md:col-span-2"><Input value={data.logradouro} onChange={(e) => set("logradouro", e.target.value)} /></Box>
                  <Box label="Número *"><Input value={data.numero} onChange={(e) => set("numero", e.target.value)} /></Box>
                  <Box label="Complemento"><Input value={data.complemento} onChange={(e) => set("complemento", e.target.value)} /></Box>
                  <Box label="Bairro"><Input value={data.bairro} onChange={(e) => set("bairro", e.target.value)} /></Box>
                  <Box label="Cidade *"><Input value={data.cidade} onChange={(e) => set("cidade", e.target.value)} /></Box>
                  <Box label="UF *"><Input maxLength={2} value={data.uf} onChange={(e) => set("uf", e.target.value.toUpperCase())} /></Box>
                  <Box label="País"><Input value={data.pais} onChange={(e) => set("pais", e.target.value)} /></Box>
                </div>
              </>
            )}

            {/* STEP 4 */}
            {step === 4 && (
              <>
                <Header icon={Phone} title="Contatos" desc="Pessoas para contato comercial, financeiro e técnico." />
                <div className="grid md:grid-cols-2 gap-4">
                  <Box label="Responsável comercial *"><Input value={data.responsavel_comercial} onChange={(e) => set("responsavel_comercial", e.target.value)} /></Box>
                  <Box label="Cargo"><Input value={data.cargo_comercial} onChange={(e) => set("cargo_comercial", e.target.value)} /></Box>
                  <Box label="Telefone / WhatsApp *"><Input value={data.telefone_comercial} onChange={(e) => set("telefone_comercial", e.target.value)} /></Box>
                  <Box label="E-mail comercial *"><Input type="email" value={data.email_comercial} onChange={(e) => set("email_comercial", e.target.value)} /></Box>
                  <Box label="Responsável financeiro"><Input value={data.responsavel_financeiro} onChange={(e) => set("responsavel_financeiro", e.target.value)} /></Box>
                  <Box label="Telefone financeiro"><Input value={data.telefone_financeiro} onChange={(e) => set("telefone_financeiro", e.target.value)} /></Box>
                  <Box label="E-mail financeiro"><Input type="email" value={data.email_financeiro} onChange={(e) => set("email_financeiro", e.target.value)} /></Box>
                  <Box label="Responsável técnico (opcional)"><Input value={data.responsavel_tecnico} onChange={(e) => set("responsavel_tecnico", e.target.value)} /></Box>
                </div>
              </>
            )}

            {/* STEP 5 */}
            {step === 5 && (
              <>
                <Header icon={Tags} title="Categorias de fornecimento" desc="Selecione uma ou mais." />
                <div className="flex flex-wrap gap-2">
                  {SUPPLIER_CATEGORIES.map((cat) => {
                    const sel = data.categorias.includes(cat);
                    return (
                      <Badge key={cat} variant={sel ? "default" : "outline"} className="cursor-pointer"
                        onClick={() => set("categorias", sel ? data.categorias.filter((c) => c !== cat) : [...data.categorias, cat])}>
                        {cat}
                      </Badge>
                    );
                  })}
                </div>
              </>
            )}

            {/* STEP 6 */}
            {step === 6 && (
              <>
                <Header icon={Landmark} title="Dados bancários" desc="Conta para recebimento." />
                <div className="grid md:grid-cols-2 gap-4">
                  <Box label="Banco *"><Input value={data.banco} onChange={(e) => set("banco", e.target.value)} /></Box>
                  <Box label="Tipo de conta">
                    <Select value={data.tipo_conta} onValueChange={(v) => set("tipo_conta", v)}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="corrente">Conta corrente</SelectItem>
                        <SelectItem value="poupanca">Poupança</SelectItem>
                        <SelectItem value="pagamento">Conta pagamento</SelectItem>
                      </SelectContent>
                    </Select>
                  </Box>
                  <Box label="Agência *"><Input value={data.agencia} onChange={(e) => set("agencia", e.target.value)} /></Box>
                  <Box label="Conta *"><Input value={data.conta} onChange={(e) => set("conta", e.target.value)} /></Box>
                  <Box label="Chave PIX"><Input value={data.chave_pix} onChange={(e) => set("chave_pix", e.target.value)} /></Box>
                  <Box label="Titular *"><Input value={data.titular} onChange={(e) => set("titular", e.target.value)} /></Box>
                  <Box label="CNPJ/CPF do titular"><Input value={data.documento_titular} onChange={(e) => set("documento_titular", e.target.value)} /></Box>
                </div>
              </>
            )}

            {/* STEP 7 */}
            {step === 7 && (
              <>
                <Header icon={FileText} title="Documentos" desc="Faça upload dos documentos. Você poderá enviá-los novamente depois caso necessário." />
                <div className="space-y-2">
                  {DEFAULT_DOCUMENT_TEMPLATES.map((d) => {
                    const v = docFiles[d.tipo] ?? { file: null, validade: "" };
                    return (
                      <div key={d.tipo} className="border rounded-lg p-3 flex flex-wrap items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{d.nome}</p>
                          <div className="flex gap-2 text-[10px]">
                            {d.obrigatorio && <Badge variant="outline">obrigatório</Badge>}
                            <Badge variant="outline" className="capitalize">{d.grupo}</Badge>
                          </div>
                        </div>
                        <Input type="file" className="max-w-xs"
                          onChange={(e) => setDocFiles({ ...docFiles, [d.tipo]: { ...v, file: e.target.files?.[0] ?? null } })} />
                        {d.precisaValidade && (
                          <Input type="date" className="max-w-[160px]" value={v.validade}
                            onChange={(e) => setDocFiles({ ...docFiles, [d.tipo]: { ...v, validade: e.target.value } })} />
                        )}
                        {v.file && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* STEP 8 */}
            {step === 8 && (
              <>
                <Header icon={ClipboardList} title="Revisão e envio" desc="Confirme as informações antes de enviar para análise." />
                <div className="grid md:grid-cols-2 gap-3 text-sm">
                  <Recap label="Razão Social" value={data.razao_social} />
                  <Recap label="CNPJ" value={data.cnpj} />
                  <Recap label="Cidade/UF" value={`${data.cidade}/${data.uf}`} />
                  <Recap label="E-mail" value={data.email} />
                  <Recap label="Categorias" value={data.categorias.join(", ") || "—"} />
                  <Recap label="Documentos enviados" value={`${Object.values(docFiles).filter(f => f.file).length} de ${DEFAULT_DOCUMENT_TEMPLATES.length}`} />
                </div>
                <div className="space-y-2 pt-4 border-t">
                  <Term checked={data.termo_veracidade} onChange={(v) => set("termo_veracidade", v)} label="Declaro que as informações fornecidas são verdadeiras." />
                  <Term checked={data.termo_portal} onChange={(v) => set("termo_portal", v)} label="Aceito os termos do Portal do Fornecedor." />
                  <Term checked={data.termo_analise} onChange={(v) => set("termo_analise", v)} label="Estou ciente de que o cadastro será analisado pela UNIG." />
                  <Term checked={data.termo_documentos} onChange={(v) => set("termo_documentos", v)} label="Estou ciente de que documentos vencidos ou reprovados podem bloquear minha participação em cotações." />
                </div>
              </>
            )}

            <div className="flex items-center justify-between pt-4 border-t">
              <Button variant="ghost" disabled={step === 1} onClick={() => setStep(step - 1)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
              {step < STEPS.length ? (
                <Button onClick={() => setStep(step + 1)} disabled={!canNext}>
                  Avançar <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={submit} disabled={!canNext || submitting}>
                  {submitting ? "Enviando…" : "Enviar cadastro para análise"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function Header({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 mb-1">
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <h2 className="font-semibold text-lg">{title}</h2>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

function Box({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function Recap({ label, value }: { label: string; value: string }) {
  return (
    <div className="border rounded-md p-3">
      <p className="text-[10px] uppercase text-muted-foreground tracking-wide">{label}</p>
      <p className="font-medium">{value || "—"}</p>
    </div>
  );
}

function Term({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-start gap-2 text-sm cursor-pointer">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(!!v)} className="mt-0.5" />
      <span>{label}</span>
    </label>
  );
}
