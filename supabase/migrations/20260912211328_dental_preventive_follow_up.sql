-- Data administrativa para organizar retorno preventivo após o plano odontológico.
alter table public.dental_treatment_plans
  add column if not exists follow_up_due_at date;

comment on column public.dental_treatment_plans.follow_up_due_at is
  'Data de retorno preventivo sugerida pelo profissional; não gera contato externo automaticamente.';
