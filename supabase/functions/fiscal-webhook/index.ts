// Edge function: fiscal-webhook
// Endpoint público (sem JWT) chamado pelo Focus NFe quando muda status de uma nota.
// Valida header X-Webhook-Secret antes de aceitar.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const expected = Deno.env.get("FOCUS_NFE_WEBHOOK_SECRET");
    if (expected) {
      const got = req.headers.get("x-webhook-secret");
      if (got !== expected) {
        return new Response(JSON.stringify({ error: "invalid secret" }), { status: 401, headers: corsHeaders });
      }
    }

    const body = await req.json();
    // Focus NFe envia { ref, status, chave_nfe/chave_nfce, protocolo, mensagem_sefaz }
    const ref: string = body.ref ?? body.referencia ?? "";
    const partes = ref.split("-");
    if (partes.length < 4) {
      return new Response(JSON.stringify({ ok: true, ignored: true }), { headers: corsHeaders });
    }
    const orgId = partes[0];
    const modelo = partes[1];
    const serie = parseInt(partes[2]);
    const numero = parseInt(partes[3]);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: fi } = await admin
      .from("fiscal_invoices")
      .select("*")
      .eq("organization_id", orgId)
      .eq("modelo", modelo)
      .eq("serie", serie)
      .eq("numero", numero)
      .maybeSingle();

    if (!fi) return new Response(JSON.stringify({ ok: true, notfound: true }), { headers: corsHeaders });

    let novoStatus: string | null = null;
    if (body.status === "autorizado") novoStatus = "autorizada";
    else if (body.status === "cancelado") novoStatus = "cancelada";
    else if (body.status === "denegado" || body.status === "erro_autorizacao") novoStatus = "rejeitada";

    if (novoStatus) {
      await admin.from("fiscal_invoices").update({
        status: novoStatus,
        chave_acesso: body.chave_nfe ?? body.chave_nfce ?? fi.chave_acesso,
        protocolo: body.protocolo ?? fi.protocolo,
        mensagem_sefaz: body.mensagem_sefaz ?? fi.mensagem_sefaz,
        xml_url: body.caminho_xml_nota_fiscal ?? fi.xml_url,
        danfe_url: body.caminho_danfe ?? fi.danfe_url,
        emitida_em: novoStatus === "autorizada" ? new Date().toISOString() : fi.emitida_em,
      }).eq("id", fi.id);

      await admin.from("fiscal_events").insert({
        organization_id: fi.organization_id,
        fiscal_invoice_id: fi.id,
        tipo: "webhook",
        mensagem: `Webhook Focus NFe: ${body.status}`,
        payload: body,
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("fiscal-webhook error:", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: corsHeaders });
  }
});
