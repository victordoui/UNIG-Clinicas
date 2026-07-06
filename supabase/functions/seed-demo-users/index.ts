// Seed demo users for UNIG-A (quick access buttons on /auth).
// Creates one auth user per role with a fixed password and inserts a matching row in user_roles.
// Safe to call multiple times: existing users are skipped, roles are upserted.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ROLES = [
  'super_admin', 'administrador', 'secretaria', 'coordenacao',
  'professor', 'aluno', 'financeiro', 'atendimento',
  'gestor_unidade', 'operador_espacos',
] as const;

const LABELS: Record<string, string> = {
  super_admin: 'Super Admin Demo',
  administrador: 'Administrador Demo',
  secretaria: 'Secretaria Demo',
  coordenacao: 'Coordenação Demo',
  professor: 'Professor Demo',
  aluno: 'Aluno Demo',
  financeiro: 'Financeiro Demo',
  atendimento: 'Atendimento Demo',
  gestor_unidade: 'Gestor de Unidade Demo',
  operador_espacos: 'Operador de Espaços Demo',
};

const DEMO_PASSWORD = 'unig1234';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey);

    let created = 0;
    let existed = 0;
    const details: Array<{ role: string; email: string; status: string; id?: string; error?: string }> = [];

    for (const role of ROLES) {
      const email = `${role.replace(/_/g, '-')}@unig.demo`;
      let userId: string | null = null;

      // Create user (skip if already exists)
      const { data: created1, error: createErr } = await admin.auth.admin.createUser({
        email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: LABELS[role] },
      });

      if (createErr) {
        // Likely already exists — look it up
        const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
        if (listErr) {
          details.push({ role, email, status: 'error', error: `list: ${listErr.message}` });
          continue;
        }
        const found = list.users.find((u) => u.email === email);
        if (!found) {
          details.push({ role, email, status: 'error', error: `create failed: ${createErr.message}` });
          continue;
        }
        userId = found.id;
        existed++;
      } else {
        userId = created1.user.id;
        created++;
      }

      // Ensure profile exists (trigger should have created it, but let's be defensive)
      await admin.from('profiles').upsert({ id: userId, email, full_name: LABELS[role] }, { onConflict: 'id' });

      // Flag super_admin on profile
      if (role === 'super_admin') {
        await admin.from('profiles').update({ is_super_admin: true }).eq('id', userId);
      }

      // Upsert role
      const { error: roleErr } = await admin
        .from('user_roles')
        .upsert(
          { user_id: userId, role: role as any, is_active: true },
          { onConflict: 'user_id,role' },
        );

      if (roleErr) {
        details.push({ role, email, status: 'role_error', id: userId, error: roleErr.message });
      } else {
        details.push({ role, email, status: created1 ? 'created' : 'existed', id: userId });
      }
    }

    return new Response(
      JSON.stringify({ ok: true, created, existed, total: ROLES.length, password: DEMO_PASSWORD, details }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
