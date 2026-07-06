import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileSearch, ClipboardList, Receipt, Package, Inbox, Sparkles, Building2,
  Pencil, User as UserIcon, AlertTriangle, FileWarning, UserCog, ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useSupplierInbox } from "@/hooks/useSupplierInbox";
import { useSupplierPendencias } from "@/hooks/useSupplierPortal";
import { PushNotificationToggle } from "@/components/notifications/PushNotificationToggle";
import { ProfileModal } from "@/components/profile/ProfileModal";
import { CoverBanner } from "@/components/profile/CoverBanner";
import { CoverEditor } from "@/components/profile/CoverEditor";
import { useProfileCover } from "@/hooks/useProfileCover";

function greet() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export default function PortalDashboard() {
  const { supplierLink, profile } = useAuth();
  const { counts: inboxCounts } = useSupplierInbox();
  const pend = useSupplierPendencias();
  const [stats, setStats] = useState({ licitacoes: 0, propostas: 0, pedidos: 0, nfPendentes: 0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const [coverEditorOpen, setCoverEditorOpen] = useState(false);
  const { state: cover } = useProfileCover();

  useEffect(() => {
    if (!supplierLink) return;
    (async () => {
      const [quotes, orders] = await Promise.all([
        supabase.from("purchase_quotes").select("id,status").eq("supplier_id", supplierLink.supplier_id),
        supabase
          .from("purchase_orders")
          .select("id,numero,status,nota_fiscal_path,valor_total,created_at")
          .eq("supplier_id", supplierLink.supplier_id)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);
      const propostas = (quotes.data ?? []).filter((q: any) => q.status === "enviada" || q.status === "escolhida").length;
      const pedidos = (orders.data ?? []).filter((o: any) => o.status !== "recebido_total" && o.status !== "cancelado").length;
      const nfPendentes = (orders.data ?? []).filter((o: any) => !o.nota_fiscal_path).length;
      setStats({
        licitacoes: quotes.data?.length ?? 0,
        propostas,
        pedidos,
        nfPendentes,
      });
      setRecentOrders(orders.data ?? []);
    })();
  }, [supplierLink]);

  const cards = [
    { label: "Licitações", value: stats.licitacoes, icon: FileSearch, to: "/portal-fornecedor/licitacoes" },
    { label: "Propostas enviadas", value: stats.propostas, icon: Package, to: "/portal-fornecedor/licitacoes" },
    { label: "Pedidos em aberto", value: stats.pedidos, icon: ClipboardList, to: "/portal-fornecedor/pedidos" },
    { label: "NFs a emitir", value: stats.nfPendentes, icon: Receipt, to: "/portal-fornecedor/pedidos" },
  ];

  const firstName = (profile?.full_name || supplierLink?.supplier_name || "Fornecedor").split(" ")[0];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero */}
      <CoverBanner cover={cover} onEdit={() => setCoverEditorOpen(true)}>
        <div className="p-8 space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 text-primary-foreground/80 text-xs font-medium uppercase tracking-widest">
            <Sparkles className="h-3.5 w-3.5" /> Portal do Fornecedor
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            {greet()}, {firstName}
          </h1>
          <p className="text-primary-foreground/85 text-base">
            Acompanhe licitações, pedidos e envie notas fiscais no mesmo lugar.
          </p>
          {supplierLink?.supplier_name && (
            <div className="pt-2 flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4" /> {supplierLink.supplier_name}
            </div>
          )}
        </div>
      </CoverBanner>
      <CoverEditor open={coverEditorOpen} onOpenChange={setCoverEditorOpen} />

      {/* Pendências importantes */}
      {pend.total > 0 && (
        <Card className="border-amber-300/60 bg-amber-50/70 dark:bg-amber-900/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-900 dark:text-amber-200">
              <AlertTriangle className="h-5 w-5" />
              Pendências importantes
              <Badge variant="destructive" className="ml-1">{pend.total}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {pend.cadastroPendente && (
              <Link to="/portal-fornecedor/meu-cadastro" className="flex items-center justify-between gap-2 rounded-lg border bg-card p-3 hover:border-primary/60 transition">
                <span className="flex items-center gap-2 text-sm"><UserCog className="h-4 w-4 text-indigo-600" /> Cadastro a corrigir</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            )}
            {pend.docsPendentes > 0 && (
              <Link to="/portal-fornecedor/documentos" className="flex items-center justify-between gap-2 rounded-lg border bg-card p-3 hover:border-primary/60 transition">
                <span className="flex items-center gap-2 text-sm"><FileWarning className="h-4 w-4 text-rose-600" /> {pend.docsPendentes} documento(s) pendente(s)</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            )}
            {pend.docsVencidos > 0 && (
              <Link to="/portal-fornecedor/documentos" className="flex items-center justify-between gap-2 rounded-lg border bg-card p-3 hover:border-primary/60 transition">
                <span className="flex items-center gap-2 text-sm"><FileWarning className="h-4 w-4 text-destructive" /> {pend.docsVencidos} documento(s) vencido(s)</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            )}
            {pend.nfsRecusadas > 0 && (
              <Link to="/portal-fornecedor/notas-fiscais" className="flex items-center justify-between gap-2 rounded-lg border bg-card p-3 hover:border-primary/60 transition">
                <span className="flex items-center gap-2 text-sm"><Receipt className="h-4 w-4 text-amber-600" /> {pend.nfsRecusadas} NF(s) recusada(s)</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Caixa de entrada */}
      <Link to="/portal-fornecedor/caixa" className="block">
        <Card className="hover:shadow-md transition-shadow border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <Inbox className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">Caixa de entrada</p>
                <p className="text-xs text-muted-foreground">
                  {inboxCounts.total > 0
                    ? `${inboxCounts.total} ${inboxCounts.total === 1 ? "item aguarda" : "itens aguardam"} sua ação`
                    : "Você está em dia"}
                </p>
              </div>
            </div>
            {inboxCounts.total > 0 && (
              <Badge variant="destructive" className="text-sm px-2.5 py-1">{inboxCounts.total}</Badge>
            )}
          </CardContent>
        </Card>
      </Link>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.to}>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-muted-foreground font-normal">{c.label}</CardTitle>
                  <c.icon className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{c.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent + profile */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" /> Últimos pedidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum pedido ainda.</p>
            ) : (
              <ul className="divide-y">
                {recentOrders.map((o) => (
                  <li key={o.id} className="py-3 flex items-center justify-between gap-3">
                    <Link to={`/portal-fornecedor/pedidos/${o.id}`} className="flex-1 min-w-0 group">
                      <div className="font-mono text-xs text-primary">{o.numero}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(o.created_at).toLocaleDateString("pt-BR")} · R$ {Number(o.valor_total ?? 0).toFixed(2)}
                      </div>
                    </Link>
                    <Badge variant="outline" className="capitalize text-[10px]">{o.status.replace(/_/g, " ")}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-primary" /> Meu perfil
              </CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setProfileOpen(true)} className="text-primary">
                <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">Nome:</span> {profile?.full_name || "—"}</div>
            <div><span className="text-muted-foreground">E-mail:</span> {profile?.email}</div>
            <div><span className="text-muted-foreground">Empresa:</span> {supplierLink?.supplier_name || "—"}</div>
            {profile?.whatsapp && <div><span className="text-muted-foreground">WhatsApp:</span> {profile.whatsapp}</div>}
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Notificações</h2>
        <PushNotificationToggle />
      </div>

      <ProfileModal open={profileOpen} onOpenChange={setProfileOpen} />
    </div>
  );
}
