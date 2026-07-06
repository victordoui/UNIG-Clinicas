import { MainLayout } from "@/components/layout/MainLayout";
import { EmptyState } from "@/components/ui/empty-state";
import { AlertTriangle } from "lucide-react";

export default function RecebimentosDivergencias() {
  return (
    <MainLayout>
      <div className="space-y-4 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><AlertTriangle className="h-6 w-6 text-primary" /> Divergências de Recebimento</h1>
          <p className="text-sm text-muted-foreground">
            Pedidos com diferenças entre o solicitado e o entregue.
          </p>
        </div>
        <EmptyState
          icon={AlertTriangle}
          title="Nenhuma divergência registrada"
          description="As divergências apontadas durante a conferência de entrega aparecerão aqui."
        />
      </div>
    </MainLayout>
  );
}
