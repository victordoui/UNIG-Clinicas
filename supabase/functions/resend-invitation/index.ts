import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

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

    const body = await req.json();
    const invitation_id = body.invitation_id;
    const expires_in_days = Number(body.expires_in_days || 3);
    if (!invitation_id) return j({ error: "ID obrigatório" }, 400);
    if (expires_in_days < 1 || expires_in_days > 30) return j({ error: "Validade inválida" }, 400);

    const { data: inv } = await admin
      .from("user_invitations").select("*").eq("id", invitation_id).maybeSingle();
    if (!inv) return j({ error: "Convite não encontrado" }, 404);
    if (inv.accepted_at) return j({ error: "Convite já cadastrado" }, 400);

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

    // Revoga o atual e cria um novo (mantém histórico)
    await admin.from("user_invitations").update({
      revoked_at: new Date().toISOString(),
    }).eq("id", invitation_id).is("accepted_at", null);

    const newToken = generateToken();
    const expires_at = new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000).toISOString();

    const { data: inserted, error: insErr } = await admin.from("user_invitations").insert({
      token: newToken,
      email: inv.email,
      role: "visitante",
      invitee_type: inv.invitee_type,
      internal_note: inv.internal_note,
      organization_id: inv.organization_id,
      invited_by: user.id,
      expires_at,
      resent_from: invitation_id,
    }).select("id, expires_at").single();
    if (insErr) return j({ error: insErr.message }, 500);

    const origin = req.headers.get("origin") || req.headers.get("referer") || "";
    const baseUrl = origin.replace(/\/$/, "");
    const invite_url = `${baseUrl}/aceitar-convite/${newToken}`;

    return j({ success: true, id: inserted.id, token: newToken, invite_url, expires_at: inserted.expires_at });
  } catch (e: any) {
    return j({ error: e.message || "Erro interno" }, 500);
  }
});
