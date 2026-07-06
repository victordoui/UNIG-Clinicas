import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Activity, Package, Calendar } from "lucide-react";
import { format } from "date-fns";

interface RemoveMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    id: string;
    user_id: string;
    role: string;
    is_active: boolean;
    joined_at: string;
    profiles?: {
      full_name: string;
      email: string;
      avatar_url?: string;
    };
  };
  activity?: {
    userId: string;
    movementsCount: number;
    productsCreated: number;
    lastActivity: string | null;
  };
  onConfirm: () => Promise<void>;
}

export function RemoveMemberDialog({ 
  open, 
  onOpenChange, 
  member, 
  activity,
  onConfirm 
}: RemoveMemberDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error('Error removing member:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasActivity = activity && (activity.movementsCount > 0 || activity.productsCreated > 0);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Remover Membro da Organização
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {/* Informações do Membro */}
              <div className="flex items-center gap-3 p-3 bg-muted rounded-md">
                <Avatar>
                  <AvatarImage src={member.profiles?.avatar_url} />
                  <AvatarFallback>
                    {member.profiles?.full_name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">
                    {member.profiles?.full_name || 'Sem nome'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {member.profiles?.email}
                  </p>
                  <Badge variant="outline" className="mt-1">
                    {member.role}
                  </Badge>
                </div>
              </div>

              {/* Informações de Atividade */}
              {hasActivity ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="space-y-2">
                    <p className="font-medium">Este membro possui atividades registradas:</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <Activity className="h-3 w-3" />
                        <span>{activity.movementsCount} movimentações realizadas</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Package className="h-3 w-3" />
                        <span>{activity.productsCreated} produtos criados</span>
                      </div>
                      {activity.lastActivity && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          <span>
                            Última atividade: {format(new Date(activity.lastActivity), "dd/MM/yyyy 'às' HH:mm")}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-xs">
                      Os registros criados por este membro permanecerão no sistema, mas ele perderá acesso à organização.
                    </p>
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <AlertDescription>
                    Este membro ainda não realizou nenhuma atividade na organização.
                  </AlertDescription>
                </Alert>
              )}

              {/* Data de entrada */}
              <p className="text-sm text-muted-foreground">
                Membro desde: {format(new Date(member.joined_at), "dd/MM/yyyy")}
              </p>

              <p className="text-sm">
                Tem certeza que deseja remover este membro? Esta ação não pode ser desfeita.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className="bg-destructive hover:bg-destructive/90"
          >
            {loading ? 'Removendo...' : 'Sim, Remover'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
