import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Building2, MapPin, Phone, Landmark, Tags, AlertCircle, ShieldCheck, Save, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useMySupplier,
  useUpdateMySupplier,
  useSupplierBankAccounts,
  useSupplierChangeRequests,
  useCreateChangeRequest,
} from "@/hooks/useSupplierPortal";
import {
  SUPPLIER_STATUS_LABEL,
  SUPPLIER_STATUS_BADGE,
  SUPPLIER_CATEGORIES,
  SUPPLIER_PORTES,
  SUPPLIER_TIPOS,
  SUPPLIER_REGIMES,
  CRITICAL_SUPPLIER_FIELDS,
  type SupplierStatus,
} from "@/lib/supplierLabels";
import { format } from "date-fns";

export default function PortalMeuCadastro() {
  const { data: supplier, isLoading } = useMySupplier();
  const { data: banks = [] } = useSupplierBankAccounts();
  const { data: changes = [] } = useSupplierChangeRequests();
  const update = useUpdateMySupplier();
  const createChange = useCreateChangeRequest();
  const { toast } = useToast();
  const [draft, setDraft] = useState<Record<string, any>>({});

  if (isLoading || !supplier) {
    return <div className="text-center py-10 text-muted-foreground">Carregando cadastro…</div>;
  }

  const status = (supplier.status ?? "rascunho") as SupplierStatus;
  const setField = (k: string, v: any) => setDraft((d) => ({ ...d, [k]: v }));
  const get = (k: string) => (draft[k] !== undefined ? draft[k] : (supplier as any)[k] ?? "");

  const saveSimple = async () => {
    // separar campos simples (direto) dos críticos (solicitar alteração)
    const simple: Record<string, any> = {};
    const critical: Array<{ campo: string; valor_antigo: any; valor_novo: any }> = [];
    for (const [k, v] of Object.entries(draft)) {
      if (CRITICAL_SUPPLIER_FIELDS.has(k)) {
        critical.push({ campo: k, valor_antigo: (supplier as any)[k] ?? null, valor_novo: v });
      } else {
        simple[k] = v;
      }
    }
    try {
      if (Object.keys(simple).length) await update.mutateAsync(simple);
      for (const c of critical) await createChange.mutateAsync(c);
      toast({
        title: "Atualizado",
        description: critical.length
          ? `${Object.keys(simple).length} campo(s) salvo(s) e ${critical.length} solicitação(ões) enviada(s) para aprovação.`
          : "Alterações salvas.",
      });
      setDraft({});
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-2xl font-bold">Meu cadastro</h1>
        <p className="text-sm text-muted-foreground">
          Consulte e mantenha atualizadas as informações da sua empresa. Algumas alterações podem depender de aprovação da UNIG.
        </p>
      </header>

      {/* Status card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> Status do fornecedor
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={SUPPLIER_STATUS_BADGE[status]}>
                  {SUPPLIER_STATUS_LABEL[status]}
                </Badge>
                {supplier.updated_at && (
                  <span className="text-xs text-muted-foreground">
                    Última atualização: {format(new Date(supplier.updated_at), "dd/MM/yyyy HH:mm")}
                  </span>
                )}
              </div>
              {supplier.status_observacao && (
                <p className="text-sm text-orange-700 mt-2">{supplier.status_observacao}</p>
              )}
            </div>
            {status === "aprovado" && (
              <Button variant="outline" disabled>
                Solicitar alteração (use os campos abaixo)
              </Button>
            )}
          </div>
          {changes.filter((c: any) => c.status === "pendente").length > 0 && (
            <Alert className="mt-4 border-blue-200 bg-blue-50">
              <AlertCircle className="h-4 w-4 text-blue-700" />
              <AlertTitle className="text-blue-900">Solicitações pendentes</AlertTitle>
              <AlertDescription className="text-blue-800">
                {changes.filter((c: any) => c.status === "pendente").length} alteração(ões) aguardando análise da UNIG.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Accordion type="multiple" defaultValue={["empresa", "endereco", "contatos"]} className="space-y-3">
        {/* DADOS DA EMPRESA */}
        <AccordionItem value="empresa" className="border rounded-lg bg-card px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2 text-base font-semibold">
              <Building2 className="h-4 w-4 text-primary" /> Dados da empresa
            </span>
          </AccordionTrigger>
          <AccordionContent className="grid md:grid-cols-2 gap-4 pt-2">
            <Field label="Razão Social" critical><Input value={get("razao_social")} onChange={(e) => setField("razao_social", e.target.value)} /></Field>
            <Field label="Nome Fantasia"><Input value={get("nome_fantasia")} onChange={(e) => setField("nome_fantasia", e.target.value)} /></Field>
            <Field label="CNPJ" critical><Input value={get("cnpj")} onChange={(e) => setField("cnpj", e.target.value)} /></Field>
            <Field label="Inscrição Estadual"><Input value={get("inscricao_estadual")} onChange={(e) => setField("inscricao_estadual", e.target.value)} /></Field>
            <Field label="Inscrição Municipal"><Input value={get("inscricao_municipal")} onChange={(e) => setField("inscricao_municipal", e.target.value)} /></Field>
            <Field label="Tipo de fornecedor">
              <Select value={get("tipo_fornecedor") || ""} onValueChange={(v) => setField("tipo_fornecedor", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{SUPPLIER_TIPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Porte">
              <Select value={get("porte") || ""} onValueChange={(v) => setField("porte", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{SUPPLIER_PORTES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Regime tributário">
              <Select value={get("regime_tributario") || ""} onValueChange={(v) => setField("regime_tributario", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{SUPPLIER_REGIMES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Site"><Input value={get("site")} onChange={(e) => setField("site", e.target.value)} /></Field>
          </AccordionContent>
        </AccordionItem>

        {/* ENDEREÇO */}
        <AccordionItem value="endereco" className="border rounded-lg bg-card px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2 text-base font-semibold">
              <MapPin className="h-4 w-4 text-primary" /> Endereço
            </span>
          </AccordionTrigger>
          <AccordionContent className="grid md:grid-cols-3 gap-4 pt-2">
            <Field label="CEP" critical><Input value={get("cep")} onChange={(e) => setField("cep", e.target.value)} /></Field>
            <Field label="Logradouro" critical><Input className="md:col-span-2" value={get("logradouro")} onChange={(e) => setField("logradouro", e.target.value)} /></Field>
            <Field label="Número" critical><Input value={get("numero")} onChange={(e) => setField("numero", e.target.value)} /></Field>
            <Field label="Complemento"><Input value={get("complemento")} onChange={(e) => setField("complemento", e.target.value)} /></Field>
            <Field label="Bairro" critical><Input value={get("bairro")} onChange={(e) => setField("bairro", e.target.value)} /></Field>
            <Field label="Cidade" critical><Input value={get("cidade")} onChange={(e) => setField("cidade", e.target.value)} /></Field>
            <Field label="UF" critical><Input value={get("uf")} onChange={(e) => setField("uf", e.target.value)} /></Field>
            <Field label="País"><Input value={get("pais") || "Brasil"} onChange={(e) => setField("pais", e.target.value)} /></Field>
          </AccordionContent>
        </AccordionItem>

        {/* CONTATOS */}
        <AccordionItem value="contatos" className="border rounded-lg bg-card px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2 text-base font-semibold">
              <Phone className="h-4 w-4 text-primary" /> Contatos
            </span>
          </AccordionTrigger>
          <AccordionContent className="grid md:grid-cols-2 gap-4 pt-2">
            <Field label="Responsável comercial"><Input value={get("responsavel_comercial")} onChange={(e) => setField("responsavel_comercial", e.target.value)} /></Field>
            <Field label="Cargo do responsável comercial"><Input value={get("cargo_comercial")} onChange={(e) => setField("cargo_comercial", e.target.value)} /></Field>
            <Field label="Telefone / WhatsApp comercial"><Input value={get("telefone_comercial")} onChange={(e) => setField("telefone_comercial", e.target.value)} /></Field>
            <Field label="E-mail comercial"><Input value={get("email_comercial")} onChange={(e) => setField("email_comercial", e.target.value)} /></Field>
            <Field label="Responsável financeiro"><Input value={get("responsavel_financeiro")} onChange={(e) => setField("responsavel_financeiro", e.target.value)} /></Field>
            <Field label="Telefone financeiro"><Input value={get("telefone_financeiro")} onChange={(e) => setField("telefone_financeiro", e.target.value)} /></Field>
            <Field label="E-mail financeiro"><Input value={get("email_financeiro")} onChange={(e) => setField("email_financeiro", e.target.value)} /></Field>
            <Field label="Responsável técnico"><Input value={get("responsavel_tecnico")} onChange={(e) => setField("responsavel_tecnico", e.target.value)} /></Field>
            <Field label="Telefone técnico"><Input value={get("telefone_tecnico")} onChange={(e) => setField("telefone_tecnico", e.target.value)} /></Field>
            <Field label="E-mail técnico"><Input value={get("email_tecnico")} onChange={(e) => setField("email_tecnico", e.target.value)} /></Field>
          </AccordionContent>
        </AccordionItem>

        {/* BANCARIOS */}
        <AccordionItem value="bancarios" className="border rounded-lg bg-card px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2 text-base font-semibold">
              <Landmark className="h-4 w-4 text-primary" /> Dados bancários
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pt-2">
            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-700" />
              <AlertDescription className="text-amber-800">
                Alterações em dados bancários passam por nova validação interna da UNIG antes de serem aprovadas.
              </AlertDescription>
            </Alert>
            {banks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma conta bancária cadastrada.</p>
            ) : banks.map((b: any) => (
              <Card key={b.id} className="border-muted">
                <CardContent className="p-4 grid md:grid-cols-4 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Banco:</span> {b.banco}</div>
                  <div><span className="text-muted-foreground">Agência:</span> {b.agencia}</div>
                  <div><span className="text-muted-foreground">Conta:</span> {b.conta}</div>
                  <div><span className="text-muted-foreground">Tipo:</span> {b.tipo_conta || "—"}</div>
                  <div className="md:col-span-2"><span className="text-muted-foreground">Titular:</span> {b.titular}</div>
                  <div className="md:col-span-2"><span className="text-muted-foreground">PIX:</span> {b.chave_pix || "—"}</div>
                </CardContent>
              </Card>
            ))}
          </AccordionContent>
        </AccordionItem>

        {/* CATEGORIAS */}
        <AccordionItem value="categorias" className="border rounded-lg bg-card px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2 text-base font-semibold">
              <Tags className="h-4 w-4 text-primary" /> Categorias de fornecimento
            </span>
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <p className="text-xs text-muted-foreground mb-2">Alterações em categorias precisam de aprovação interna.</p>
            <div className="flex flex-wrap gap-2">
              {SUPPLIER_CATEGORIES.map((cat) => {
                const selected = (get("categorias") || []).includes(cat);
                return (
                  <Badge
                    key={cat}
                    variant={selected ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      const current: string[] = get("categorias") || [];
                      setField(
                        "categorias",
                        selected ? current.filter((c) => c !== cat) : [...current, cat]
                      );
                    }}
                  >
                    {cat}
                  </Badge>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="flex items-center justify-end gap-3 sticky bottom-4 bg-background/80 backdrop-blur p-3 rounded-lg border shadow-sm">
        <span className="text-xs text-muted-foreground mr-auto">
          {Object.keys(draft).length > 0 ? `${Object.keys(draft).length} campo(s) alterado(s)` : "Nada alterado"}
        </span>
        <Button variant="ghost" onClick={() => setDraft({})} disabled={!Object.keys(draft).length}>
          Descartar
        </Button>
        <Button onClick={saveSimple} disabled={!Object.keys(draft).length || update.isPending}>
          <Save className="h-4 w-4 mr-2" /> Salvar alterações
        </Button>
      </div>
    </div>
  );
}

function Field({ label, critical, children }: { label: string; critical?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs flex items-center gap-1">
        {label}
        {critical && <span className="text-amber-600" title="Alteração requer aprovação">★</span>}
      </Label>
      {children}
    </div>
  );
}
