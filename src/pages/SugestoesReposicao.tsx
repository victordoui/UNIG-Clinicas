import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useReorderSuggestions, useGenerateSuggestions, useDecideSuggestion } from '@/hooks/useReorderSuggestions';
import { EmptyState } from '@/components/ui/empty-state';
import { Sparkles, Check, X, Package, RefreshCw } from 'lucide-react';
import { LoadingButton } from '@/components/ui/loading-button';
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function SugestoesReposicao() {
  const [tab, setTab] = useState('pendente');
  const { data: suggestions = [], isLoading } = useReorderSuggestions(tab);
  const generate = useGenerateSuggestions();
  const decide = useDecideSuggestion();

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="h-6 w-6 text-primary" /> Sugestões de Reposição</h1>
            <p className="text-muted-foreground mt-1">Reposições automáticas baseadas em estoque mínimo e consumo histórico</p>
          </div>
          <LoadingButton loading={generate.isPending} onClick={() => generate.mutate()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Gerar sugestões agora
          </LoadingButton>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="pendente">Pendentes</TabsTrigger>
            <TabsTrigger value="convertida">Convertidas</TabsTrigger>
            <TabsTrigger value="rejeitada">Rejeitadas</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-4">
            {isLoading ? (
              <p className="text-muted-foreground">Carregando…</p>
            ) : suggestions.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="Nenhuma sugestão"
                description="Gere sugestões automaticamente com base em produtos abaixo do estoque mínimo."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {suggestions.map((s) => (
                  <Card key={s.id} className="animate-fade-in">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-primary" />
                          <CardTitle className="text-base">{s.product?.name ?? 'Produto'}</CardTitle>
                        </div>
                        <Badge variant="outline">{s.product?.sku}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Estoque atual</p>
                          <p className="font-semibold">{s.product?.current_stock ?? '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Sugerido</p>
                          <p className="font-semibold text-primary">{Number(s.quantidade_sugerida).toLocaleString()}</p>
                        </div>
                      </div>
                      {s.motivo && <p className="text-xs text-muted-foreground">{s.motivo}</p>}
                      {tab === 'pendente' && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => decide.mutate({
                              id: s.id,
                              decision: 'aceita',
                              quantidade: Number(s.quantidade_sugerida),
                              product_id: s.product_id,
                              product_name: s.product?.name,
                            })}
                            disabled={decide.isPending}
                          >
                            <Check className="h-4 w-4 mr-1" /> Aceitar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => decide.mutate({ id: s.id, decision: 'rejeitada' })}
                            disabled={decide.isPending}
                          >
                            <X className="h-4 w-4 mr-1" /> Rejeitar
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
