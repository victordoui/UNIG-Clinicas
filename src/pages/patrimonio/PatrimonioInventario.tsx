import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";

export default function PatrimonioInventario() {
  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-4">
        <PageHeader icon={ClipboardList} title="Inventário de Patrimônio"
          description="Realize conferências físicas e registre divergências." />
        <Card className="p-6 text-center text-muted-foreground">
          Módulo de conferência físico em preparação. Utilize a lista principal e a leitura por QR Code para inventariar.
        </Card>
      </div>
    </MainLayout>
  );
}
