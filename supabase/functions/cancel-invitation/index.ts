import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function j(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return j({ error: "Não autenticado" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user } } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return j({ error: "Sessão expirada" }, 401);

    const { invitation_id } = await req.json();
    if (!invitation_id) return j({ error: "ID obrigatório" }, 400);

    const { data: inv } = await admin
      .from("user_invitations").select("organization_id, accepted_at").eq("id", invitation_id).maybeSingle();
    if (!inv) return j({ error: "Convite não encontrado" }, 404);
    if (inv.accepted_at) return j({ error: "Convite já cadastrado, não pode ser cancelado" }, 400);

    const { data: profile } = await admin
      .from("profiles").select("is_super_admin").eq("id", user.id).single();
    const isSuperAdmin = !!profile?.is_super_admin;

    if (!isSuperAdmin) {
      const { data: membership } = await admin
        .from("organization_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("organization_id", inv.organization_id)
        .eq("is_active", true)
        .maybeSingle();
      if (!membership || membership.role !== "organization_admin") {
        return j({ error: "Sem permissão" }, 403);
      }
    }

    const { error } = await admin
      .from("user_invitations")
      .update({ cancelled_at: new Date().toISOString(), cancelled_by: user.id })
      .eq("id", invitation_id);
    if (error) return j({ error: error.message }, 500);

    return j({ success: true });
  } catch (e: any) {
    return j({ error: e.message || "Erro interno" }, 500);
  }
});
