import { Card, CardContent } from "@/components/ui/card";
import { Clock, CheckCircle2, XCircle, AlertCircle, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InvitationRow } from "@/hooks/useInvitations";

interface Props {
  items: InvitationRow[];
  activeFilter?: string | null;
  onFilterClick?: (status: string | null) => void;
}

export function InvitationStatsCards({ items, activeFilter, onFilterClick }: Props) {
  const pending = items.filter((i) => i.status === "pending").length;
  const registered = items.filter((i) => i.status === "registered").length;
  const expired = items.filter((i) => i.status === "expired").length;
  const cancelled = items.filter((i) => i.status === "cancelled").length;
  const active = pending; // ativo = pendente válido

  const cards = [
    { key: "pending", label: "Ativos", value: active, icon: Mail, color: "text-primary" },
    { key: "pending2", label: "Pendentes", value: pending, icon: Clock, color: "text-amber-600" },
    { key: "registered", label: "Cadastrados", value: registered, icon: CheckCircle2, color: "text-emerald-600" },
    { key: "expired", label: "Expirados", value: expired, icon: AlertCircle, color: "text-muted-foreground" },
    { key: "cancelled", label: "Cancelados", value: cancelled, icon: XCircle, color: "text-destructive" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {cards.map((c) => {
        const filterKey = c.key === "pending2" ? "pending" : c.key === "pending" ? "pending" : c.key;
        const isActive = activeFilter === filterKey;
        const Icon = c.icon;
        return (
          <Card
            key={c.label}
            onClick={() => onFilterClick?.(isActive ? null : filterKey)}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md animate-fade-in",
              isActive && "ring-2 ring-primary"
            )}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("p-2 rounded-lg bg-muted/50", c.color)}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold">{c.value}</div>
                <div className="text-xs text-muted-foreground">{c.label}</div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
