import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Unit {
  id: string;
  name: string;
  short_name: string | null;
  emoji: string | null;
  is_active: boolean;
  display_order: number;
  type: string | null;
  icon: string | null;
  color: string | null;
  address: string | null;
  observation: string | null;
  created_at: string;
  updated_at: string;
}

export interface UnitInput {
  name: string;
  short_name?: string | null;
  display_order?: number;
  type?: string | null;
  icon?: string | null;
  color?: string | null;
  address?: string | null;
  observation?: string | null;
  is_active?: boolean;
}

export function useUnitsManagement() {
  const qc = useQueryClient();

  const { data: units = [], isLoading } = useQuery<Unit[]>({
    queryKey: ["units-management"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("units")
        .select("*")
        .order("is_active", { ascending: false })
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Unit[];
    },
  });

  const activeUnits = units.filter((u) => u.is_active);

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["units-management"] });
    qc.invalidateQueries({ queryKey: ["units"] });
    qc.invalidateQueries({ queryKey: ["campuses-from-organizations"] });
  };

  const onError = (e: any) => {
    const msg = e?.code === "23505" ? "Já existe uma unidade com esse nome." : e?.message ?? "Erro ao salvar.";
    toast({ title: "Erro", description: msg, variant: "destructive" });
  };

  const createUnit = useMutation({
    mutationFn: async (input: UnitInput) => {
      const { error } = await (supabase as any).from("units").insert(input);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: "Unidade criada com sucesso." }); },
    onError,
  });

  const updateUnit = useMutation({
    mutationFn: async ({ id, ...input }: UnitInput & { id: string }) => {
      const { error } = await (supabase as any).from("units").update(input).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: "Unidade atualizada." }); },
    onError,
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any).from("units").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); },
    onError,
  });

  const deleteUnit = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("units").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: "Unidade removida." }); },
    onError,
  });

  return {
    units,
    activeUnits,
    isLoading,
    createUnit: createUnit.mutateAsync,
    updateUnit: updateUnit.mutateAsync,
    toggleActive: toggleActive.mutateAsync,
    deleteUnit: deleteUnit.mutateAsync,
    isCreating: createUnit.isPending,
    isUpdating: updateUnit.isPending,
    isDeleting: deleteUnit.isPending,
  };
}
