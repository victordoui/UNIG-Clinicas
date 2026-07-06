import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Package, ArrowRightLeft, Bell, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { MoreOptionsSheet } from "./MoreOptionsSheet";
import { useAlerts } from "@/hooks/useAlerts";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";

interface BottomNavItem {
  title: string;
  icon: any;
  href: string;
  withAlertBadge?: boolean;
}

function haptic() {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(8);
    }
  } catch {
    /* no-op */
  }
}

export function BottomNav() {
  const location = useLocation();
  const { alerts } = useAlerts();
  const { isSuperAdmin } = useAuth();
  const alertCount = alerts.length;
  const [menuOpen, setMenuOpen] = useState(false);

  if (isSuperAdmin) return null;

  const leftItems: BottomNavItem[] = [
    { title: "Painel", icon: Home, href: "/dashboard" },
    { title: "Produtos", icon: Package, href: "/produtos" },
  ];
  const rightItems: BottomNavItem[] = [
    { title: "Movimentações", icon: ArrowRightLeft, href: "/movimentacoes" },
    { title: "Alertas", icon: Bell, href: "/alertas", withAlertBadge: true },
  ];

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 md:hidden",
        "bg-card border-t border-border",
        "shadow-[0_-4px_12px_-6px_rgba(0,0,0,0.15)]",
        "pb-[env(safe-area-inset-bottom)]"
      )}
      aria-label="Navegação principal"
    >
      <div
        className={cn(
          "relative flex items-center justify-around h-16 px-2"
        )}
      >
        {leftItems.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            isActive={location.pathname === item.href}
            alertCount={alertCount}
          />
        ))}

        {/* Botão central alinhado */}
        <div className="flex-1 flex items-center justify-center">
          <MoreOptionsSheet
            alertCount={alertCount}
            open={menuOpen}
            onOpenChange={setMenuOpen}
          >
            <button
              onClick={haptic}
              aria-label="Abrir menu"
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5",
                "min-h-[48px] py-1 rounded-2xl",
                "text-muted-foreground hover:text-foreground",
                "transition-all duration-200 active:scale-95"
              )}
            >
              <div
                className={cn(
                  "h-9 w-9 rounded-full flex items-center justify-center",
                  "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground",
                  "shadow-[0_4px_12px_-4px_hsl(var(--primary)/0.45)]"
                )}
              >
                <LayoutGrid className="h-5 w-5" strokeWidth={2.25} />
              </div>
              <span className="text-[10px] font-medium tracking-tight leading-none">
                Menu
              </span>
            </button>
          </MoreOptionsSheet>
        </div>

        {rightItems.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            isActive={location.pathname === item.href}
            alertCount={alertCount}
          />
        ))}
      </div>
    </nav>
  );
}

function NavItem({
  item,
  isActive,
  alertCount,
}: {
  item: BottomNavItem;
  isActive: boolean;
  alertCount: number;
}) {
  return (
    <Link
      to={item.href}
      onClick={haptic}
      className={cn(
        "relative flex-1 flex flex-col items-center justify-center gap-0.5",
        "min-h-[48px] py-1 rounded-2xl",
        "transition-all duration-200 active:scale-95",
        isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
      )}
    >
      <div
        className={cn(
          "relative flex items-center justify-center rounded-full transition-all duration-200",
          isActive ? "bg-primary/10 px-3 py-1" : "px-2 py-1"
        )}
      >
        <item.icon
          className={cn(
            "h-5 w-5 transition-transform duration-200",
            isActive && "scale-110"
          )}
          strokeWidth={isActive ? 2.4 : 2}
        />
        {item.withAlertBadge && alertCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-0.5 -right-1 h-4 min-w-4 px-1 flex items-center justify-center text-[9px] font-semibold animate-pulse"
          >
            {alertCount > 9 ? "9+" : alertCount}
          </Badge>
        )}
      </div>
      <span
        className={cn(
          "text-[10px] font-medium tracking-tight leading-none truncate max-w-full px-1",
          isActive && "font-semibold"
        )}
      >
        {item.title}
      </span>
    </Link>
  );
}
