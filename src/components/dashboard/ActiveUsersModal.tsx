
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, Clock } from "lucide-react";

interface ActiveUsersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ActiveUsersModal({ open, onOpenChange }: ActiveUsersModalProps) {
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadActiveSessions();
    }
  }, [open]);

  const loadActiveSessions = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('active_sessions')
        .select(`
          *,
          profiles!active_sessions_user_id_fkey (
            full_name,
            role
          )
        `)
        .order('last_activity', { ascending: false });

      if (error) {
        console.error('Error loading active sessions:', error);
        toast({
          title: "Erro ao carregar sessões ativas",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      setActiveSessions(data || []);
    } catch (error) {
      console.error('Error loading active sessions:', error);
      toast({
        title: "Erro interno",
        description: "Não foi possível carregar as sessões ativas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR');
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Agora";
    if (diffInMinutes < 60) return `${diffInMinutes} min atrás`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d atrás`;
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge variant="destructive">Admin</Badge>;
      case "gerente":
        return <Badge variant="default" className="bg-primary text-primary-foreground">Gerente</Badge>;
      case "usuario":
        return <Badge variant="outline">Usuário</Badge>;
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  const getInitials = (name: string | null, userId: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return userId.charAt(0).toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Usuários Ativos ({activeSessions.length})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-pulse-slow">Carregando sessões ativas...</div>
            </div>
          ) : activeSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma sessão ativa encontrada.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Última Atividade</TableHead>
                    <TableHead>Dispositivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeSessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {getInitials(session.profiles?.full_name, session.user_id)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {session.profiles?.full_name || "Nome não definido"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              ID: {session.user_id}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getRoleBadge(session.profiles?.role || 'usuario')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-sm font-medium">
                              {getTimeAgo(session.last_activity)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDateTime(session.last_activity)}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                            <div className="font-medium">
                              {session.device_info || 'Navegador'}
                            </div>
                          <div className="text-muted-foreground">
                            {session.ip_address || 'IP não disponível'}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
