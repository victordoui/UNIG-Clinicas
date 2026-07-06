import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Link } from "react-router-dom";
import {
  ArrowRightLeft,
  Bell,
  Users,
  FileText,
  Settings,
  QrCode,
  ClipboardCheck,
  Tag,
  Send,
  ShoppingCart,
  Package,
  Wallet,
  Receipt,
  TrendingUp,
  TrendingDown,
  Plus,
  Truck,
  MapPin,
  Layers,
  BarChart3,
  Sparkles,
  History,
  User,
  KanbanSquare,
  LineChart,
  Target,
  FileSearch,
  FileSignature,
  PackageCheck,
  AlertTriangle,
  Trophy,
  Sun,
  Moon,
  type LucideIcon,
} from "lucide-react";
import { useTheme } from "@/components/ui/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ProductEntryModal } from "@/components/products/ProductEntryModal";
import { ProductWithdrawalModal } from "@/components/products/ProductWithdrawalModal";
import { NewProductModal } from "@/components/products/NewProductModal";

interface MoreOptionsSheetProps {
  children: React.ReactNode;
  alertCount?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface MenuItem {
  title: string;
  icon: LucideIcon;
  href?: string;
  action?: "entry" | "withdrawal" | "new-product";
  badge?: number;
  accent?: string;
}

interface MenuSection {
  label: string;
  items: MenuItem[];
}

export function MoreOptionsSheet({
  children,
  alertCount = 0,
  open,
  onOpenChange,
}: MoreOptionsSheetProps) {
  const { isSuperAdmin, currentRole, unigRole } = useAuth();
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  const [quickAction, setQuickAction] = useState<
    "entry" | "withdrawal" | "new-product" | null
  >(null);

  if (isSuperAdmin) return null;

  const isManager = currentRole === "admin" || currentRole === "gerente";
  const isAdmin = currentRole === "admin";

  const defaultSections: MenuSection[] = [
    {
      label: "Ações Rápidas",
      items: [
        {
          title: "Entrada",
          icon: TrendingUp,
          action: "entry",
          accent: "text-success",
        },
        {
          title: "Saída",
          icon: TrendingDown,
          action: "withdrawal",
          accent: "text-destructive",
        },
        {
          title: "Novo Produto",
          icon: Plus,
          action: "new-product",
          accent: "text-primary",
        },
        { title: "Scanner", icon: QrCode, href: "/scanner", accent: "text-primary" },
      ],
    },
    {
      label: "Operação",
      items: [
        { title: "Movimentações", icon: ArrowRightLeft, href: "/movimentacoes" },
        { title: "Inventário", icon: ClipboardCheck, href: "/inventario" },
        { title: "Etiquetas", icon: Tag, href: "/etiquetas" },
        { title: "Transferências", icon: Send, href: "/transferencias" },
        { title: "Alertas", icon: Bell, href: "/alertas", badge: alertCount },
      ],
    },
    {
      label: "Compras",
      items: [
        { title: "Solicitações", icon: ShoppingCart, href: "/solicitacoes" },
        { title: "Cotações", icon: FileSearch, href: "/compras/cotacoes" },
        { title: "Pedidos", icon: Package, href: "/pedidos" },
        { title: "Kanban", icon: KanbanSquare, href: "/compras/kanban" },
        { title: "Comprador", icon: Target, href: "/compras/painel" },
      ],
    },
    {
      label: "Financeiro",
      items: [
        { title: "Contas a Pagar", icon: Wallet, href: "/financeiro/contas-a-pagar" },
        { title: "Fluxo de Caixa", icon: LineChart, href: "/financeiro/fluxo-caixa" },
        { title: "Notas Fiscais", icon: Receipt, href: "/fiscal/notas" },
      ],
    },
    {
      label: "Cadastros",
      items: [
        { title: "Fornecedores", icon: Truck, href: "/fornecedores" },
        { title: "Locais", icon: MapPin, href: "/locais" },
        { title: "Lotes", icon: Layers, href: "/lotes" },
        ...(isManager
          ? [{ title: "Usuários", icon: Users, href: "/usuarios" }]
          : []),
      ],
    },
    {
      label: "Insights",
      items: [
        ...(isManager
          ? [{ title: "Relatórios", icon: FileText, href: "/relatorios" }]
          : []),
        { title: "Insights", icon: Sparkles, href: "/insights" },
        { title: "Previsão", icon: BarChart3, href: "/inteligencia/previsao-demanda" },
        { title: "Reposição", icon: TrendingUp, href: "/inteligencia/sugestoes-reposicao" },
      ],
    },
    {
      label: "Sistema",
      items: [
        ...(isAdmin
          ? [{ title: "Configurações", icon: Settings, href: "/configuracoes" }]
          : []),
        ...(isManager
          ? [{ title: "Auditoria", icon: History, href: "/auditoria" }]
          : []),
        { title: "Início", icon: User, href: "/dashboard" },
      ],
    },
  ];

  const buyerSections: MenuSection[] = [
    {
      label: "Meu Trabalho",
      items: [
        { title: "Painel", icon: Target, href: "/compras/painel" },
        { title: "Minhas CIs", icon: User, href: "/compras/kanban?view=mine" },
      ],
    },
    {
      label: "Compras",
      items: [
        { title: "Kanban", icon: KanbanSquare, href: "/compras/kanban" },
        { title: "Cotações", icon: FileSearch, href: "/compras/cotacoes" },
        { title: "Pedidos", icon: Package, href: "/pedidos" },
      ],
    },
    {
      label: "Fornecedores",
      items: [
        { title: "Cadastro", icon: Truck, href: "/fornecedores" },
        { title: "Desempenho", icon: Trophy, href: "/fornecedores/ranking" },
        { title: "Contratos", icon: FileSignature, href: "/contratos" },
      ],
    },
    {
      label: "Recebimentos",
      items: [
        { title: "Conferência", icon: PackageCheck, href: "/recebimentos/conferencia" },
        { title: "Divergências", icon: AlertTriangle, href: "/recebimentos/divergencias" },
        { title: "Fiscal", icon: Receipt, href: "/recebimento-fiscal" },
      ],
    },
  ];

  const warehouseSections: MenuSection[] = [
    defaultSections[0],
    defaultSections[1],
    {
      label: "Recebimentos",
      items: [
        { title: "Conferência", icon: PackageCheck, href: "/recebimentos/conferencia" },
        { title: "Divergências", icon: AlertTriangle, href: "/recebimentos/divergencias" },
        { title: "Fiscal", icon: Receipt, href: "/recebimento-fiscal" },
      ],
    },
    defaultSections[defaultSections.length - 1],
  ];

  const sections = unigRole === "compras"
    ? buyerSections
    : unigRole === "almoxarifado"
      ? warehouseSections
      : defaultSections;

  const handleClose = () => onOpenChange?.(false);

  const handleAction = (action: NonNullable<MenuItem["action"]>) => {
    handleClose();
    setQuickAction(action);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetTrigger asChild>{children}</SheetTrigger>

        <SheetContent
          side="bottom"
          className={cn(
            "h-[85vh] rounded-t-3xl border-t-0 p-0",
            "bg-background/95 backdrop-blur-2xl",
            "pb-[env(safe-area-inset-bottom)]"
          )}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-2 pb-1">
            <div className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
          </div>

          <SheetHeader className="px-6 pt-2 pb-3 text-left">
            <SheetTitle className="text-xl tracking-tight">Menu</SheetTitle>
          </SheetHeader>

          <div className="overflow-y-auto px-4 pb-6 space-y-6 h-[calc(85vh-5rem)]">
            {sections.map((section) => {
              if (section.items.length === 0) return null;
              return (
                <section key={section.label} className="animate-fade-in">
                  <h3 className="px-2 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.label}
                  </h3>
                  <div className="grid grid-cols-4 gap-2">
                    {section.items.map((item) => (
                      <MenuTile
                        key={item.title}
                        item={item}
                        onNavigate={handleClose}
                        onAction={handleAction}
                      />
                    ))}
                  </div>
                </section>
              );
            })}

            <section className="animate-fade-in">
              <h3 className="px-2 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Aparência
              </h3>
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setTheme(isDark ? "light" : "dark")}
                  className="group flex flex-col items-center gap-1.5 p-2 rounded-2xl active:scale-95 transition-transform"
                >
                  <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-muted/60 group-hover:bg-muted transition-colors shadow-sm">
                    {isDark ? (
                      <Sun className="h-5 w-5 text-amber-500" strokeWidth={2} />
                    ) : (
                      <Moon className="h-5 w-5 text-primary" strokeWidth={2} />
                    )}
                  </div>
                  <span className="text-[11px] font-medium text-center text-foreground leading-tight">
                    {isDark ? "Tema claro" : "Tema escuro"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("system")}
                  className="group flex flex-col items-center gap-1.5 p-2 rounded-2xl active:scale-95 transition-transform"
                >
                  <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-muted/60 group-hover:bg-muted transition-colors shadow-sm">
                    <Settings className="h-5 w-5 text-muted-foreground" strokeWidth={2} />
                  </div>
                  <span className="text-[11px] font-medium text-center text-foreground leading-tight">
                    Sistema
                  </span>
                </button>
              </div>
            </section>
          </div>
        </SheetContent>
      </Sheet>

      <ProductEntryModal
        open={quickAction === "entry"}
        onOpenChange={(o) => !o && setQuickAction(null)}
      />
      <ProductWithdrawalModal
        open={quickAction === "withdrawal"}
        onOpenChange={(o) => !o && setQuickAction(null)}
      />
      <NewProductModal
        open={quickAction === "new-product"}
        onOpenChange={(o) => !o && setQuickAction(null)}
      />
    </>
  );
}

