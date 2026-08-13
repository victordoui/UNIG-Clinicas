-- Dados de teste do módulo acadêmico.
-- Executar somente APÓS a migration 20260813020442_academic_schedule_core.sql.
-- Use no SQL Editor do Supabase com perfil administrativo.

insert into public.units (id, code, name, city, state, is_active)
values ('10000000-0000-0000-0000-000000000001', 'TEST-UNIG', 'UNIG - Unidade de Teste', 'Nova Iguaçu', 'RJ', true)
on conflict (id) do update set name = excluded.name, is_active = true;

insert into public.courses (id, unit_id, code, name, degree_type, modality, duration_semesters, status)
values ('10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'TEST-DIR', 'Direito - Teste', 'Bacharelado', 'Presencial', 10, 'active')
on conflict (code) do update set name = excluded.name, status = 'active';

insert into public.professors (id, unit_id, registration, full_name, email, title, department, status)
values ('10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'TEST-PROF-001', 'Ana Lúcia - Teste', 'ana.teste@unig.local', 'Mestre', 'Direito', 'active')
on conflict (registration) do update set full_name = excluded.full_name, status = 'active';

insert into public.subjects (id, course_id, professor_id, code, name, workload_hours, semester, status)
values ('10000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', 'TEST-TGD-101', 'Teoria Geral do Direito - Teste', 60, 2, 'active')
on conflict (code) do update set name = excluded.name, status = 'active';

insert into public.rooms (id, unit_id, code, name, block, floor, capacity, room_type, status, notes)
values ('10000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 'TEST-SALA-204', 'Sala 204 - Teste', 'Bloco D', '2', 45, 'sala_aula', 'disponivel', 'Registro de teste do módulo acadêmico')
on conflict (id) do update set status = 'disponivel', capacity = 45;

insert into public.classes (id, unit_id, course_id, subject_id, professor_id, code, name, academic_period, shift, room, capacity, enrolled_count, status, schedule)
values ('10000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000003', 'TEST-DRM201', 'DRM201 - Turma de Teste', '2026.2', 'Manha', 'Sala 204 - Teste', 45, 0, 'active', '[{"day":1,"start":"07:10","end":"08:00"},{"day":1,"start":"08:00","end":"08:50"},{"day":3,"start":"08:50","end":"09:40"}]'::jsonb)
on conflict (code) do update set schedule = excluded.schedule, room = excluded.room, status = 'active';

insert into public.academic_schedules (id, unit_id, course_id, academic_period, name, version, status, starts_on, ends_on)
values ('10000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '2026.2', 'Grade de Teste - Direito', 1, 'draft', '2026-08-01', '2026-12-20')
on conflict (id) do update set status = 'draft', updated_at = now();

insert into public.class_meetings (id, academic_schedule_id, class_id, professor_id, room_id, weekday, starts_at, ends_at, status, notes)
values
  ('10000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000005', 1, '07:10', '08:00', 'planned', 'Dados de teste'),
  ('10000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000005', 1, '08:00', '08:50', 'planned', 'Dados de teste'),
  ('10000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000005', 3, '08:50', '09:40', 'planned', 'Dados de teste')
on conflict (id) do update set starts_at = excluded.starts_at, ends_at = excluded.ends_at, status = 'planned';

update public.academic_schedules
set status = 'published', published_at = now()
where id = '10000000-0000-0000-0000-000000000007';
