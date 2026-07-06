import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CheckCheck, X, Bell, Package, CalendarClock, ShieldAlert, Settings as Cog } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type AlertType = "low_stock" | "expired" | "system" | "security";

interface AlertItem {
  id: string;
  title: string;
  message: string;
  type: AlertType;
  severity?: string;
  product_id?: string | null;
  created_at: string;
}

interface Props {
  notifications: AlertItem[];
  totalUnread: number;
  onMarkRead: (id: string) => void;
  onClearAll: () => void;
  onClose?: () => void;
}

const TYPE_META: Record<AlertType, { label: string; icon: any; route: string }> = {
  low_stock: { label: "Estoque", icon: Package, route: "/produtos" },
  expired:   { label: "Validade", icon: CalendarClock, route: "/lotes" },
  security:  { label: "Segurança", icon: ShieldAlert, route: "/alertas" },
  system:    { label: "Sistema", icon: Cog, route: "/alertas" },
};

export function NotificationCenter({
  notifications,
  totalUnread,
  onMarkRead,
  onClearAll,
  onClose,
}: Props) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"todas" | AlertType>("todas");

  const grouped = useMemo(() => {
    const g: Record<AlertType, AlertItem[]> = {
      low_stock: [], expired: [], system: [], security: [],
    };
    for (const n of notifications) {
      const t = (n.type as AlertType) ?? "system";
      if (g[t]) g[t].push(n); else g.system.push(n);
    }
    return g;
  }, [notifications]);

  const visibleTabs = (Object.keys(TYPE_META) as AlertType[]).filter(t => grouped[t].length > 0);
  const list = tab === "todas" ? notifications : grouped[tab];

  const open = (n: AlertItem) => {
    onMarkRead(n.id);
    onClose?.();
    const route = n.product_id ? "/produtos" : TYPE_META[n.type]?.route ?? "/alertas";
    navigate(route);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-sm leading-none">Notificações</h4>
          {totalUnread > 0 && (
            <span className="text-[10px] font-medium bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">
              {totalUnread > 99 ? "99+" : totalUnread} novas
            </span>
          )}
        </div>
        {notifications.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="h-7 px-2 text-xs"
          >
            <CheckCheck className="h-3.5 w-3.5 mr-1" />
            Marcar todas
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhuma notificação</p>
        </div>
      ) : (
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          {visibleTabs.length > 1 && (
            <TabsList className="w-full justify-start h-8 p-0.5 bg-muted/50">
              <TabsTrigger value="todas" className="text-xs h-7 px-2">
                Todas
              </TabsTrigger>
              {visibleTabs.map((t) => {
                const Icon = TYPE_META[t].icon;
                return (
                  <TabsTrigger key={t} value={t} className="text-xs h-7 px-2 gap-1">
                    <Icon className="h-3 w-3" />
                    {TYPE_META[t].label}
                    <span className="ml-1 text-[10px] opacity-70">{grouped[t].length}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          )}

          <TabsContent value={tab} className="mt-3">
            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {list.map((n) => {
                const Icon = TYPE_META[n.type]?.icon ?? Bell;
                return (
                  <button
                    key={n.id}
                    onClick={() => open(n)}
                    className="group w-full text-left flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="mt-0.5 h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); onMarkRead(n.id); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onMarkRead(n.id); } }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 rounded hover:bg-background flex items-center justify-center"
                      aria-label="Marcar como lida"
                    >
                      <X className="h-3 w-3" />
                    </span>
                  </button>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      )}

      <div className="pt-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs h-8"
          onClick={() => { onClose?.(); navigate("/alertas"); }}
        >
          Ver todas no Centro de Alertas
        </Button>
      </div>
    </div>
  );
}
