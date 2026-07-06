import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface LaunchpadPreferences {
  favorites: string[];
  hidden: string[];
}

const EMPTY: LaunchpadPreferences = { favorites: [], hidden: [] };

export function useLaunchpadPreferences() {
  const { user, organization } = useAuth();
  return useQuery({
    queryKey: ['launchpad_preferences', user?.id, organization?.organization_id],
    enabled: !!user && !!organization,
    queryFn: async (): Promise<LaunchpadPreferences> => {
      const { data, error } = await supabase
        .from('launchpad_preferences' as any)
        .select('favorites, hidden')
        .eq('user_id', user!.id)
        .eq('organization_id', organization!.organization_id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return EMPTY;
      const row = data as any;
      return {
        favorites: row.favorites ?? [],
        hidden: row.hidden ?? [],
      };
    },
  });
}

export function useSaveLaunchpadPreferences() {
  const qc = useQueryClient();
  const { user, organization } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (prefs: LaunchpadPreferences) => {
      if (!user || !organization) throw new Error('Sem sessão');
      const payload = {
        user_id: user.id,
        organization_id: organization.organization_id,
        favorites: prefs.favorites,
        hidden: prefs.hidden,
      };
      const { error } = await supabase
        .from('launchpad_preferences' as any)
        .upsert(payload, { onConflict: 'user_id,organization_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['launchpad_preferences'] });
      toast({ title: 'Launchpad personalizado salvo' });
    },
    onError: (e: any) =>
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' }),
  });
}

export function useResetLaunchpadPreferences() {
  const qc = useQueryClient();
  const { user, organization } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async () => {
      if (!user || !organization) throw new Error('Sem sessão');
      const { error } = await supabase
        .from('launchpad_preferences' as any)
        .delete()
        .eq('user_id', user.id)
        .eq('organization_id', organization.organization_id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['launchpad_preferences'] });
      toast({ title: 'Layout restaurado para o padrão' });
    },
    onError: (e: any) =>
      toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}
