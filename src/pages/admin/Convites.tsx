import { useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, UserPlus, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useInvitations, type InvitationRow } from "@/hooks/useInvitations";
import { InvitationStatsCards } from "@/components/invitations/InvitationStatsCards";
import { InvitationFilters, type InvitationFiltersState } from "@/components/invitations/InvitationFilters";
import { InvitationsTable } from "@/components/invitations/InvitationsTable";
import { InvitationDetailsDrawer } from "@/components/invitations/InvitationDetailsDrawer";
import { NewInvitationModal } from "@/components/invitations/NewInvitationModal";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Convites() {
  const { isSuperAdmin, currentRole } = useAuth();
  const { toast } = useToast();
  const canManage = isSuperAdmin || currentRole === "admin";

  const { items, loading, reload } = useInvitations();
  const [newOpen, setNewOpen] = useState(false);
  const [detail, setDetail] = useState<InvitationRow | null>(null);
  const [cancelTarget, setCancelTarget] = useState<InvitationRow | null>(null);
  const [filters, setFilters] = useState<InvitationFiltersState>({ search: "", status: "all", invitee_type: "all", created_by: "all" });

  const creators = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((i) => { if (i.invited_by) map.set(i.invited_by, i.invited_by_name || "—"); });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (filters.status !== "all" && i.status !== filters.status) return false;
      if (filters.invitee_type !== "all" && i.invitee_type !== filters.invitee_type) return false;
      if (filters.created_by !== "all" && i.invited_by !== filters.created_by) return false;
      if (filters.search) {
        const s = filters.search.toLowerCase();
        if (!i.email.toLowerCase().includes(s) && !(i.filled_name || "").toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [items, filters]);

  const copyLink = async (token: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}/aceitar-convite/${token}`);
    toast({ title: "Link copiado" });
  };

  const resend = async (row: InvitationRow) => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) { toast({ title: "Sessão expirada", variant: "destructive" }); return; }
    const { data, error } = await supabase.functions.invoke("resend-invitation", {
      body: { invitation_id: row.id, expires_in_days: 5 },
    });
    if (error || !data?.success) {
      toast({ title: "Erro ao reenviar", description: error?.message || data?.error, variant: "destructive" });
      return;
    }
    await navigator.clipboard.writeText(data.invite_url);
    toast({ title: "Convite reenviado", description: "Novo link copiado para a área de transferência." });
    reload();
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) { toast({ title: "Sessão expirada", variant: "destructive" }); return; }
    const { data, error } = await supabase.functions.invoke("cancel-invitation", {
      body: { invitation_id: cancelTarget.id },
    });
    if (error || !data?.success) {
      toast({ title: "Erro ao cancelar", description: error?.message || data?.error, variant: "destructive" });
    } else {
      toast({ title: "Convite cancelado" });
      reload();
    }
    setCancelTarget(null);
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Mail className="h-6 w-6 text-primary" />
              Convites de Acesso
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Gere links únicos de convite. Todo cadastro inicia como Visitante e será revisado pela administração.
            </p>
          </div>
          {canManage && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={reload}>
                <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
              </Button>
              <Button size="sm" className="bg-gradient-primary text-white" onClick={() => setNewOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" /> Novo convite
              </Button>
            </div>
          )}
        </div>

        {!canManage ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Você não tem permissão para gerenciar convites.
            </CardContent>
          </Card>
        ) : (
          <>
            <InvitationStatsCards
              items={items}
              activeFilter={filters.status === "all" ? null : filters.status}
              onFilterClick={(s) => setFilters((f) => ({ ...f, status: s ?? "all" }))}
            />
            <InvitationFilters value={filters} onChange={setFilters} creators={creators} />
            {loading ? (
              <div className="text-center py-12 text-muted-foreground animate-pulse-slow">Carregando convites...</div>
            ) : (
              <InvitationsTable
                items={filtered}
                onCopy={copyLink}
                onView={(r) => setDetail(r)}
                onResend={resend}
                onCancel={(r) => setCancelTarget(r)}
              />
            )}
          </>
        )}
      </div>

      <NewInvitationModal open={newOpen} onOpenChange={setNewOpen} onCreated={reload} />
      <InvitationDetailsDrawer open={!!detail} onOpenChange={(o) => !o && setDetail(null)} invitation={detail} />

      <AlertDialog open={!!cancelTarget} onOpenChange={(o) => !o && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar convite?</AlertDialogTitle>
            <AlertDialogDescription>
              O link <strong>{cancelTarget?.email}</strong> ficará inacessível. O convite continuará visível no histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel} className="bg-destructive text-destructive-foreground">
              Cancelar convite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
