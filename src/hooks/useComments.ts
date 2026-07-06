import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type EntidadeTipo = "purchase_request" | "purchase_order" | "purchase_receipt" | "ci_request";

export interface CommentThread {
  id: string;
  organization_id: string;
  entidade_tipo: EntidadeTipo;
  entidade_id: string;
  resolvido: boolean;
  resolvido_em: string | null;
  resolvido_por: string | null;
  criado_por: string;
  created_at: string;
}

export interface Comment {
  id: string;
  thread_id: string;
  organization_id: string;
  autor_id: string;
  conteudo: string;
  mencionados: string[];
  editado_em: string | null;
  created_at: string;
}

export function useCommentsThread(entidadeTipo: EntidadeTipo, entidadeId: string | undefined) {
  return useQuery({
    queryKey: ["comments_thread", entidadeTipo, entidadeId],
    enabled: !!entidadeId,
    queryFn: async () => {
      const { data: thread } = await supabase
        .from("comments_threads")
        .select("*")
        .eq("entidade_tipo", entidadeTipo)
        .eq("entidade_id", entidadeId!)
        .maybeSingle();

      if (!thread) return { thread: null as CommentThread | null, comments: [] as Comment[] };

      const { data: comments, error } = await supabase
        .from("comments")
        .select("*")
        .eq("thread_id", thread.id)
        .order("created_at", { ascending: true });
      if (error) throw error;

      return { thread: thread as CommentThread, comments: (comments ?? []) as Comment[] };
    },
  });
}

export function useAddComment(entidadeTipo: EntidadeTipo, entidadeId: string) {
  const qc = useQueryClient();
  const { user, organization } = useAuth();
  return useMutation({
    mutationFn: async ({ conteudo, mencionados = [] }: { conteudo: string; mencionados?: string[] }) => {
      if (!user || !organization) throw new Error("Sem sessão");

      // ensure thread exists
      let { data: thread } = await supabase
        .from("comments_threads")
        .select("*")
        .eq("entidade_tipo", entidadeTipo)
        .eq("entidade_id", entidadeId)
        .maybeSingle();

      if (!thread) {
        const { data: newThread, error: thErr } = await supabase
          .from("comments_threads")
          .insert({
            organization_id: organization.organization_id,
            entidade_tipo: entidadeTipo,
            entidade_id: entidadeId,
            criado_por: user.id,
          })
          .select()
          .single();
        if (thErr) throw thErr;
        thread = newThread;
      }

      const { error } = await supabase.from("comments").insert({
        thread_id: thread!.id,
        organization_id: organization.organization_id,
        autor_id: user.id,
        conteudo,
        mencionados,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments_thread", entidadeTipo, entidadeId] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useResolveThread(entidadeTipo: EntidadeTipo, entidadeId: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (threadId: string) => {
      const { error } = await supabase
        .from("comments_threads")
        .update({ resolvido: true, resolvido_em: new Date().toISOString(), resolvido_por: user?.id })
        .eq("id", threadId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments_thread", entidadeTipo, entidadeId] });
      toast.success("Thread resolvida");
    },
  });
}
