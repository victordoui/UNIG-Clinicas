# Plano de continuidade — Módulo Acadêmico

## Objetivo

Evoluir a gestão acadêmica tendo a grade como fonte central para aulas,
ensalamento, disponibilidade de salas, validação de conflitos, publicação e
histórico de versões.

## Estado atual

- A branch `main` contém as telas de visão geral, calendário, ensalamento,
  pendências, análise, publicação, histórico e salas livres.
- A página `/academico/aulas` consulta as turmas e horários existentes; ela não
  usa dados fictícios.
- As entidades existentes incluem unidades, cursos, disciplinas, professores,
  turmas, alunos, matrículas, salas e reservas de sala.
- O formato atual de horários está ligado a `classes.schedule`, e não existe
  ainda uma fonte relacional única para aula, alocação e publicação.

## Ponto de atenção antes do banco

As migrations locais e o histórico remoto do Supabase não estão alinhados.
Não executar `supabase db push` até criar uma linha de base do schema remoto.
O projeto Supabase confirmado é `arsaiartfxlpirudydpz` (UNIG-Academico).

## Próximas etapas

1. Exportar e revisar o schema remoto do Supabase.
2. Definir o modelo central de período, grade, aula, alocação de sala,
   publicação e versões.
3. Criar migrations novas somente após resolver a base de migrations.
4. Implementar regras transacionais para impedir conflitos de sala, professor,
   turma e horário.
5. Aplicar RLS por papel e escopo de unidade/curso, sem usar dados simulados.
6. Conectar as telas acadêmicas ao modelo real e substituir a demonstração de
   grade por dados publicados.
7. Validar cenários de criação, conflito, publicação, histórico e consulta de
   salas livres.

## Comando de retomada no Supabase

No computador que possui a sessão autenticada do Supabase CLI, dentro do
repositório, executar:

```powershell
npx supabase db dump --linked --schema public --file supabase\remote_schema.sql
```

O arquivo resultante deve ser revisado antes de qualquer migration ou alteração
no banco remoto.

## Regras de trabalho

- Não criar tabelas duplicadas.
- Não executar comandos destrutivos no banco remoto.
- Não expor chaves de serviço no frontend.
- Toda tabela no schema `public` precisa de RLS e políticas adequadas.
- Mudanças de banco devem ser verificadas antes de serem publicadas.

## Entrega preparada em 2026-08-12

- Exportação do schema remoto: `supabase/remote_schema.sql` (arquivo local de
  referência, não publicar por conter a estrutura completa do banco).
- Migration pronta e validada localmente: `20260813020442_academic_schedule_core.sql`.
- Modelo novo: `academic_schedules`, `class_meetings` e
  `academic_schedule_versions`.
- Bloqueios no banco para conflitos de sala, professor e turma no mesmo dia e
  horário; índices para as consultas de grade; RLS por papel e unidade.

## Aplicação remota pendente

Não aplicar a migration com `supabase db push` enquanto as migrations locais e
remotas estiverem divergentes. Primeiro é preciso revisar/normalizar esse
histórico. Depois disso, a migration poderá ser aplicada de forma controlada e
as páginas de publicação, histórico e ensalamento poderão gravar no banco.
