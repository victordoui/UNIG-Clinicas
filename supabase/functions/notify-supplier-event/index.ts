import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type EventKind =
  | "quote_requested"
  | "order_created"
  | "divergence"
  | "nf_reminder"
  | "quote_stale";

interface Body {
  event: EventKind;
  supplier_id: string;
  reference?: string;
  order_id?: string;
  request_id?: string;
  amount?: number;
}

const fmtBRL = (v?: number) =>
  typeof v === "number"
    ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "";

function buildMessage(b: Body): { title: string; message: string } {
  const ref = b.reference ? ` ${b.reference}` : "";
  const amt = b.amount ? ` — ${fmtBRL(b.amount)}` : "";
  switch (b.event) {
    case "quote_requested":
      return {
        title: "Nova cotação solicitada",
        message: `Você recebeu uma nova solicitação de cotação${ref}.`,
      };
    case "order_created":
      return {
        title: "Novo pedido recebido",
        message: `Pedido${ref}${amt} aguardando sua confirmação.`,
      };
    case "divergence":
      return {
        title: "Divergência registrada",
        message: `Foi registrada divergência no recebimento do pedido${ref}.`,
      };
    case "nf_reminder":
      return {
        title: "Lembrete: NF pendente",
        message: `O pedido${ref} ainda está sem nota fiscal. Envie para liberar o pagamento.`,
      };
    case "quote_stale":
      return {
        title: "Cotação aguardando resposta",
        message: `A cotação${ref} está aguardando sua proposta há mais de 24h.`,
      };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await authClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: Body = await req.json();
    if (!body?.event || !body?.supplier_id) {
      return new Response(JSON.stringify({ error: "event e supplier_id obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: links, error: linksErr } = await admin
      .from("supplier_users")
      .select("user_id")
      .eq("supplier_id", body.supplier_id);

    if (linksErr) {
      console.error("supplier_users error", linksErr);
      return new Response(JSON.stringify({ error: linksErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userIds = (links ?? []).map((l: any) => l.user_id).filter(Boolean);
    if (userIds.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, note: "no supplier users" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { title, message } = buildMessage(body);
    const url = "/portal-fornecedor/caixa";

    let sent = 0;
    let failed = 0;
    for (const uid of userIds) {
      try {
        const { error } = await admin.functions.invoke("send-push-notification", {
          body: {
            userId: uid,
            title,
            message,
            url,
            data: {
              event: body.event,
              order_id: body.order_id,
              request_id: body.request_id,
            },
          },
        });
        if (error) {
          failed++;
          console.error("send-push-notification error", error);
        } else {
          sent++;
        }
      } catch (e) {
        failed++;
        console.error("invoke threw", e);
      }
    }

    return new Response(JSON.stringify({ success: true, sent, failed, total: userIds.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("notify-supplier-event fatal", e);
    return new Response(JSON.stringify({ error: e?.message ?? "internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
