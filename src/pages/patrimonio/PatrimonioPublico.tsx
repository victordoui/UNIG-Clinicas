import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Package } from "lucide-react";
import { AssetStatusBadge } from "@/components/patrimonio/AssetStatusBadge";

export default function PatrimonioPublico() {
  const { qr } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["asset-by-qr", qr],
    enabled: !!qr,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_asset_by_qr", { _qr: qr });
      if (error) throw error;
      return (data?.[0]) ?? null;
    },
  });

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6">
        <div className="flex items-center gap-2 mb-4">
          <Package className="h-6 w-6 text-primary" />
          <h1 className="text-lg font-bold">Consulta de Patrimônio</h1>
        </div>
        {isLoading ? <p>Carregando…</p> : !data ? <p className="text-muted-foreground">Patrimônio não encontrado.</p> : (
          <div className="space-y-3">
            <div><p className="text-xs text-muted-foreground">Nº Patrimônio</p><p className="font-mono font-bold">{data.asset_number}</p></div>
            <div><p className="text-xs text-muted-foreground">Nome</p><p className="font-medium">{data.name}</p></div>
            {data.brand && <div><p className="text-xs text-muted-foreground">Marca / Modelo</p><p>{data.brand} {data.model}</p></div>}
            {data.unit_name && <div><p className="text-xs text-muted-foreground">Unidade</p><p>{data.unit_name}</p></div>}
            <AssetStatusBadge status={data.status} />
          </div>
        )}
      </Card>
    </div>
  );
}
