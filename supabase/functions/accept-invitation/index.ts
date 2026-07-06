import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function validatePassword(p: string): string | null {
  if (!p || p.length < 12) return "Senha deve ter no mínimo 12 caracteres";
  if (!/[A-Z]/.test(p)) return "Senha deve conter letra maiúscula";
  if (!/[a-z]/.test(p)) return "Senha deve conter letra minúscula";
  if (!/[0-9]/.test(p)) return "Senha deve conter número";
  if (!/[^A-Za-z0-9]/.test(p)) return "Senha deve conter caractere especial";
  return null;
}

function jsonErr(msg: string, status: number) {
  return new Response(JSON.stringify({ success: false, error: msg }), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const token = String(body.token || "").trim();
    const full_name = String(body.full_name || "").trim();
    const password = String(body.password || "");
    const preferred_name = String(body.preferred_name || "").trim() || null;
    const registration = String(body.registration || "").trim() || null;
    const birth_date = body.birth_date || null;
    const job_role = String(body.job_role || "").trim() || null;
    const department = String(body.department || "").trim() || null;
    const unit_campus = String(body.unit_campus || "").trim() || null;
    const work_location = String(body.work_location || "").trim() || null;
    const whatsapp = String(body.whatsapp || "").trim() || null;
    const personal_email = String(body.personal_email || "").trim().toLowerCase() || null;
    const user_type = String(body.user_type || "").trim().toLowerCase() || null;
    const accept_terms = body.accept_terms === true;

    if (!token) return jsonErr("Token ausente", 400);
    if (!full_name) return jsonErr("Nome completo obrigatório", 400);
    if (!accept_terms) return jsonErr("É necessário aceitar os termos de uso", 400);
    const pwErr = validatePassword(password);
    if (pwErr) return jsonErr(pwErr, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: inv, error: invErr } = await admin
      .from("user_invitations").select("*").eq("token", token).maybeSingle();

    if (invErr || !inv) return jsonErr("Convite não encontrado", 404);
    if (inv.accepted_at) return jsonErr("Convite já utilizado", 400);
    if (inv.cancelled_at || inv.revoked_at) return jsonErr("Convite cancelado", 400);
    if (new Date(inv.expires_at).getTime() < Date.now()) return jsonErr("Convite expirado", 400);

    // Limite
    const { data: org } = await admin
      .from("organizations").select("max_users").eq("id", inv.organization_id).single();
    const { count } = await admin
      .from("organization_members")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", inv.organization_id)
      .eq("is_active", true);
    if (org && count !== null && count >= org.max_users) {
      return jsonErr(`Limite de ${org.max_users} usuários atingido`, 400);
    }

    const { data: existingList } = await admin.auth.admin.listUsers();
    const existing = existingList.users.find((u) => u.email?.toLowerCase() === inv.email.toLowerCase());

    let userId: string;
    if (existing) {
      userId = existing.id;
      await admin.auth.admin.updateUserById(userId, {
        password, email_confirm: true,
        user_metadata: { full_name, password_change_required: false },
      });
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: inv.email, password, email_confirm: true,
        user_metadata: { full_name, password_change_required: false },
      });
      if (createErr || !created.user) return jsonErr(createErr?.message || "Erro ao criar usuário", 500);
      userId = created.user.id;
      await new Promise((r) => setTimeout(r, 150));
    }

    await admin.from("profiles").upsert({
      id: userId,
      email: inv.email,
      institutional_email: inv.email,
      full_name,
      preferred_name,
      nickname: preferred_name,
      registration,
      birth_date,
      department,
      job_role,
      unit_campus,
      work_location,
      whatsapp,
      personal_email,
      user_type: user_type || inv.invitee_type || "visitante",
      password_change_required: false,
    }, { onConflict: "id" });

    // SEMPRE como visitante (defesa em profundidade)
    const { data: existingMember } = await admin
      .from("organization_members")
      .select("id")
      .eq("user_id", userId)
      .eq("organization_id", inv.organization_id)
      .maybeSingle();

    if (existingMember) {
      await admin.from("organization_members").update({
        role: "visitante", is_active: true, invited_by: inv.invited_by,
      }).eq("id", existingMember.id);
    } else {
      const { error: memberErr } = await admin.from("organization_members").insert({
        organization_id: inv.organization_id,
        user_id: userId,
        role: "visitante",
        invited_by: inv.invited_by,
        is_active: true,
      });
      if (memberErr) return jsonErr(memberErr.message, 500);
    }

    await admin.from("user_invitations").update({
      accepted_at: new Date().toISOString(),
      accepted_by: userId,
      filled_name: full_name,
    }).eq("id", inv.id);

    return new Response(JSON.stringify({ success: true, email: inv.email }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("accept-invitation error:", e);
    return jsonErr(e.message || "Erro interno", 500);
  }
});
