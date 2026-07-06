import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useProductFiscalData, useUpsertProductFiscalData } from "@/hooks/useFiscal";

export function ProductFiscalDialog({
  productId,
  open,
  onOpenChange,
}: {
  productId?: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data } = useProductFiscalData(productId);
  const upsert = useUpsertProductFiscalData();
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    setForm(data ?? { origem: "0", icms_aliquota: 0, pis_aliquota: 0, cofins_aliquota: 0 });
  }, [data, productId]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!productId) return;
    if (form.ncm && !/^\d{8}$/.test(String(form.ncm))) {
      alert("NCM deve ter 8 dígitos");
      return;
    }
    await upsert.mutateAsync({ ...form, product_id: productId });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Dados fiscais do produto</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>NCM</Label><Input maxLength={8} value={form.ncm ?? ""} onChange={(e) => set("ncm", e.target.value.replace(/\D/g, ""))} /></div>
          <div><Label>CEST</Label><Input value={form.cest ?? ""} onChange={(e) => set("cest", e.target.value)} /></div>
          <div><Label>CFOP padrão</Label><Input value={form.cfop_padrao ?? ""} onChange={(e) => set("cfop_padrao", e.target.value)} placeholder="5102" /></div>
          <div><Label>Origem (0–8)</Label><Input value={form.origem ?? "0"} onChange={(e) => set("origem", e.target.value)} /></div>
          <div><Label>Unidade tributável</Label><Input value={form.unidade_tributavel ?? ""} onChange={(e) => set("unidade_tributavel", e.target.value)} placeholder="UN" /></div>
          <div></div>
          <div><Label>ICMS CST</Label><Input value={form.icms_cst ?? ""} onChange={(e) => set("icms_cst", e.target.value)} /></div>
          <div><Label>ICMS Alíquota %</Label><Input type="number" step="0.01" value={form.icms_aliquota ?? 0} onChange={(e) => set("icms_aliquota", Number(e.target.value))} /></div>
          <div><Label>PIS CST</Label><Input value={form.pis_cst ?? ""} onChange={(e) => set("pis_cst", e.target.value)} /></div>
          <div><Label>PIS Alíquota %</Label><Input type="number" step="0.01" value={form.pis_aliquota ?? 0} onChange={(e) => set("pis_aliquota", Number(e.target.value))} /></div>
          <div><Label>COFINS CST</Label><Input value={form.cofins_cst ?? ""} onChange={(e) => set("cofins_cst", e.target.value)} /></div>
          <div><Label>COFINS Alíquota %</Label><Input type="number" step="0.01" value={form.cofins_aliquota ?? 0} onChange={(e) => set("cofins_aliquota", Number(e.target.value))} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={upsert.isPending}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
