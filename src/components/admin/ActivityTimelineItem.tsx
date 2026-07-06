import { ArrowDownCircle, ArrowUpCircle, ArrowRightLeft, Settings } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ActivityTimelineItemProps {
  movement: {
    type: string;
    quantity: number;
    created_at: string;
    products?: { name: string };
    profiles?: { full_name: string };
    supplier?: string;
    destination?: string;
    reason?: string;
  };
}

export function ActivityTimelineItem({ movement }: ActivityTimelineItemProps) {
  const getIcon = () => {
    switch (movement.type) {
      case 'entrada':
        return <ArrowDownCircle className="h-5 w-5 text-green-600" />;
      case 'saida':
        return <ArrowUpCircle className="h-5 w-5 text-red-600" />;
      case 'transferencia':
        return <ArrowRightLeft className="h-5 w-5 text-blue-600" />;
      default:
        return <Settings className="h-5 w-5 text-gray-600" />;
    }
  };

  const getTypeLabel = () => {
    switch (movement.type) {
      case 'entrada':
        return 'Entrada';
      case 'saida':
        return 'Saída';
      case 'transferencia':
        return 'Transferência';
      case 'ajuste':
        return 'Ajuste';
      default:
        return movement.type;
    }
  };

  return (
    <div className="flex gap-4 p-4 border-l-2 border-border hover:bg-accent/50 transition-colors">
      <div className="mt-1">{getIcon()}</div>
      <div className="flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium">
              {getTypeLabel()} de Produto: {movement.products?.name}
            </p>
            <p className="text-sm text-muted-foreground">
              {movement.quantity} unidades
            </p>
          </div>
        </div>
        
        {(movement.supplier || movement.destination || movement.reason) && (
          <div className="mt-2 text-sm text-muted-foreground space-y-1">
            {movement.supplier && <p>Fornecedor: {movement.supplier}</p>}
            {movement.destination && <p>Destino: {movement.destination}</p>}
            {movement.reason && <p>Motivo: {movement.reason}</p>}
          </div>
        )}
        
        <p className="text-xs text-muted-foreground mt-2">
          Por: {movement.profiles?.full_name || 'Desconhecido'} | {' '}
          {format(new Date(movement.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </p>
      </div>
    </div>
  );
}
