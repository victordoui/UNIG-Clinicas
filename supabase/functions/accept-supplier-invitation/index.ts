import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const { token, password, nome_empresa, cnpj, nome_responsavel, telefone, aceite_termos } = body ?? {};
    if (!token || !password || !nome_responsavel || !aceite_termos) {
      throw new Error("Campos obrigatórios ausentes");
    }
    if (String(password).length < 8) throw new Error("Senha muito curta");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Atomic claim — only if still pending and not expired
    const { data: claimed, error: claimErr } = await admin
      .from("supplier_invitations")
      .update({ used_at: new Date().toISOString() })
      .eq("token", token)
      .eq("status", "pendente")
      .gt("expires_at", new Date().toISOString())
      .select()
      .maybeSingle();
    if (claimErr) throw claimErr;
    if (!claimed) throw new Error("Convite inválido, expirado ou já utilizado");

    const email = String(claimed.email).trim().toLowerCase();

    // Create or find auth user
    const { data: list } = await admin.auth.admin.listUsers();
    let userId = list.users.find((u) => u.email === email)?.id;
    if (!userId) {
      const { data: newUser, error: ce } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: nome_responsavel, supplier_invitation: true },
      });
      if (ce || !newUser.user) throw ce ?? new Error("Falha ao criar usuário");
      userId = newUser.user.id;
    } else {
      // Update password for existing user
      await admin.auth.admin.updateUserById(userId, { password });
    }

    // Create supplier shell
    const { data: supplier, error: supErr } = await admin
      .from("suppliers")
      .insert({
        organization_id: claimed.organization_id,
        nome_fantasia: nome_empresa || claimed.nome_empresa || nome_responsavel,
        razao_social: nome_empresa || claimed.nome_empresa || null,
        cnpj: cnpj || claimed.cnpj || null,
        email,
        telefone: telefone || null,
        tipo_fornecedor: claimed.tipo_fornecedor,
        status: "acesso_criado",
        created_by: userId,
      })
      .select()
      .single();
    if (supErr) throw supErr;

    // Organization member as fornecedor
    await admin.from("organization_members").upsert({
      organization_id: claimed.organization_id,
      user_id: userId,
      role: "fornecedor",
      is_active: true,
    }, { onConflict: "user_id,organization_id" });

    // Supplier user link
    const { error: linkErr } = await admin.from("supplier_users").upsert({
      user_id: userId,
      supplier_id: supplier.id,
      organization_id: claimed.organization_id,
      is_active: true,
    }, { onConflict: "user_id,supplier_id" });
    if (linkErr) throw linkErr;

    // Finalize invitation
    await admin.from("supplier_invitations")
      .update({ status: "usado", used_by_user_id: userId, supplier_id: supplier.id })
      .eq("id", claimed.id);

    return new Response(JSON.stringify({ success: true, email, supplier_id: supplier.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (e: any) {
    console.error("accept-supplier-invitation", e);
    return new Response(JSON.stringify({ error: e.message ?? "Erro" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
