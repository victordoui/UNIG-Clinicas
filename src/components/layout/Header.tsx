import { useState, useEffect } from "react";
import { Bell, Search, User, Menu, LogOut, Settings, UserCog, X, CheckCheck, PanelLeftClose, PanelLeft, History, MoreHorizontal, Building2 } from "lucide-react";
import { MoreOptionsSheet } from "@/components/layout/MoreOptionsSheet";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GlobalSearch } from "@/components/global/GlobalSearch";
import { ProfileModal } from "@/components/profile/ProfileModal";
import { OrganizationBadge } from "@/components/layout/OrganizationBadge";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";

import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useNavigate } from "react-router-dom";
import { UNIG_ROLE_ICON, UNIG_ROLE_LABEL, UNIG_ROLE_BADGE } from "@/lib/unigRoles";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface HeaderProps {
  onMenuClick?: () => void;
  onToggleCollapse?: () => void;
  sidebarCollapsed?: boolean;
  isMobile?: boolean;
}

export function Header({ onMenuClick, onToggleCollapse, sidebarCollapsed, isMobile }: HeaderProps) {
  const { profile, signOut, currentRole, organization, unigRole } = useAuth();
  const RoleIcon = UNIG_ROLE_ICON[unigRole];
  const roleLabel = UNIG_ROLE_LABEL[unigRole];
  const roleBadge = UNIG_ROLE_BADGE[unigRole];
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    const { data: alerts } = await supabase
      .from('alerts')
      .select('*')
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    if (alerts) {
      setNotifications(alerts.slice(0, 5));
      // Mostrar 99+ se tiver mais de 99 alertas
      setNotificationCount(alerts.length > 99 ? 99 : alerts.length);
    }
  };

  const markAsRead = async (alertId: string) => {
    await supabase
      .from('alerts')
      .update({ is_read: true })
      .eq('id', alertId);
    
    loadNotifications();
  };

  const clearAllNotifications = async () => {
    await supabase
      .from('alerts')
      .update({ is_read: true })
      .eq('is_read', false);
    
    loadNotifications();
  };
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  })();

  const firstName = (profile?.full_name || profile?.email || "Usuário").split(" ")[0];

  if (isMobile) {
    const roleLabel = currentRole === 'admin' ? 'Administrador' : currentRole === 'gerente' ? 'Gerente' : 'Usuário';
    const orgName = (profile as any)?.organization_name || (typeof window !== 'undefined' ? '' : '');
    return (
      <header className="bg-background border-b border-border/60 flex items-center justify-between gap-2 px-3 h-16">
        <button
          onClick={() => setProfileModalOpen(true)}
          className="flex items-center gap-2.5 min-w-0 flex-1 text-left active:scale-[0.98] transition-transform"
          aria-label="Abrir perfil"
        >
          <Avatar className="h-10 w-10 ring-2 ring-border/50 shrink-0">
            <AvatarImage src={profile?.avatar_url || ""} alt={profile?.full_name || ""} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {profile?.full_name?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold leading-tight truncate">{profile?.full_name || firstName}</p>
            <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
              <span className="text-[11px] text-muted-foreground leading-none truncate">{roleLabel}</span>
              {organization?.organization_name && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-border/60 bg-muted/40 text-[10px] text-muted-foreground leading-none shrink-0 max-w-[110px]">
                  <Building2 className="h-2.5 w-2.5 shrink-0" />
                  <span className="truncate">{organization.organization_name}</span>
                </span>
              )}
            </div>
          </div>
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          <MoreOptionsSheet alertCount={notificationCount}>
            <button
              aria-label="Mais opções"
              className="relative h-9 w-9 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center transition-colors active:scale-95"
            >
              <MoreHorizontal className="h-[16px] w-[16px]" />
              {notificationCount > 0 && (
                <Badge variant="destructive" className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full p-0 flex items-center justify-center text-[9px]">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </Badge>
              )}
            </button>
          </MoreOptionsSheet>
        </div>

        <ProfileModal open={profileModalOpen} onOpenChange={setProfileModalOpen} />
      </header>
    );
  }


  return (
    <header className={cn(
      "bg-card border-b border-border shadow-card flex items-center justify-between px-3 md:px-6",
      "h-16"
    )}>
      <div className="flex items-center gap-1 md:gap-2 min-w-0">
        {/* Botão Colapsar Sidebar - Desktop Only */}
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex"
            onClick={onToggleCollapse}
            aria-label={sidebarCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
            title={sidebarCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
          >
            {sidebarCollapsed ? (
              <PanelLeft className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </Button>
        )}
        {/* Organização compacta no mobile */}
        {isMobile && <OrganizationBadge />}
      </div>

      <div className="flex-1 max-w-md mx-4 hidden md:block">
        <GlobalSearch 
          value={searchTerm}
          onChange={setSearchTerm}
          onSearch={() => navigate('/produtos')}
        />
      </div>

      <div className="flex items-center gap-1 md:gap-2">
        
        {/* Badge da Organização - desktop apenas (mobile mostra à esquerda) */}
        {!isMobile && <OrganizationBadge />}
        
        {/* Busca compacta no mobile */}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Buscar"
            onClick={() => navigate('/produtos')}
            className="h-9 w-9"
          >
            <Search className="h-5 w-5" />
          </Button>
        )}
        
        {/* Badge do Papel do Usuário - Visível no Header */}
        <Badge
          variant="outline"
          className={cn("hidden sm:inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5", roleBadge)}
        >
          {RoleIcon && <RoleIcon className="h-3 w-3" />}
          {roleLabel}
        </Badge>

        
        {/* Toggle de Tema */}
        <ThemeToggle />
        
        {/* Notificações */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label={`Notificações${notificationCount > 0 ? ` (${notificationCount})` : ''}`}>
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96 p-3" align="end">
            <NotificationCenter
              notifications={notifications as any}
              totalUnread={notificationCount}
              onMarkRead={markAsRead}
              onClearAll={clearAllNotifications}
            />
          </PopoverContent>
        </Popover>

        
        {/* Menu do Usuário */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url || ""} alt={profile?.full_name || ""} />
                <AvatarFallback>
                  {profile?.full_name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{(() => {
                  console.log('Header profile data:', profile);
                  return profile?.full_name || profile?.email || "Usuário";
                })()}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {profile?.email}
                </p>
                <div className="mt-1">
                  <span className={cn("inline-flex items-center gap-1 text-xs px-2 py-1 rounded", roleBadge)}>
                    {RoleIcon && <RoleIcon className="h-3 w-3" />}
                    {roleLabel}
                  </span>
                </div>

              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setProfileModalOpen(true)}>
              <UserCog className="mr-2 h-4 w-4" />
              <span>Perfil</span>
            </DropdownMenuItem>
            {currentRole === 'admin' && (
              <DropdownMenuItem onClick={() => navigate('/configuracoes')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Configurações</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ProfileModal open={profileModalOpen} onOpenChange={setProfileModalOpen} />
    </header>
  );
}