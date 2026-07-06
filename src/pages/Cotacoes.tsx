import { Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { usePurchaseRequests } from "@/hooks/usePurchaseRequests";
import { Badge } from "@/components/ui/badge";
import { FileSignature } from "lucide-react";
import { STATUS_LABEL } from "@/lib/purchaseLabels";

export default function Cotacoes() {
  const { data, isLoading } = usePurchaseRequests();

  const comCotacoes = (data || []).filter((r) =>
    ["em_cotacao", "aguardando_aprovacao", "aprovada", "pedido_emitido"].includes(r.status as string),
  );

  return (
    <MainLayout>
      <div className="space-y-4 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileSignature className="h-6 w-6 text-primary" /> Cotações</h1>
          <p className="text-sm text-muted-foreground">
            Solicitações com cotações em andamento ou já decididas.
          </p>
        </div>

        {isLoading ? (
          <TableSkeleton rows={6} />
        ) : comCotacoes.length === 0 ? (
          <EmptyState
            icon={FileSignature}
            title="Sem cotações no momento"
            description="As cotações aparecem aqui assim que as solicitações entram no fluxo de Compras."
          />
        ) : (
          <div className="grid gap-3">
            {comCotacoes.map((r) => (
              <Link key={r.id} to={`/solicitacoes/${r.id}`}>
                <Card className="p-4 hover:shadow-md transition-shadow flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{r.numero}</span>
                      <Badge variant="secondary">
                        {STATUS_LABEL[r.status] || r.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-1">
                      {r.item_descricao}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {r.setor || "—"}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
