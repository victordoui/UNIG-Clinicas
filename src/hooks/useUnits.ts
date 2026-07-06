import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveUnitIcon } from "@/lib/iconRegistry";

export interface UnitOption {
  id: string;
  name: string;
  shortName?: string | null;
  emoji?: string | null;
  displayName: string;
  iconKey: string;
  displayOrder?: number;
  type?: string | null;
}

/** Lista pública de unidades ativas para selects/filtros. Cache 15min. */
export function useUnits() {
  return useQuery<UnitOption[]>({
    queryKey: ["units"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("units")
        .select("id, name, short_name, emoji, is_active, display_order, type")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((u: any) => ({
        id: u.id,
        name: u.name,
        shortName: u.short_name,
        emoji: u.emoji,
        displayName: u.name,
        iconKey: resolveUnitIcon(u.name).id,
        displayOrder: u.display_order ?? undefined,
        type: u.type ?? undefined,
      }));
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
