import { useEffect } from "react";
import { AlertTriangle, Clock, TrendingDown, Check, X, CheckCheck, Trash2 } from "lucide-react";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription } from "@/components/ui/modal";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSecureAlerts } from "@/hooks/useSecureAlerts";
import { useToast } from "@/hooks/use-toast";

interface AlertsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AlertsModal({ open, onOpenChange }: AlertsModalProps) {
  const { alerts, loading, loadAlerts, markAsRead, markAllAsRead, deleteAllAlerts, canAccessAlerts } = useSecureAlerts();
  const { toast } = useToast();

  useEffect(() => {
    if (open && canAccessAlerts) {
      loadAlerts();
    }
  }, [open, canAccessAlerts]);

  const handleMarkAsRead = async (alertId: string) => {
    await markAsRead(alertId);
    toast({
      title: "Alerta marcado como lido",
      description: "O alerta foi marcado como lido com sucesso.",
    });
  };

  const handleDeleteAlert = async (alertId: string) => {
    // For now, just mark as read since we don't have individual delete in secure hook
    await markAsRead(alertId);
    toast({
      title: "Alerta removido",
      description: "O alerta foi marcado como lido.",
    });
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "alta":
        return <Badge variant="destructive">Alta</Badge>;
      case "media":
        return <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20">Média</Badge>;
      case "baixa":
        return <Badge variant="secondary">Baixa</Badge>;
      default:
        return <Badge variant="secondary">Normal</Badge>;
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "estoque_baixo":
        return <TrendingDown className="h-4 w-4 text-warning" />;
      case "ruptura":
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case "validade":
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-4xl max-h-[80vh]">
        <ModalHeader>
          <ModalTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Todos os Alertas
          </ModalTitle>
          <ModalDescription>
            Visualize e gerencie todos os alertas do sistema
          </ModalDescription>
          <div className="flex gap-2 mt-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={async () => {
                await markAllAsRead();
                toast({
                  title: "Todos os alertas marcados como lidos",
                  description: "Operação realizada com sucesso.",
                });
              }}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Marcar Todos
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={async () => {
                if (confirm("Tem certeza que deseja excluir todos os alertas?")) {
                  await deleteAllAlerts();
                  toast({
                    title: "Todos os alertas foram excluídos",
                    description: "Operação realizada com sucesso.",
                  });
                }
              }}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir Todos
            </Button>
          </div>
        </ModalHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-pulse-slow">Carregando alertas...</div>
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum alerta encontrado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <Card key={alert.id} className={`${alert.is_read ? 'opacity-60' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center">
                          {getAlertIcon(alert.type)}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{alert.title}</h3>
                            {getSeverityBadge(alert.severity)}
                          </div>
                          
                          <p className="text-muted-foreground mb-2">{alert.message}</p>
                          
                          <div className="text-sm text-muted-foreground">
                            {alert.created_at && new Date(alert.created_at).toLocaleString('pt-BR')}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        {!alert.is_read && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleMarkAsRead(alert.id)}
                            className="hover-scale"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteAlert(alert.id)}
                          className="hover-scale"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </ModalContent>
    </Modal>
  );
}