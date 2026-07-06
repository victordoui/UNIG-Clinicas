import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  supplier_id: string;
  email: string;
  full_name: string;
  temporary_password: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Header de autorização ausente");
    const token = authHeader.replace("Bearer ", "");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: { user }, error: userError } = await admin.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Sessão expirada", code: "SESSION_EXPIRED" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const body: Body = await req.json();
    const { supplier_id, email, full_name, temporary_password } = body;
    if (!supplier_id || !email || !full_name || !temporary_password) {
      throw new Error("Campos obrigatórios ausentes");
    }

    // Resolve supplier organization and verify caller permission
    const { data: supplier, error: supErr } = await admin
      .from("suppliers").select("id, organization_id, nome_fantasia").eq("id", supplier_id).single();
    if (supErr || !supplier) throw new Error("Fornecedor não encontrado");

    const { data: callerMembership } = await admin
      .from("organization_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", supplier.organization_id)
      .eq("is_active", true)
      .maybeSingle();

    const { data: callerProfile } = await admin
      .from("profiles").select("is_super_admin").eq("id", user.id).maybeSingle();

    const allowedRoles = ["organization_admin", "administrador", "compras", "manager"];
    const isAuthorized = callerProfile?.is_super_admin ||
      (callerMembership && allowedRoles.includes(callerMembership.role));
    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: "Sem permissão" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Check if user exists
    const { data: list } = await admin.auth.admin.listUsers();
    const existing = list.users.find((u) => u.email === email);
    let userId: string;
    if (existing) {
      userId = existing.id;
    } else {
      const { data: newUser, error: createError } = await admin.auth.admin.createUser({
        email,
        password: temporary_password,
        email_confirm: true,
        user_metadata: { full_name, password_change_required: true },
      });
      if (createError || !newUser.user) throw createError ?? new Error("Erro ao criar usuário");
      userId = newUser.user.id;
      await new Promise((r) => setTimeout(r, 100));
    }

    // Ensure organization_members row with role 'fornecedor'
    const { data: existingMember } = await admin
      .from("organization_members")
      .select("id, is_active, role")
      .eq("user_id", userId)
      .eq("organization_id", supplier.organization_id)
      .maybeSingle();

    if (existingMember) {
      await admin.from("organization_members").update({
        role: "fornecedor", is_active: true, invited_by: user.id,
      }).eq("id", existingMember.id);
    } else {
      await admin.from("organization_members").insert({
        organization_id: supplier.organization_id,
        user_id: userId,
        role: "fornecedor",
        invited_by: user.id,
        is_active: true,
      });
    }

    // Insert supplier_users link
    const { error: linkError } = await admin.from("supplier_users").upsert({
      user_id: userId,
      supplier_id: supplier.id,
      organization_id: supplier.organization_id,
      invited_by: user.id,
      is_active: true,
    }, { onConflict: "user_id,supplier_id" });
    if (linkError) throw linkError;

    return new Response(JSON.stringify({ success: true, user_id: userId }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (e: any) {
    console.error("invite-supplier-user error:", e);
    return new Response(JSON.stringify({ error: e.message ?? "Erro" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
