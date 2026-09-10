// One-time bootstrap for the UNIG Clínicas development environment.
// The function is deployed with JWT verification after the initial invocation.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const DEMO_PASSWORD = 'unig1234';
const DEMO_ORGANIZATION = 'UNIG Clínicas — Ambiente de Teste';
const ROLES = [
  ['super_admin', 'Super Admin'], ['organization_admin', 'Administração da organização'],
  ['clinic_manager', 'Gestão da clínica'], ['clinician', 'Profissional clínico'],
  ['academic_supervisor', 'Supervisor acadêmico'], ['student', 'Estudante'],
  ['receptionist', 'Recepção'], ['auditor', 'Auditoria'],
] as const;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: existingOrganization, error: lookupError } = await admin
      .from('organizations').select('id').eq('display_name', DEMO_ORGANIZATION).maybeSingle();
    if (lookupError) throw lookupError;

    // Before initialization, allow one anonymous call. Once the test organization
    // exists, subsequent calls require the test Super Admin session.
    if (existingOrganization) {
      const authorization = req.headers.get('authorization');
      if (!authorization?.startsWith('Bearer ')) return json({ error: 'Bootstrap já concluído.' }, 403);
      const { data: userData, error: userError } = await admin.auth.getUser(authorization.slice(7));
      if (userError || !userData.user) return json({ error: 'Sessão inválida.' }, 401);
      const { data: assignment } = await admin
        .from('user_roles').select('role:roles(code)')
        .eq('user_id', userData.user.id).eq('organization_id', existingOrganization.id).eq('is_active', true).maybeSingle();
      if ((assignment as { role?: { code?: string } } | null)?.role?.code !== 'super_admin') {
        return json({ error: 'Apenas o Super Admin pode executar esta operação.' }, 403);
      }
    }

    let organizationId = existingOrganization?.id;
    if (!organizationId) {
      const { data, error } = await admin.from('organizations')
        .insert({ legal_name: DEMO_ORGANIZATION, display_name: DEMO_ORGANIZATION, is_active: true }).select('id').single();
      if (error) throw error;
      organizationId = data.id;
    }

    const { data: roleRows, error: rolesError } = await admin.from('roles').select('id, code').in('code', ROLES.map(([code]) => code));
    if (rolesError) throw rolesError;
    const roleByCode = new Map(roleRows.map((role) => [role.code, role.id]));
    if (roleByCode.size !== ROLES.length) throw new Error('Papéis clínicos de sistema não foram encontrados.');

    let created = 0;
    let existed = 0;
    for (const [code, label] of ROLES) {
      const email = `${code.replace(/_/g, '-')}@unig.demo`;
      const { data: createdUser, error: createError } = await admin.auth.admin.createUser({ email, password: DEMO_PASSWORD, email_confirm: true });
      let userId = createdUser.user?.id;
      if (createError) {
        const { data: users, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        if (usersError) throw usersError;
        userId = users.users.find((user) => user.email === email)?.id;
        if (!userId) throw createError;
        existed++;
      } else created++;

      const { error: profileError } = await admin.from('profiles')
        .upsert({ id: userId, email, full_name: `${label} — Teste` }, { onConflict: 'id' });
      if (profileError) throw profileError;
      const roleId = roleByCode.get(code)!;
      const { data: assignment, error: assignmentError } = await admin.from('user_roles').select('id')
        .eq('user_id', userId).eq('organization_id', organizationId).eq('role_id', roleId).maybeSingle();
      if (assignmentError) throw assignmentError;
      if (!assignment) {
        const { error } = await admin.from('user_roles').insert({ user_id: userId, organization_id: organizationId, role_id: roleId, is_active: true });
        if (error) throw error;
      }
    }
    return json({ ok: true, created, existed, total: ROLES.length });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
