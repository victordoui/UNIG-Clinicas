import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NF_LATE_HOURS = 48;
const QUOTE_LATE_HOURS = 24;
const DEDUP_DAYS = 7;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const now = Date.now();
    const nfCutoff = new Date(now - NF_LATE_HOURS * 3_600_000).toISOString();
    const quoteCutoff = new Date(now - QUOTE_LATE_HOURS * 3_600_000).toISOString();
    const dedupSince = new Date(now - DEDUP_DAYS * 24 * 3_600_000).toISOString();

    // Pending NF orders
    const { data: orders, error: ordersErr } = await admin
      .from("purchase_orders")
      .select("id, supplier_id, numero, organization_id, created_at, nota_fiscal_path, status")
      .is("nota_fiscal_path", null)
      .not("status", "in", '("cancelado","recebido_total")')
      .lte("created_at", nfCutoff)
      .limit(500);
    if (ordersErr) throw ordersErr;

    // Stale quotes
    const { data: quotes, error: quotesErr } = await admin
      .from("purchase_quotes")
      .select("id, supplier_id, status, created_at, request_id, organization_id, purchase_requests:request_id(numero)")
      .in("status", ["solicitada", "pendente"])
      .lte("created_at", quoteCutoff)
      .limit(500);
    if (quotesErr) throw quotesErr;

    const candidates: Array<{ kind: "nf_reminder" | "quote_stale"; supplier_id: string; ref_id: string; reference?: string; organization_id?: string; order_id?: string; request_id?: string }> = [];

    (orders ?? []).forEach((o: any) => {
      if (!o.supplier_id) return;
      candidates.push({
        kind: "nf_reminder",
        supplier_id: o.supplier_id,
        ref_id: o.id,
        reference: o.numero,
        organization_id: o.organization_id,
        order_id: o.id,
      });
    });
    (quotes ?? []).forEach((q: any) => {
      if (!q.supplier_id) return;
      candidates.push({
        kind: "quote_stale",
        supplier_id: q.supplier_id,
        ref_id: q.id,
        reference: q.purchase_requests?.numero,
        organization_id: q.organization_id,
        request_id: q.request_id,
      });
    });

    if (candidates.length === 0) {
      return new Response(JSON.stringify({ success: true, scanned: 0, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Dedup: fetch recent notifications for these refs
    const refIds = candidates.map((c) => c.ref_id);
    const { data: recent, error: recentErr } = await admin
      .from("supplier_sla_notifications")
      .select("supplier_id, kind, ref_id")
      .in("ref_id", refIds)
      .gte("notified_at", dedupSince);
    if (recentErr) throw recentErr;

    const seen = new Set(
      (recent ?? []).map((r: any) => `${r.supplier_id}|${r.kind}|${r.ref_id}`)
    );

    let sent = 0;
    let failed = 0;
    for (const c of candidates) {
      const key = `${c.supplier_id}|${c.kind}|${c.ref_id}`;
      if (seen.has(key)) continue;
      try {
        const { error: invokeErr } = await admin.functions.invoke("notify-supplier-event", {
          body: {
            event: c.kind,
            supplier_id: c.supplier_id,
            reference: c.reference,
            order_id: c.order_id,
            request_id: c.request_id,
          },
        });
        if (invokeErr) {
          failed++;
          console.error("notify-supplier-event invoke error", invokeErr);
          continue;
        }
        await admin.from("supplier_sla_notifications").insert({
          supplier_id: c.supplier_id,
          kind: c.kind,
          ref_id: c.ref_id,
          organization_id: c.organization_id ?? null,
        });
        sent++;
      } catch (e) {
        failed++;
        console.error("sla cron item error", e);
      }
    }

    return new Response(JSON.stringify({ success: true, scanned: candidates.length, sent, failed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("supplier-sla-cron fatal", e);
    return new Response(JSON.stringify({ error: e?.message ?? "internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
