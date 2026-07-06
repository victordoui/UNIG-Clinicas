import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LogOut, GraduationCap } from 'lucide-react';
import { UNIG_ROLE_LABEL, UNIG_ROLE_BADGE, UNIG_ROLE_ICON } from '@/lib/unigRoles';
import { cn } from '@/lib/utils';

export function Header() {
  const { profile, unigRole, signOut } = useAuth();
  const name = profile?.full_name || profile?.email || 'Usuário';
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  const RoleIcon = UNIG_ROLE_ICON[unigRole];

  return (
    <div className="flex-1 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <GraduationCap className="h-5 w-5 text-primary shrink-0" />
        <span className="font-bold text-primary hidden sm:inline">UNIG-A</span>
        <span className="text-muted-foreground text-sm hidden md:inline">· Portal Acadêmico Integrado</span>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="outline" className={cn('gap-1.5 hidden sm:inline-flex', UNIG_ROLE_BADGE[unigRole])}>
          <RoleIcon className="h-3.5 w-3.5" />
          {UNIG_ROLE_LABEL[unigRole]}
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-9 gap-2 px-2">
              <Avatar className="h-7 w-7"><AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback></Avatar>
              <span className="text-sm max-w-[140px] truncate hidden md:inline">{name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col">
              <span className="truncate">{name}</span>
              <span className="text-xs text-muted-foreground truncate">{profile?.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4 mr-2" /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
