## Fase 9 — Relatórios avançados

Substitui os dois placeholders (`/relatorios/academicos` e `/relatorios/operacionais`) por páginas reais de relatórios agregados, com filtros de período, curso/turma/perfil e unidade. Segue os padrões (StaffOnly leitura, hooks tanstack-query, cards KPI, tabelas simples, sem redesign global).

Já existentes: `/relatorios/ocupacao` (Fase 6) e `/financeiro/relatorios` (Fase 7). Esta fase completa a área.

### Escopo

**1. Camada compartilhada**

- `src/lib/reports.ts` — período padrão (últimos 30/90 dias / mês atual / ano letivo), formatação, agregações puras (`groupCount`, `avgBy`, `pctBy`), export CSV client-side (`downloadCSV(rows, filename)`).
- `src/hooks/useReports.ts` — hooks tanstack-query que consomem as tabelas existentes:
  - **Acadêmicos**: `useEnrollmentStats(filters)`, `useGradeStats(filters)`, `useAttendanceStats(filters)`, `useCourseSummary(filters)`.
  - **Operacionais**: `useRequirementStats(filters)` (SLA, tempo médio de atendimento, por status/categoria), `useUnitLoad(filters)` (carga por unidade).

Todos os hooks aceitam `{ from, to, courseId?, classId?, unitId?, role? }` e fazem `SELECT` no client via Supabase (RLS já cuida do acesso — apenas staff).

**2. Componentes (`src/components/relatorios/`)**

- `ReportFilters` — barra reutilizável (período com preset + custom, `courseId`, `classId`, `unitId` opcionais).
- `MetricCard` — reusa `CoverKpiCard`, wrapper com título/valor/subtítulo/ícone (se um wrapper simples não bastar, cria pequeno stub).
- `BarList` — lista de barras horizontal (label + valor + barra tailwind), padrão dos relatórios financeiros/ocupação existentes.
- `BreakdownTable` — tabela genérica (colunas dinâmicas) com export CSV.
- `ExportCsvButton` — botão "Exportar CSV".

**3. Páginas**

- `/relatorios/academicos` — Relatórios Acadêmicos
  - KPIs: total de matrículas ativas, taxa de aprovação, média geral, frequência média.
  - Breakdowns: matrículas por curso, aprovação por disciplina, notas por período, frequência por turma.
  - Filtros: período, curso, turma.

- `/relatorios/operacionais` — Relatórios Operacionais
  - KPIs: requerimentos abertos, no prazo, tempo médio de resposta, taxa de resolução.
  - Breakdowns: requerimentos por status, por categoria, por unidade, por atendente; SLA (dentro/fora).
  - Filtros: período, categoria, unidade, status.

Cada página tem botão **Exportar CSV** nas tabelas principais.

**4. Integrações mínimas**

- Substituir os 2 placeholders em `App.tsx`.
- Nenhuma alteração em Sidebar, Header, dashboards ou outros módulos.
- Reusa componentes existentes: `CoverKpiCard`, `SituationBadge`, `Badge`, `Select`, `Popover+Calendar`.

### Fora de escopo

- Gráficos de biblioteca externa (usar barras/listas em Tailwind, como nas fases anteriores).
- Export PDF / Excel nativo (CSV client-side é suficiente).
- Agendamento de relatórios por e-mail.
- Cache/materialized views (agregação client-side com paginação até 1000 linhas por consulta — dados demo cabem).

### Permissões

- Leitura restrita a `is_staff` (RLS já garante nas tabelas).
- UI de acesso: qualquer staff (Sidebar já expõe `/relatorios/*` para staff).

### Estrutura técnica

```text
src/lib/reports.ts
src/hooks/useReports.ts
src/components/relatorios/
  ├── ReportFilters.tsx
  ├── BarList.tsx
  ├── BreakdownTable.tsx
  └── ExportCsvButton.tsx
src/pages/relatorios/
  ├── Academicos.tsx
  └── Operacionais.tsx
src/App.tsx  (trocar 2 placeholders)
```

### Ordem de execução

1. `lib/reports.ts` (utilitários + CSV) e `hooks/useReports.ts`.
2. Componentes compartilhados (`ReportFilters`, `BarList`, `BreakdownTable`, `ExportCsvButton`).
3. Página `/relatorios/academicos`.
4. Página `/relatorios/operacionais`.
5. Atualizar `App.tsx` (2 rotas).
6. Typecheck.
7. Atualizar `.lovable/plan.md` marcando Fase 9 concluída e apontando para Fase 10 (Administração).

### Próxima fase (Fase 10)

Administração — usuários, permissões, unidades, configurações gerais, logs (placeholders `/admin/*`).