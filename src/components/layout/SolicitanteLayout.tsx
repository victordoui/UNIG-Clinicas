import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sheet, SheetContent } from '@/components/ui/sheet';

import { ProfileModal } from '@/components/profile/ProfileModal';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

export default function SolicitanteLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar desktop — mesma sidebar do sistema, variant solicitante */}
      {!isMobile && (
        <Sidebar
          variant="solicitante"
          className={cn(
            'fixed left-0 top-0 h-screen border-r z-50 transition-all duration-300',
            sidebarCollapsed ? 'md:w-16' : 'md:w-64',
          )}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      )}

      {/* Sidebar mobile (sheet) */}
      {isMobile && (
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="p-0 w-64 border-r-0">
            <Sidebar variant="solicitante" />
          </SheetContent>
        </Sheet>
      )}

      {/* Área principal */}
      <div
        className={cn(
          'flex-1 flex flex-col min-w-0 max-w-full transition-all duration-300',
          !isMobile && (sidebarCollapsed ? 'ml-16' : 'ml-64'),
          isMobile && 'ml-0 mb-16',
        )}
      >
        <div className="sticky top-0 z-40">
          <Header
            onMenuClick={() => setSidebarOpen(true)}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            sidebarCollapsed={sidebarCollapsed}
            isMobile={isMobile}
          />
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className={cn('p-6', isMobile && 'p-3 pb-20')}>
            <Outlet />
          </div>
        </main>
      </div>

      {isMobile && <BottomNav />}

      <ProfileModal open={profileOpen} onOpenChange={setProfileOpen} />
    </div>
  );
}
