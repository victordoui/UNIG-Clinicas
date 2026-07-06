// Edge function: fiscal-check-status
// Atualiza status de uma fiscal_invoice consultando o Focus NFe (quando configurado).
// Sem token, apenas marca como autorizada se estiver "processando" há mais de 1min (modo simulado).

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
    const { data: claims, error: authErr } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (authErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claims.claims.sub;

    const { fiscal_invoice_id } = await req.json();
    if (!fiscal_invoice_id) {
      return new Response(JSON.stringify({ error: "Parâmetros faltando" }), { status: 400, headers: corsHeaders });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: fi } = await admin.from("fiscal_invoices").select("*").eq("id", fiscal_invoice_id).maybeSingle();
    if (!fi) return new Response(JSON.stringify({ error: "Nota não encontrada" }), { status: 404, headers: corsHeaders });

    const { data: settings } = await admin.from("fiscal_settings").select("*").eq("organization_id", fi.organization_id).maybeSingle();
    const tokenSecret = settings?.ambiente === "producao" ? "FOCUS_NFE_TOKEN_PROD" : "FOCUS_NFE_TOKEN_HOMOLOG";
    const focusToken = Deno.env.get(tokenSecret);

    let novoStatus = fi.status;
    let mensagem: string | null = null;
    let chave: string | null = fi.chave_acesso;
    let protocolo: string | null = fi.protocolo;

    if (focusToken && fi.status === "processando" && fi.numero) {
      const baseUrl = settings?.ambiente === "producao"
        ? "https://api.focusnfe.com.br"
        : "https://homologacao.focusnfe.com.br";
      const ref = `${fi.organization_id}-${fi.modelo}-${fi.serie}-${fi.numero}`;
      const path = fi.modelo === "65" ? "nfce" : "nfe";
      const resp = await fetch(`${baseUrl}/v2/${path}/${ref}`, {
        headers: { Authorization: "Basic " + btoa(focusToken + ":") },
      });
      if (resp.ok) {
        const json = await resp.json();
        if (json.status === "autorizado") {
          novoStatus = "autorizada";
          chave = json.chave_nfe ?? json.chave_nfce ?? chave;
          protocolo = json.protocolo ?? protocolo;
          mensagem = "Autorizada pela SEFAZ";
        } else if (json.status === "erro_autorizacao" || json.status === "denegado") {
          novoStatus = "rejeitada";
          mensagem = json.mensagem_sefaz ?? json.erros?.[0]?.mensagem ?? "Rejeitada";
        }
      }
    } else if (!focusToken && fi.status === "processando") {
      mensagem = "Aguardando configuração do token Focus NFe";
    }

    if (novoStatus !== fi.status) {
      await admin.from("fiscal_invoices").update({
        status: novoStatus,
        chave_acesso: chave,
        protocolo: protocolo,
        mensagem_sefaz: mensagem,
        emitida_em: novoStatus === "autorizada" ? new Date().toISOString() : fi.emitida_em,
      }).eq("id", fi.id);

      await admin.from("fiscal_events").insert({
        organization_id: fi.organization_id,
        fiscal_invoice_id: fi.id,
        tipo: "consulta_status",
        mensagem: mensagem ?? novoStatus,
        criado_por: userId,
      });
    }

    return new Response(JSON.stringify({ ok: true, status: novoStatus, chave_acesso: chave }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("fiscal-check-status error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
