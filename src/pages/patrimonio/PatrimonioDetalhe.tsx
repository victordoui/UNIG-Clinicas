import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, ArrowLeft, Pencil, QrCode, Printer } from "lucide-react";
import { useAsset, useAssetMovements, useAssetMaintenance, useAssetDocuments } from "@/hooks/useAssets";
import { AssetStatusBadge, AssetConditionBadge } from "@/components/patrimonio/AssetStatusBadge";
import { AssetQRCode } from "@/components/patrimonio/AssetQRCode";
import { format } from "date-fns";

export default function PatrimonioDetalhe() {
  const { id } = useParams();
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const tab = sp.get("tab") ?? "geral";
  const { data: asset, isLoading } = useAsset(id);
  const { data: movements = [] } = useAssetMovements(id);
  const { data: maints = [] } = useAssetMaintenance(id);
  const { data: docs = [] } = useAssetDocuments(id);

  if (isLoading) return <MainLayout><div className="p-6">Carregando…</div></MainLayout>;
  if (!asset) return <MainLayout><div className="p-6">Patrimônio não encontrado.</div></MainLayout>;

  const Field = ({ label, value }: { label: string; value: any }) => (
    <div><p className="text-xs text-muted-foreground">{label}</p><p className="font-medium">{value || "—"}</p></div>
  );

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-4 p-4 md:p-6">
        <PageHeader
          icon={Package}
          title={asset.name}
          description={<span className="font-mono text-xs">Nº {asset.asset_number}</span>}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => nav("/patrimonio")}><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Button>
              <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" />Imprimir</Button>
              <Button onClick={() => nav(`/patrimonio/${id}/editar`)}><Pencil className="h-4 w-4 mr-2" />Editar</Button>
            </div>
          }
        />

        <div className="flex flex-wrap items-center gap-2">
          <AssetStatusBadge status={asset.status} />
          <AssetConditionBadge condition={asset.physical_condition} />
          {asset.category && <span className="text-sm text-muted-foreground">{asset.category.name}</span>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <Card className="p-4">
              <Tabs value={tab} onValueChange={(v) => setSp({ tab: v })}>
                <TabsList className="flex flex-wrap h-auto">
                  <TabsTrigger value="geral">Dados gerais</TabsTrigger>
                  <TabsTrigger value="local">Localização</TabsTrigger>
                  <TabsTrigger value="historico">Histórico</TabsTrigger>
                  <TabsTrigger value="manutencoes">Manutenções</TabsTrigger>
                  <TabsTrigger value="documentos">Documentos</TabsTrigger>
                  <TabsTrigger value="auditoria">Auditoria</TabsTrigger>
                </TabsList>

                <TabsContent value="geral" className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4">
                  <Field label="Nº Patrimônio" value={asset.asset_number} />
                  <Field label="Código interno" value={asset.internal_code} />
                  <Field label="Categoria" value={asset.category?.name} />
                  <Field label="Tipo" value={asset.type?.name} />
                  <Field label="Marca" value={asset.brand} />
                  <Field label="Modelo" value={asset.model} />
                  <Field label="Nº de série" value={asset.serial_number} />
                  <Field label="Cor" value={asset.color} />
                  <Field label="Material" value={asset.material} />
                  <Field label="Data de aquisição" value={asset.acquisition_date ? format(new Date(asset.acquisition_date), "dd/MM/yyyy") : "—"} />
                  <Field label="Valor de aquisição" value={asset.acquisition_value ? Number(asset.acquisition_value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"} />
                  <Field label="Nota fiscal" value={asset.invoice_number} />
                  <Field label="Garantia até" value={asset.warranty_until ? format(new Date(asset.warranty_until), "dd/MM/yyyy") : "—"} />
                  <div className="col-span-full"><Field label="Descrição" value={asset.description} /></div>
                  <div className="col-span-full"><Field label="Observações" value={asset.notes} /></div>
                </TabsContent>

                <TabsContent value="local" className="grid grid-cols-2 gap-4 pt-4">
                  <Field label="Unidade" value={asset.unit?.name} />
                  <Field label="Bloco" value={asset.building?.name} />
                  <Field label="Sala / Setor" value={asset.sector?.name} />
                  <Field label="Local específico" value={asset.subspace?.name} />
                  <div className="col-span-full"><Field label="Observação de localização" value={asset.specific_location} /></div>
                </TabsContent>

                <TabsContent value="historico" className="pt-4 space-y-3">
                  {movements.length === 0 ? <p className="text-sm text-muted-foreground">Sem movimentações registradas.</p> :
                    movements.map((m: any) => (
                      <Card key={m.id} className="p-3">
                        <p className="text-xs text-muted-foreground">{format(new Date(m.movement_date), "dd/MM/yyyy HH:mm")}</p>
                        <p className="text-sm font-medium">{m.movement_type ?? "movimentação"}</p>
                        {m.reason && <p className="text-xs">{m.reason}</p>}
                      </Card>
                    ))}
                </TabsContent>

                <TabsContent value="manutencoes" className="pt-4 space-y-3">
                  {maints.length === 0 ? <p className="text-sm text-muted-foreground">Sem manutenções registradas.</p> :
                    maints.map((m: any) => (
                      <Card key={m.id} className="p-3">
                        <div className="flex justify-between">
                          <p className="text-sm font-medium">{m.maintenance_type}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(m.maintenance_date), "dd/MM/yyyy")}</p>
                        </div>
                        {m.description && <p className="text-xs mt-1">{m.description}</p>}
                      </Card>
                    ))}
                </TabsContent>

                <TabsContent value="documentos" className="pt-4">
                  {docs.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum documento anexado.</p> :
                    <ul className="space-y-1">{docs.map((d: any) => <li key={d.id}><a href={d.file_url} target="_blank" rel="noreferrer" className="text-primary hover:underline text-sm">{d.file_name}</a></li>)}</ul>}
                </TabsContent>

                <TabsContent value="auditoria" className="pt-4 grid grid-cols-2 gap-4">
                  <Field label="Criado em" value={format(new Date(asset.created_at), "dd/MM/yyyy HH:mm")} />
                  <Field label="Última atualização" value={format(new Date(asset.updated_at), "dd/MM/yyyy HH:mm")} />
                </TabsContent>
              </Tabs>
            </Card>
          </div>

          <div className="space-y-4">
            <AssetQRCode qrCode={asset.qr_code} assetNumber={asset.asset_number} name={asset.name} />
            <Card className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Responsável</p>
              <p className="font-medium">{asset.responsible?.full_name ?? "—"}</p>
              {asset.responsible_team && <p className="text-xs mt-2 text-muted-foreground">Equipe: {asset.responsible_team}</p>}
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
