import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, Package, Calendar, Settings, Check, X, CheckCheck, Trash2, Filter, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";

export default function Alertas() {
  const [alertas, setAlertas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAlerts, setSelectedAlerts] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    type: 'all',
    severity: 'all',
    status: 'all',
    search: ''
  });
  const { toast } = useToast();
  const { organization, isSuperAdmin } = useAuth();

  // Load alerts from database
  const loadAlerts = async () => {
    try {
      let query = supabase
        .from('alerts')
        .select(`
          *,
          products (
            name,
            sku,
            current_stock,
            min_stock
          )
        `);

      // Filter by organization if not super admin
      if (!isSuperAdmin && organization?.organization_id) {
        query = query.eq('organization_id', organization.organization_id);
      }

      // Apply filters
      if (filters.type && filters.type !== 'all') {
        query = query.eq('type', filters.type as any);
      }
      if (filters.severity && filters.severity !== 'all') {
        query = query.eq('severity', filters.severity as any);
      }
      if (filters.status && filters.status !== 'all') {
        if (filters.status === 'read') {
          query = query.eq('is_read', true);
        } else if (filters.status === 'unread') {
          query = query.eq('is_read', false);
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false })
        .limit(1000);

      if (error) {
        console.error('Error loading alerts:', error);
        toast({
          title: "Erro ao carregar alertas",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      let alertsList = data || [];
      
      // Apply search filter
      if (filters.search) {
        alertsList = alertsList.filter(alert => 
          alert.title.toLowerCase().includes(filters.search.toLowerCase()) ||
          alert.message.toLowerCase().includes(filters.search.toLowerCase()) ||
          alert.products?.name?.toLowerCase().includes(filters.search.toLowerCase())
        );
      }

      // Simulate more than 1000 alerts if needed
      if (alertsList.length >= 1000) {
        alertsList = alertsList.slice(0, 1000);
      }

      setAlertas(alertsList);
    } catch (error) {
      console.error('Error loading alerts:', error);
      toast({
        title: "Erro interno",
        description: "Não foi possível carregar os alertas.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ is_read: true })
        .eq('id', alertId);

      if (error) {
        console.error('Error confirming alert:', error);
        toast({
          title: "Erro ao confirmar alerta",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Alerta confirmado",
        description: "O alerta foi marcado como lido.",
      });

      loadAlerts();
    } catch (error) {
      console.error('Error confirming alert:', error);
      toast({
        title: "Erro interno",
        description: "Não foi possível confirmar o alerta.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveAlert = async (alertId: string) => {
    try {
      const { data: deletedAlerts, error } = await supabase
        .from('alerts')
        .delete()
        .eq('id', alertId)
        .select();

      if (error) {
        console.error('Error removing alert:', error);
        toast({
          title: "Erro ao remover alerta",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // Verificar se realmente deletou algo
      if (!deletedAlerts || deletedAlerts.length === 0) {
        toast({
          title: "Erro ao remover alerta",
          description: "Você não tem permissão para remover este alerta ou ele já foi removido.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Alerta removido",
        description: "O alerta foi removido com sucesso.",
      });

      loadAlerts();
    } catch (error) {
      console.error('Error removing alert:', error);
      toast({
        title: "Erro interno",
        description: "Não foi possível remover o alerta.",
        variant: "destructive",
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!window.confirm("Tem certeza que deseja marcar todos os alertas como lidos?")) {
      return;
    }

    try {
      setIsLoading(true);
      
      const { error, count } = await supabase
        .from('alerts')
        .update({ is_read: true })
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all as read:', error);
        toast({
          title: "Erro ao marcar como lidos",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Alertas marcados como lidos",
        description: count ? `${count} alertas foram marcados como lidos.` : "Todos os alertas não lidos foram marcados como lidos.",
      });

      // Limpar seleções e recarregar
      setSelectedAlerts([]);
      await loadAlerts();
    } catch (error: any) {
      console.error('Error marking all as read:', error);
      toast({
        title: "Erro interno",
        description: error?.message || "Não foi possível marcar os alertas como lidos.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm("Tem certeza que deseja excluir todos os alertas? Esta ação não pode ser desfeita.")) {
      return;
    }

    try {
      setIsLoading(true);
      
      // Buscar todos os IDs primeiro
      const { data: alertsToDelete, error: fetchError } = await supabase
        .from('alerts')
        .select('id')
        .limit(100); // Reduzir para 100 como solicitado
      
      if (fetchError) {
        throw fetchError;
      }

      if (!alertsToDelete || alertsToDelete.length === 0) {
        toast({
          title: "Nenhum alerta para excluir",
          description: "Não há alertas no sistema.",
        });
        return;
      }

      // Deletar em lotes pequenos para evitar timeout
      const batchSize = 20;
      let deletedCount = 0;
      
      for (let i = 0; i < alertsToDelete.length; i += batchSize) {
        const batch = alertsToDelete.slice(i, i + batchSize);
        const ids = batch.map(alert => alert.id);
        
        const { data: deleted, error: deleteError } = await supabase
          .from('alerts')
          .delete()
          .in('id', ids)
          .select();
        
        if (deleteError) {
          throw deleteError;
        }
        
        // Contar apenas os realmente deletados
        deletedCount += deleted?.length || 0;
        
        // Pequena pausa entre lotes
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Verificar se deletou algo
      if (deletedCount === 0) {
        toast({
          title: "Sem permissão",
          description: "Você não tem permissão para excluir alertas.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Alertas excluídos com sucesso",
        description: `${deletedCount} alertas foram excluídos.`,
      });

      // Limpar seleções e recarregar
      setSelectedAlerts([]);
      await loadAlerts();
    } catch (error: any) {
      console.error('Error deleting all alerts:', error);
      toast({
        title: "Erro ao excluir alertas",
        description: error?.message || "Não foi possível excluir os alertas.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAllAlerts = () => {
    if (selectedAlerts.length === alertas.length) {
      setSelectedAlerts([]);
    } else {
      setSelectedAlerts(alertas.map(alert => alert.id));
    }
  };

  const handleSelectAlert = (alertId: string) => {
    setSelectedAlerts(prev => 
      prev.includes(alertId) 
        ? prev.filter(id => id !== alertId)
        : [...prev, alertId]
    );
  };

  const handleBulkAction = async (action: 'read' | 'delete') => {
    if (selectedAlerts.length === 0) {
      toast({
        title: "Nenhum alerta selecionado",
        description: "Selecione ao menos um alerta para realizar esta ação.",
        variant: "destructive",
      });
      return;
    }

    const actionText = action === 'read' ? 'marcar como lidos' : 'excluir';
    if (!window.confirm(`Tem certeza que deseja ${actionText} ${selectedAlerts.length} alertas selecionados?`)) {
      return;
    }

    try {
      setIsLoading(true);
      
      // Processar em lotes pequenos para evitar timeout
      const batchSize = 20;
      let processedCount = 0;
      
      for (let i = 0; i < selectedAlerts.length; i += batchSize) {
        const batch = selectedAlerts.slice(i, i + batchSize);
        
        if (action === 'read') {
          const { error } = await supabase
            .from('alerts')
            .update({ is_read: true })
            .in('id', batch);

          if (error) throw error;
        } else if (action === 'delete') {
          const { data: deleted, error } = await supabase
            .from('alerts')
            .delete()
            .in('id', batch)
            .select();

          if (error) throw error;
          
          // Contar apenas os realmente deletados (não incrementar batch.length)
          processedCount += deleted?.length || 0;
          continue; // Pular o incremento padrão abaixo
        }
        
        processedCount += batch.length;
        
        // Pequena pausa entre lotes
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const successMessage = action === 'read' 
        ? `${processedCount} alertas foram marcados como lidos.`
        : `${processedCount} alertas foram excluídos.`;
      
      toast({
        title: action === 'read' ? "Alertas marcados como lidos" : "Alertas excluídos",
        description: successMessage,
      });

      setSelectedAlerts([]);
      await loadAlerts();
    } catch (error: any) {
      console.error(`Error in bulk ${action}:`, error);
      toast({
        title: "Erro na operação",
        description: error?.message || `Não foi possível ${actionText} os alertas selecionados.`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [filters]);

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case "estoque_baixo":
      case "estoque_critico":
        return <Package className="h-5 w-5" />;
      case "validade":
        return <Calendar className="h-5 w-5" />;
      case "solicitacao_pendente":
        return <Clock className="h-5 w-5" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const getPrioridadeBadge = (prioridade: string) => {
    switch (prioridade) {
      case "critica":
        return <Badge variant="destructive">Crítica</Badge>;
      case "alta":
        return <Badge variant="default" className="bg-warning text-warning-foreground">Alta</Badge>;
      case "media":
        return <Badge variant="outline">Média</Badge>;
      case "baixa":
        return <Badge variant="secondary">Baixa</Badge>;
      default:
        return <Badge variant="secondary">Normal</Badge>;
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR');
  };

  const alertasCriticos = alertas.filter(a => a.severity === "critical").length;
  const alertasAltos = alertas.filter(a => a.severity === "high").length;
  const alertasAtivos = alertas.filter(a => !a.is_read).length;

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto space-y-6">
            {/* Header da página */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <AlertTriangle className="h-6 w-6 text-primary" />
                  Alertas
                </h1>
                <p className="text-muted-foreground mt-1">
                  Monitor de alertas do sistema e notificações importantes
                </p>
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  disabled={isLoading}
                  className="btn-ripple hover-scale"
                >
                  <CheckCheck className="h-4 w-4 mr-2" />
                  {isLoading ? 'Processando...' : 'Marcar Todos'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleDeleteAll}
                  disabled={isLoading}
                  className="text-destructive hover:text-destructive btn-ripple hover-scale"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isLoading ? 'Excluindo...' : 'Excluir Todos'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="btn-ripple hover-scale bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Configurar
                </Button>
              </div>
            </div>

            {/* Cards de resumo */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Ativos</p>
                      <p className="text-2xl font-bold">{alertasAtivos}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-destructive/10 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Críticos</p>
                      <p className="text-2xl font-bold">{alertasCriticos}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-warning/10 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Alta Prioridade</p>
                      <p className="text-2xl font-bold">{alertasAltos}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-success/10 rounded-lg">
                      <Check className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Resolvidos Hoje</p>
                      <p className="text-2xl font-bold">8</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filtros Modernos */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar alertas..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="estoque_baixo">Estoque Baixo</SelectItem>
                    <SelectItem value="ruptura">Ruptura</SelectItem>
                    <SelectItem value="validade">Validade</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filters.severity} onValueChange={(value) => setFilters(prev => ({ ...prev, severity: value }))}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Severidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="error">Crítica</SelectItem>
                    <SelectItem value="warning">Alta</SelectItem>
                    <SelectItem value="info">Baixa</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="unread">Não lidos</SelectItem>
                    <SelectItem value="read">Lidos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Ações em lote */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllAlerts}
                      disabled={isLoading}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      {selectedAlerts.length === alertas.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {selectedAlerts.length} de {alertas.length} selecionados
                    </span>
                  </div>
                  
                  {selectedAlerts.length > 0 && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkAction('read')}
                        disabled={isLoading}
                      >
                        <CheckCheck className="h-4 w-4 mr-2" />
                        {isLoading ? 'Processando...' : 'Marcar como Lidos'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkAction('delete')}
                        disabled={isLoading}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {isLoading ? 'Excluindo...' : 'Excluir Selecionados'}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Lista de alertas */}
            <div className="space-y-4">
              {/* Indicador de limite de alertas */}
              {alertas.length >= 1000 && (
                <Card className="border-warning">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-warning">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        Mostrando os primeiros 1000 alertas. Há mais alertas disponíveis.
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-pulse-slow">Carregando alertas...</div>
                </div>
              ) : alertas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum alerta encontrado.
                </div>
              ) : (
                alertas.map((alerta) => (
                  <Card key={alerta.id} className={`${
                    alerta.severity === 'error' ? 'border-destructive' : 
                    alerta.severity === 'warning' ? 'border-warning' : ''
                  } ${alerta.is_read ? 'opacity-60' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedAlerts.includes(alerta.id)}
                              onChange={() => handleSelectAlert(alerta.id)}
                              className="rounded"
                            />
                            <div className={`p-2 rounded-lg ${
                              alerta.severity === 'error' ? 'bg-destructive/10' :
                              alerta.severity === 'warning' ? 'bg-warning/10' :
                              'bg-primary/10'
                            }`}>
                              {getTipoIcon(alerta.type)}
                            </div>
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">
                                {alerta.products?.name || alerta.title}
                              </h3>
                              {getPrioridadeBadge(alerta.severity)}
                              {alerta.is_read && <Badge variant="secondary">Lido</Badge>}
                            </div>
                            
                            <p className="text-muted-foreground mb-2">{alerta.message}</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                              {alerta.products?.sku && (
                                <div><span className="font-medium">Código:</span> {alerta.products.sku}</div>
                              )}
                              
                              {alerta.products?.current_stock !== undefined && (
                                <div>
                                  <span className="font-medium">Estoque:</span> {alerta.products.current_stock} 
                                  {alerta.products.min_stock && ` / Mín: ${alerta.products.min_stock}`}
                                </div>
                              )}
                              
                              <div><span className="font-medium">Criado em:</span> {formatDateTime(alerta.created_at)}</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          {!alerta.is_read && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleConfirmAlert(alerta.id)}
                              title="Confirmar alerta"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleRemoveAlert(alerta.id)}
                            title="Remover alerta"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Configurações de alertas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configurações de Alertas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Tipos de Alerta</h4>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked className="rounded" />
                        <span>Estoque baixo</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked className="rounded" />
                        <span>Produtos vencendo</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked className="rounded" />
                        <span>Solicitações pendentes</span>
                      </label>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-3">Notificações</h4>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked className="rounded" />
                        <span>E-mail</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="rounded" />
                        <span>WhatsApp</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="rounded" />
                        <span>SMS</span>
                      </label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
      </div>
    </MainLayout>
  );
}