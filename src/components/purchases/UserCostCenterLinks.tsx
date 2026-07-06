import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserCostCenterLinks, useUpsertUserCostCenter, useDeleteUserCostCenter } from '@/hooks/useUserCostCenters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LoadingButton } from '@/components/ui/loading-button';
import { Trash2, UserPlus, Users } from 'lucide-react';
import type { CostCenter } from '@/hooks/useCostCenters';

interface Props { costCenter: CostCenter; }

interface OrgMember {
  user_id: string;
  role: string;
  is_active: boolean;
  full_name: string | null;
  email: string | null;
}

function useOrgMembers() {
  const { organization } = useAuth();
  return useQuery({
    enabled: !!organization,
    queryKey: ['org_members_for_cc', organization?.organization_id],
    queryFn: async () => {
      const { data: members, error } = await supabase
        .from('organization_members')
        .select('user_id, role, is_active')
        .eq('organization_id', organization!.organization_id)
        .eq('is_active', true);
      if (error) throw error;
      const ids = (members ?? []).map(m => m.user_id);
      if (ids.length === 0) return [] as OrgMember[];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', ids);
      const map = new Map((profiles ?? []).map(p => [p.id, p]));
      return (members ?? []).map(m => ({
        user_id: m.user_id,
        role: m.role,
        is_active: m.is_active,
        full_name: map.get(m.user_id)?.full_name ?? null,
        email: map.get(m.user_id)?.email ?? null,
      })) as OrgMember[];
    },
  });
}

export function UserCostCenterLinks({ costCenter }: Props) {
  const { data: links = [], isLoading } = useUserCostCenterLinks(costCenter.id);
  const { data: members = [] } = useOrgMembers();
  const upsert = useUpsertUserCostCenter();
  const remove = useDeleteUserCostCenter();
  const [selectedUser, setSelectedUser] = useState<string>('');

  const memberById = new Map(members.map(m => [m.user_id, m]));
  const linkedIds = new Set(links.map(l => l.user_id));
  const available = members.filter(m => !linkedIds.has(m.user_id));

  const addLink = async () => {
    if (!selectedUser) return;
    await upsert.mutateAsync({
      user_id: selectedUser,
      cost_center_id: costCenter.id,
      can_request: true,
      can_approve_cc: false,
      is_default: false,
    });
    setSelectedUser('');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" /> Usuários vinculados — {costCenter.codigo}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder={available.length ? 'Selecione um usuário…' : 'Todos os usuários já vinculados'} />
              </SelectTrigger>
              <SelectContent>
                {available.map(m => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    {m.full_name || m.email || m.user_id.slice(0, 8)} <span className="text-xs text-muted-foreground">({m.role})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <LoadingButton loading={upsert.isPending} disabled={!selectedUser} onClick={addLink}>
            <UserPlus className="h-4 w-4 mr-2" /> Vincular
          </LoadingButton>
        </div>

        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground text-sm">Carregando…</div>
        ) : links.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-sm">Nenhum usuário vinculado a este centro de custo.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Pode solicitar</TableHead>
                <TableHead>Gestor do CC</TableHead>
                <TableHead>Padrão</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map(l => {
                const m = memberById.get(l.user_id);
                return (
                  <TableRow key={l.id}>
                    <TableCell>
                      <div className="font-medium">{m?.full_name || m?.email || l.user_id.slice(0, 8)}</div>
                      {m?.email && <div className="text-xs text-muted-foreground">{m.email}</div>}
                      {m?.role && <Badge variant="outline" className="mt-1 text-xs">{m.role}</Badge>}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={l.can_request}
                        onCheckedChange={(v) => upsert.mutate({ id: l.id, user_id: l.user_id, cost_center_id: l.cost_center_id, can_request: v, can_approve_cc: l.can_approve_cc, is_default: l.is_default })}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={l.can_approve_cc}
                        onCheckedChange={(v) => upsert.mutate({ id: l.id, user_id: l.user_id, cost_center_id: l.cost_center_id, can_request: l.can_request, can_approve_cc: v, is_default: l.is_default })}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={l.is_default}
                        onCheckedChange={(v) => upsert.mutate({ id: l.id, user_id: l.user_id, cost_center_id: l.cost_center_id, can_request: l.can_request, can_approve_cc: l.can_approve_cc, is_default: v })}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => remove.mutate(l.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
