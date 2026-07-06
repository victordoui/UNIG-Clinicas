import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, AlertTriangle, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CRITICAL_ACTIONS } from '@/lib/auditPdfExport';
import { cn } from '@/lib/utils';

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  details: any;
  created_at: string;
  organization_id: string | null;
  user_agent: string | null;
  ip_address: string | null;
  profiles?: {
    full_name: string;
    email: string;
    avatar_url?: string;
  };
  organizations?: {
    name: string;
    subscription_plan: string;
  };
}

interface AuditLogRowProps {
  log: AuditLog;
  expanded: boolean;
  onToggle: () => void;
  onViewDetails?: (log: AuditLog) => void;
}

const ACTION_CONFIG: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  product_created: { variant: 'default', label: 'Produto Criado' },
  product_updated: { variant: 'secondary', label: 'Produto Atualizado' },
  product_deleted: { variant: 'destructive', label: 'Produto Excluído' },
  movement_created: { variant: 'default', label: 'Movimentação' },
  user_invited: { variant: 'default', label: 'Usuário Convidado' },
  user_removed: { variant: 'destructive', label: 'Usuário Removido' },
};

const PLAN_LABELS: Record<string, string> = {
  basic: 'Basic',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

export function AuditLogRow({ log, expanded, onToggle, onViewDetails }: AuditLogRowProps) {
  const actionConfig = ACTION_CONFIG[log.action] || { variant: 'outline' as const, label: log.action };
  const isCritical = CRITICAL_ACTIONS.has(log.action);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <TableRow
        className={cn(
          "cursor-pointer hover:bg-muted/50",
          isCritical && "bg-destructive/5 border-l-4 border-l-destructive"
        )}
        onClick={onToggle}
      >
        <TableCell>
          <div className="flex flex-col">
            <span className="font-medium">{log.organizations?.name || 'N/A'}</span>
            {log.organizations?.subscription_plan && (
              <Badge variant="outline" className="mt-1 w-fit text-xs">
                {PLAN_LABELS[log.organizations.subscription_plan] || log.organizations.subscription_plan}
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {log.profiles ? getInitials(log.profiles.full_name) : 'NA'}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium text-sm">{log.profiles?.full_name || 'N/A'}</span>
              <span className="text-xs text-muted-foreground">{log.profiles?.email || 'N/A'}</span>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant={actionConfig.variant}>{actionConfig.label}</Badge>
            {isCritical && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" /> Crítico
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Ação sensível: exclusões, recusas ou mudanças de papel/permissão</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </TableCell>
        <TableCell>
          <div className="flex flex-col">
            <span className="text-sm">
              {format(new Date(log.created_at), "dd/MM/yyyy", { locale: ptBR })}
            </span>
            <span className="text-xs text-muted-foreground">
              {format(new Date(log.created_at), "HH:mm:ss", { locale: ptBR })}
            </span>
          </div>
        </TableCell>
        <TableCell>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-sm text-muted-foreground cursor-help">
                  {log.ip_address || 'N/A'}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <div className="max-w-xs">
                  <p className="text-xs font-medium">User Agent:</p>
                  <p className="text-xs break-words">{log.user_agent || 'N/A'}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            {onViewDetails && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onViewDetails(log); }}
                title="Ver detalhes"
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onToggle(); }}>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={6} className="bg-muted/30">
            <div className="p-4">
              <h4 className="font-semibold mb-2">Detalhes da Ação:</h4>
              <pre className="text-xs bg-background p-3 rounded-md overflow-auto max-h-40">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
