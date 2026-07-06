import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDemandForecasts, useRecalculateForecast } from '@/hooks/useDemandForecasts';
import { EmptyState } from '@/components/ui/empty-state';
import { TrendingUp, RefreshCw } from 'lucide-react';
import { LoadingButton } from '@/components/ui/loading-button';
import { useMemo } from 'react';

export default function PrevisaoDemanda() {
  const { data: forecasts = [], isLoading } = useDemandForecasts();
  const recalc = useRecalculateForecast();

  const productIds = useMemo(
    () => Array.from(new Set(forecasts.map((f) => f.product_id))),
    [forecasts]
  );

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><TrendingUp className="h-6 w-6 text-primary" /> Previsão de Demanda</h1>
            <p className="text-muted-foreground mt-1">Projeções baseadas em consumo histórico (média móvel 6 meses)</p>
          </div>
          <LoadingButton
            loading={recalc.isPending}
            onClick={() => recalc.mutate(productIds)}
            disabled={productIds.length === 0}
          >
            <RefreshCw className="h-4 w-4 mr-2" /> Recalcular
          </LoadingButton>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Carregando…</p>
        ) : forecasts.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="Sem previsões"
            description="As previsões serão geradas conforme produtos forem analisados."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {forecasts.map((f) => (
              <Card key={f.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{f.product?.name ?? 'Produto'}</CardTitle>
                    <Badge variant="outline">{f.product?.sku}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Período</span>
                    <span className="font-medium">{new Date(f.periodo).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Consumo previsto</span>
                    <span className="font-bold text-primary">{Number(f.consumo_previsto).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Estoque atual</span>
                    <span className="font-medium">{f.product?.current_stock ?? '-'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Confiança</span>
                    <Badge variant="secondary">{f.confianca}%</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
