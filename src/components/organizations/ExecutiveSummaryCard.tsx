import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Package, User, Tag, DollarSign } from "lucide-react";

interface ExecutiveSummaryCardProps {
  totalStockValue: number;
  topProduct: { name: string; count: number } | null;
  topCategory: string | null;
  memberActivity: any[];
  movementsCount: number;
}

export function ExecutiveSummaryCard({ 
  totalStockValue, 
  topProduct, 
  topCategory,
  memberActivity,
  movementsCount 
}: ExecutiveSummaryCardProps) {
  const topMember = memberActivity.length > 0 
    ? memberActivity.reduce((max, member) => 
        member.movementsCount > max.movementsCount ? member : max
      )
    : null;

  const avgMovementsPerDay = movementsCount > 0 ? (movementsCount / 30).toFixed(1) : '0';

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Resumo Executivo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="w-4 h-4" />
              <span>Valor Total em Estoque</span>
            </div>
            <p className="text-2xl font-bold text-primary">
              {new Intl.NumberFormat('pt-BR', { 
                style: 'currency', 
                currency: 'BRL' 
              }).format(totalStockValue)}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="w-4 h-4" />
              <span>Produto Mais Movimentado</span>
            </div>
            <p className="text-lg font-semibold truncate" title={topProduct?.name}>
              {topProduct?.name || 'Nenhum'}
            </p>
            {topProduct && (
              <p className="text-sm text-muted-foreground">
                {topProduct.count} movimentos
              </p>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Tag className="w-4 h-4" />
              <span>Categoria Principal</span>
            </div>
            <p className="text-lg font-semibold">
              {topCategory || 'Nenhuma'}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="w-4 h-4" />
              <span>Média de Movimentos/Dia</span>
            </div>
            <p className="text-2xl font-bold">
              {avgMovementsPerDay}
            </p>
            <p className="text-xs text-muted-foreground">
              Últimos 30 dias
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
