import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CampusOption {
  id: string;
  name: string;
}

/**
 * Lista de Unidades/Campus para selects do sistema.
 *
 * Fonte primária: tabela `units` (cadastro mestre em Administração → Unidades).
 * Fallback: tabela `organizations` (compat para instalações em migração).
 *
 * A assinatura `{ id, name }` é mantida para não quebrar consumidores legados.
 * Em código novo, prefira `useUnits()` direto + `<UnitSelect />`.
 */
export function useCampuses() {
  return useQuery<CampusOption[]>({
    queryKey: ["campuses-from-organizations"],
    queryFn: async () => {
      const { data: units, error: unitsErr } = await (supabase as any)
        .from("units")
        .select("id, name, is_active, display_order")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });
      if (!unitsErr && units && units.length > 0) {
        return units.map((u: any) => ({ id: u.id, name: u.name }));
      }
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((o: any) => ({ id: o.id, name: o.name }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

