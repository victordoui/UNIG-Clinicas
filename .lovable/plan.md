# Fase 7 — Financeiro

Módulo financeiro do UNIG-A: mensalidades por aluno, emissão/gestão de boletos, programas de bolsa/desconto, portal do aluno com histórico de pagamentos e relatórios para a tesouraria. Segue os padrões das fases anteriores (StaffOnly, ConfirmDeleteDialog, hooks tanstack-query, RLS via `is_staff`, dialogs de formulário, badges semânticas).

## Escopo

### 1. Modelo de dados (migração nova)

Nenhuma tabela financeira existe hoje — criar em uma única migração com GRANTs + RLS:

- **`scholarships`** — programas de bolsa/desconto
  - `id`, `name`, `code`, `type` (`bolsa_integral` | `bolsa_parcial` | `desconto_pontualidade` | `desconto_convenio` | `outro`), `discount_kind` (`percent` | `fixed`), `discount_value` (numeric), `valid_from`, `valid_until`, `active`, `notes`, timestamps.
- **`student_scholarships`** — vínculo aluno × bolsa
  - `id`, `student_id → students`, `scholarship_id → scholarships`, `starts_at`, `ends_at` (nullable), `status` (`ativa` | `suspensa` | `encerrada`), `granted_by`, `notes`, timestamps. Unique (student_id, scholarship_id, starts_at).
- **`tuition_charges`** — mensalidades / cobranças
  - `id`, `student_id`, `course_id` (nullable), `reference_month` (date — dia 1), `description`, `base_amount`, `discount_amount` (aplicado da bolsa), `net_amount` (gerado), `due_date`, `status` (`pendente` | `pago` | `vencido` | `cancelado` | `em_negociacao`), `paid_at`, `paid_amount`, `payment_method`, `notes`, `created_by`, timestamps.
- **`payment_slips` (boletos)** — 1:1 com `tuition_charges` (ou avulso)
  - `id`, `charge_id` (nullable — permite boleto avulso), `student_id`, `slip_number` (unique), `barcode`, `digitable_line`, `amount`, `due_date`, `issued_at`, `status` (`emitido` | `pago` | `vencido` | `cancelado`), `paid_at`, `pdf_url` (nullable), `notes`, timestamps.
- **Função `mark_charge_paid(charge_id, paid_amount, method, paid_at)`** — security definer, atualiza charge + slip vinculado atomicamente.
- **View / trigger de status vencido**: trigger simples no `SELECT` não é possível; usar função `refresh_overdue_charges()` chamada pelo hook staff, OU calcular vencimento client-side quando `status='pendente' AND due_date<today`.
- **RLS**:
  - `scholarships`, `student_scholarships`: leitura para `is_staff`; escrita para `super_admin`, `administrador`, `financeiro`. Aluno vê apenas as próprias via join.
  - `tuition_charges`, `payment_slips`: staff (`financeiro`/admins) faz tudo; aluno lê apenas onde `student_id` pertence ao seu profile.
- **GRANTs** obrigatórios em todas as tabelas para `authenticated` (leitura+escrita conforme policy) e `service_role`.

### 2. Camada compartilhada

- **`src/lib/finance.ts`** — labels de status/tipo, cores das badges, `formatBRL`, cálculo de desconto (`applyScholarship(base, scholarship)`), cálculo de vencimento, gerador de referência mensal, helper `isOverdue(charge)`, agregações (`sumByStatus`, `defaultRate`).
- **`src/hooks/useFinance.ts`** — `useScholarships`, `useCreateScholarship/Update/Delete`, `useStudentScholarships(studentId?)`, `useAssignScholarship`, `useRevokeScholarship`, `useTuitionCharges(filters)`, `useCreateCharge`, `useBulkGenerateCharges` (por curso/turma/mês), `useUpdateCharge`, `useCancelCharge`, `useMarkChargePaid`, `usePaymentSlips(filters)`, `useIssueSlip(chargeId)`, `useMyCharges()` (aluno logado), `useMySlips()`, `useFinanceSummary()` (KPIs staff).

### 3. Componentes (`src/components/financeiro/`)

- `ScholarshipFormDialog` — CRUD de bolsa.
- `ScholarshipCard` / linha de tabela.
- `AssignScholarshipDialog` — vincular aluno a programa.
- `ChargeFormDialog` — criar/editar cobrança avulsa.
- `BulkChargeGeneratorDialog` — gerar mensalidades em lote (curso/turma/mês, aplica bolsas automaticamente).
- `ChargeStatusBadge` (usa `SituationBadge` como referência de padrão).
- `ChargeListTable` — tabela filtrável (status, aluno, mês, curso).
- `MarkAsPaidDialog` — registrar pagamento (valor, método, data).
- `PaymentSlipCard` — card do boleto com código de barras/linha digitável + botão copiar.
- `IssueSlipDialog` — emitir boleto a partir de charge.
- `FinanceKpiRow` — KPIs (arrecadado no mês, a receber, inadimplência %, bolsas ativas). Reusa `CoverKpiCard`.
- `StudentFinancialTimeline` — histórico consolidado do aluno.

