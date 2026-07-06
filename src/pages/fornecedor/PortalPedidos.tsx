import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, FileCheck, Eye } from "lucide-react";

export default function PortalPedidos() {
  const { supplierLink } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [nfNum, setNfNum] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!supplierLink) return;
    setLoading(true);
    const { data } = await supabase
      .from("purchase_orders")
      .select("*, purchase_requests(numero, item_descricao)")
      .eq("supplier_id", supplierLink.supplier_id)
      .order("created_at", { ascending: false });
    setOrders(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [supplierLink]);

  const openUpload = (o: any) => {
    setSelected(o);
    setNfNum(o.nota_fiscal_numero ?? "");
    setFile(null);
  };

  const submit = async () => {
    if (!selected || !supplierLink) return;
    setSaving(true);
    try {
      let path = selected.nota_fiscal_path;
      if (file) {
        const ext = file.name.split(".").pop();
        path = `${supplierLink.supplier_id}/${selected.id}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("fiscal-documents").upload(path, file, { upsert: true });
        if (upErr) throw upErr;
      }
      const { error } = await supabase
        .from("purchase_orders")
        .update({
          nota_fiscal_numero: nfNum || null,
          nota_fiscal_path: path,
          nota_fiscal_uploaded_at: new Date().toISOString(),
        })
        .eq("id", selected.id)
        .select();
      if (error) throw error;
      toast({ title: "Nota fiscal enviada" });
      setSelected(null);
      load();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <p className="text-muted-foreground text-sm">Pedidos de compra recebidos e envio de notas fiscais.</p>
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : orders.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhum pedido recebido.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {orders.map((o) => (
            <Card key={o.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{o.numero}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{o.purchase_requests?.item_descricao}</p>
                  </div>
                  <Badge variant={o.nota_fiscal_path ? "default" : "secondary"}>
                    {o.nota_fiscal_path ? <><FileCheck className="h-3 w-3 mr-1" /> NF enviada</> : "Aguardando NF"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="text-sm grid grid-cols-2 md:grid-cols-5 gap-3 items-center">
                <div><span className="text-muted-foreground">Qtd:</span> {o.quantidade}</div>
                <div><span className="text-muted-foreground">Total:</span> R$ {Number(o.valor_total ?? 0).toFixed(2)}</div>
                <div><span className="text-muted-foreground">Status:</span> {o.status}</div>
                <div className="text-right md:col-span-2 flex gap-2 justify-end">
                  <Link to={`/portal-fornecedor/pedidos/${o.id}`}>
                    <Button size="sm" variant="outline"><Eye className="h-4 w-4 mr-1" /> Ver esteira</Button>
                  </Link>
                  <Button size="sm" variant="outline" onClick={() => openUpload(o)}>
                    <Upload className="h-4 w-4 mr-1" /> {o.nota_fiscal_path ? "Atualizar NF" : "Enviar NF"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Enviar nota fiscal</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Número da NF</Label>
              <Input value={nfNum} onChange={(e) => setNfNum(e.target.value)} />
            </div>
            <div>
              <Label>Arquivo (PDF/XML)</Label>
              <Input ref={fileRef} type="file" accept=".pdf,.xml" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Cancelar</Button>
            <Button onClick={submit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
