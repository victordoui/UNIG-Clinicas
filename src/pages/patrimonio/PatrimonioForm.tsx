import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, ArrowLeft, Save } from "lucide-react";
import { useAsset, useSaveAsset, useAssetCategories, useAssetTypes } from "@/hooks/useAssets";
import { CategoryTypeSelector } from "@/components/shared/CategoryTypeSelector";
import { AssetLocationSelector } from "@/components/patrimonio/AssetLocationSelector";
import { STATUS_OPTIONS, CONDITION_OPTIONS } from "@/components/patrimonio/AssetStatusBadge";

export default function PatrimonioForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const isEdit = !!id;
  const { data: existing } = useAsset(id);
  const save = useSaveAsset();
  const { data: cats = [] } = useAssetCategories();

  const [form, setForm] = useState<any>({
    asset_number: "",
    internal_code: "",
    name: "",
    description: "",
    category_id: null,
    type_id: null,
    unit_id: null,
    building_id: null,
    sector_id: null,
    subspace_id: null,
    specific_location: "",
    brand: "",
    model: "",
    serial_number: "",
    color: "",
    material: "",
    status: "ativo",
    physical_condition: "bom",
    acquisition_date: "",
    acquisition_value: "",
    invoice_number: "",
    warranty_until: "",
    has_preventive_maintenance: false,
    preventive_frequency: "",
    notes: "",
  });
  const { data: types = [] } = useAssetTypes(form.category_id);

  useEffect(() => {
    if (existing) setForm((f: any) => ({ ...f, ...existing }));
  }, [existing]);

  const upd = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.asset_number || !form.name || !form.unit_id) {
      alert("Preencha Nº Patrimônio, Nome e Unidade.");
      return;
    }
    const payload: any = { ...form };
    if (payload.acquisition_value === "") payload.acquisition_value = null;
    if (payload.acquisition_date === "") payload.acquisition_date = null;
    if (payload.warranty_until === "") payload.warranty_until = null;
    if (isEdit) payload.id = id;
    const saved = await save.mutateAsync(payload);
    nav(`/patrimonio/${saved.id}`);
  };

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto space-y-4 p-4 md:p-6">
        <PageHeader
          icon={Package}
          title={isEdit ? "Editar Patrimônio" : "Novo Patrimônio"}
          description="Preencha os dados organizados por seções."
          actions={<Button variant="outline" onClick={() => nav(-1)}><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Button>}
        />
        <form onSubmit={submit}>
          <Card className="p-4 md:p-6">
            <Tabs defaultValue="ident">
              <TabsList className="flex flex-wrap h-auto">
                <TabsTrigger value="ident">Identificação</TabsTrigger>
                <TabsTrigger value="class">Classificação</TabsTrigger>
                <TabsTrigger value="local">Localização</TabsTrigger>
                <TabsTrigger value="resp">Responsabilidade</TabsTrigger>
                <TabsTrigger value="aquis">Aquisição</TabsTrigger>
                <TabsTrigger value="estado">Estado</TabsTrigger>
                <TabsTrigger value="manut">Manutenção</TabsTrigger>
              </TabsList>

              <TabsContent value="ident" className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <div className="space-y-2"><Label>Nº Patrimônio / Tombamento *</Label>
                  <Input value={form.asset_number} onChange={(e) => upd("asset_number", e.target.value)} required /></div>
                <div className="space-y-2"><Label>Código interno</Label>
                  <Input value={form.internal_code ?? ""} onChange={(e) => upd("internal_code", e.target.value)} /></div>
                <div className="md:col-span-2 space-y-2"><Label>Nome do bem *</Label>
                  <Input value={form.name} onChange={(e) => upd("name", e.target.value)} required /></div>
                <div className="md:col-span-2 space-y-2"><Label>Descrição detalhada</Label>
                  <Textarea rows={3} value={form.description ?? ""} onChange={(e) => upd("description", e.target.value)} /></div>
              </TabsContent>

              <TabsContent value="class" className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <div className="md:col-span-2">
                  <CategoryTypeSelector
                    categoryId={form.category_id}
                    typeId={form.type_id}
                    onChange={(v) => setForm((f: any) => ({ ...f, category_id: v.categoryId ?? null, type_id: v.typeId ?? null }))}
                  />
                </div>
                <div className="space-y-2"><Label>Marca</Label><Input value={form.brand ?? ""} onChange={(e) => upd("brand", e.target.value)} /></div>
                <div className="space-y-2"><Label>Modelo</Label><Input value={form.model ?? ""} onChange={(e) => upd("model", e.target.value)} /></div>
                <div className="space-y-2"><Label>Nº de série</Label><Input value={form.serial_number ?? ""} onChange={(e) => upd("serial_number", e.target.value)} /></div>
                <div className="space-y-2"><Label>Cor</Label><Input value={form.color ?? ""} onChange={(e) => upd("color", e.target.value)} /></div>
                <div className="space-y-2"><Label>Material</Label><Input value={form.material ?? ""} onChange={(e) => upd("material", e.target.value)} /></div>
              </TabsContent>


              <TabsContent value="local" className="space-y-4 pt-4">
                <AssetLocationSelector
                  unitId={form.unit_id}
                  buildingId={form.building_id}
                  sectorId={form.sector_id}
                  subspaceId={form.subspace_id}
                  onChange={(v) => setForm((f: any) => ({ ...f, ...v }))}
                />
                <div className="space-y-2"><Label>Observação de localização</Label>
                  <Input value={form.specific_location ?? ""} onChange={(e) => upd("specific_location", e.target.value)} /></div>
              </TabsContent>

              <TabsContent value="resp" className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <div className="space-y-2"><Label>Equipe responsável</Label>
                  <Input value={form.responsible_team ?? ""} onChange={(e) => upd("responsible_team", e.target.value)} /></div>
                <div className="text-sm text-muted-foreground md:col-span-2">
                  Vincule colaboradores e centro de custo diretamente na página de detalhes após o cadastro inicial.
                </div>
              </TabsContent>

              <TabsContent value="aquis" className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <div className="space-y-2"><Label>Data de aquisição</Label>
                  <Input type="date" value={form.acquisition_date ?? ""} onChange={(e) => upd("acquisition_date", e.target.value)} /></div>
                <div className="space-y-2"><Label>Valor de aquisição (R$)</Label>
                  <Input type="number" step="0.01" value={form.acquisition_value ?? ""} onChange={(e) => upd("acquisition_value", e.target.value)} /></div>
                <div className="space-y-2"><Label>Nota fiscal</Label>
                  <Input value={form.invoice_number ?? ""} onChange={(e) => upd("invoice_number", e.target.value)} /></div>
                <div className="space-y-2"><Label>Garantia até</Label>
                  <Input type="date" value={form.warranty_until ?? ""} onChange={(e) => upd("warranty_until", e.target.value)} /></div>
              </TabsContent>

              <TabsContent value="estado" className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <div className="space-y-2"><Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => upd("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Condição física</Label>
                  <Select value={form.physical_condition} onValueChange={(v) => upd("physical_condition", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CONDITION_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2 space-y-2"><Label>Observações</Label>
                  <Textarea rows={3} value={form.notes ?? ""} onChange={(e) => upd("notes", e.target.value)} /></div>
              </TabsContent>

              <TabsContent value="manut" className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <div className="md:col-span-2 flex items-center gap-3">
                  <Switch checked={!!form.has_preventive_maintenance} onCheckedChange={(v) => upd("has_preventive_maintenance", v)} />
                  <Label>Possui manutenção preventiva</Label>
                </div>
                <div className="space-y-2"><Label>Periodicidade</Label>
                  <Input placeholder="Mensal, Trimestral, Anual…" value={form.preventive_frequency ?? ""} onChange={(e) => upd("preventive_frequency", e.target.value)} /></div>
              </TabsContent>
            </Tabs>

            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => nav(-1)}>Cancelar</Button>
              <Button type="submit" disabled={save.isPending} className="gap-2">
                <Save className="h-4 w-4" /> {save.isPending ? "Salvando…" : "Salvar patrimônio"}
              </Button>
            </div>
          </Card>
        </form>
      </div>
    </MainLayout>
  );
}
