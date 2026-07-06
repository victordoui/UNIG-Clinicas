import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFiscalSettings, useUpsertFiscalSettings } from "@/hooks/useFiscal";
import { Receipt } from "lucide-react";

export default function ConfiguracaoFiscal() {
  const { data: settings, isLoading } = useFiscalSettings();
  const upsert = useUpsertFiscalSettings();
  const [form, setForm] = useState<any>({
    cnpj: "",
    razao_social: "",
    nome_fantasia: "",
    inscricao_estadual: "",
    inscricao_municipal: "",
    regime_tributario: "simples_nacional",
    ambiente: "homologacao",
    serie_nfe: 1,
    proximo_numero_nfe: 1,
    serie_nfce: 1,
    proximo_numero_nfce: 1,
  });

  useEffect(() => {
    if (settings) setForm({ ...form, ...settings });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const set = (k: string) => (v: any) => setForm((f: any) => ({ ...f, [k]: v?.target?.value ?? v }));

  return (
    <MainLayout>
      <div className="container max-w-4xl py-6 animate-fade-in">
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-1"><Receipt className="h-6 w-6 text-primary" /> Configuração Fiscal</h1>
        <p className="text-muted-foreground mb-6">
          Dados do emitente, regime tributário, série e ambiente para emissão de NF-e e NFC-e.
        </p>

        <Card>
          <CardHeader><CardTitle>Identificação</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>CNPJ</Label><Input value={form.cnpj} onChange={set("cnpj")} placeholder="00.000.000/0000-00" /></div>
            <div><Label>Razão Social</Label><Input value={form.razao_social} onChange={set("razao_social")} /></div>
            <div><Label>Nome Fantasia</Label><Input value={form.nome_fantasia ?? ""} onChange={set("nome_fantasia")} /></div>
            <div><Label>Inscrição Estadual</Label><Input value={form.inscricao_estadual ?? ""} onChange={set("inscricao_estadual")} /></div>
            <div><Label>Inscrição Municipal</Label><Input value={form.inscricao_municipal ?? ""} onChange={set("inscricao_municipal")} /></div>
            <div>
              <Label>Regime Tributário</Label>
              <Select value={form.regime_tributario} onValueChange={set("regime_tributario")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="simples_nacional">Simples Nacional</SelectItem>
                  <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
                  <SelectItem value="lucro_real">Lucro Real</SelectItem>
                  <SelectItem value="mei">MEI</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader><CardTitle>Emissão</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Ambiente</Label>
              <Select value={form.ambiente} onValueChange={set("ambiente")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="homologacao">Homologação (testes)</SelectItem>
                  <SelectItem value="producao">Produção</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div />
            <div><Label>Série NF-e</Label><Input type="number" value={form.serie_nfe} onChange={set("serie_nfe")} /></div>
            <div><Label>Próximo Nº NF-e</Label><Input type="number" value={form.proximo_numero_nfe} onChange={set("proximo_numero_nfe")} /></div>
            <div><Label>Série NFC-e</Label><Input type="number" value={form.serie_nfce} onChange={set("serie_nfce")} /></div>
            <div><Label>Próximo Nº NFC-e</Label><Input type="number" value={form.proximo_numero_nfce} onChange={set("proximo_numero_nfce")} /></div>
            <div><Label>CSC ID (NFC-e)</Label><Input value={form.csc_id ?? ""} onChange={set("csc_id")} /></div>
            <div><Label>CSC Token (NFC-e)</Label><Input value={form.csc_token ?? ""} onChange={set("csc_token")} type="password" /></div>
          </CardContent>
        </Card>

        <div className="mt-4 p-4 rounded-lg border border-dashed text-sm text-muted-foreground">
          <strong>Certificado A1 e Token Focus NFe:</strong> a integração com o provedor (Focus NFe) requer
          o token de API armazenado como secret do projeto e o certificado digital A1 enviado ao provedor.
          Após salvar estas configurações, peça ao admin para cadastrar os secrets <code>FOCUS_NFE_TOKEN_HOMOLOG</code> e
          <code> FOCUS_NFE_TOKEN_PROD</code> em Lovable Cloud.
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={() => upsert.mutate(form)} disabled={upsert.isPending || isLoading}>
            {upsert.isPending ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
