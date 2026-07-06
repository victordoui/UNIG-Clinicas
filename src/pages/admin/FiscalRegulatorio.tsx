import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollText, Building2, ShieldAlert, FileBadge } from "lucide-react";
import { useFiscalSettings, useUpsertFiscalSettings } from "@/hooks/useFiscal";

function ConfiguracaoFiscalEmbed() {
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
    if (settings) setForm((f: any) => ({ ...f, ...settings }));
  }, [settings]);

  const set = (k: string) => (v: any) =>
    setForm((f: any) => ({ ...f, [k]: v?.target?.value ?? v }));

  return (
    <div className="space-y-4">
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

      <Card>
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

      <div className="flex justify-end">
        <Button onClick={() => upsert.mutate(form)} disabled={upsert.isPending || isLoading}>
          {upsert.isPending ? "Salvando..." : "Salvar Configurações Fiscais"}
        </Button>
      </div>
    </div>
  );
}

export default function FiscalRegulatorio() {
  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ScrollText className="h-6 w-6 text-primary" />
            Fiscal e Regulatório
          </h1>
          <p className="text-muted-foreground mt-1">
            Configuração fiscal, produtos controlados e órgãos reguladores.
          </p>
        </div>

        <Tabs defaultValue="fiscal">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="fiscal"><FileBadge className="h-4 w-4 mr-1.5" />Configuração Fiscal</TabsTrigger>
            <TabsTrigger value="orgaos"><Building2 className="h-4 w-4 mr-1.5" />Órgãos Reguladores</TabsTrigger>
            <TabsTrigger value="controlados"><ShieldAlert className="h-4 w-4 mr-1.5" />Produtos Controlados</TabsTrigger>
            <TabsTrigger value="naturezas">Naturezas Fiscais</TabsTrigger>
          </TabsList>

          <TabsContent value="fiscal" className="mt-4">
            <ConfiguracaoFiscalEmbed />
          </TabsContent>

          <TabsContent value="orgaos" className="mt-4">
            <Card>
              <CardHeader><CardTitle>Órgãos Reguladores</CardTitle></CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2">
                  <li>• <strong>Polícia Federal</strong> — produtos químicos controlados</li>
                  <li>• <strong>Receita Federal</strong> — emissão e validação fiscal</li>
                  <li>• <strong>Exército</strong> — produtos de uso controlado</li>
                  <li>• <strong>ANVISA</strong> — saneantes, cosméticos, saúde</li>
                  <li>• <strong>IBAMA</strong> — produtos com impacto ambiental</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="controlados" className="mt-4">
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Em breve: cadastro de produtos controlados e validações regulatórias automáticas.
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="naturezas" className="mt-4">
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Em breve: cadastro de naturezas fiscais (CFOP, CST, NCM padrão).
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
