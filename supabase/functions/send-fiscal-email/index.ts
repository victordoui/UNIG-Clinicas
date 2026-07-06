// Edge function: send-fiscal-email
// Envia XML+DANFE de uma nota fiscal por e-mail ao destinatário.
// Usa Resend se RESEND_API_KEY estiver configurado; caso contrário retorna 400 informando.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (!claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { fiscal_invoice_id, email } = await req.json();
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: fi } = await admin.from("fiscal_invoices").select("*").eq("id", fiscal_invoice_id).maybeSingle();
    if (!fi) return new Response(JSON.stringify({ error: "Nota não encontrada" }), { status: 404, headers: corsHeaders });

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY não configurada" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const to = email || fi.destinatario_email;
    if (!to) {
      return new Response(JSON.stringify({ error: "E-mail do destinatário ausente" }), { status: 400, headers: corsHeaders });
    }

    const html = `
      <h2>Nota Fiscal ${fi.numero}/${fi.serie}</h2>
      <p>Modelo: ${fi.modelo === "55" ? "NF-e" : "NFC-e"}</p>
      <p>Chave de acesso: <code>${fi.chave_acesso ?? "—"}</code></p>
      <p>Valor: R$ ${Number(fi.valor_total).toFixed(2)}</p>
      ${fi.danfe_url ? `<p><a href="${fi.danfe_url}">Baixar DANFE</a></p>` : ""}
      ${fi.xml_url ? `<p><a href="${fi.xml_url}">Baixar XML</a></p>` : ""}
    `;

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: Deno.env.get("FISCAL_EMAIL_FROM") ?? "no-reply@resend.dev",
        to: [to],
        subject: `Nota Fiscal ${fi.numero}/${fi.serie}`,
        html,
      }),
    });

    if (!resp.ok) {
      const errTxt = await resp.text();
      throw new Error(`Resend: ${errTxt}`);
    }

    await admin.from("fiscal_events").insert({
      organization_id: fi.organization_id,
      fiscal_invoice_id: fi.id,
      tipo: "email_enviado",
      mensagem: `E-mail enviado para ${to}`,
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("send-fiscal-email error:", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: corsHeaders });
  }
});
