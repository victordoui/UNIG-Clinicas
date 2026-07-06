import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch contracts in expiring window (60 days) not yet warned in the last 7 days
    const { data: rows, error } = await admin
      .from("contracts_expiring_v")
      .select("contract_id, organization_id, supplier_id, numero, fim, status, dias_aviso_vencimento, auto_renovacao, aviso_enviado_em, dias_para_vencer");
    if (error) throw error;

    let alerts = 0;
    let renewMarks = 0;
    const sevenDaysAgo = Date.now() - 7 * 24 * 3_600_000;

    for (const c of rows ?? []) {
      const withinWarning = (c.dias_para_vencer ?? 999) <= (c.dias_aviso_vencimento ?? 30);
      if (!withinWarning) continue;

      const lastWarn = c.aviso_enviado_em ? new Date(c.aviso_enviado_em).getTime() : 0;
      if (lastWarn > sevenDaysAgo) continue;

      // Fetch supplier name
      const { data: supplier } = await admin
        .from("suppliers")
        .select("nome_fantasia")
        .eq("id", c.supplier_id)
        .maybeSingle();

      const supplierName = supplier?.nome_fantasia ?? "Fornecedor";
      const dias = c.dias_para_vencer;
      const title = dias <= 0 ? `Contrato vencido: ${supplierName}` : `Contrato vencendo em ${dias} dias: ${supplierName}`;
      const message = `Contrato ${c.numero} (${supplierName}) vence em ${c.fim}.${c.auto_renovacao ? ' Renovação automática ativada.' : ' Inicie processo de renovação.'}`;

      await admin.from("alerts").insert({
        organization_id: c.organization_id,
        type: "system",
        severity: dias <= 0 ? "high" : dias <= 7 ? "high" : "medium",
        title,
        message,
      });
      alerts++;

      const newStatus = c.auto_renovacao ? c.status : "em_renovacao";
      await admin
        .from("supplier_contracts")
        .update({ aviso_enviado_em: new Date().toISOString(), status: newStatus })
        .eq("id", c.contract_id);
      if (newStatus === "em_renovacao") renewMarks++;
    }

    return new Response(JSON.stringify({ success: true, alerts, renewMarks }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("contract-expiry-cron fatal", e);
    return new Response(JSON.stringify({ error: e?.message ?? "internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
