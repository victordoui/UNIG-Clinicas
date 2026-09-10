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
const DEMO_ACCOUNTS = [
  { key: 'super_admin', role: 'super_admin', email: 'super-admin@unig.demo', label: 'Super Admin', clinicCode: null },
  { key: 'organization_admin', role: 'organization_admin', email: 'organization-admin@unig.demo', label: 'Administrador da organização', clinicCode: null },
  ...[
    ['ODONTO', 'Clínica de Odontologia'], ['FISIO', 'Clínica de Fisioterapia'],
    ['VET', 'Clínica Veterinária'], ['ESTETICA', 'Clínica de Estética'],
  ].flatMap(([clinicCode]) => [
    { key: `clinic_manager_${clinicCode.toLowerCase()}`, role: 'clinic_manager', email: `clinic-manager-${clinicCode.toLowerCase()}@unig.demo`, label: 'Gestor da clínica', clinicCode },
    { key: `clinician_${clinicCode.toLowerCase()}`, role: 'clinician', email: `clinician-${clinicCode.toLowerCase()}@unig.demo`, label: 'Profissional clínico', clinicCode },
    { key: `receptionist_${clinicCode.toLowerCase()}`, role: 'receptionist', email: `receptionist-${clinicCode.toLowerCase()}@unig.demo`, label: 'Recepção e fila', clinicCode },
  ]),
  { key: 'academic_supervisor_odonto', role: 'academic_supervisor', email: 'academic-supervisor-odonto@unig.demo', label: 'Supervisor acadêmico', clinicCode: 'ODONTO' },
  { key: 'student_odonto', role: 'student', email: 'student-odonto@unig.demo', label: 'Estudante', clinicCode: 'ODONTO' },
  { key: 'auditor', role: 'auditor', email: 'auditor@unig.demo', label: 'Auditoria transversal', clinicCode: null },
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

    const roleCodes = Array.from(new Set(DEMO_ACCOUNTS.map((account) => account.role)));
    const { data: roleRows, error: rolesError } = await admin.from('roles').select('id, code').in('code', roleCodes);
    if (rolesError) throw rolesError;
    const roleByCode = new Map(roleRows.map((role) => [role.code, role.id]));
    if (roleByCode.size !== roleCodes.length) throw new Error('Papéis clínicos de sistema não foram encontrados.');
    const { data: scopedClinics, error: scopedClinicsError } = await admin.from('clinics').select('id, code').eq('organization_id', organizationId).in('code', demoClinics.map(([code]) => code));
    if (scopedClinicsError) throw scopedClinicsError;
    const clinicByCode = new Map((scopedClinics ?? []).map((clinic) => [clinic.code, clinic.id]));
    const { data: existingUsers, error: existingUsersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (existingUsersError) throw existingUsersError;
    const userByEmail = new Map((existingUsers.users ?? []).filter((user) => user.email).map((user) => [user.email!.toLowerCase(), user]));

    let created = 0;
    let existed = 0;
    const userIdByAccount = new Map<string, string>();
    for (const account of DEMO_ACCOUNTS) {
      let user = userByEmail.get(account.email);
      if (!user) {
        const { data: createdUser, error: createError } = await admin.auth.admin.createUser({ email: account.email, password: DEMO_PASSWORD, email_confirm: true });
        if (createError || !createdUser.user) throw createError ?? new Error(`Não foi possível criar ${account.email}`);
        user = createdUser.user;
        userByEmail.set(account.email, user);
        created++;
      } else existed++;

      const { error: profileError } = await admin.from('profiles')
        .upsert({ id: user.id, email: account.email, full_name: `${account.label} — Teste` }, { onConflict: 'id' });
      if (profileError) throw profileError;
      const roleId = roleByCode.get(account.role)!;
      const { data: existingAssignment, error: assignmentError } = await admin.from('user_roles').select('id')
        .eq('user_id', user.id).eq('organization_id', organizationId).eq('role_id', roleId).maybeSingle();
      if (assignmentError) throw assignmentError;
      let assignmentId = existingAssignment?.id;
      if (!assignmentId) {
        const { data: assignment, error } = await admin.from('user_roles').insert({ user_id: user.id, organization_id: organizationId, role_id: roleId, is_active: true }).select('id').single();
        if (error) throw error;
        assignmentId = assignment.id;
      }
      if (account.clinicCode) {
        const clinicId = clinicByCode.get(account.clinicCode);
        if (!clinicId) throw new Error(`Clínica ${account.clinicCode} não encontrada.`);
        const { error: revokeOtherScopesError } = await admin.from('user_clinic_scopes')
          .update({ revoked_at: new Date().toISOString() }).eq('user_role_id', assignmentId).neq('clinic_id', clinicId).is('revoked_at', null);
        if (revokeOtherScopesError) throw revokeOtherScopesError;
        const { error: scopeError } = await admin.from('user_clinic_scopes')
          .upsert({ user_role_id: assignmentId, clinic_id: clinicId, revoked_at: null }, { onConflict: 'user_role_id,clinic_id' });
        if (scopeError) throw scopeError;
      }
      userIdByAccount.set(account.key, user.id);
    }

    // Keep one academic supervision available in the quick-access environment
    // so supervisors and students can validate the workflow immediately.
    const demoStudentId = userIdByAccount.get('student_odonto');
    const demoSupervisorId = userIdByAccount.get('academic_supervisor_odonto');
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

    // Add one versioned clinical evolution for the first demo patient.
    const demoClinicianId = userIdByAccount.get('clinician_odonto');
    const demoPatientId = patientByCode.get('demo-001');
    if (demoClinicianId && demoPatientId) {
      const { data: demoClinic, error: demoClinicError } = await admin.from('clinics')
        .select('id').eq('organization_id', organizationId).eq('code', 'ODONTO').single();
      if (demoClinicError) throw demoClinicError;
      const { data: demoAppointment, error: appointmentError } = await admin.from('appointments')
        .select('id').eq('organization_id', organizationId).eq('clinic_id', demoClinic.id)
        .eq('patient_id', demoPatientId).eq('reason', 'Consulta de demonstração').single();
      if (appointmentError) throw appointmentError;
      const { data: demoTicket } = await admin.from('queue_tickets').select('id').eq('appointment_id', demoAppointment.id).maybeSingle();
      const { data: existingEncounter, error: encounterLookupError } = await admin.from('encounters')
        .select('id').eq('appointment_id', demoAppointment.id).maybeSingle();
      if (encounterLookupError) throw encounterLookupError;
      let encounterId = existingEncounter?.id;
      if (!encounterId) {
        const { data: createdEncounter, error: encounterInsertError } = await admin.from('encounters').insert({
          organization_id: organizationId,
          clinic_id: demoClinic.id,
          patient_id: demoPatientId,
          appointment_id: demoAppointment.id,
          queue_ticket_id: demoTicket?.id ?? null,
          status: 'in_progress',
          created_by: demoClinicianId,
          updated_by: demoClinicianId,
        }).select('id').single();
        if (encounterInsertError) throw encounterInsertError;
        encounterId = createdEncounter.id;
      }
      const { data: existingRecord, error: recordLookupError } = await admin.from('clinical_records')
        .select('id').eq('organization_id', organizationId).eq('patient_id', demoPatientId).limit(1).maybeSingle();
      if (recordLookupError) throw recordLookupError;
      let clinicalRecordId = existingRecord?.id;
      if (!clinicalRecordId) {
        const { data: createdRecord, error: recordInsertError } = await admin.from('clinical_records').insert({
          organization_id: organizationId, patient_id: demoPatientId, created_by: demoClinicianId,
        }).select('id').single();
        if (recordInsertError) throw recordInsertError;
        clinicalRecordId = createdRecord.id;
      }
      const { data: existingNote, error: noteLookupError } = await admin.from('clinical_notes')
        .select('id').eq('encounter_id', encounterId).eq('note_type', 'evolution').maybeSingle();
      if (noteLookupError) throw noteLookupError;
      if (!existingNote) {
        const noteContent = 'Paciente acolhida para avaliação inicial. Sem intercorrências no momento; plano terapêutico em definição pela equipe acadêmica.';
        const { data: createdNote, error: noteInsertError } = await admin.from('clinical_notes').insert({
          clinical_record_id: clinicalRecordId,
          encounter_id: encounterId,
          note_type: 'evolution',
          content: noteContent,
          author_id: demoClinicianId,
        }).select('id').single();
        if (noteInsertError) throw noteInsertError;
        const { error: versionInsertError } = await admin.from('clinical_note_versions').insert({
          clinical_note_id: createdNote.id, version_number: 1, content: noteContent, reason: 'Registro inicial', author_id: demoClinicianId,
        });
        if (versionInsertError) throw versionInsertError;
      }
    }
    return json({ ok: true, created, existed, total: DEMO_ACCOUNTS.length });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
