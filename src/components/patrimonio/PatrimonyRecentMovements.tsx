import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PatrimonyChartCard } from "./PatrimonyChartCard";
import { ArrowLeftRight, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

const sb = supabase as any;

export function PatrimonyRecentMovements() {
  const nav = useNavigate();
  const { data = [], isLoading } = useQuery({
    queryKey: ["asset_movements_recent"],
    queryFn: async () => {
      const { data, error } = await sb.from("asset_movements")
        .select("id,movement_type,movement_date,notes,from_unit_id,to_unit_id,asset:assets(id,name,asset_number),from_unit:units!asset_movements_from_unit_id_fkey(name),to_unit:units!asset_movements_to_unit_id_fkey(name)")
        .order("movement_date", { ascending: false })
        .limit(8);
      if (error) return [];
      return data ?? [];
    },
  });

  return (
    <PatrimonyChartCard
      title="Movimentações recentes"
      subtitle="Últimas movimentações registradas"
      icon={ArrowLeftRight}
      action={
        <Button variant="ghost" size="sm" onClick={() => nav("/patrimonio/movimentacoes")} className="gap-1">
          Ver todas <ChevronRight className="h-3 w-3" />
        </Button>
      }
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Carregando…</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma movimentação recente.</p>
      ) : (
        <ul className="divide-y">
          {data.map((m: any) => (
            <li key={m.id} className="py-2.5 flex items-start gap-3 cursor-pointer hover:bg-muted/40 rounded px-1"
              onClick={() => m.asset?.id && nav(`/patrimonio/${m.asset.id}?tab=historico`)}>
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <ArrowLeftRight className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {m.asset?.name ?? "Patrimônio"} <span className="text-muted-foreground font-normal">#{m.asset?.asset_number ?? "—"}</span>
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {m.movement_type ?? "movimentação"}
                  {m.from_unit?.name || m.to_unit?.name ? (
                    <> · {m.from_unit?.name ?? "—"} → {m.to_unit?.name ?? "—"}</>
                  ) : null}
                </p>
              </div>
              <span className="text-[11px] text-muted-foreground shrink-0">
                {m.movement_date ? format(new Date(m.movement_date), "dd/MM/yy") : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </PatrimonyChartCard>
  );
}
