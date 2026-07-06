import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle2, XCircle, AlertCircle, Mail, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { INVITATION_STATUS_BADGE, INVITATION_STATUS_LABEL, INVITEE_TYPE_LABEL } from "@/lib/invitationConstants";
import type { InvitationRow } from "@/hooks/useInvitations";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invitation: InvitationRow | null;
}

const fmt = (d: string | null) => (d ? new Date(d).toLocaleString("pt-BR") : "—");

export function InvitationDetailsDrawer({ open, onOpenChange, invitation }: Props) {
  const { toast } = useToast();
  if (!invitation) return null;

  const url = `${window.location.origin}/aceitar-convite/${invitation.token}`;
  const copy = async () => {
    await navigator.clipboard.writeText(url);
    toast({ title: "Link copiado" });
  };

  const timeline = [
    { icon: Mail, label: "Convite criado", date: invitation.created_at, color: "text-primary" },
    invitation.accepted_at ? { icon: CheckCircle2, label: "Cadastro concluído", date: invitation.accepted_at, color: "text-emerald-600" } : null,
    invitation.cancelled_at ? { icon: XCircle, label: "Cancelado", date: invitation.cancelled_at, color: "text-destructive" } : null,
    invitation.revoked_at && !invitation.cancelled_at ? { icon: XCircle, label: "Revogado", date: invitation.revoked_at, color: "text-destructive" } : null,
    !invitation.accepted_at && !invitation.cancelled_at && new Date(invitation.expires_at).getTime() < Date.now()
      ? { icon: AlertCircle, label: "Expirado", date: invitation.expires_at, color: "text-muted-foreground" }
      : null,
  ].filter(Boolean) as { icon: any; label: string; date: string; color: string }[];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Detalhes do convite</SheetTitle>
          <SheetDescription>{invitation.email}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={cn(INVITATION_STATUS_BADGE[invitation.status])}>
              {INVITATION_STATUS_LABEL[invitation.status]}
            </Badge>
            <Badge variant="outline">Nível inicial: Visitante</Badge>
            {invitation.invitee_type && (
              <Badge variant="outline">{INVITEE_TYPE_LABEL[invitation.invitee_type] || invitation.invitee_type}</Badge>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Criado por</div>
              <div className="font-medium">{invitation.invited_by_name || "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Criado em</div>
              <div className="font-medium">{fmt(invitation.created_at)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Expira em</div>
              <div className="font-medium">{fmt(invitation.expires_at)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Cadastro</div>
              <div className="font-medium">{fmt(invitation.accepted_at)}</div>
            </div>
            {invitation.filled_name && (
              <div className="col-span-2">
                <div className="text-xs text-muted-foreground">Nome preenchido</div>
                <div className="font-medium">{invitation.filled_name}</div>
              </div>
            )}
          </div>

          {invitation.internal_note && (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <div className="text-xs text-muted-foreground mb-1">Observação interna</div>
              {invitation.internal_note}
            </div>
          )}

          {invitation.status === "pending" && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Link do convite</div>
              <div className="flex gap-2">
                <input readOnly value={url} className="flex-1 text-xs font-mono px-2 py-1.5 rounded border bg-muted/30" />
                <Button variant="outline" size="icon" onClick={copy}><Copy className="h-4 w-4" /></Button>
              </div>
            </div>
          )}

          <div>
            <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <Clock className="h-3 w-3" /> Histórico
            </div>
            <div className="space-y-3">
              {timeline.map((t, idx) => {
                const Icon = t.icon;
                return (
                  <div key={idx} className="flex items-start gap-3">
                    <div className={cn("p-1.5 rounded-full bg-muted", t.color)}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">{t.label}</div>
                      <div className="text-xs text-muted-foreground">{fmt(t.date)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
