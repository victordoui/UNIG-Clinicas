import { MainLayout } from "@/components/layout/MainLayout";
import { EmptyState } from "@/components/ui/empty-state";
import { Briefcase } from "lucide-react";

export default function Servicos() {
  return (
    <MainLayout>
      <div className="space-y-4 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Briefcase className="h-6 w-6 text-primary" /> Serviços</h1>
          <p className="text-sm text-muted-foreground">
            Cadastro e contratação de serviços não-estocáveis.
          </p>
        </div>
        <EmptyState
          icon={Briefcase}
          title="Módulo em construção"
          description="Em breve você poderá cadastrar serviços, registrar execuções e anexar evidências de entrega."
        />
      </div>
    </MainLayout>
  );
}
