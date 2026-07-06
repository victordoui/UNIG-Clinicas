
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UserCheck, UserX, Clock, Mail } from "lucide-react";

interface UserApprovalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserApprovalModal({ open, onOpenChange }: UserApprovalModalProps) {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedApproval, setSelectedApproval] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadApprovals();
    }
  }, [open]);

  const loadApprovals = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_approvals')
        .select('*')
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });

      if (error) {
        console.error('Error loading approvals:', error);
        toast({
          title: "Erro ao carregar solicitações",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      setApprovals(data || []);
    } catch (error) {
      console.error('Error loading approvals:', error);
      toast({
        title: "Erro interno",
        description: "Não foi possível carregar as solicitações.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (approvalId: string) => {
    try {
      const approval = approvals.find(a => a.id === approvalId);
      if (!approval) return;

      // Create user in auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: approval.email,
        password: approval.password_hash, // This would need proper handling in real implementation
        email_confirm: true,
        user_metadata: {
          full_name: approval.full_name,
        }
      });

      if (authError) {
        console.error('Error creating user:', authError);
        toast({
          title: "Erro ao criar usuário",
          description: authError.message,
          variant: "destructive",
        });
        return;
      }

      // Add user to organization_members with role instead of updating profile
      if (authData.user && approval.organization_id) {
        const { error: memberError } = await supabase
          .from('organization_members')
          .insert({
            user_id: authData.user.id,
            organization_id: approval.organization_id,
            role: approval.requested_role,
            is_active: true,
            invited_by: approval.user_id
          });

        if (memberError) {
          console.error('Error adding organization member:', memberError);
        }
      }

      // Update approval status
      const { error: updateError } = await supabase
        .from('user_approvals')
        .update({
          status: 'approved',
          approved_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', approvalId);

      if (updateError) {
        console.error('Error updating approval:', updateError);
        return;
      }

      toast({
        title: "Usuário aprovado",
        description: `O usuário ${approval.full_name} foi aprovado com sucesso.`,
      });

      loadApprovals();
    } catch (error) {
      console.error('Error approving user:', error);
      toast({
        title: "Erro interno",
        description: "Não foi possível aprovar o usuário.",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (approvalId: string) => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Motivo obrigatório",
        description: "Por favor, informe o motivo da rejeição.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('user_approvals')
        .update({
          status: 'rejected',
          approved_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', approvalId);

      if (error) {
        console.error('Error rejecting approval:', error);
        toast({
          title: "Erro ao rejeitar",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Solicitação rejeitada",
        description: "A solicitação foi rejeitada com sucesso.",
      });

      setRejectionReason("");
      setSelectedApproval(null);
      loadApprovals();
    } catch (error) {
      console.error('Error rejecting user:', error);
      toast({
        title: "Erro interno",
        description: "Não foi possível rejeitar a solicitação.",
        variant: "destructive",
      });
    }
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

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Aprovação de Usuários ({approvals.length} pendentes)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-pulse-slow">Carregando solicitações...</div>
            </div>
          ) : approvals.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground">
                  Nenhuma solicitação pendente
                </h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Todas as solicitações de novos usuários foram processadas.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Perfil Solicitado</TableHead>
                    <TableHead>Data da Solicitação</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvals.map((approval) => (
                    <TableRow key={approval.id}>
                      <TableCell className="font-medium">
                        {approval.full_name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {approval.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getRoleBadge(approval.requested_role)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {formatDateTime(approval.requested_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(approval.id)}
                            className="bg-success text-success-foreground hover:bg-success/90"
                          >
                            <UserCheck className="h-4 w-4 mr-1" />
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setSelectedApproval(approval.id)}
                          >
                            <UserX className="h-4 w-4 mr-1" />
                            Rejeitar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {selectedApproval && (
            <Card>
              <CardHeader>
                <CardTitle>Rejeitar Solicitação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Informe o motivo da rejeição..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={() => handleReject(selectedApproval)}
                  >
                    Confirmar Rejeição
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedApproval(null);
                      setRejectionReason("");
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
