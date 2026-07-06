# Fase 2 — Portal do Aluno (real)

Seguindo a ordem do plano original (MVP → Portal do Aluno → Requerimentos → Acadêmico → Espaços → Professor → Comunicação → Financeiro → Relatórios → Admin), esta fase substitui os placeholders do bloco "Portal do Aluno" por telas reais conectadas ao Supabase.

## Escopo desta fase

Telas do aluno logado (papel `aluno`), consumindo `students`, `classes`, `subjects`, `courses`, `student_requirements`, `announcements`, `academic_events`.

1. **Meu Perfil Acadêmico** (`/aluno/perfil`)
   - Dados do aluno: matrícula, curso, período, situação, unidade, contato.
   - Card com foto/iniciais + badges (curso, período, status).
   - Somente leitura na Fase 2 (edição vem na Fase 10 — Admin/Perfil).

2. **Minhas Disciplinas** (`/aluno/disciplinas`)
   - Lista das turmas em que o aluno está matriculado no período letivo atual.
   - Cada card: código, nome da disciplina, professor, carga horária, turno, sala.
   - Filtro por período letivo.
   - Vazio-state amigável quando não houver matrícula.

3. **Minha Grade** (`/aluno/grade`)
   - Visualização semanal (segunda–sábado × turnos manhã/tarde/noite).
   - Blocos coloridos por disciplina, com sala e professor.
   - Toggle "Semana atual / Próxima semana" (leitura do array `schedule` já em `classes`).
   - Mobile: virar para lista agrupada por dia.

4. **Notas e Frequência** (`/aluno/notas`)
   - Placeholder estruturado permanece (tabela `grades`/`attendance` ainda não existe no schema atual — será criada na Fase 4/6 junto com lançamento pelo professor).
   - Nesta fase entregamos apenas o **layout final** (tabela de disciplinas com colunas AV1/AV2/AV3/Média/Freq/Situação) preenchido com "—" e um aviso "aguardando lançamento do professor".
   - Isso evita retrabalho quando os dados reais existirem.

5. **Documentos** (`/aluno/documentos`)
   - Lista de documentos disponíveis para download/solicitação: declaração de matrícula, histórico, atestado de frequência, ementa, diploma.
   - Cada item: ícone, título, descrição, botão "Solicitar" que abre um novo requerimento na categoria correspondente (integra com `student_requirements` + `requirement_categories` já semeadas).
   - "Meus documentos emitidos" — lista os requerimentos do tipo documento já concluídos com link de download (campo `response` por enquanto).

6. **Dashboard do Aluno** (atualizar `Index.tsx` para o papel `aluno`)
   - KPIs reais: nº disciplinas ativas, nº requerimentos abertos, próximo evento acadêmico, próxima aula.
   - QuickActions apontando para as 5 telas acima + Requerimentos.
   - Mural de comunicados (últimos 3 de `announcements` visíveis para alunos).

## O que NÃO entra nesta fase

- Financeiro do aluno (mensalidades/boletos) — Fase 8.
- Lançamento/edição de notas — Fase 6 (Portal do Professor).
- Emissão real de PDF de documentos — Fase 3 fluxo completo de requerimentos.
- Comunicados/mensagens diretas — Fase 7.

## Estrutura técnica

**Novos componentes reutilizáveis** (em `src/components/aluno/`):
- `StudentIdentityCard.tsx` — cartão de identidade acadêmica.
- `EnrolledClassCard.tsx` — card de turma.
- `WeeklyScheduleGrid.tsx` — grade semanal responsiva (reutilizável depois pelo Professor).
- `GradesTable.tsx` — tabela de notas/frequência (aceita `data` vazia).
- `DocumentRequestList.tsx` — lista de documentos solicitáveis.

**Novos hooks** (em `src/hooks/`):
- `useStudentProfile.ts` — busca `students` do usuário logado (por `profile_id` ou `email`).
- `useStudentClasses.ts` — busca `classes` via matrícula do aluno.
- `useStudentRequirements.ts` — lista requerimentos do aluno.
- `useAnnouncements.ts` — comunicados ativos para o papel aluno.

**Banco (verificação)**
- Antes de codar, ler as colunas reais de `students`, `classes`, `subjects` e a tabela de matrícula (se já existir uma junção aluno↔turma ou se precisa criar `enrollments`).
- Se `enrollments` não existir, esta fase inclui **1 migração pequena**: criar `public.enrollments(student_id, class_id, status, enrolled_at)` com GRANT + RLS (aluno vê apenas as próprias; secretaria/coordenação vê todas), + trigger `updated_at`.
- Seed de matrículas para o aluno demo (`aluno@unig.demo`) em 2–3 turmas para as telas terem dado.

**Rotas**
- Já registradas em `App.tsx` — apenas trocar `Placeholder` pelas novas páginas reais.

**UI/UX**
- 100% dentro do padrão atual: paleta azul, Nunito, shadcn, `RoleHomeCover`, `QuickAction`, `Card`.
- Responsivo desktop + tablet + mobile (PWA).
- Nada de refatorar módulos fora de `aluno/*`.

## Ordem de execução

1. Ler schema real (`students`, `classes`, `subjects`, tabela de matrícula se houver).
2. Se necessário: migração `enrollments` + seed do aluno demo.
3. Hooks (`useStudentProfile`, `useStudentClasses`, `useStudentRequirements`, `useAnnouncements`).
4. Componentes reutilizáveis (`src/components/aluno/*`).
5. Páginas reais: Perfil → Disciplinas → Grade → Documentos → Notas (layout) → Dashboard Aluno.
6. Testar login com `aluno@unig.demo` e navegar por todas as telas.

## Próxima fase (Fase 3)

Requerimentos completos: fila de atendimento, fluxo de aprovação, anexos, comentários, SLA, protocolo. Tabelas `requirement_categories` e `student_requirements` já estão prontas — falta apenas UI + `requirement_comments` e `requirement_attachments`.
