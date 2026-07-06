import { Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { PackageCheck } from "lucide-react";

export default function RecebimentosConferencia() {
  return (
    <MainLayout>
      <div className="space-y-4 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><PackageCheck className="h-6 w-6 text-primary" /> Conferência de Entrega</h1>
          <p className="text-sm text-muted-foreground">
            Confira itens recebidos contra os pedidos de compra.
          </p>
        </div>
        <EmptyState
          icon={PackageCheck}
          title="Tela dedicada em construção"
          description="Por enquanto, registre recebimentos diretamente no pedido de compra correspondente."
          action={
            <Link to="/pedidos">
              <Button>Ir para Pedidos de Compra</Button>
            </Link>
          }
        />
      </div>
    </MainLayout>
  );
}
