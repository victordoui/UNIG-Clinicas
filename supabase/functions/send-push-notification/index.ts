import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  userId?: string;
  organizationId?: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  icon?: string;
  badge?: string;
  url?: string;
}

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// Web Push com VAPID
async function sendWebPush(
  subscription: PushSubscription,
  payload: object,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<Response> {
  const encoder = new TextEncoder();
  const payloadBytes = encoder.encode(JSON.stringify(payload));

  // Criar JWT para VAPID
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    aud: new URL(subscription.endpoint).origin,
    exp: now + 12 * 60 * 60, // 12 horas
    sub: vapidSubject,
  };

  // Para simplificar, usamos fetch direto com headers VAPID
  // Em produção, usar biblioteca de Web Push ou crypto nativo
  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      TTL: "86400",
      Urgency: "high",
    },
    body: payloadBytes,
  });

  return response;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@unigops.app";

    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: PushPayload = await req.json();
    const { userId, organizationId, title, message, data, icon, badge, url } = body;

    if (!title || !message) {
      return new Response(
        JSON.stringify({ error: "title e message são obrigatórios" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Buscar tokens de push
    let query = supabase.from("user_push_tokens").select("user_id, subscription");

    if (userId) {
      query = query.eq("user_id", userId);
    } else if (organizationId) {
      // Buscar todos os membros da organização
      const { data: members } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", organizationId)
        .eq("is_active", true);

      if (members && members.length > 0) {
        const userIds = members.map((m) => m.user_id);
        query = query.in("user_id", userIds);
      }
    }

    const { data: tokens, error: tokensError } = await query;

    if (tokensError) {
      console.error("Erro ao buscar tokens:", tokensError);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar tokens" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Nenhum token encontrado",
          sent: 0 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Preparar payload da notificação
    const notificationPayload = {
      title,
      body: message,
      icon: icon || "/pwa-192x192.png",
      badge: badge || "/pwa-64x64.png",
      data: {
        ...data,
        url: url || "/",
        timestamp: new Date().toISOString(),
      },
      actions: [
        { action: "view", title: "Ver" },
        { action: "dismiss", title: "Dispensar" },
      ],
    };

    // Enviar notificações
    const results = {
      sent: 0,
      failed: 0,
      expired: [] as string[],
    };

    for (const token of tokens) {
      try {
        const subscription = token.subscription as unknown as PushSubscription;

        if (!subscription?.endpoint) {
          console.warn(`Token inválido para user ${token.user_id}`);
          continue;
        }

        // Tentar enviar via fetch simples (funciona para alguns provedores)
        const response = await fetch(subscription.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            TTL: "86400",
          },
          body: JSON.stringify(notificationPayload),
        });

        if (response.ok || response.status === 201) {
          results.sent++;
        } else if (response.status === 410 || response.status === 404) {
          // Token expirado ou inválido - remover do banco
          results.expired.push(token.user_id);
          await supabase
            .from("user_push_tokens")
            .delete()
            .eq("user_id", token.user_id);
        } else {
          console.error(`Falha ao enviar para ${token.user_id}: ${response.status}`);
          results.failed++;
        }
      } catch (error) {
        console.error(`Erro ao processar token ${token.user_id}:`, error);
        results.failed++;
      }
    }

    console.log("Resultados do envio:", results);

    return new Response(
      JSON.stringify({
        success: true,
        ...results,
        total: tokens.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Erro na edge function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
