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

    const { data: existingUnit, error: unitLookupError } = await admin.from('units')
      .select('id').eq('organization_id', organizationId).eq('code', 'DEMO').maybeSingle();
    if (unitLookupError) throw unitLookupError;
    let unitId = existingUnit?.id;
    if (!unitId) {
      const { data, error } = await admin.from('units').insert({
        organization_id: organizationId, code: 'DEMO', name: 'Unidade de Demonstração', city: 'Nova Iguaçu', state: 'RJ', is_active: true,
      }).select('id').single();
      if (error) throw error;
      unitId = data.id;
    }

    const demoClinics = [
      ['ODONTO', 'Clínica de Odontologia', 'Odontologia'],
      ['FISIO', 'Clínica de Fisioterapia', 'Fisioterapia'],
      ['VET', 'Clínica Veterinária', 'Veterinária'],
      ['ESTETICA', 'Clínica de Estética', 'Estética'],
    ] as const;
    for (const [code, name, specialty] of demoClinics) {
      const { data: clinic, error: clinicLookupError } = await admin.from('clinics')
        .select('id').eq('organization_id', organizationId).eq('code', code).maybeSingle();
      if (clinicLookupError) throw clinicLookupError;
      let clinicId = clinic?.id;
      if (!clinicId) {
        const { data, error } = await admin.from('clinics').insert({ organization_id: organizationId, unit_id: unitId, code, name, specialty, is_active: true }).select('id').single();
        if (error) throw error;
        clinicId = data.id;
      }
      const { data: service, error: serviceLookupError } = await admin.from('clinic_services')
        .select('id').eq('clinic_id', clinicId).eq('code', 'AVALIACAO').maybeSingle();
      if (serviceLookupError) throw serviceLookupError;
      if (!service) {
        const { error } = await admin.from('clinic_services').insert({ clinic_id: clinicId, code: 'AVALIACAO', name: 'Avaliação inicial', duration_minutes: 30, is_active: true });
        if (error) throw error;
      }
    }

    const demoPatients = [
      ['DEMO-001', 'Ana Souza', 'demo-001'],
      ['DEMO-002', 'Bruno Oliveira', 'demo-002'],
      ['DEMO-003', 'Carla Santos', 'demo-003'],
      ['DEMO-004', 'Diego Lima', 'demo-004'],
    ] as const;
    const patientByCode = new Map<string, string>();
    for (const [recordNumber, fullName, documentNumber] of demoPatients) {
      const { data: existingPerson, error: personLookupError } = await admin.from('persons')
        .select('id').eq('organization_id', organizationId).eq('document_number', documentNumber).maybeSingle();
      if (personLookupError) throw personLookupError;
      let personId = existingPerson?.id;
      if (!personId) {
        const { data, error } = await admin.from('persons').insert({ organization_id: organizationId, full_name: fullName, document_number: documentNumber, email: `${documentNumber}@example.invalid` }).select('id').single();
        if (error) throw error;
        personId = data.id;
      }
      const { data: existingPatient, error: patientLookupError } = await admin.from('patients')
        .select('id').eq('organization_id', organizationId).eq('record_number', recordNumber).maybeSingle();
      if (patientLookupError) throw patientLookupError;
      let patientId = existingPatient?.id;
      if (!patientId) {
        const { data, error } = await admin.from('patients').insert({ organization_id: organizationId, person_id: personId, record_number: recordNumber, status: 'active' }).select('id').single();
        if (error) throw error;
        patientId = data.id;
      }
      patientByCode.set(documentNumber, patientId);
    }

    const guardianId = patientByCode.get('demo-003');
    if (guardianId) {
      const { data: guardianPerson } = await admin.from('persons').select('id').eq('organization_id', organizationId).eq('document_number', 'demo-003').single();
      const { data: existingAnimal, error: animalLookupError } = await admin.from('animals').select('id').eq('organization_id', organizationId).eq('microchip_number', 'DEMO-MICROCHIP').maybeSingle();
      if (animalLookupError) throw animalLookupError;
      let animalId = existingAnimal?.id;
      if (!animalId) {
        const { data, error } = await admin.from('animals').insert({ organization_id: organizationId, name: 'Luna', species: 'Canina', breed: 'SRD', sex: 'female', microchip_number: 'DEMO-MICROCHIP' }).select('id').single();
        if (error) throw error;
        animalId = data.id;
      }
      const { data: guardianLink, error: guardianLookupError } = await admin.from('animal_guardians').select('id').eq('animal_id', animalId).eq('person_id', guardianPerson.id).maybeSingle();
      if (guardianLookupError) throw guardianLookupError;
      if (!guardianLink) {
        const { error } = await admin.from('animal_guardians').insert({ animal_id: animalId, person_id: guardianPerson.id, relationship: 'tutora', is_primary: true });
        if (error) throw error;
      }
    }

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    tomorrow.setHours(9, 0, 0, 0);
    const scheduledAt = tomorrow.toISOString();
    const today = new Date().toISOString().slice(0, 10);
    for (const [index, [code]] of demoClinics.entries()) {
      const { data: clinic } = await admin.from('clinics').select('id').eq('organization_id', organizationId).eq('code', code).single();
      const { data: service } = await admin.from('clinic_services').select('id').eq('clinic_id', clinic.id).eq('code', 'AVALIACAO').single();
      const patientId = patientByCode.get(demoPatients[index][2])!;
      const { data: existingAppointment, error: appointmentLookupError } = await admin.from('appointments')
        .select('id').eq('organization_id', organizationId).eq('patient_id', patientId).eq('reason', 'Consulta de demonstração').maybeSingle();
      if (appointmentLookupError) throw appointmentLookupError;
      let appointmentId = existingAppointment?.id;
      if (!appointmentId) {
        const { data, error } = await admin.from('appointments').insert({ organization_id: organizationId, clinic_id: clinic.id, patient_id: patientId, clinic_service_id: service.id, scheduled_at: scheduledAt, duration_minutes: 30, status: 'scheduled', reason: 'Consulta de demonstração' }).select('id').single();
        if (error) throw error;
        appointmentId = data.id;
      }
      const { data: existingSession, error: sessionLookupError } = await admin.from('queue_sessions')
        .select('id').eq('clinic_id', clinic.id).eq('service_date', today).maybeSingle();
      if (sessionLookupError) throw sessionLookupError;
      let sessionId = existingSession?.id;
      if (!sessionId) {
        const { data, error } = await admin.from('queue_sessions').insert({ organization_id: organizationId, clinic_id: clinic.id, service_date: today, status: 'open' }).select('id').single();
        if (error) throw error;
        sessionId = data.id;
      }
      const { data: existingTicket, error: ticketLookupError } = await admin.from('queue_tickets')
        .select('id').eq('queue_session_id', sessionId).eq('appointment_id', appointmentId).maybeSingle();
      if (ticketLookupError) throw ticketLookupError;
      if (!existingTicket) {
        const { data: lastTicket, error: lastTicketError } = await admin.from('queue_tickets').select('ticket_number').eq('queue_session_id', sessionId).order('ticket_number', { ascending: false }).limit(1).maybeSingle();
        if (lastTicketError) throw lastTicketError;
        const { error } = await admin.from('queue_tickets').insert({ queue_session_id: sessionId, patient_id: patientId, appointment_id: appointmentId, ticket_number: (lastTicket?.ticket_number ?? 0) + 1, status: 'waiting', priority: index === 0 ? 'priority' : 'normal' });
        if (error) throw error;
      }
      const { data: existingProcedure, error: procedureLookupError } = await admin.from('clinical_procedures').select('id').eq('clinic_id', clinic.id).eq('patient_id', patientId).eq('code', 'AVALIACAO_INICIAL').maybeSingle();
      if (procedureLookupError) throw procedureLookupError;
      if (!existingProcedure) {
        const { error } = await admin.from('clinical_procedures').insert({ organization_id: organizationId, clinic_id: clinic.id, patient_id: patientId, code: 'AVALIACAO_INICIAL', name: 'Avaliação inicial', status: 'planned' });
        if (error) throw error;
      }
      const { data: existingExam, error: examLookupError } = await admin.from('exam_orders').select('id').eq('clinic_id', clinic.id).eq('patient_id', patientId).eq('exam_name', 'Exame demonstrativo').maybeSingle();
      if (examLookupError) throw examLookupError;
      if (!existingExam) {
        const { error } = await admin.from('exam_orders').insert({ organization_id: organizationId, clinic_id: clinic.id, patient_id: patientId, exam_name: 'Exame demonstrativo', status: 'requested' });
        if (error) throw error;
      }
    }

    const { data: roleRows, error: rolesError } = await admin.from('roles').select('id, code').in('code', ROLES.map(([code]) => code));
    if (rolesError) throw rolesError;
    const roleByCode = new Map(roleRows.map((role) => [role.code, role.id]));
    if (roleByCode.size !== ROLES.length) throw new Error('Papéis clínicos de sistema não foram encontrados.');

    let created = 0;
    let existed = 0;
    const userIdByRole = new Map<string, string>();
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
      userIdByRole.set(code, userId);
    }

    // Keep one academic supervision available in the quick-access environment
    // so supervisors and students can validate the workflow immediately.
    const demoStudentId = userIdByRole.get('student');
    const demoSupervisorId = userIdByRole.get('academic_supervisor');
    if (demoStudentId && demoSupervisorId) {
      const { data: demoClinic, error: demoClinicError } = await admin.from('clinics')
        .select('id').eq('organization_id', organizationId).eq('code', 'ODONTO').single();
      if (demoClinicError) throw demoClinicError;
      const { data: existingSupervision, error: supervisionLookupError } = await admin.from('student_supervisions')
        .select('id').eq('organization_id', organizationId).eq('clinic_id', demoClinic.id)
        .eq('student_user_id', demoStudentId).maybeSingle();
      if (supervisionLookupError) throw supervisionLookupError;
      let supervisionId = existingSupervision?.id;
      if (!supervisionId) {
        const { data: createdSupervision, error: supervisionInsertError } = await admin.from('student_supervisions').insert({
          organization_id: organizationId,
          clinic_id: demoClinic.id,
          student_user_id: demoStudentId,
          supervisor_user_id: demoSupervisorId,
          status: 'in_progress',
          started_at: new Date().toISOString(),
        }).select('id').single();
        if (supervisionInsertError) throw supervisionInsertError;
        supervisionId = createdSupervision.id;
      }
      const { data: existingEvaluation, error: evaluationLookupError } = await admin.from('evaluations')
        .select('id').eq('supervision_id', supervisionId).eq('evaluator_user_id', demoSupervisorId).maybeSingle();
      if (evaluationLookupError) throw evaluationLookupError;
      if (!existingEvaluation) {
        const { error: evaluationInsertError } = await admin.from('evaluations').insert({
          supervision_id: supervisionId,
          evaluator_user_id: demoSupervisorId,
          score: 92,
          feedback: 'Bom acolhimento e registro clínico consistente.',
          rubric: { acolhimento: 'adequado', registro: 'adequado' },
        });
        if (evaluationInsertError) throw evaluationInsertError;
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
