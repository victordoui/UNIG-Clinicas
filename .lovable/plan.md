# Fase 4 — CRUD Acadêmico Completo

Substitui os placeholders do menu **Acadêmico** por telas reais de cadastro e gestão. É a base de dados para tudo o que vem depois (grade, financeiro, relatórios).

## Escopo

### 1. Alunos (`/academico/alunos`)
- Lista com busca (nome/matrícula/e-mail), filtros (curso, unidade, status de matrícula) e paginação.
- Colunas: nome, matrícula, curso, unidade, status, ações.
- Ações: novo aluno, editar, ver perfil completo (drawer), inativar.
- Modal de criação/edição com todos os campos de `students`.

### 2. Professores (`/academico/professores`)
- Lista com busca, filtro por departamento, unidade.
- Colunas: nome, titulação, departamento, e-mail, ações.
- CRUD via modal.

### 3. Cursos (`/academico/cursos`)
- Grid de cards + lista alternativa.
- Filtros: unidade, modalidade, tipo (graduação/pós/técnico).
- CRUD via modal (código, nome, tipo, duração, modalidade, unidade, coordenador).

### 4. Disciplinas (`/academico/disciplinas`)
- Lista com busca, filtro por curso e semestre.
- Colunas: código, nome, carga horária, semestre, curso.
- CRUD via modal.

### 5. Turmas (`/academico/turmas`)
- Lista com filtros: período, curso, disciplina, professor, unidade.
- Colunas: código, disciplina, professor, período, turno, sala, ocupação (matriculados/capacidade).
- CRUD via modal (inclui vínculo com disciplina, professor, sala, capacidade, período, turno, horários da grade).
- Editor de horários integrado (dias da semana + start/end) que grava em `classes.schedule` (JSONB já existente).
- Ação **"Ver matrículas"** — drawer lista alunos matriculados naquela turma com opções de adicionar/remover.

### 6. Matriz Curricular (`/academico/matriz`)
- Seleciona um curso → mostra disciplinas agrupadas por semestre.
- Ação: adicionar disciplina existente ao curso (ajustando `subjects.course_id` e `semester`).
- Somente leitura para papéis não-secretaria/coordenação/admin.

### 7. Grade de Aulas (`/academico/aulas`)
- Grade semanal consolidada de **todas as turmas** de uma unidade/curso escolhido.
- Reaproveita o `WeeklyScheduleGrid` do portal do aluno.
- Filtros: unidade, curso, turno.

## Fora de escopo desta fase
- Importação em massa (CSV/Excel) — Fase futura.
- Vincular login (auth.users) ao aluno/professor — Fase de Convites/Usuários.
- Histórico escolar, notas e frequência — Fase 5 (Notas & Frequência).
- Gestão de salas — Fase 6 (Espaços).

## Permissões
- **Leitura**: staff acadêmico (`secretaria`, `coordenacao`, `administrador`, `super_admin`, `gestor_unidade`) — demais papéis não veem menu.
- **Escrita** (create/update/delete): `secretaria`, `coordenacao`, `administrador`, `super_admin`.
- Componente `<StaffOnly roles={[...]}>` para gatear botões de ação.

## Estrutura técnica

**Hooks** (`src/hooks/`):
- `useAcademicData.ts` — hooks unificados: `useStudents`, `useProfessors`, `useCourses`, `useSubjects`, `useClasses`, `useClassEnrollments`, e mutations correspondentes (`useUpsertStudent`, `useUpsertProfessor`, `useUpsertCourse`, `useUpsertSubject`, `useUpsertClass`, `useEnrollStudent`, `useUnenrollStudent`, `useDeleteEntity`).
- Filtros padronizados via objeto de opções.

**Componentes** (`src/components/academico/`):
- `StudentFormDialog`, `ProfessorFormDialog`, `CourseFormDialog`, `SubjectFormDialog`, `ClassFormDialog` (todos com Zod + react-hook-form).
- `ClassScheduleEditor` — matriz visual de dias × horários.
- `ClassEnrollmentsDrawer` — lista alunos + autocomplete para adicionar.
- `EntityTable` — tabela padrão reutilizável (busca, ordenação, ações).
- `AcademicFiltersBar` — filtros reutilizáveis (unidade, curso, etc.).
- `StaffOnly` — wrapper de permissão.
- `ConfirmDeleteDialog` — reaproveitado nos 6 CRUDs.

**Páginas** (`src/pages/academico/`):
- `Alunos.tsx`, `Professores.tsx`, `Cursos.tsx`, `Disciplinas.tsx`, `Turmas.tsx`, `Matriz.tsx`, `Aulas.tsx`.

**Utilitário**:
- `src/lib/academic.ts` — labels (turno, modalidade, tipo de curso, status de matrícula), helpers de horário.

**Sem migração de banco** — o schema atual (`students`, `professors`, `courses`, `subjects`, `classes`, `enrollments`, `units`) já contém tudo. Apenas garantimos que as políticas RLS existentes permitem escrita para staff (validaremos antes de codar; se faltar, criamos uma micro-migração).

## Ordem de execução
1. Validar RLS de escrita (`students`, `professors`, `courses`, `subjects`, `classes`). Se faltar, migração mínima com policies para staff.
2. `lib/academic.ts` + `hooks/useAcademicData.ts`.
3. Componentes compartilhados (`EntityTable`, `StaffOnly`, `ConfirmDeleteDialog`, `AcademicFiltersBar`, `ClassScheduleEditor`).
4. Formulários (5 dialogs) — em paralelo.
5. Páginas (7 telas) — em paralelo.
6. Atualizar `App.tsx` para trocar os 7 placeholders pelas rotas reais.
7. Smoke-test manual: criar 1 registro de cada tipo e vincular aluno demo a nova turma.

## Próxima fase (Fase 5)
Notas & Frequência: lançamento pelo professor, boletim do aluno, cálculo de média, situação (aprovado / reprovado / em recuperação).
