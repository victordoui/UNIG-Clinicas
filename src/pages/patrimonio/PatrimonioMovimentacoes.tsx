import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeftRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export default function PatrimonioMovimentacoes() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["all-asset-movements"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("asset_movements")
        .select("*, asset:assets(asset_number,name)")
        .order("movement_date", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-4">
        <PageHeader icon={ArrowLeftRight} title="Movimentações de Patrimônio"
          description="Histórico de transferências entre unidades, blocos e locais." />
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Data</TableHead><TableHead>Patrimônio</TableHead>
                <TableHead>Tipo</TableHead><TableHead>Motivo</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {isLoading ? <TableRow><TableCell colSpan={4} className="text-center py-6">Carregando…</TableCell></TableRow>
                : data.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Sem movimentações.</TableCell></TableRow>
                : data.map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs">{format(new Date(m.movement_date), "dd/MM/yy HH:mm")}</TableCell>
                    <TableCell className="font-mono text-xs">{m.asset?.asset_number}<br /><span className="text-muted-foreground">{m.asset?.name}</span></TableCell>
                    <TableCell className="text-sm">{m.movement_type}</TableCell>
                    <TableCell className="text-sm">{m.reason ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
