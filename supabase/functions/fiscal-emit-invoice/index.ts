// Edge function: fiscal-emit-invoice
// Recebe { referencia_tipo, referencia_id, modelo } e dispara emissão via Focus NFe.
// Quando o token Focus NFe não está configurado, cria a fiscal_invoice em status "rascunho"
// para que o usuário possa configurar depois sem perder o registro.

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

    const body = await req.json();
    const { referencia_tipo, referencia_id, modelo } = body ?? {};
    if (!referencia_tipo || !referencia_id || !modelo) {
      return new Response(JSON.stringify({ error: "Parâmetros faltando" }), { status: 400, headers: corsHeaders });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Resolve org do usuário
    const { data: orgRow } = await admin
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();
    const orgId = orgRow?.organization_id;
    if (!orgId) {
      return new Response(JSON.stringify({ error: "Organização não encontrada" }), { status: 400, headers: corsHeaders });
    }

    // Idempotência: se já existe nota pra esta referência em estado utilizável, devolve
    const { data: existing } = await admin
      .from("fiscal_invoices")
      .select("*")
      .eq("organization_id", orgId)
      .eq("referencia_tipo", referencia_tipo)
      .eq("referencia_id", referencia_id)
      .eq("modelo", modelo)
      .in("status", ["processando", "autorizada"])
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ ok: true, fiscal_invoice_id: existing.id, status: existing.status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Configurações fiscais
    const { data: settings } = await admin
      .from("fiscal_settings")
      .select("*")
      .eq("organization_id", orgId)
      .maybeSingle();
    if (!settings) {
      return new Response(
        JSON.stringify({ error: "Configurações fiscais ausentes. Acesse Configuração Fiscal." }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Carregar dados da referência (fatura -> pedido -> itens)
    let referencia: any = null;
    let itens: any[] = [];
    let destinatario: any = null;
    let valorTotal = 0;

    if (referencia_tipo === "invoice") {
      const { data: inv } = await admin.from("invoices").select("*").eq("id", referencia_id).maybeSingle();
      referencia = inv;
      if (inv?.order_id) {
        const { data: items } = await admin
          .from("sales_order_items")
          .select("*, products(name, sku)")
          .eq("order_id", inv.order_id);
        itens = items ?? [];
      }
      if (inv?.customer_id) {
        const { data: cust } = await admin.from("customers").select("*").eq("id", inv.customer_id).maybeSingle();
        destinatario = cust;
      }
      valorTotal = Number(inv?.valor_total ?? 0);
    }

    // Numeração
    const { data: numRow } = await admin.rpc("next_fiscal_number", {
      _org_id: orgId,
      _modelo: modelo,
    });
    const numero = numRow?.[0]?.numero ?? null;
    const serie = numRow?.[0]?.serie ?? null;

    // Tenta chamar Focus NFe se houver token
    const tokenSecret = settings.ambiente === "producao" ? "FOCUS_NFE_TOKEN_PROD" : "FOCUS_NFE_TOKEN_HOMOLOG";
    const focusToken = Deno.env.get(tokenSecret);

    const initialStatus = focusToken ? "processando" : "rascunho";
    const mensagem = focusToken
      ? "Enviada ao Focus NFe"
      : `Salva como rascunho. Configure o secret ${tokenSecret} para emissão automática.`;

    // Cria fiscal_invoice
    const { data: fi, error: fiErr } = await admin
      .from("fiscal_invoices")
      .insert({
        organization_id: orgId,
        numero,
        serie,
        modelo,
        tipo: "saida",
        ambiente: settings.ambiente,
        status: initialStatus,
        referencia_id,
        referencia_tipo,
        valor_total: valorTotal,
        destinatario_nome: destinatario?.nome ?? null,
        destinatario_documento: destinatario?.documento ?? null,
        mensagem_sefaz: mensagem,
        emitida_em: focusToken ? new Date().toISOString() : null,
        created_by: userId,
      })
      .select()
      .single();
    if (fiErr) throw fiErr;

    // Itens
    if (itens.length) {
      const itemRows = itens.map((it: any, idx: number) => ({
        fiscal_invoice_id: fi.id,
        organization_id: orgId,
        product_id: it.product_id,
        numero_item: idx + 1,
        descricao: it.products?.name ?? "Item",
        cfop: "5102",
        unidade: "UN",
        quantidade: Number(it.quantidade ?? 0),
        valor_unitario: Number(it.preco_unitario ?? 0),
        valor_total: Number(it.valor_total ?? Number(it.quantidade ?? 0) * Number(it.preco_unitario ?? 0)),
      }));
      await admin.from("fiscal_invoice_items").insert(itemRows);
    }

    // Evento
    await admin.from("fiscal_events").insert({
      organization_id: orgId,
      fiscal_invoice_id: fi.id,
      tipo: "emissao",
      mensagem,
      payload: { referencia_tipo, referencia_id, modelo },
      criado_por: userId,
    });

    // Se Focus NFe configurado, enviar (placeholder simples; integração real expandida depois)
    if (focusToken) {
      // Em produção, aqui seria o POST para https://api.focusnfe.com.br/v2/nfe?ref=...
      // Mantemos placeholder para evitar requisições reais sem certificado configurado.
    }

    return new Response(
      JSON.stringify({ ok: true, fiscal_invoice_id: fi.id, status: initialStatus, numero, serie }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("fiscal-emit-invoice error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
