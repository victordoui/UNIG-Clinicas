import { useState, useEffect } from "react";
import { ArrowUp, ArrowDown, ArrowRightLeft, RotateCcw, Package, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Movement {
  id: string;
  type: "entrada" | "saida" | "transferencia" | "ajuste";
  product: string;
  quantity: number;
  user: string;
  timestamp: string;
  status?: "processando" | "concluido" | "cancelado";
}

export function RecentMovements() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadRecentMovements();
  }, []);

  const loadRecentMovements = async () => {
    try {
      const { data, error } = await supabase
        .from('movements')
        .select(`
          *,
          products (name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error loading movements:', error);
        return;
      }

      if (data) {
        // Buscar nomes dos usuários separadamente
        const userIds = data.map(movement => movement.created_by).filter(Boolean);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);

        const profilesMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

        const formattedMovements = data.map(movement => ({
          id: movement.id,
          type: movement.type as "entrada" | "saida" | "transferencia" | "ajuste",
          product: movement.products?.name || 'Produto não encontrado',
          quantity: movement.quantity,
          user: profilesMap.get(movement.created_by) || 'Usuário não encontrado',
          timestamp: formatTimestamp(movement.created_at),
          status: "concluido" as "processando" | "concluido" | "cancelado"
        }));
        setMovements(formattedMovements);
      }
    } catch (error) {
      console.error('Error loading movements:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `Há ${diffInMinutes} minuto${diffInMinutes !== 1 ? 's' : ''}`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `Há ${hours} hora${hours !== 1 ? 's' : ''}`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `Há ${days} dia${days !== 1 ? 's' : ''}`;
    }
  };
  const getMovementIcon = (type: Movement["type"]) => {
    switch (type) {
      case "entrada":
        return <ArrowDown className="h-4 w-4 text-success" />;
      case "saida":
        return <ArrowUp className="h-4 w-4 text-destructive" />;
      case "transferencia":
        return <ArrowRightLeft className="h-4 w-4 text-primary" />;
      case "ajuste":
        return <RotateCcw className="h-4 w-4 text-warning" />;
      default:
        return <Package className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: Movement["status"]) => {
    switch (status) {
      case "processando":
        return <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20">Processando</Badge>;
      case "concluido":
        return <Badge variant="secondary" className="bg-success/10 text-success border-success/20">Concluído</Badge>;
      case "cancelado":
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Movimentações Recentes
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/movimentacoes')}
            className="hover-scale text-primary hover:text-primary/80"
          >
            <Eye className="h-4 w-4 mr-1" />
            Ver Todos
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-background-secondary/50 border border-border/50">
                <div className="w-10 h-10 rounded-lg bg-muted animate-pulse"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse"></div>
                  <div className="h-3 bg-muted rounded w-2/3 animate-pulse"></div>
                </div>
                <div className="h-3 bg-muted rounded w-16 animate-pulse"></div>
              </div>
            ))}
          </div>
        ) : movements.length > 0 ? (
          movements.map((movement) => (
            <div key={movement.id} className="flex items-center gap-4 p-3 rounded-lg bg-background-secondary/50 border border-border/50">
              <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center">
                {getMovementIcon(movement.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-sm text-foreground truncate">
                    {movement.product}
                  </p>
                  {movement.status && getStatusBadge(movement.status)}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="capitalize">{movement.type}</span>
                  <span>Qtd: {movement.quantity}</span>
                  <span>{movement.user}</span>
                </div>
              </div>
              
              <div className="text-xs text-muted-foreground">
                {movement.timestamp}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma movimentação recente</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}