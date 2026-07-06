import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, Copy, User, Building2, Globe, Clock, Tag } from "lucide-react";
import { toast } from "sonner";
import { CRITICAL_ACTIONS } from "@/lib/auditPdfExport";

const ACTION_LABELS: Record<string, string> = {
  product_created: "Produto Criado",
  product_updated: "Produto Atualizado",
  product_deleted: "Produto Excluído",
  movement_created: "Movimentação",
  user_invited: "Usuário Convidado",
  user_removed: "Usuário Removido",
  approval_rejected: "Aprovação Recusada",
  role_changed: "Papel Alterado",
  permission_changed: "Permissão Alterada",
  organization_deleted: "Organização Excluída",
};

interface Props {
  log: any | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

function getInitials(name?: string) {
  if (!name) return "NA";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function renderDetails(details: any) {
  if (details == null) return <p className="text-sm text-muted-foreground">Sem detalhes adicionais.</p>;
  if (typeof details !== "object") return <p className="text-sm">{String(details)}</p>;
  const entries = Object.entries(details);
  if (entries.length === 0) return <p className="text-sm text-muted-foreground">Sem detalhes adicionais.</p>;
  return (
    <div className="space-y-1.5">
      {entries.map(([k, v]) => (
        <div key={k} className="grid grid-cols-3 gap-2 text-sm border-b border-border/50 py-1.5">
          <span className="font-medium text-muted-foreground truncate">{k}</span>
          <span className="col-span-2 break-words">
            {typeof v === "object" ? (
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{JSON.stringify(v)}</code>
            ) : (
              String(v)
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

export function AuditLogDetailModal({ log, open, onOpenChange }: Props) {
  if (!log) return null;

  const isCritical = CRITICAL_ACTIONS.has(log.action);

  const copyJson = async () => {
    await navigator.clipboard.writeText(JSON.stringify(log.details ?? {}, null, 2));
    toast.success("JSON copiado");
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-2xl">
        <ModalHeader>
          <ModalTitle className="flex items-center gap-2 flex-wrap">
            <Tag className="h-5 w-5" />
            {ACTION_LABELS[log.action] || log.action}
            {isCritical && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Crítico
              </Badge>
            )}
          </ModalTitle>
          <ModalDescription className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
          </ModalDescription>
        </ModalHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-4">
            {/* Usuário */}
            <div className="border rounded-lg p-3">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <User className="h-4 w-4" /> Usuário
              </h4>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>{getInitials(log.profiles?.full_name)}</AvatarFallback>
                </Avatar>
                <div className="text-sm">
                  <div className="font-medium">{log.profiles?.full_name || "—"}</div>
                  <div className="text-muted-foreground">{log.profiles?.email || "—"}</div>
                </div>
              </div>
              <Separator className="my-2" />
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">IP:</span> {log.ip_address || "—"}
                </div>
                <div className="truncate">
                  <span className="text-muted-foreground">User Agent:</span>{" "}
                  <span title={log.user_agent || ""}>{log.user_agent || "—"}</span>
                </div>
              </div>
            </div>

            {/* Contexto */}
            <div className="border rounded-lg p-3">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <Building2 className="h-4 w-4" /> Organização
              </h4>
              <div className="text-sm">
                {log.organizations?.name || "—"}{" "}
                {log.organizations?.subscription_plan && (
                  <Badge variant="outline" className="ml-1 text-xs">
                    {log.organizations.subscription_plan}
                  </Badge>
                )}
              </div>
            </div>

            {/* Detalhes amigáveis */}
            <div className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                  <Globe className="h-4 w-4" /> Detalhes da Ação
                </h4>
                <Button size="sm" variant="ghost" onClick={copyJson}>
                  <Copy className="h-3.5 w-3.5 mr-1" /> Copiar JSON
                </Button>
              </div>
              {renderDetails(log.details)}
            </div>

            {/* JSON bruto */}
            <details className="border rounded-lg p-3">
              <summary className="text-sm font-medium cursor-pointer">Ver JSON bruto</summary>
              <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-auto max-h-60">
                {JSON.stringify(log, null, 2)}
              </pre>
            </details>
          </div>
        </ScrollArea>
      </ModalContent>
    </Modal>
  );
}