### 4. Páginas

**Tesouraria / Financeiro (staff)** — substituir placeholders atuais em `/financeiro/*`:

- `/financeiro` — dashboard com `FinanceKpiRow` + próximas cobranças vencendo + inadimplentes recentes.
- `/financeiro/mensalidades` — `ChargeListTable` + `ChargeFormDialog` + `BulkChargeGeneratorDialog` + `MarkAsPaidDialog`.
- `/financeiro/boletos` — lista de boletos com filtros (status/mês/aluno) + `IssueSlipDialog` + copiar linha digitável.
- `/financeiro/bolsas` — CRUD de programas + tabela de vínculos ativos com `AssignScholarshipDialog`.
- `/financeiro/relatorios` — `/relatorios/financeiros`-style: arrecadação por mês (gráfico simples com barras Tailwind), inadimplência por curso, ranking de bolsas concedidas.

**Portal do Aluno** — nova rota real substituindo o placeholder `/aluno/financeiro`:

- `/aluno/financeiro` — cards de mensalidades (pendente/paga/vencida), boletos disponíveis para pagamento (copiar linha digitável), bolsas ativas do aluno, timeline financeira.

### 5. Integrações

- `App.tsx`: substituir os 4 placeholders `/financeiro/*` + `/aluno/financeiro` pelas novas páginas (mantendo `ProtectedRoute` sem quebrar `allowRoles` já existentes no Sidebar).
- **Sem** alteração no Sidebar, dashboards, ou outros módulos.
- Portal do aluno (`AlunoDashboardExtras` opcional): apenas se já expõe placeholder financeiro — não mexer se não for necessário.

## Fora de escopo

- Integração real com boleto bancário (Itaú, Bradesco, PIX Cobrança) — números/linha digitável serão gerados via mock determinístico (função utilitária) com nota clara. Só a estrutura de dados fica pronta para integração futura.
- Notificações automáticas de vencimento (fica para módulo Comunicação).
- Nota fiscal eletrônica.
- Renegociação/parcelamento com múltiplos vencimentos (só campo `em_negociacao`).
- Conciliação bancária.
- Cobrança judicial / SPC.

## Permissões

- **Programas de bolsa (CRUD)**: `super_admin`, `administrador`, `financeiro`.
- **Vincular bolsa a aluno**: `super_admin`, `administrador`, `financeiro`, `secretaria`.
- **Gerar/editar cobranças e boletos**: `super_admin`, `administrador`, `financeiro`.
- **Marcar como pago**: `super_admin`, `administrador`, `financeiro`.
- **Ver todas as cobranças/boletos**: staff (`is_staff`).
- **Ver próprias cobranças/boletos/bolsas**: aluno.

## Estrutura técnica

```text
supabase/migrations/xxx_financeiro.sql          (novo: tabelas + funções + RLS + GRANTs)
src/lib/finance.ts                              (novo)
src/hooks/useFinance.ts                         (novo)
src/components/financeiro/
  ├── ScholarshipFormDialog.tsx
  ├── AssignScholarshipDialog.tsx
  ├── ChargeFormDialog.tsx
  ├── BulkChargeGeneratorDialog.tsx
  ├── ChargeListTable.tsx
  ├── ChargeStatusBadge.tsx
  ├── MarkAsPaidDialog.tsx
  ├── IssueSlipDialog.tsx
  ├── PaymentSlipCard.tsx
  ├── FinanceKpiRow.tsx
  └── StudentFinancialTimeline.tsx
src/pages/financeiro/
  ├── Dashboard.tsx
  ├── Mensalidades.tsx
  ├── Boletos.tsx
  ├── Bolsas.tsx
  └── Relatorios.tsx
src/pages/aluno/Financeiro.tsx                  (novo)
src/App.tsx                                     (trocar 5 placeholders pelas rotas reais)
```

## Ordem de execução

1. Migração: tabelas + função `mark_charge_paid` + RLS + GRANTs.
2. `lib/finance.ts` + `hooks/useFinance.ts`.
3. Componentes compartilhados (form dialogs, badge, kpi row, tabela).
4. Páginas staff (Dashboard, Mensalidades, Boletos, Bolsas, Relatórios).
5. Página do aluno (`/aluno/financeiro`).
6. Atualizar `App.tsx` (5 rotas).
7. Validar typecheck.
8. Seed opcional: 1–2 programas de bolsa + mensalidades do mês para o aluno demo + 1 boleto emitido, para validar telas.

## Próxima fase (Fase 8)

Comunicação — comunicados institucionais, notificações internas e mensagens diretas (já com placeholders em `/comunicacao/*`).
