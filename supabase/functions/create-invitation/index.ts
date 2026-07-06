import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INVITEE_TYPES = new Set([
  "colaborador",
  "professor",
  "aluno",
  "terceirizado",
  "fornecedor",
  "visitante",
  "solicitante",
]);

// Mapeia o tipo do convite para o role efetivo gravado em user_invitations.
function roleFromInviteeType(t: string): string {
  if (t === "solicitante") return "solicitante";
  return "visitante";
}

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

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await admin.auth.getUser(token);
    if (userError || !user) return j({ error: "Sessão expirada" }, 401);

    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const invitee_type = String(body.invitee_type || "visitante").trim().toLowerCase();
    const internal_note = String(body.internal_note || "").trim() || null;
    const organization_id = body.organization_id;
    const expires_in_days = Number(body.expires_in_days);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return j({ error: "E-mail inválido" }, 400);
    if (!INVITEE_TYPES.has(invitee_type)) return j({ error: "Tipo de usuário inválido" }, 400);
    if (!organization_id) return j({ error: "Organização obrigatória" }, 400);
    if (!Number.isFinite(expires_in_days) || expires_in_days < 1 || expires_in_days > 30) {
      return j({ error: "Validade deve estar entre 1 e 30 dias" }, 400);
    }

    // Permissão: super_admin OR organization_admin
    const { data: profile } = await admin
      .from("profiles").select("is_super_admin").eq("id", user.id).single();
    const isSuperAdmin = !!profile?.is_super_admin;

    if (!isSuperAdmin) {
      const { data: membership } = await admin
        .from("organization_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("organization_id", organization_id)
        .eq("is_active", true)
        .maybeSingle();
      if (!membership || membership.role !== "organization_admin") {
        return j({ error: "Sem permissão para convidar" }, 403);
      }
    }

    // Limite de usuários
    const { data: org } = await admin
      .from("organizations").select("max_users").eq("id", organization_id).single();
    const { count } = await admin
      .from("organization_members")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organization_id)
      .eq("is_active", true);
    if (org && count !== null && count >= org.max_users) {
      return j({ error: `Limite de ${org.max_users} usuários atingido` }, 400);
    }

    // Revoga convites pendentes anteriores para o mesmo email+org
    await admin
      .from("user_invitations")
      .update({ revoked_at: new Date().toISOString() })
      .eq("email", email)
      .eq("organization_id", organization_id)
      .is("accepted_at", null)
      .is("revoked_at", null)
      .is("cancelled_at", null);

    const inviteToken = generateToken();
    const expires_at = new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000).toISOString();

    const { data: inserted, error: insertError } = await admin
      .from("user_invitations")
      .insert({
        token: inviteToken,
        email,
        role: roleFromInviteeType(invitee_type),
        invitee_type,
        internal_note,
        organization_id,
        invited_by: user.id,
        expires_at,
      })
      .select("id, expires_at")
      .single();

    if (insertError) {
      console.error("Insert invitation error:", insertError);
      return j({ error: insertError.message }, 500);
    }

    const origin = req.headers.get("origin") || req.headers.get("referer") || "";
    const baseUrl = origin.replace(/\/$/, "");
    const invite_url = `${baseUrl}/aceitar-convite/${inviteToken}`;

    return j({
      success: true,
      id: inserted.id,
      token: inviteToken,
      invite_url,
      expires_at: inserted.expires_at,
    });
  } catch (e: any) {
    console.error("create-invitation error:", e);
    return j({ error: e.message || "Erro interno" }, 500);
  }
});
