import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveTable, type ResponsiveColumn } from "@/components/ui/responsive-table";
import { FilterChips, type FilterChip } from "@/components/ui/filter-chips";
import { ArrowRightLeft, ArrowUp, ArrowDown, RotateCcw, Filter, Download } from "lucide-react";
import { MovementFiltersModal } from "@/components/movements/MovementFiltersModal";
import { ExportMovementsModal } from "@/components/movements/ExportMovementsModal";
import { ModernFilter } from "@/components/ui/modern-filter";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { StatsCardsSkeleton } from "@/components/ui/table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getCategoryBadge } from "@/lib/categoryUtils";

export default function Movimentacoes() {
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [filters, setFilters] = useState<any>({});
  const [stats, setStats] = useState({
    entradas: 0,
    saidas: 0,
    transferencias: 0,
    ajustes: 0
  });
  const { organization, isSuperAdmin } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadMovements();
    loadStats();
  }, [filters]);

  const loadMovements = async () => {
    try {
      let query = supabase
        .from('movements')
        .select(`
          *,
          products (
            name,
            sku,
            category
          )
        `);

      // Filter by organization (unless super admin)
      if (!isSuperAdmin && organization?.organization_id) {
        query = query.eq('organization_id', organization.organization_id);
      }

      // Apply filters
      if (filters.type && filters.type !== "all") {
        query = query.eq('type', filters.type);
      }
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo + 'T23:59:59');
      }
      if (filters.minQuantity) {
        query = query.gte('quantity', parseInt(filters.minQuantity));
      }
      if (filters.maxQuantity) {
        query = query.lte('quantity', parseInt(filters.maxQuantity));
      }
      if (filters.productName) {
        // This will be filtered client-side after the query
      }

      const { data, error } = await query.order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        throw error;
      }

      let filteredData = data || [];

      // Apply product name filter client-side
      if (filters.productName) {
        filteredData = filteredData.filter(movement => 
          movement.products?.name?.toLowerCase().includes(filters.productName.toLowerCase()) ||
          movement.products?.sku?.toLowerCase().includes(filters.productName.toLowerCase())
        );
      }

      setMovements(filteredData);
    } catch (error) {
      console.error('Error loading movements:', error);
      toast({
        title: "Erro ao carregar movimentações",
        description: "Não foi possível carregar o histórico de movimentações.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFiltersApply = (newFilters: any) => {
    setFilters(newFilters);
  };

  const loadStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      let query = supabase
        .from('movements')
        .select('type')
        .gte('created_at', today);

      // Filter by organization (unless super admin)
      if (!isSuperAdmin && organization?.organization_id) {
        query = query.eq('organization_id', organization.organization_id);
      }

      const { data: todayMovements } = await query;

      if (todayMovements) {
        const stats = {
          entradas: todayMovements.filter(m => m.type === 'entrada').length,
          saidas: todayMovements.filter(m => m.type === 'saida').length,
          transferencias: todayMovements.filter(m => m.type === 'transferencia').length,
          ajustes: todayMovements.filter(m => m.type === 'ajuste').length,
        };
        setStats(stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case "entrada":
        return <ArrowDown className="h-4 w-4 text-success" />;
      case "saida":
        return <ArrowUp className="h-4 w-4 text-destructive" />;
      case "transferencia":
        return <ArrowRightLeft className="h-4 w-4 text-primary" />;
      case "ajuste":
        return <RotateCcw className="h-4 w-4 text-warning" />;
      default:
        return <ArrowRightLeft className="h-4 w-4" />;
    }
  };

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case "entrada":
        return <Badge variant="default" className="bg-success text-success-foreground">Entrada</Badge>;
      case "saida":
        return <Badge variant="destructive">Saída</Badge>;
      case "transferencia":
        return <Badge variant="default" className="bg-primary text-primary-foreground">Transferência</Badge>;
      case "ajuste":
        return <Badge variant="default" className="bg-warning text-warning-foreground">Ajuste</Badge>;
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR');
  };

  const getLocationInfo = (movement: any) => {
    if (movement.type === 'transferencia' && movement.destination_location) {
      return movement.destination_location;
    }
    if ((movement.type === 'entrada' || movement.type === 'saida') && movement.location_info) {
      return movement.location_info;
    }
    return 'N/A';
  };


  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto space-y-6">
            {/* Header da página */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <ArrowRightLeft className="h-6 w-6 text-primary" />
                  Movimentações
                </h1>
                <p className="text-muted-foreground mt-1">
                  Histórico completo de entradas, saídas e transferências
                </p>
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <ModernFilter
                  options={[
                    {
                      key: "type",
                      label: "Tipo",
                      type: "select",
                      options: [
                        { value: "entrada", label: "Entrada" },
                        { value: "saida", label: "Saída" },
                        { value: "transferencia", label: "Transferência" },
                        { value: "ajuste", label: "Ajuste" }
                      ]
                    },
                    {
                      key: "dateFrom",
                      label: "Data Inicial",
                      type: "date"
                    },
                    {
                      key: "dateTo",
                      label: "Data Final",
                      type: "date"
                    },
                    {
                      key: "productName",
                      label: "Produto",
                      type: "text",
                      placeholder: "Nome do produto"
                    },
                    {
                      key: "minQuantity",
                      label: "Quantidade Mínima",
                      type: "number",
                      placeholder: "Ex: 1"
                    },
                    {
                      key: "maxQuantity",
                      label: "Quantidade Máxima",
                      type: "number",
                      placeholder: "Ex: 100"
                    }
                  ]}
                  onFiltersChange={(filters) => setFilters(filters)}
                  initialFilters={filters}
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsExportModalOpen(true)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </div>

            {/* Cards de resumo */}
            {loading ? (
              <StatsCardsSkeleton count={4} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="card-interactive animate-fade-in" style={{ animationDelay: '0ms' }}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-success/10 rounded-lg">
                        <ArrowDown className="h-5 w-5 text-success" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Entradas Hoje</p>
                        <p className="text-2xl font-bold">{stats.entradas}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-interactive animate-fade-in" style={{ animationDelay: '100ms' }}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-destructive/10 rounded-lg">
                        <ArrowUp className="h-5 w-5 text-destructive" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Saídas Hoje</p>
                        <p className="text-2xl font-bold">{stats.saidas}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-interactive animate-fade-in" style={{ animationDelay: '200ms' }}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <ArrowRightLeft className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Transferências</p>
                        <p className="text-2xl font-bold">{stats.transferencias}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-interactive animate-fade-in" style={{ animationDelay: '300ms' }}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-warning/10 rounded-lg">
                        <RotateCcw className="h-5 w-5 text-warning" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Ajustes</p>
                        <p className="text-2xl font-bold">{stats.ajustes}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Chips de filtros ativos */}
            {(() => {
              const labelMap: Record<string, string> = {
                type: "Tipo",
                dateFrom: "De",
                dateTo: "Até",
                productName: "Produto",
                minQuantity: "Qtd min",
                maxQuantity: "Qtd max",
              };
              const chips: FilterChip[] = Object.entries(filters)
                .filter(([_, v]) => v !== undefined && v !== "" && v !== "all")
                .map(([k, v]) => ({
                  key: k,
                  label: labelMap[k] ?? k,
                  value: String(v),
                  onRemove: () => {
                    const next = { ...filters };
                    delete next[k];
                    setFilters(next);
                  },
                }));
              return <FilterChips chips={chips} onClearAll={() => setFilters({})} />;
            })()}

            {/* Tabela / lista de movimentações */}
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Movimentações</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <TableSkeleton rows={6} columns={6} />
                ) : (
                  <ResponsiveTable
                    data={movements}
                    rowKey={(m) => m.id}
                    emptyState={
                      <EmptyState
                        icon={ArrowRightLeft}
                        title="Nenhuma movimentação encontrada"
                        description="As movimentações de estoque aparecerão aqui assim que você registrar entradas, saídas ou transferências."
                        variant="default"
                      />
                    }
                    columns={[
                      {
                        key: "produto",
                        header: "Produto",
                        mobilePrimary: true,
                        cell: (mov: any) => (
                          <div>
                            <div className="font-medium">{mov.products?.name || "Produto não informado"}</div>
                            <div className="text-xs text-muted-foreground font-mono">{mov.products?.sku || "N/A"}</div>
                          </div>
                        ),
                      },
                      {
                        key: "tipo",
                        header: "Tipo",
                        cell: (mov: any) => (
                          <div className="flex items-center gap-2">
                            {getTipoIcon(mov.type)}
                            {getTipoBadge(mov.type)}
                          </div>
                        ),
                      },
                      { key: "qtd", header: "Quantidade", cell: (mov: any) => <span className="font-medium">{mov.quantity}</span> },
                      { key: "data", header: "Data/Hora", cell: (mov: any) => <span className="text-xs">{formatDateTime(mov.created_at)}</span> },
                      {
                        key: "categoria",
                        header: "Categoria",
                        hideOnMobile: true,
                        cell: (mov: any) => getCategoryBadge(mov.products?.category || "outros"),
                      },
                      {
                        key: "local",
                        header: "Destino/Local",
                        hideOnMobile: true,
                        cell: (mov: any) => <span className="text-xs">{getLocationInfo(mov)}</span>,
                      },
                      {
                        key: "obs",
                        header: "Observação",
                        hideOnMobile: true,
                        cell: (mov: any) => (
                          <span className="block max-w-xs truncate text-xs" title={mov.reason || "N/A"}>
                            {mov.reason || "N/A"}
                          </span>
                        ),
                      },
                    ]}
                  />
                )}
              </CardContent>
            </Card>
      </div>
      
      <MovementFiltersModal
        open={isFiltersModalOpen}
        onOpenChange={setIsFiltersModalOpen}
        onFiltersApply={handleFiltersApply}
        initialFilters={filters}
      />
      
      <ExportMovementsModal
        open={isExportModalOpen}
        onOpenChange={setIsExportModalOpen}
      />
    </MainLayout>
  );
}
