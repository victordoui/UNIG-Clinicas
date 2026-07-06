import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { UNIG_ROLE_LABEL } from "@/lib/unigRoles";
import { Copy, X } from "lucide-react";

interface Invitation {
  id: string;
  token: string;
  email: string;
  role: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export function PendingInvitationsList({ refreshKey = 0 }: { refreshKey?: number }) {
  const { organization } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!organization?.organization_id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("user_invitations")
      .select("id, token, email, role, expires_at, accepted_at, revoked_at, created_at")
      .eq("organization_id", organization.organization_id)
      .is("accepted_at", null)
      .is("revoked_at", null)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Erro ao carregar convites", description: error.message, variant: "destructive" });
    } else {
      setItems((data || []) as Invitation[]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [organization?.organization_id, refreshKey]);

  const copy = async (token: string) => {
    const url = `${window.location.origin}/aceitar-convite/${token}`;
    await navigator.clipboard.writeText(url);
    toast({ title: "Link copiado" });
  };

  const revoke = async (id: string) => {
    const { error } = await supabase
      .from("user_invitations")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast({ title: "Erro ao revogar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Convite revogado" });
      load();
    }
  };

  const isExpired = (d: string) => new Date(d).getTime() < Date.now();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Convites pendentes ({items.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-6 text-muted-foreground animate-pulse-slow">Carregando...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">Nenhum convite pendente.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Expira em</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((i) => (
                  <TableRow key={i.id} className="animate-fade-in">
                    <TableCell className="font-medium">{i.email}</TableCell>
                    <TableCell>{UNIG_ROLE_LABEL[i.role as keyof typeof UNIG_ROLE_LABEL] || i.role}</TableCell>
                    <TableCell className="text-sm">{new Date(i.expires_at).toLocaleString("pt-BR")}</TableCell>
                    <TableCell>
                      {isExpired(i.expires_at) ? (
                        <Badge variant="secondary">Expirado</Badge>
                      ) : (
                        <Badge className="bg-primary/15 text-primary border-primary/30" variant="outline">Pendente</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {!isExpired(i.expires_at) && (
                          <Button variant="ghost" size="sm" onClick={() => copy(i.token)} title="Copiar link">
                            <Copy className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => revoke(i.id)} title="Revogar">
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
