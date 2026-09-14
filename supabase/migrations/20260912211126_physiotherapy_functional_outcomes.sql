-- Medidas funcionais flexíveis: a escala e sua interpretação são definidas
-- pelo profissional responsável, sem cálculo clínico automático pelo sistema.
alter table public.physiotherapy_assessments
  add column if not exists functional_scale_name text,
  add column if not exists baseline_score numeric,
  add column if not exists target_score numeric;

alter table public.physiotherapy_sessions
  add column if not exists functional_score numeric,
  add column if not exists adherence_notes text;

comment on column public.physiotherapy_assessments.functional_scale_name is
  'Nome da escala funcional adotada pelo profissional responsável.';
comment on column public.physiotherapy_assessments.baseline_score is
  'Pontuação inicial na escala funcional informada.';
comment on column public.physiotherapy_assessments.target_score is
  'Meta funcional definida pelo profissional na mesma escala.';
comment on column public.physiotherapy_sessions.functional_score is
  'Pontuação registrada na sessão, na escala da avaliação.';
comment on column public.physiotherapy_sessions.adherence_notes is
  'Registro profissional sobre adesão ao plano domiciliar.';
