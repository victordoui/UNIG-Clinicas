import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAIInsights, useUpdateInsightStatus, useGenerateInsights, type InsightTipo } from "@/hooks/useAIInsights";
import { Sparkles, AlertTriangle, TrendingUp, Lightbulb, ShieldAlert, Check, X, Eye, RefreshCw } from "lucide-react";
import { useState } from "react";

const TIPO_META: Record<InsightTipo, { icon: any; label: string; color: string }> = {
  anomalia: { icon: AlertTriangle, label: "Anomalia", color: "text-orange-500" },
  tendencia: { icon: TrendingUp, label: "Tendência", color: "text-blue-500" },
  oportunidade: { icon: Lightbulb, label: "Oportunidade", color: "text-emerald-500" },
  risco: { icon: ShieldAlert, label: "Risco", color: "text-red-500" },
};

const SEV_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  baixa: "outline",
  media: "secondary",
  alta: "destructive",
};

export default function Insights() {
  const [tab, setTab] = useState<"novo" | "visto" | "acionado" | "descartado">("novo");
  const { data: insights = [], isLoading } = useAIInsights({ status: tab });
  const update = useUpdateInsightStatus();
  const generate = useGenerateInsights();

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="h-6 w-6 text-primary" /> Insights de IA</h1>
            <p className="text-muted-foreground mt-1">
              Anomalias, tendências e riscos detectados automaticamente.
            </p>
          </div>
          <LoadingButton loading={generate.isPending} onClick={() => generate.mutate()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Gerar insights agora
          </LoadingButton>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList>
            <TabsTrigger value="novo">Novos</TabsTrigger>
            <TabsTrigger value="visto">Vistos</TabsTrigger>
            <TabsTrigger value="acionado">Acionados</TabsTrigger>
            <TabsTrigger value="descartado">Descartados</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-4">
            {isLoading ? (
              <p className="text-muted-foreground">Carregando…</p>
            ) : insights.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="Nenhum insight"
                description="Clique em 'Gerar insights agora' para que a IA analise seus dados."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {insights.map((ins) => {
                  const meta = TIPO_META[ins.tipo];
                  const Icon = meta.icon;
                  return (
                    <Card key={ins.id} className="animate-fade-in">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Icon className={`h-5 w-5 ${meta.color}`} />
                            <CardTitle className="text-base">{ins.titulo}</CardTitle>
                          </div>
                          <Badge variant={SEV_VARIANT[ins.severidade]}>{ins.severidade}</Badge>
                        </div>
                        <Badge variant="outline" className="w-fit mt-1">{meta.label}</Badge>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-muted-foreground">{ins.descricao}</p>
                        {ins.status === "novo" && (
                          <div className="flex gap-2 flex-wrap">
                            <Button size="sm" variant="outline" onClick={() => update.mutate({ id: ins.id, status: "visto" })}>
                              <Eye className="h-3.5 w-3.5 mr-1" /> Visto
                            </Button>
                            <Button size="sm" onClick={() => update.mutate({ id: ins.id, status: "acionado" })}>
                              <Check className="h-3.5 w-3.5 mr-1" /> Acionar
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => update.mutate({ id: ins.id, status: "descartado" })}>
                              <X className="h-3.5 w-3.5 mr-1" /> Descartar
                            </Button>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(ins.gerado_em).toLocaleString("pt-BR")}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
