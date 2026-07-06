import { useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isMobile = useIsMobile();
  
  const swipeHandlers = useSwipeNavigation({
    routes: ["/dashboard", "/produtos"],
    enabled: true,
    threshold: 60,
    velocity: 0.3,
  });

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar fixa à esquerda - só desktop */}
      {!isMobile && (
        <Sidebar
        className={cn(
          "fixed left-0 top-0 h-screen border-r z-50 transition-all duration-300",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          sidebarCollapsed ? "md:w-16" : "md:w-64"
        )}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      )}
      
      {/* Overlay para fechar sidebar no mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Área principal à direita da sidebar */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0 max-w-full transition-all duration-300",
        !isMobile && (sidebarCollapsed ? "ml-16" : "ml-64"),
        isMobile && "ml-0 mb-16"
      )}>
        {/* Header fixo no topo da área principal */}
        <div className="sticky top-0 z-40">
          <Header 
            onMenuClick={() => setSidebarOpen(true)}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            sidebarCollapsed={sidebarCollapsed}
            isMobile={isMobile}
          />
        </div>
        
        {/* Conteúdo principal com scroll */}
        <main className="flex-1 overflow-y-auto" {...swipeHandlers}>
          <div className={cn(
            "p-6",
            isMobile && "p-3 pb-20 animate-in fade-in-0 slide-in-from-bottom-4 duration-300"
          )}>
            {children}
          </div>
        </main>
      </div>
      
      {/* Bottom Navigation - só mobile */}
      {isMobile && <BottomNav />}
    </div>
  );
}
