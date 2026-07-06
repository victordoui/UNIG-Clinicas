import { MainLayout } from "@/components/layout/MainLayout";
import { PurchaseCIKanban } from "@/components/purchases/PurchaseCIKanban";
import { KanbanSquare } from "lucide-react";

export default function ComprasKanban() {
  return (
    <MainLayout>
      <div className="space-y-4 animate-fade-in min-w-0 max-w-full">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><KanbanSquare className="h-6 w-6 text-primary" /> Kanban de Compras</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe o fluxo das solicitações em todas as etapas.
          </p>
        </div>
        <div className="min-w-0 max-w-full overflow-hidden">
          <PurchaseCIKanban />
        </div>
      </div>
    </MainLayout>
  );
}
