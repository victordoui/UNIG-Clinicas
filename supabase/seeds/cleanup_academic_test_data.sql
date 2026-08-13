-- Remove SOMENTE os dados identificados como TEST-* do módulo acadêmico.
-- Executar no SQL Editor quando for iniciar o uso real do sistema.

delete from public.academic_schedules where id = '10000000-0000-0000-0000-000000000007';
delete from public.academic_events where id in ('10000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000012');
delete from public.classes where id = '10000000-0000-0000-0000-000000000006';
delete from public.subjects where id = '10000000-0000-0000-0000-000000000004';
delete from public.professors where id = '10000000-0000-0000-0000-000000000003';
delete from public.rooms where id = '10000000-0000-0000-0000-000000000005';
delete from public.courses where id = '10000000-0000-0000-0000-000000000002';
delete from public.units where id = '10000000-0000-0000-0000-000000000001';
