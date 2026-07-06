import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PackagePlus, PackageCheck, PackageX, UserPlus, UserMinus, Activity } from "lucide-react";

interface AuditLogRowProps {
  log: {
    created_at: string;
    action: string;
    details?: any;
    ip_address?: string;
    user_agent?: string;
    profiles?: { full_name: string };
  };
}

export function AuditLogRow({ log }: AuditLogRowProps) {
  const getActionIcon = () => {
    switch (log.action) {
      case 'product_created':
        return <PackagePlus className="h-4 w-4 text-green-600" />;
      case 'product_updated':
        return <PackageCheck className="h-4 w-4 text-blue-600" />;
      case 'product_deleted':
        return <PackageX className="h-4 w-4 text-red-600" />;
      case 'user_invited':
        return <UserPlus className="h-4 w-4 text-green-600" />;
      case 'user_removed':
        return <UserMinus className="h-4 w-4 text-red-600" />;
      case 'movement_created':
        return <Activity className="h-4 w-4 text-blue-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionLabel = () => {
    const labels: Record<string, string> = {
      product_created: 'Produto Criado',
      product_updated: 'Produto Atualizado',
      product_deleted: 'Produto Deletado',
      user_invited: 'Usuário Convidado',
      user_removed: 'Usuário Removido',
      movement_created: 'Movimento Criado',
    };
    return labels[log.action] || log.action;
  };

  const getActionVariant = () => {
    if (log.action.includes('created') || log.action.includes('invited')) return 'default';
    if (log.action.includes('deleted') || log.action.includes('removed')) return 'destructive';
    return 'secondary';
  };

  return (
    <tr className="hover:bg-accent/50">
      <td className="p-3 text-sm">
        {format(new Date(log.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
      </td>
      <td className="p-3">
        <Badge variant={getActionVariant()} className="flex items-center gap-1 w-fit">
          {getActionIcon()}
          {getActionLabel()}
        </Badge>
      </td>
      <td className="p-3 text-sm">{log.profiles?.full_name || 'Sistema'}</td>
      <td className="p-3 text-sm">
        {log.details && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-blue-600 hover:underline text-left">
                Ver detalhes
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-md">
              <pre className="text-xs overflow-auto max-h-48">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            </TooltipContent>
          </Tooltip>
        )}
      </td>
      <td className="p-3 text-xs text-muted-foreground">{log.ip_address || '-'}</td>
      <td className="p-3 text-xs text-muted-foreground">
        {log.user_agent && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help truncate block max-w-[150px]">
                {log.user_agent.slice(0, 30)}...
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-sm text-xs">{log.user_agent}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </td>
    </tr>
  );
}
