import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function randomToken(len = 48) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Sem autorização");
    const token = authHeader.replace("Bearer ", "");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: claimsData, error: claimsError } = await admin.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    const userId = claimsData.claims.sub as string;

    const body = await req.json();
    const { email, organization_id, nome_empresa, cnpj, tipo_fornecedor, categoria_esperada, observacao_interna, validade_dias } = body ?? {};
    if (!email || !organization_id || !tipo_fornecedor) throw new Error("Campos obrigatórios ausentes");

    // authorize: must be admin/compras of org or super_admin
    const { data: profile } = await admin.from("profiles").select("is_super_admin").eq("id", userId).maybeSingle();
    const { data: membership } = await admin.from("organization_members")
      .select("role").eq("user_id", userId).eq("organization_id", organization_id).eq("is_active", true).maybeSingle();
    const allowed = ["organization_admin", "administrador", "compras", "manager"];
    if (!profile?.is_super_admin && !(membership && allowed.includes(membership.role))) {
      return new Response(JSON.stringify({ error: "Sem permissão" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const expires = new Date();
    expires.setDate(expires.getDate() + (Number(validade_dias) || 7));
    const invitationToken = randomToken();

    const { data: inserted, error } = await admin.from("supplier_invitations").insert({
      organization_id,
      email: String(email).trim().toLowerCase(),
      nome_empresa: nome_empresa || null,
      cnpj: cnpj || null,
      tipo_fornecedor,
      categoria_esperada: categoria_esperada || null,
      observacao_interna: observacao_interna || null,
      token: invitationToken,
      expires_at: expires.toISOString(),
      status: "pendente",
      created_by: userId,
    }).select().single();
    if (error) throw error;

    const origin = req.headers.get("origin") ?? "";
    const link = `${origin}/convite-fornecedor/${invitationToken}`;

    return new Response(JSON.stringify({ success: true, invitation: inserted, link }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (e: any) {
    console.error("create-supplier-invitation", e);
    return new Response(JSON.stringify({ error: e.message ?? "Erro" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
