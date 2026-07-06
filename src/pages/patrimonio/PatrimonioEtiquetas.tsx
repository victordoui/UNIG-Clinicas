import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tag, Printer } from "lucide-react";
import { useAssets } from "@/hooks/useAssets";
import { AssetQRCode } from "@/components/patrimonio/AssetQRCode";

export default function PatrimonioEtiquetas() {
  const { data: assets = [] } = useAssets();
  const [sel, setSel] = useState<Set<string>>(new Set());
  const toggle = (id: string) => {
    const s = new Set(sel); s.has(id) ? s.delete(id) : s.add(id); setSel(s);
  };
  const selected = assets.filter((a) => sel.has(a.id));

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-4">
        <PageHeader icon={Tag} title="Etiquetas e QR Codes"
          description="Selecione os patrimônios e imprima etiquetas com QR Code."
          actions={<Button disabled={selected.length === 0} onClick={() => window.print()} className="gap-2"><Printer className="h-4 w-4" />Imprimir ({selected.length})</Button>}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 print:hidden">
          <Card className="lg:col-span-1 p-4 max-h-[70vh] overflow-y-auto">
            <p className="text-sm font-semibold mb-2">Patrimônios ({assets.length})</p>
            <div className="space-y-1">
              {assets.map((a) => (
                <label key={a.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer">
                  <Checkbox checked={sel.has(a.id)} onCheckedChange={() => toggle(a.id)} />
                  <div className="text-xs">
                    <p className="font-mono">{a.asset_number}</p>
                    <p className="text-muted-foreground">{a.name}</p>
                  </div>
                </label>
              ))}
            </div>
          </Card>
          <Card className="lg:col-span-2 p-4">
            <p className="text-sm text-muted-foreground mb-3">Preview de impressão ({selected.length} etiquetas)</p>
            <div className="grid grid-cols-3 gap-2">
              {selected.map((a) => <AssetQRCode key={a.id} qrCode={a.qr_code} assetNumber={a.asset_number} name={a.name} size={120} />)}
            </div>
          </Card>
        </div>

        <div className="hidden print:grid grid-cols-3 gap-2">
          {selected.map((a) => <AssetQRCode key={a.id} qrCode={a.qr_code} assetNumber={a.asset_number} name={a.name} size={140} />)}
        </div>
      </div>
    </MainLayout>
  );
}