function MenuTile({
  item,
  onNavigate,
  onAction,
}: {
  item: MenuItem;
  onNavigate: () => void;
  onAction: (action: NonNullable<MenuItem["action"]>) => void;
}) {
  const content = (
    <>
      <div className="relative">
        <div
          className={cn(
            "flex items-center justify-center h-12 w-12 rounded-2xl",
            "bg-muted/60 group-hover:bg-muted transition-colors",
            "shadow-sm"
          )}
        >
          <item.icon
            className={cn("h-5 w-5", item.accent ?? "text-foreground")}
            strokeWidth={2}
          />
        </div>
        {item.badge && item.badge > 0 ? (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-4 min-w-4 px-1 flex items-center justify-center text-[9px] font-semibold"
          >
            {item.badge > 9 ? "9+" : item.badge}
          </Badge>
        ) : null}
      </div>
      <span className="text-[11px] font-medium text-center text-foreground leading-tight line-clamp-2">
        {item.title}
      </span>
    </>
  );

  const wrapperClass =
    "group flex flex-col items-center gap-1.5 p-2 rounded-2xl active:scale-95 transition-transform";

  if (item.action) {
    return (
      <button
        type="button"
        onClick={() => onAction(item.action!)}
        className={wrapperClass}
      >
        {content}
      </button>
    );
  }

  return (
    <Link to={item.href!} onClick={onNavigate} className={wrapperClass}>
      {content}
    </Link>
  );
}
