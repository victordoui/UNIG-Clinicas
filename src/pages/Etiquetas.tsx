import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";
import QRCode from "qrcode";
import { Printer, Tag } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "sonner";

export default function Etiquetas() {
  const [busca, setBusca] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [largura, setLargura] = useState(50);
  const [altura, setAltura] = useState(30);
  const [copias, setCopias] = useState(1);
  const [generating, setGenerating] = useState(false);

  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ["produtos_etiquetas", busca],
    queryFn: async () => {
      let q = supabase.from("products").select("id, name, sku, current_stock").order("name").limit(100);
      if (busca.trim()) q = q.or(`name.ilike.%${busca}%,sku.ilike.%${busca}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const selectedIds = Object.keys(selected).filter((k) => selected[k]);
  const selectedProducts = produtos.filter((p: any) => selected[p.id]);

  const handleGerar = async () => {
    if (selectedProducts.length === 0) return toast.error("Selecione ao menos um produto");
    setGenerating(true);
    try {
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: [largura, altura] });
      let first = true;
      for (const p of selectedProducts) {
        for (let i = 0; i < copias; i++) {
          if (!first) pdf.addPage([largura, altura], "landscape");
          first = false;

          const qrSize = Math.min(altura - 6, 22);
          const qrDataUrl = await QRCode.toDataURL(p.sku || p.id, { margin: 0, width: 256 });
          pdf.addImage(qrDataUrl, "PNG", 2, (altura - qrSize) / 2, qrSize, qrSize);

          const textX = qrSize + 4;
          const maxWidth = largura - textX - 2;
          pdf.setFontSize(9);
          pdf.setFont("helvetica", "bold");
          const nameLines = pdf.splitTextToSize(p.name, maxWidth);
          pdf.text(nameLines.slice(0, 2), textX, 6);

          pdf.setFontSize(7);
          pdf.setFont("helvetica", "normal");
          pdf.text(`SKU: ${p.sku ?? "—"}`, textX, altura - 6);
          pdf.text(`Estoque: ${p.current_stock}`, textX, altura - 2);
        }
      }
      pdf.save(`etiquetas-${Date.now()}.pdf`);
      toast.success(`${selectedProducts.length * copias} etiqueta(s) gerada(s)`);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao gerar PDF");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Tag className="h-6 w-6 text-primary" /> Etiquetas</h1>
          <p className="text-muted-foreground mt-1">Gere etiquetas com QR Code para impressão térmica ou A4</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-base">Selecionar produtos</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou SKU..." />
              <div className="border rounded-md max-h-96 overflow-auto">
                {isLoading ? (
                  <div className="p-3 text-sm text-muted-foreground">Carregando...</div>
                ) : produtos.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground">Nenhum produto.</div>
                ) : produtos.map((p: any) => (
                  <label key={p.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted cursor-pointer border-b last:border-0">
                    <Checkbox checked={!!selected[p.id]} onCheckedChange={(v) => setSelected((s) => ({ ...s, [p.id]: !!v }))} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{p.name}</div>
                      <div className="text-xs text-muted-foreground">SKU: {p.sku} · Estoque: {p.current_stock}</div>
                    </div>
                  </label>
                ))}
              </div>
              <div className="text-sm text-muted-foreground">{selectedIds.length} selecionado(s)</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Tag className="h-4 w-4" /> Configuração</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Largura (mm)</Label>
                <Input type="number" value={largura} onChange={(e) => setLargura(Number(e.target.value) || 0)} />
              </div>
              <div>
                <Label>Altura (mm)</Label>
                <Input type="number" value={altura} onChange={(e) => setAltura(Number(e.target.value) || 0)} />
              </div>
              <div>
                <Label>Cópias por produto</Label>
                <Input type="number" min={1} value={copias} onChange={(e) => setCopias(Math.max(1, Number(e.target.value) || 1))} />
              </div>
              <LoadingButton loading={generating} onClick={handleGerar} className="w-full">
                <Printer className="h-4 w-4 mr-2" /> Gerar PDF
              </LoadingButton>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
