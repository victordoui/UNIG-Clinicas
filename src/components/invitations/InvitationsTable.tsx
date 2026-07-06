import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy, Eye, RotateCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { INVITATION_STATUS_BADGE, INVITATION_STATUS_LABEL, INVITEE_TYPE_LABEL } from "@/lib/invitationConstants";
import type { InvitationRow } from "@/hooks/useInvitations";

interface Props {
  items: InvitationRow[];
  onCopy: (token: string) => void;
  onView: (row: InvitationRow) => void;
  onResend: (row: InvitationRow) => void;
  onCancel: (row: InvitationRow) => void;
}

const fmt = (d: string | null) => (d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—");

export function InvitationsTable({ items, onCopy, onView, onResend, onCancel }: Props) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border rounded-lg">
        Nenhum convite encontrado com os filtros atuais.
      </div>
    );
  }

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>E-mail</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Nível</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Criado por</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead>Expira em</TableHead>
              <TableHead>Cadastro</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((i) => {
              const canCancel = i.status === "pending";
              const canResend = i.status === "pending" || i.status === "expired" || i.status === "cancelled";
              return (
                <TableRow key={i.id} className="animate-fade-in">
                  <TableCell className="font-medium text-sm">{i.email}</TableCell>
                  <TableCell className="text-sm">{i.filled_name || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn(INVITATION_STATUS_BADGE[i.status])}>
                      {INVITATION_STATUS_LABEL[i.status]}
                    </Badge>
                  </TableCell>
                  <TableCell><Badge variant="outline">Visitante</Badge></TableCell>
                  <TableCell className="text-sm">{INVITEE_TYPE_LABEL[i.invitee_type || ""] || "—"}</TableCell>
                  <TableCell className="text-sm">{i.invited_by_name || "—"}</TableCell>
                  <TableCell className="text-xs">{fmt(i.created_at)}</TableCell>
                  <TableCell className="text-xs">{fmt(i.expires_at)}</TableCell>
                  <TableCell className="text-xs">{fmt(i.accepted_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => onCopy(i.token)} title="Copiar link">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onView(i)} title="Detalhes">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canResend && (
                        <Button variant="ghost" size="sm" onClick={() => onResend(i)} title="Reenviar">
                          <RotateCw className="h-4 w-4" />
                        </Button>
                      )}
                      {canCancel && (
                        <Button variant="ghost" size="sm" onClick={() => onCancel(i)} title="Cancelar">
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-2">
        {items.map((i) => (
          <div key={i.id} className="border rounded-lg p-3 space-y-2 animate-fade-in">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{i.email}</div>
                {i.filled_name && <div className="text-xs text-muted-foreground">{i.filled_name}</div>}
              </div>
              <Badge variant="outline" className={cn(INVITATION_STATUS_BADGE[i.status])}>
                {INVITATION_STATUS_LABEL[i.status]}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <div>Tipo: {INVITEE_TYPE_LABEL[i.invitee_type || ""] || "—"} · Nível: Visitante</div>
              <div>Criado em {fmt(i.created_at)}</div>
              <div>Expira em {fmt(i.expires_at)}</div>
            </div>
            <div className="flex gap-1 flex-wrap pt-1">
              <Button variant="outline" size="sm" onClick={() => onCopy(i.token)}>
                <Copy className="h-3 w-3 mr-1" /> Link
              </Button>
              <Button variant="outline" size="sm" onClick={() => onView(i)}>
                <Eye className="h-3 w-3 mr-1" /> Detalhes
              </Button>
              {(i.status === "pending" || i.status === "expired" || i.status === "cancelled") && (
                <Button variant="outline" size="sm" onClick={() => onResend(i)}>
                  <RotateCw className="h-3 w-3 mr-1" /> Reenviar
                </Button>
              )}
              {i.status === "pending" && (
                <Button variant="outline" size="sm" onClick={() => onCancel(i)}>
                  <X className="h-3 w-3 mr-1 text-destructive" /> Cancelar
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
