import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './Sidebar';
import { Header } from './Header';

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-slate-100">
        <AppSidebar />
        <SidebarInset className="min-w-0 flex-1 flex flex-col">
          <header className="h-14 flex items-center gap-3 border-b bg-white/95 px-4 shadow-sm backdrop-blur sticky top-0 z-30">
            <SidebarTrigger />
            <Header />
          </header>
          <main className="flex-1 overflow-y-auto">
            <div className="p-4 md:p-5 max-w-[1500px] mx-auto w-full animate-in fade-in-0 duration-300">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
