import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { UnitLabel } from "@/components/ui/UnitLabel";
import { UnitStatusBadge } from "@/components/ui/UnitStatusBadge";
import type { Unit } from "@/hooks/useUnitsManagement";
import { FileText, Briefcase, AlertCircle, Package } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  unit: Unit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UnitDetailDialog({ unit, open, onOpenChange }: Props) {
  const { data: counts } = useQuery({
    enabled: !!unit && open,
    queryKey: ["unit-detail-counts", unit?.id, unit?.name],
    queryFn: async () => {
      if (!unit) return { ci: 0, demandas: 0, patrimonio: 0 };
      const [ciRes, demandasRes, patRes] = await Promise.all([
        (supabase as any).from("ci_requests").select("id", { count: "exact", head: true }).eq("campus", unit.name),
        (supabase as any).from("operational_demands").select("id", { count: "exact", head: true }).eq("unidade", unit.name),
        (supabase as any).from("assets").select("id", { count: "exact", head: true }).eq("unit_id", unit.id).is("deleted_at", null),
      ]);
      return { ci: ciRes.count ?? 0, demandas: demandasRes.count ?? 0, patrimonio: patRes.count ?? 0 };
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {unit && <UnitLabel unit={unit.name} size="lg" />}
          </DialogTitle>
          <DialogDescription>Detalhes e vínculos da unidade</DialogDescription>
        </DialogHeader>

        {unit && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <UnitStatusBadge active={unit.is_active} />
              {unit.type && (
                <span className="text-xs rounded-full px-2 py-0.5 bg-muted text-muted-foreground border">
                  {unit.type}
                </span>
              )}
              <span className="text-xs text-muted-foreground ml-auto">Ordem #{unit.display_order}</span>
            </div>

            {unit.short_name && (
              <div className="text-sm">
                <span className="text-muted-foreground">Abreviação: </span>
                <span className="font-medium">{unit.short_name}</span>
              </div>
            )}
            {unit.address && (
              <div className="text-sm">
                <span className="text-muted-foreground">Endereço: </span>
                <span>{unit.address}</span>
              </div>
            )}
            {unit.observation && (
              <div className="text-sm">
                <span className="text-muted-foreground">Observação: </span>
                <span>{unit.observation}</span>
              </div>
            )}

            <Separator />

            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                Vínculos
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <Card className="p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" /> CIs
                  </div>
                  <div className="text-2xl font-bold">{counts?.ci ?? 0}</div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Briefcase className="h-3.5 w-3.5" /> Demandas
                  </div>
                  <div className="text-2xl font-bold">{counts?.demandas ?? 0}</div>
                </Card>
                <Link to={`/patrimonio?unit=${unit.id}`} onClick={() => onOpenChange(false)}>
                  <Card className="p-3 hover:bg-muted/40 transition-colors cursor-pointer">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Package className="h-3.5 w-3.5" /> Patrimônios
                    </div>
                    <div className="text-2xl font-bold">{counts?.patrimonio ?? 0}</div>
                  </Card>
                </Link>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
