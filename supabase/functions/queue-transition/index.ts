import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  const authorization = req.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'Sessão obrigatória.' }, 401);

  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: userData, error: userError } = await admin.auth.getUser(authorization.slice(7));
    if (userError || !userData.user) return json({ error: 'Sessão inválida.' }, 401);

    const body = await req.json() as { sessionId?: string; targetStatus?: string };
    if (!body.sessionId || body.targetStatus !== 'open') return json({ error: 'Transição não suportada.' }, 400);

    const { data: queue, error: queueError } = await admin.from('queue_sessions')
      .select('id,organization_id,clinic_id,status,service_date')
      .eq('id', body.sessionId)
      .single();
    if (queueError || !queue) return json({ error: 'Fila não encontrada.' }, 404);
    if (queue.service_date !== new Date().toISOString().slice(0, 10)) return json({ error: 'Somente a fila de hoje pode ser reaberta.' }, 409);
    if (queue.status === 'open') return json({ ok: true, status: 'open' });
    if (!['closed', 'paused'].includes(queue.status)) return json({ error: 'Estado da fila inválido.' }, 409);

    const { data: assignments, error: assignmentError } = await admin.from('user_roles')
      .select('id,role:roles(code)')
      .eq('user_id', userData.user.id)
      .eq('organization_id', queue.organization_id)
      .eq('is_active', true);
    if (assignmentError) throw assignmentError;
    const allowedRoles = new Set(['super_admin', 'organization_admin', 'clinic_manager', 'receptionist', 'clinician']);
    const allowedAssignments = (assignments ?? []).filter((assignment: any) => allowedRoles.has(assignment.role?.code));
    if (!allowedAssignments.length) return json({ error: 'Sem permissão para operar esta fila.' }, 403);

    const organizationWide = allowedAssignments.some((assignment: any) => ['super_admin', 'organization_admin'].includes(assignment.role?.code));
    if (!organizationWide) {
      const { count, error: scopeError } = await admin.from('user_clinic_scopes')
        .select('id', { count: 'exact', head: true })
        .in('user_role_id', allowedAssignments.map((assignment: any) => assignment.id))
        .eq('clinic_id', queue.clinic_id)
        .is('revoked_at', null);
      if (scopeError) throw scopeError;
      if (!count) return json({ error: 'Sem permissão para esta clínica.' }, 403);
    }

    const { error: updateError } = await admin.from('queue_sessions')
      .update({ status: 'open', updated_at: new Date().toISOString(), updated_by: userData.user.id })
      .eq('id', queue.id);
    if (updateError) throw updateError;
    const { error: eventError } = await admin.from('queue_events').insert({
      organization_id: queue.organization_id,
      clinic_id: queue.clinic_id,
      queue_session_id: queue.id,
      event_type: 'session.open',
      previous_status: queue.status,
      new_status: 'open',
      actor_id: userData.user.id,
    });
    if (eventError) throw eventError;
    return json({ ok: true, status: 'open' });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Não foi possível atualizar a fila.' }, 500);
  }
});
