import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardCheck, Workflow, Scale, UserCog } from "lucide-react";
import { ApprovalThresholdsSection } from "@/components/purchases/ApprovalThresholdsSection";
import { ConfiguracaoAprovacoesContent } from "@/pages/ConfiguracaoAprovacoes";
import ConfiguracaoDelegacoes from "@/pages/ConfiguracaoDelegacoes";

export default function RegrasAprovacao() {
  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-primary" />
            Regras de Aprovação
          </h1>
          <p className="text-muted-foreground mt-1">
            Fluxos, alçadas e delegações de aprovação por valor, setor e tipo de produto.
          </p>
        </div>

        <Tabs defaultValue="alcadas">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="alcadas"><Scale className="h-4 w-4 mr-1.5" />Alçadas</TabsTrigger>
            <TabsTrigger value="fluxos"><Workflow className="h-4 w-4 mr-1.5" />Fluxos</TabsTrigger>
            <TabsTrigger value="delegacoes"><UserCog className="h-4 w-4 mr-1.5" />Delegações</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="alcadas" className="mt-4">
            <ApprovalThresholdsSection />
          </TabsContent>

          <TabsContent value="fluxos" className="mt-4">
            <ConfiguracaoAprovacoesContent embedded />
          </TabsContent>

          <TabsContent value="delegacoes" className="mt-4">
            <ConfiguracaoDelegacoes />
          </TabsContent>

          <TabsContent value="historico" className="mt-4">
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Em breve: histórico consolidado de aprovações e delegações.
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
