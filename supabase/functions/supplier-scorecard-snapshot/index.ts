import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PERIOD_DAYS = 30;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const to = new Date();
    const from = new Date(Date.now() - PERIOD_DAYS * 24 * 3_600_000);

    // List active organizations
    const { data: orgs, error: orgsErr } = await admin
      .from("organizations")
      .select("id");
    if (orgsErr) throw orgsErr;

    let totalSnapshots = 0;

    for (const org of orgs ?? []) {
      // Call scorecard scoped to this org by temporarily setting jwt claim is not trivial
      // Instead, we run the calc directly via an SQL RPC alternative:
      // We re-query the function as if the user belonged to this org by issuing a custom SQL.
      // Simplest path: use the same function but only after impersonating — not possible.
      // So we fetch raw aggregates per-org with service role and recompute the same formula here.

      const [{ data: orders }, { data: evals }, { data: receipts }, { data: quotes }] = await Promise.all([
        admin.from("purchase_orders").select("id, supplier_id, valor_total, status, prazo_entrega_dias, created_at, nota_fiscal_uploaded_at")
          .eq("organization_id", org.id).gte("created_at", from.toISOString()).lte("created_at", to.toISOString()),
        admin.from("supplier_evaluations").select("supplier_id, nota_geral, created_at")
          .eq("organization_id", org.id).gte("created_at", from.toISOString()).lte("created_at", to.toISOString()),
        admin.from("purchase_receipts").select("order_id, data_recebimento, divergencia, created_at, purchase_orders:order_id(supplier_id, organization_id, created_at, prazo_entrega_dias)")
          .gte("created_at", from.toISOString()).lte("created_at", to.toISOString()),
        admin.from("purchase_quotes").select("supplier_id, status, created_at, updated_at")
          .eq("organization_id", org.id).gte("created_at", from.toISOString()).lte("created_at", to.toISOString()),
      ]);

      const supplierIds = new Set<string>();
      (orders ?? []).forEach((o: any) => o.supplier_id && supplierIds.add(o.supplier_id));
      (evals ?? []).forEach((e: any) => supplierIds.add(e.supplier_id));
      (quotes ?? []).forEach((q: any) => q.supplier_id && supplierIds.add(q.supplier_id));

      for (const sid of supplierIds) {
        const sOrders = (orders ?? []).filter((o: any) => o.supplier_id === sid);
        const sEvals = (evals ?? []).filter((e: any) => e.supplier_id === sid);
        const sQuotes = (quotes ?? []).filter((q: any) => q.supplier_id === sid);
        const sReceipts = (receipts ?? []).filter((r: any) => r.purchase_orders?.supplier_id === sid && r.purchase_orders?.organization_id === org.id);

        const ordersCount = sOrders.length;
        const totalValue = sOrders.reduce((a: number, o: any) => a + Number(o.valor_total || 0), 0);

        const received = sOrders.filter((o: any) => o.status === "recebido_total");
        const onTime = received.filter((o: any) => {
          const rec = sReceipts.find((r: any) => r.order_id === o.id);
          if (!rec) return false;
          const deadline = new Date(o.created_at);
          deadline.setDate(deadline.getDate() + (o.prazo_entrega_dias ?? 0));
          return new Date(rec.data_recebimento) <= deadline;
        });
        const onTimeRate = received.length ? (100 * onTime.length) / received.length : 0;

        const active = sOrders.filter((o: any) => o.status !== "cancelado");
        const nfOnTime = active.filter((o: any) => o.nota_fiscal_uploaded_at && (new Date(o.nota_fiscal_uploaded_at).getTime() - new Date(o.created_at).getTime()) <= 48 * 3_600_000);
        const nfOnTimeRate = active.length ? (100 * nfOnTime.length) / active.length : 0;

        const divCount = sReceipts.filter((r: any) => r.divergencia).length;
        const divRate = sReceipts.length ? (100 * divCount) / sReceipts.length : 0;

        const responded = sQuotes.filter((q: any) => ["respondida", "escolhida", "descartada"].includes(q.status) && (new Date(q.updated_at).getTime() - new Date(q.created_at).getTime()) <= 48 * 3_600_000);
        const respRate = sQuotes.length ? (100 * responded.length) / sQuotes.length : 0;

        const manualAvg = sEvals.length ? (sEvals.reduce((a: number, e: any) => a + Number(e.nota_geral || 0), 0) / sEvals.length) * 20 : 0;

        const score = 0.30 * manualAvg + 0.25 * onTimeRate + 0.15 * nfOnTimeRate + 0.15 * (100 - divRate) + 0.15 * respRate;
        const tier = ordersCount === 0 && manualAvg === 0 ? "sem_dados"
          : score >= 85 ? "ouro"
          : score >= 70 ? "prata"
          : score >= 50 ? "bronze"
          : "atencao";

        await admin.from("supplier_score_snapshots").insert({
          supplier_id: sid,
          organization_id: org.id,
          period_from: from.toISOString(),
          period_to: to.toISOString(),
          score_final: Number(score.toFixed(2)),
          tier,
          metrics: {
            manual_avg: Number(manualAvg.toFixed(2)),
            on_time_rate: Number(onTimeRate.toFixed(2)),
            nf_on_time_rate: Number(nfOnTimeRate.toFixed(2)),
            divergence_rate: Number(divRate.toFixed(2)),
            quote_response_rate: Number(respRate.toFixed(2)),
            orders_count: ordersCount,
            total_value: totalValue,
          },
        });
        totalSnapshots++;
      }
    }

    return new Response(JSON.stringify({ success: true, snapshots: totalSnapshots }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("supplier-scorecard-snapshot fatal", e);
    return new Response(JSON.stringify({ error: e?.message ?? "internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
