import { useState } from "react";
import { AlertTriangle, Clock, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertsModal } from "@/components/dashboard/AlertsModal";
import { useSecureAlerts } from "@/hooks/useSecureAlerts";

interface Alert {
  id: string;
  type: string;
  product: string;
  message: string;
  severity: "info" | "warning" | "error";
  timestamp: string;
  title: string;
}

export function AlertsPanel() {
  const [modalOpen, setModalOpen] = useState(false);
  const { alerts: rawAlerts, loading, canAccessAlerts } = useSecureAlerts();

  // Format alerts for display
  const alerts = rawAlerts.slice(0, 5).map(alert => ({
    id: alert.id,
    type: alert.type,
    product: alert.title || 'Produto não encontrado',
    message: alert.message,
    severity: alert.severity === 'critical' ? 'error' as const : 
              alert.severity === 'high' ? 'warning' as const : 'info' as const,
    timestamp: formatTimestamp(alert.created_at),
    title: alert.title
  }));

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
  const getSeverityBadge = (severity: Alert["severity"]) => {
    switch (severity) {
      case "error":
        return <Badge variant="destructive">Alta</Badge>;
      case "warning":
        return <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20">Média</Badge>;
      case "info":
        return <Badge variant="secondary">Baixa</Badge>;
      default:
        return null;
    }
  };

  const getAlertIcon = (type: Alert["type"]) => {
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
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          Alertas Ativos
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setModalOpen(true)}>
            Ver Todos
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!canAccessAlerts ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Acesso restrito a administradores</p>
          </div>
        ) : loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-background-secondary/50 border border-border/50">
                <div className="w-8 h-8 rounded-lg bg-muted animate-pulse"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse"></div>
                  <div className="h-3 bg-muted rounded w-2/3 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        ) : alerts.length > 0 ? (
          alerts.map((alert) => (
            <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg bg-background-secondary/50 border border-border/50">
              <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center mt-0.5">
                {getAlertIcon(alert.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-sm text-foreground">
                    {alert.title}
                  </p>
                  {getSeverityBadge(alert.severity)}
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {alert.message}
                </p>
                <p className="text-xs text-muted-foreground">
                  {alert.timestamp}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum alerta ativo</p>
          </div>
        )}
      </CardContent>
      <AlertsModal open={modalOpen} onOpenChange={setModalOpen} />
    </Card>
  );
}