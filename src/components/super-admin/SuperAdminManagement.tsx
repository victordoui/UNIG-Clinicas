import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, Trash2, UserPlus } from "lucide-react";
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

interface SuperAdmin {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
  is_super_admin?: boolean;
}

export function SuperAdminManagement() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [superAdmins, setSuperAdmins] = useState<SuperAdmin[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [adminToRemove, setAdminToRemove] = useState<SuperAdmin | null>(null);

  useEffect(() => {
    loadSuperAdmins();
  }, []);

  const loadSuperAdmins = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, created_at, is_super_admin')
        .eq('is_super_admin', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSuperAdmins(data || []);
    } catch (error) {
      console.error('Erro ao carregar super admins:', error);
      toast({
        title: "Erro ao carregar",
        description: "Não foi possível carregar a lista de super admins.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addSuperAdmin = async () => {
    if (!newAdminEmail.trim()) {
      toast({
        title: "Email obrigatório",
        description: "Por favor, insira o email do usuário.",
        variant: "destructive",
      });
      return;
    }

    setAdding(true);
    try {
      // Buscar usuário pelo email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email, is_super_admin')
        .eq('email', newAdminEmail.trim())
        .single();

      if (profileError || !profile) {
        toast({
          title: "Usuário não encontrado",
          description: "Não existe um usuário com este email no sistema.",
          variant: "destructive",
        });
        return;
      }

      if (profile.is_super_admin) {
        toast({
          title: "Já é super admin",
          description: "Este usuário já é um super administrador.",
          variant: "destructive",
        });
        return;
      }

      // Atualizar para super admin
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_super_admin: true })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      toast({
        title: "Super admin adicionado",
        description: `${profile.full_name} agora é um super administrador.`,
      });

      setNewAdminEmail("");
      loadSuperAdmins();
    } catch (error) {
      console.error('Erro ao adicionar super admin:', error);
      toast({
        title: "Erro ao adicionar",
        description: "Não foi possível adicionar o super admin.",
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  const removeSuperAdmin = async () => {
    if (!adminToRemove) return;

    // Proteção: não pode remover a si mesmo
    if (adminToRemove.id === user?.id) {
      toast({
        title: "Ação não permitida",
        description: "Você não pode remover seu próprio status de super admin.",
        variant: "destructive",
      });
      setAdminToRemove(null);
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_super_admin: false })
        .eq('id', adminToRemove.id);

      if (error) throw error;

      toast({
        title: "Super admin removido",
        description: `${adminToRemove.full_name} não é mais um super administrador.`,
      });

      loadSuperAdmins();
    } catch (error) {
      console.error('Erro ao remover super admin:', error);
      toast({
        title: "Erro ao remover",
        description: "Não foi possível remover o super admin.",
        variant: "destructive",
      });
    } finally {
      setAdminToRemove(null);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return <div className="text-center py-8">Carregando super administradores...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Crown className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <CardTitle>Super Administradores</CardTitle>
            <CardDescription>
              Gerencie os usuários com acesso de super administrador
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Lista de Super Admins */}
        <div className="space-y-3">
          {superAdmins.map((admin) => (
            <div
              key={admin.id}
              className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={admin.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(admin.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{admin.full_name}</p>
                  <p className="text-sm text-muted-foreground">{admin.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Desde {new Date(admin.created_at).toLocaleDateString('pt-BR')}
                </span>
                {admin.id !== user?.id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setAdminToRemove(admin)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Adicionar Novo Super Admin */}
        <div className="space-y-3 pt-4 border-t">
          <Label htmlFor="new_admin_email">Adicionar Novo Super Admin</Label>
          <div className="flex gap-2">
            <Input
              id="new_admin_email"
              type="email"
              placeholder="email@exemplo.com"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addSuperAdmin()}
            />
            <Button onClick={addSuperAdmin} disabled={adding}>
              <UserPlus className="h-4 w-4 mr-2" />
              {adding ? "Adicionando..." : "Adicionar"}
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Dialog de confirmação de remoção */}
      <AlertDialog open={!!adminToRemove} onOpenChange={() => setAdminToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Super Admin</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o status de super administrador de{' '}
              <span className="font-semibold">{adminToRemove?.full_name}</span>?
              Esta ação pode ser revertida posteriormente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={removeSuperAdmin} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
