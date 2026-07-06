import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useCreatePurchaseReturn } from "@/hooks/useFiscal";

export default function CompraDevolucao() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [productId, setProductId] = useState<string>("");
  const [quantidade, setQuantidade] = useState<number>(0);
  const [whId, setWhId] = useState<string>("");
  const [motivo, setMotivo] = useState("");
  const [valorUnitario, setValorUnitario] = useState<number>(0);
  const { data: warehouses } = useWarehouses();
  const create = useCreatePurchaseReturn();

  useEffect(() => {
    (async () => {
      const { data: o } = await supabase
        .from("purchase_orders")
        .select("*, suppliers(razao_social, nome_fantasia), purchase_requests(item_descricao)")
        .eq("id", id!)
        .maybeSingle();
      setOrder(o);
      if (o) {
        setQuantidade(Number(o.quantidade));
        setValorUnitario(Number(o.valor_total) / Math.max(1, Number(o.quantidade)));
      }
      const { data: prods } = await supabase.from("products").select("id, name, sku").order("name");
      setProducts(prods ?? []);
    })();
  }, [id]);

  const handleSubmit = async () => {
    if (!order || !productId || !quantidade || !motivo) return;
    await create.mutateAsync({
      purchase_order_id: id!,
      motivo,
      items: [
        {
          product_id: productId,
          quantidade,
          valor_unitario: valorUnitario,
          warehouse_id: whId || null,
          motivo_item: motivo,
        },
      ],
    });
    navigate("/fiscal/devolucoes");
  };

  if (!order) return <MainLayout><div className="p-6">Carregando...</div></MainLayout>;

  return (
    <MainLayout>
      <div className="container py-6 animate-fade-in space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Devolução do pedido {order.numero}</h1>
          <p className="text-muted-foreground">
            Fornecedor: {order.suppliers?.nome_fantasia ?? order.suppliers?.razao_social} ·{" "}
            Item: {order.purchase_requests?.item_descricao}
          </p>
        </div>

        <Card>
          <CardHeader><CardTitle>Item a devolver</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Produto correspondente</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger><SelectValue placeholder="Selecione o produto do estoque" /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Quantidade a devolver</Label>
                <Input type="number" min={0} max={Number(order.quantidade)} value={quantidade}
                  onChange={(e) => setQuantidade(Number(e.target.value))} />
              </div>
              <div>
                <Label>Valor unitário (R$)</Label>
                <Input type="number" step="0.01" value={valorUnitario}
                  onChange={(e) => setValorUnitario(Number(e.target.value))} />
              </div>
              <div>
                <Label>Local de origem</Label>
                <Select value={whId} onValueChange={setWhId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {(warehouses ?? []).map((w: any) => <SelectItem key={w.id} value={w.id}>{w.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Motivo</CardTitle></CardHeader>
          <CardContent>
            <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} placeholder="Avaria, divergência, recusa..." />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={create.isPending || !productId || !quantidade || !motivo}>
            {create.isPending ? "Salvando..." : "Criar devolução"}
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
