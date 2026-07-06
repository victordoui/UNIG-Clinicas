import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { token } = await req.json();
    if (!token) throw new Error("Token ausente");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: inv, error } = await admin
      .from("supplier_invitations")
      .select("id, email, nome_empresa, cnpj, tipo_fornecedor, categoria_esperada, status, expires_at, organization_id")
      .eq("token", token)
      .maybeSingle();
    if (error) throw error;

    if (!inv) {
      return new Response(JSON.stringify({ ok: false, code: "invalid" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    if (inv.status === "cancelado") {
      return new Response(JSON.stringify({ ok: false, code: "cancelled" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    if (inv.status === "usado") {
      return new Response(JSON.stringify({ ok: false, code: "used" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    if (new Date(inv.expires_at) < new Date()) {
      await admin.from("supplier_invitations").update({ status: "expirado" }).eq("id", inv.id);
      return new Response(JSON.stringify({ ok: false, code: "expired" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    return new Response(JSON.stringify({
      ok: true,
      invitation: {
        email: inv.email,
        nome_empresa: inv.nome_empresa,
        cnpj: inv.cnpj,
        tipo_fornecedor: inv.tipo_fornecedor,
        categoria_esperada: inv.categoria_esperada,
        expires_at: inv.expires_at,
      },
    }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (e: any) {
    console.error("get-supplier-invitation", e);
    return new Response(JSON.stringify({ ok: false, code: "error", error: e.message }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
