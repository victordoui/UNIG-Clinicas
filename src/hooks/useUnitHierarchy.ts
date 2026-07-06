import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type HierarchyLevel = "block" | "floor" | "sector" | "subspace";

const TABLE: Record<HierarchyLevel, string> = {
  block: "unit_blocks",
  floor: "unit_floors",
  sector: "unit_sectors",
  subspace: "unit_subspaces",
};
const PARENT_KEY: Record<HierarchyLevel, string> = {
  block: "unit_id",
  floor: "block_id",
  sector: "floor_id",
  subspace: "sector_id",
};

export interface HierarchyNode {
  id: string;
  name: string;
  display_order: number;
  parent_id: string;
}

export function useHierarchyChildren(level: HierarchyLevel, parentId: string | null) {
  return useQuery<HierarchyNode[]>({
    queryKey: ["unit-hierarchy", level, parentId],
    enabled: !!parentId,
    queryFn: async () => {
      if (!parentId) return [];
      const { data, error } = await (supabase as any)
        .from(TABLE[level])
        .select("id, name, display_order, " + PARENT_KEY[level])
        .eq(PARENT_KEY[level], parentId)
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: r.id,
        name: r.name,
        display_order: r.display_order,
        parent_id: r[PARENT_KEY[level]],
      }));
    },
  });
}

export function useHierarchyMutations(level: HierarchyLevel) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["unit-hierarchy", level] });

  const create = useMutation({
    mutationFn: async ({ parentId, name, display_order }: { parentId: string; name: string; display_order?: number }) => {
      const payload: any = { name, display_order: display_order ?? 999 };
      payload[PARENT_KEY[level]] = parentId;
      const { error } = await (supabase as any).from(TABLE[level]).insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: "Adicionado." }); },
    onError: (e: any) => toast({ title: "Erro", description: e?.message, variant: "destructive" }),
  });

  const rename = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await (supabase as any).from(TABLE[level]).update({ name }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: "Renomeado." }); },
    onError: (e: any) => toast({ title: "Erro", description: e?.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from(TABLE[level]).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: "Removido." }); },
    onError: (e: any) => toast({ title: "Erro", description: e?.message, variant: "destructive" }),
  });

  return { create: create.mutateAsync, rename: rename.mutateAsync, remove: remove.mutateAsync };
}
