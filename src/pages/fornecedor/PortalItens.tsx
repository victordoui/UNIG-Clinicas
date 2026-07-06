import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

export default function PortalItens() {
  const { supplierLink } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      if (!supplierLink) return;
      setLoading(true);
      const { data } = await supabase
        .from("purchase_requests")
        .select("id, numero, item_descricao, quantidade, categoria, prazo_desejado, status")
        .eq("organization_id", supplierLink.organization_id)
        .order("created_at", { ascending: false });
      setItems(data ?? []);
      setLoading(false);
    })();
  }, [supplierLink]);

  const filtered = items.filter((i) =>
    !q || `${i.item_descricao ?? ""} ${i.categoria ?? ""} ${i.numero ?? ""}`.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Itens / Produtos / Serviços</h1>
        <p className="text-muted-foreground text-sm">Catálogo de itens solicitados pela organização.</p>
      </div>
      <Input placeholder="Buscar item, categoria ou nº..." value={q} onChange={(e) => setQ(e.target.value)} />
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhum item encontrado.</CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {filtered.map((i) => (
            <Card key={i.id}>
              <CardContent className="py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-sm">{i.item_descricao}</p>
                  <p className="text-xs text-muted-foreground">
                    {i.numero} · {i.categoria ?? "—"} · Qtd: {i.quantidade}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">{i.status}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
