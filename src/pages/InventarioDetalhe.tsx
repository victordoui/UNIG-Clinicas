import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useInventorySession,
  useInventoryCounts,
  useAddInventoryCount,
  useCloseInventorySession,
} from "@/hooks/useInventorySessions";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { LoadingButton } from "@/components/ui/loading-button";
import { ArrowLeft, Lock, Search, ClipboardList } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function InventarioDetalhe() {
  const { id } = useParams();
  const { currentRole } = useAuth();
  const { data: session } = useInventorySession(id);
  const { data: counts = [] } = useInventoryCounts(id);
  const add = useAddInventoryCount(id!);
  const close = useCloseInventorySession();

  const [busca, setBusca] = useState("");
  const [contado, setContado] = useState("");

  const { data: produtos = [] } = useQuery({
    queryKey: ["products_search", busca],
    enabled: busca.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, sku, current_stock")
        .or(`name.ilike.%${busca}%,sku.ilike.%${busca}%`)
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const handleAdd = async () => {
    if (!selectedProduct) return toast.error("Selecione um produto");
    const qty = Number(contado);
    if (Number.isNaN(qty) || qty < 0) return toast.error("Quantidade inválida");
    await add.mutateAsync({
      product_id: selectedProduct.id,
      contado: qty,
      sistema: Number(selectedProduct.current_stock ?? 0),
    });
    setContado("");
    setSelectedProduct(null);
    setBusca("");
  };

  const totals = useMemo(() => {
    const div = counts.filter((c) => Number(c.divergencia) !== 0).length;
    return { total: counts.length, divergencias: div };
  }, [counts]);

  const isOpen = session?.status !== "fechada";
  const canClose = isOpen && (currentRole === "admin" || currentRole === "gerente");

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/inventario"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-primary" />
              <span>{session?.nome ?? "Sessão"}</span>
            </h1>
            <div className="text-sm text-muted-foreground">
              Tipo: <span className="capitalize">{session?.tipo}</span> · Status: <Badge variant="outline">{session?.status}</Badge>
            </div>
          </div>
          {canClose && (
            <LoadingButton
              loading={close.isPending}
              onClick={() => {
                if (confirm(`Fechar sessão? Isso aplicará ${totals.divergencias} ajuste(s) ao estoque.`)) {
                  close.mutate(id!);
                }
              }}
              variant="destructive"
            >
              <Lock className="h-4 w-4 mr-2" /> Fechar sessão
            </LoadingButton>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Itens contados</div><div className="text-2xl font-bold">{totals.total}</div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Com divergência</div><div className="text-2xl font-bold text-warning">{totals.divergencias}</div></CardContent></Card>
        </div>

        {isOpen && (
          <Card>
            <CardHeader><CardTitle className="text-base">Adicionar contagem</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Buscar produto (nome ou SKU)</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-8" value={busca} onChange={(e) => { setBusca(e.target.value); setSelectedProduct(null); }} placeholder="Digite ao menos 2 caracteres" />
                </div>
                {busca.length >= 2 && !selectedProduct && (
                  <div className="mt-2 border rounded-md max-h-48 overflow-auto">
                    {produtos.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">Nenhum produto encontrado</div>
                    ) : produtos.map((p: any) => (
                      <button key={p.id} type="button" onClick={() => { setSelectedProduct(p); setBusca(p.name); }}
                        className="w-full text-left px-3 py-2 hover:bg-muted flex justify-between gap-3">
                        <span>{p.name} <span className="text-muted-foreground text-xs">({p.sku})</span></span>
                        <span className="text-muted-foreground text-xs">Sistema: {p.current_stock}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedProduct && (
                <>
                  <div className="text-sm text-muted-foreground">Sistema atual: <span className="font-semibold text-foreground">{selectedProduct.current_stock}</span></div>
                  <div>
                    <Label>Quantidade contada *</Label>
                    <Input type="number" inputMode="decimal" value={contado} onChange={(e) => setContado(e.target.value)} />
                  </div>
                  <LoadingButton loading={add.isPending} onClick={handleAdd}>Registrar contagem</LoadingButton>
                </>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Contagens registradas</CardTitle></CardHeader>
          <CardContent>
            {counts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma contagem ainda.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Sistema</TableHead>
                    <TableHead className="text-right">Contado</TableHead>
                    <TableHead className="text-right">Divergência</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {counts.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.product?.name ?? c.product_id} <span className="text-xs text-muted-foreground">{c.product?.sku}</span></TableCell>
                      <TableCell className="text-right">{c.sistema}</TableCell>
                      <TableCell className="text-right">{c.contado}</TableCell>
                      <TableCell className={`text-right font-semibold ${Number(c.divergencia) === 0 ? "" : Number(c.divergencia) > 0 ? "text-success" : "text-destructive"}`}>
                        {Number(c.divergencia) > 0 ? "+" : ""}{c.divergencia}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
