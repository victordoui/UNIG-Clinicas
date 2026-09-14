-- Orçamento e aceite administrativo do plano odontológico existente.
alter table public.dental_treatment_plans
  add column if not exists estimated_cost numeric(12,2) check (estimated_cost is null or estimated_cost >= 0),
  add column if not exists patient_accepted_at timestamptz,
  add column if not exists patient_accepted_by uuid references auth.users(id),
  add column if not exists acceptance_note text;
