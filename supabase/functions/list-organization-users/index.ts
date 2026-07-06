import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const [{ data: callerProfile }, { data: callerOrg }] = await Promise.all([
      admin.from("profiles").select("is_super_admin").eq("id", user.id).maybeSingle(),
      admin
        .from("organization_members")
        .select("organization_id, role")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle(),
    ]);

    const isSuperAdmin = !!callerProfile?.is_super_admin;
    const isOrgAdmin =
      callerOrg?.role === "organization_admin" || callerOrg?.role === "administrador";

    if (!isSuperAdmin && !isOrgAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerOrgId = callerOrg?.organization_id ?? null;

    // 1) organization_members
    let membersQuery = admin
      .from("organization_members")
      .select("id, user_id, organization_id, role, is_active, joined_at, created_at, invited_by")
      .order("joined_at", { ascending: false });
    if (!isSuperAdmin) membersQuery = membersQuery.eq("organization_id", callerOrgId!);
    const { data: members, error: membersErr } = await membersQuery;
    if (membersErr) throw membersErr;

    // 2) supplier_users
    let supplierQuery = admin
      .from("supplier_users")
      .select("id, user_id, supplier_id, organization_id, is_active, created_at, suppliers(nome_fantasia)")
      .eq("is_active", true);
    if (!isSuperAdmin) supplierQuery = supplierQuery.eq("organization_id", callerOrgId!);
    const { data: supplierUsers } = await supplierQuery;

    // 3) council_members (apenas flag)
    let councilQuery = admin
      .from("council_members")
      .select("user_id, organization_id, ativo, nome_exibicao")
      .eq("ativo", true);
    if (!isSuperAdmin) councilQuery = councilQuery.eq("organization_id", callerOrgId!);
    const { data: councilRows } = await councilQuery;

    const councilByUser: Record<string, { nome: string | null }> = {};
    (councilRows || []).forEach((c: any) => {
      councilByUser[c.user_id] = { nome: c.nome_exibicao ?? null };
    });

    // Profiles + Organizations
    const allUserIds = Array.from(new Set([
      ...(members || []).map((m: any) => m.user_id),
      ...(supplierUsers || []).map((s: any) => s.user_id),
    ])).filter(Boolean);

    let profilesById: Record<string, any> = {};
    if (allUserIds.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, email, full_name, avatar_url, created_at, is_super_admin")
        .in("id", allUserIds);
      profilesById = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]));
    }

    const orgIds = Array.from(new Set([
      ...(members || []).map((m: any) => m.organization_id),
      ...(supplierUsers || []).map((s: any) => s.organization_id),
    ])).filter(Boolean);
    let orgsById: Record<string, any> = {};
    if (orgIds.length > 0) {
      const { data: orgs } = await admin
        .from("organizations")
        .select("id, name, slug")
        .in("id", orgIds);
      orgsById = Object.fromEntries((orgs || []).map((o: any) => [o.id, o]));
    }

    // Build member entries
    const memberEntries = (members || []).map((m: any) => {
      const p = profilesById[m.user_id] || {};
      const cm = councilByUser[m.user_id];
      return {
        id: m.id,
        source: "member" as const,
        user_id: m.user_id,
        organization_id: m.organization_id,
        organization_name: orgsById[m.organization_id]?.name ?? null,
        role: m.role,
        is_active: m.is_active,
        joined_at: m.joined_at,
        full_name: p.full_name ?? null,
        email: p.email ?? null,
        avatar_url: p.avatar_url ?? null,
        is_super_admin: p.is_super_admin ?? false,
        is_council_member: !!cm,
        council_display_name: cm?.nome ?? null,
        supplier_name: null as string | null,
        created_at: p.created_at ?? m.created_at,
      };
    });

    const memberUserSet = new Set(memberEntries.map((e) => `${e.user_id}:${e.organization_id}`));

    // Build supplier entries (skip if same user already listed as member in same org)
    const supplierEntries = (supplierUsers || [])
      .filter((s: any) => !memberUserSet.has(`${s.user_id}:${s.organization_id}`))
      .map((s: any) => {
        const p = profilesById[s.user_id] || {};
        return {
          id: s.id,
          source: "supplier" as const,
          user_id: s.user_id,
          organization_id: s.organization_id,
          organization_name: orgsById[s.organization_id]?.name ?? null,
          role: "fornecedor",
          is_active: s.is_active,
          joined_at: s.created_at,
          full_name: p.full_name ?? null,
          email: p.email ?? null,
          avatar_url: p.avatar_url ?? null,
          is_super_admin: p.is_super_admin ?? false,
          is_council_member: false,
          council_display_name: null,
          supplier_name: s.suppliers?.nome_fantasia ?? null,
          created_at: p.created_at ?? s.created_at,
        };
      });

    const result = [...memberEntries, ...supplierEntries];

    return new Response(JSON.stringify({ users: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("list-organization-users error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
