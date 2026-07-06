import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Home, FileSearch, Package, ClipboardList, LogOut, Truck, Inbox, User, FileText, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSupplierInbox } from "@/hooks/useSupplierInbox";
import { SupplierStatusBanner } from "@/components/fornecedor/SupplierStatusBanner";

const navItems = [
  { to: "/portal-fornecedor", label: "Início", icon: Home, end: true },
  { to: "/portal-fornecedor/caixa", label: "Caixa", icon: Inbox, badgeKey: "inbox" as const },
  { to: "/portal-fornecedor/meu-cadastro", label: "Meu cadastro", icon: User },
  { to: "/portal-fornecedor/documentos", label: "Documentos", icon: FileText },
  { to: "/portal-fornecedor/licitacoes", label: "Licitações", icon: FileSearch },
  { to: "/portal-fornecedor/itens", label: "Itens", icon: Package },
  { to: "/portal-fornecedor/pedidos", label: "Pedidos", icon: ClipboardList },
  { to: "/portal-fornecedor/notas-fiscais", label: "Notas fiscais", icon: Receipt },
];

export function SupplierLayout() {
  const { supplierLink, signOut } = useAuth();
  const navigate = useNavigate();
  const { counts } = useSupplierInbox();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Truck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Portal do Fornecedor</p>
              <p className="font-semibold text-sm">{supplierLink?.supplier_name ?? "Fornecedor"}</p>
            </div>
            <Badge variant="outline" className="ml-2">Fornecedor</Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={() => signOut()}>
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </Button>
        </div>
        <nav className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {navItems.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={(it as any).end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 px-4 py-3 text-sm border-b-2 whitespace-nowrap transition-colors",
                  isActive
                    ? "border-primary text-primary font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )
              }
            >
              <it.icon className="h-4 w-4" /> {it.label}
              {it.badgeKey === "inbox" && counts.total > 0 && (
                <Badge
                  variant={counts.late > 0 ? "destructive" : "secondary"}
                  className={cn(
                    "ml-1 h-5 px-1.5 text-xs",
                    counts.late === 0 && counts.warn > 0 && "bg-amber-500 text-white hover:bg-amber-500"
                  )}
                >
                  {counts.total}
                </Badge>
              )}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 animate-fade-in space-y-4">
        <SupplierStatusBanner />
        <Outlet />
      </main>
    </div>
  );
}
