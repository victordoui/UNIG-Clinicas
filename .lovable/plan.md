# Fase 5 — Notas & Frequência

Implementa lançamento de notas e controle de presença pelo professor, além do boletim consolidado do aluno com cálculo automático de média e situação.

## Escopo

### 1. Modelo de dados (nova migração)
Duas tabelas novas em `public`, ambas com GRANTs completos e RLS:

**`grades`** — nota por avaliação
- `id uuid pk`, `enrollment_id uuid fk enrollments`, `assessment text` (AV1/AV2/AV3/REC), `score numeric(5,2)`, `max_score numeric(5,2) default 10`, `weight numeric(4,2) default 1`, `released_at timestamptz`, `released_by uuid`, `notes text`, `created_at/updated_at`.
- Unique `(enrollment_id, assessment)`.

**`attendance_records`** — presença por aula
- `id uuid pk`, `enrollment_id uuid fk`, `class_date date`, `status text` (`present|absent|justified`), `hours numeric(4,2) default 2`, `notes text`, `recorded_by uuid`, timestamps.
- Unique `(enrollment_id, class_date)`.

**RLS**:
- Aluno lê apenas suas próprias notas/presenças (via `enrollments.student_id → students.profile_id = auth.uid()`).
- Professor da turma (via `classes.professor_id → professors.profile_id = auth.uid()`) faz CRUD.
- Staff (`is_staff(auth.uid())`) tem acesso total.

**Constantes de negócio** (em `src/lib/grades.ts`):
- Média = média ponderada AV1+AV2+AV3.
- Aprovado se média ≥ 6 **e** frequência ≥ 75%.
- Em recuperação se 4 ≤ média < 6.
- Reprovado se média < 4 ou frequência < 75%.
- Após REC, média final = max(média, nota REC) — regra padrão UNIG-A.

### 2. Hooks (`src/hooks/useGrades.ts`)
- `useClassRoster(classId)` — alunos matriculados + notas + faltas.
- `useStudentGrades(studentId)` — boletim consolidado (todas as disciplinas do período ativo).
- `useUpsertGrade()`, `useUpsertAttendance()`, `useBulkAttendance()` — mutations com invalidation.

### 3. Portal do Professor (rotas reais)
Substitui os placeholders atuais:

- **`/professor/turmas`** — lista das turmas em que o professor leciona (filtro por período), card com botão "Lançar notas" e "Registrar presença".
- **`/professor/turmas/:classId/notas`** — tabela editável: linhas = alunos, colunas = AV1/AV2/AV3/REC/Média/Situação. Edição inline com debounce + salvar. Botão "Publicar" (marca `released_at`).
- **`/professor/turmas/:classId/frequencia`** — seletor de data + grid alunos × status (presente/ausente/justificada). Suporta lote (marcar todos presentes).
- **`/professor/grade`** — grade semanal reaproveitando `WeeklyScheduleGrid` filtrada pelo professor.

### 4. Portal do Aluno (upgrade da tela existente)
- **`/aluno/notas`** — substitui a `GradesTable` placeholder atual pela versão real com dados de `grades` + `attendance_records`, cálculo de média/frequência/situação e badge colorida.
- Mantém layout atual (Card + Table) para preservar UX.

### 5. Componentes novos (`src/components/notas/`)
- `GradeEntryTable` — tabela editável usada pelo professor.
- `AttendanceGrid` — grid de presença por data.
- `StudentReportCard` — boletim do aluno (usado em `/aluno/notas` e no drawer de "Ver perfil" no `/academico/alunos`).
- `SituationBadge` — badge de situação (aprovado/reprovado/em curso/recuperação).

### 6. Integrações
- `App.tsx`: trocar placeholders `/professor/turmas` e `/professor/grade`, adicionar `/professor/turmas/:classId/notas` e `/professor/turmas/:classId/frequencia`.
- `academico/Alunos.tsx`: no drawer de perfil, incluir aba "Boletim" reutilizando `StudentReportCard`.

## Fora de escopo
- Diário de classe/plano de aula (fase futura).
- Recuperação paralela / prova substitutiva com regras customizáveis por curso.
- Exportação de boletim em PDF (fase de Relatórios).
- Notificação automática ao aluno quando nota é publicada (fase de Comunicação).

## Permissões
- **Notas/Presença write**: `professor` (só da própria turma), `secretaria`, `coordenacao`, `administrador`, `super_admin`.
- **Read (aluno)**: apenas suas próprias.
- **Read (staff acadêmico)**: tudo.

## Estrutura técnica

```text
supabase/migrations/xxx_grades_attendance.sql   (novo)
src/lib/grades.ts                                (novo — cálculos + labels)
src/hooks/useGrades.ts                           (novo)
src/components/notas/
  ├── GradeEntryTable.tsx
  ├── AttendanceGrid.tsx
  ├── StudentReportCard.tsx
  └── SituationBadge.tsx
src/pages/professor/
  ├── MinhasTurmas.tsx
  ├── LancarNotas.tsx
  ├── RegistrarFrequencia.tsx
  └── GradeSemanal.tsx
src/pages/aluno/Notas.tsx                        (refatorado — usa StudentReportCard)
src/App.tsx                                       (rotas)
```

## Ordem de execução
1. Migração `grades` + `attendance_records` com GRANTs e policies.
2. `lib/grades.ts` (cálculos) + `hooks/useGrades.ts`.
3. Componentes compartilhados (`SituationBadge`, `StudentReportCard`, `GradeEntryTable`, `AttendanceGrid`).
4. Páginas do professor (4 telas).
5. Refatorar `aluno/Notas.tsx` para consumir dados reais.
6. Atualizar `App.tsx`.
7. Seed mínimo: preencher notas/presenças demo para o aluno `aluno@unig.demo` validarem o boletim end-to-end.

## Próxima fase (Fase 6)
Espaços — cadastro de salas, agenda de reservas, mapa de ocupação e workflow de solicitação/aprovação.
