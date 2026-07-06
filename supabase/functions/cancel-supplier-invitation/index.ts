import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Sem autorização");
    const jwt = authHeader.replace("Bearer ", "");
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: claims } = await admin.auth.getClaims(jwt);
    if (!claims?.claims?.sub) throw new Error("Sessão inválida");

    const { invitation_id } = await req.json();
    if (!invitation_id) throw new Error("invitation_id ausente");

    const { data, error } = await admin.from("supplier_invitations")
      .update({ status: "cancelado" })
      .eq("id", invitation_id)
      .eq("status", "pendente")
      .select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Convite não pode ser cancelado");

    return new Response(JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message ?? "Erro" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
