import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function j(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const token = String(body.token || "").trim();
    if (!token) return j({ valid: false, error: "Token ausente" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: inv } = await admin
      .from("user_invitations")
      .select("email, role, invitee_type, organization_id, expires_at, accepted_at, revoked_at, cancelled_at")
      .eq("token", token)
      .maybeSingle();

    if (!inv) return j({ valid: false, error: "Convite não encontrado", reason: "not_found" });
    if (inv.accepted_at) return j({ valid: false, error: "Convite já utilizado", reason: "used" });
    if (inv.cancelled_at || inv.revoked_at) return j({ valid: false, error: "Convite cancelado", reason: "cancelled" });
    if (new Date(inv.expires_at).getTime() < Date.now()) return j({ valid: false, error: "Convite expirado", reason: "expired" });

    const { data: org } = await admin
      .from("organizations").select("name").eq("id", inv.organization_id).single();

    return j({
      valid: true,
      email: inv.email,
      role: "visitante",
      role_label: "Visitante",
      invitee_type: inv.invitee_type || "visitante",
      organization_name: org?.name || "",
      expires_at: inv.expires_at,
    });
  } catch (e: any) {
    return j({ valid: false, error: e.message }, 500);
  }
});
