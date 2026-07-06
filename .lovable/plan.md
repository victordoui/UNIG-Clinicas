
# Plano — Fase 1 do UNIG-A (base limpa + acessos rápidos)

Objetivo: transformar este projeto na base do **UNIG-A**, mantendo o padrão visual atual (azul corporativo, `RoleHomeCover`, `QuickAction`, shadcn, Nunito, Phosphor→Lucide) mas apagando todos os módulos antigos (Patrimônio, Compras, Almoxarifado, CI, Conselho, Fornecedores, Demandas, Fiscal, etc.) e substituindo por um esqueleto acadêmico com perfis, dashboards por perfil e login de teste.

---

## 1. Limpeza do projeto (código)

**Apagar** (rotas, páginas, componentes, hooks e libs dos módulos antigos):

- `src/pages/` — remover todas as páginas exceto: `Auth.tsx`, `Index.tsx`, `NotFound.tsx`, `Home.tsx` (adaptada), `Configuracoes.tsx` (será refeita), `Usuarios.tsx` (será refeita), `admin/AuditoriaLogs.tsx`, `admin/Unidades.tsx`. Remover diretórios `ci/`, `conselho/`, `demandas/`, `esteira/`, `fornecedor/`, `patrimonio/` e todas as páginas de compras/almoxarifado/fiscal/financeiro/estoque/relatórios antigos.
- `src/components/` — remover `ci/`, `conselho/`, `demandas/`, `esteira/`, `fornecedor/`, `patrimonio/`, `purchases/`, `products/`, `movements/`, `stock/`, `suppliers/`, `supplier-inbox/`, `fiscal/`, `financial/`, `approvals/`, `audit/` (mantém o essencial), `inbox/`, `receipts/*`, `launchpad/`, `super-admin/`, `dashboard/DashboardAlmoxarifado`, `DashboardCompras`, `DashboardPatrimonio`.
- `src/hooks/` — remover hooks vinculados aos domínios apagados (mantém apenas: `useAuth`, `use-toast`, `use-mobile`, `useProfileCover`, `useAlerts`, `useUnits/useUnitsManagement`, `usePWAUpdate`, `usePushNotifications`, `useRealtimeNotifications`, `useSessionTracking`, `useInputValidation`, `useSwipeNavigation`).
- `src/lib/` — remover libs de domínios antigos; manter `utils`, `masks`, `validation`, `coverPresets`, `iconRegistry`, `linkify`, `exportUtils`.
- `supabase/functions/` — manter apenas as genéricas de convite/usuário (`accept-invitation`, `cancel-invitation`, `create-invitation`, `get-invitation`, `resend-invitation`, `create-organization-member`, `list-organization-users`, `seed-cover-presets`, `send-push-notification`). Remover as de fornecedores, fiscal, contratos, scorecard, SLA.

**Manter e adaptar**:

- `src/components/layout/` (MainLayout, Sidebar) — reconstruir a sidebar com os novos módulos.
- `src/components/dashboard/RoleHomeCover.tsx`, `CoverKpiCard`, `QuickAction`.
- `src/components/profile/*`, `src/components/auth/*`, `src/components/pwa/*`, `src/components/notifications/*`, `src/components/global/GlobalSearch.tsx` (com resultados vazios inicialmente).
- `src/hooks/useAuth.tsx` e `src/lib/unigRoles.ts` — reescritos para os novos papéis.
- `src/App.tsx` — roteamento novo, enxuto.
- `src/index.css`, `tailwind.config.ts`, paleta azul corporativa: **preservados**.

---

## 2. Novos papéis (UnigRole)

Substituir `src/lib/unigRoles.ts`:

```
super_admin | administrador | secretaria | coordenacao |
professor | aluno | financeiro | atendimento |
gestor_unidade | operador_espacos
```

Labels, cores (badge/ícone) e ícones Lucide para cada um. Função `mapDbRoleToUnig` passa a ler de `user_roles.role` (enum novo no banco).

---

## 3. Banco Supabase (migração destrutiva)

**Drop** de todas as tabelas atuais que não são acadêmicas. Mantém apenas: `profiles`, `user_roles`, `audit_logs`, `system_settings`, `announcements`, `academic_events`, `units`, `role_permissions`, `students`, `professors`, `courses`, `subjects`, `classes`, `student_requirements` (renomeada para `requirements` no plano do UNIG-A, mas mantemos o nome atual para reaproveitar).

**Criar/ajustar**:

- Enum `app_role` com os 10 novos papéis.
- `user_roles(user_id, role app_role, unit_id, course_id, is_active)` + função `has_role(_user_id, _role)` SECURITY DEFINER.
- Novas tabelas Fase 1: `curriculum_grids`, `class_schedules`, `rooms`, `room_reservations`, `space_requests`, `event_participants`, `requirement_categories`, `requirement_comments`, `requirement_attachments`, `communications`, `communication_recipients`, `notifications`.
- Para cada tabela nova: `GRANT` para `authenticated`/`service_role`, `ENABLE RLS`, políticas usando `has_role()` e escopo por `unit_id`/`user_id`.
- Seed inicial: 1 unidade demo, 2 cursos, 4 disciplinas, 3 turmas, 5 salas, 2 professores, 3 alunos, categorias de requerimento.

*(Migração enviada em call separada do supabase--migration, sem código junto.)*

---

## 4. Usuários demo para acesso rápido

Criar 10 usuários seed (via edge function `seed-demo-users` chamada uma vez, ou instrução manual no painel Auth se o usuário preferir):

| Perfil | Email | Senha |
|---|---|---|
| Super Admin | superadmin@unig.demo | unig1234 |
| Administrador | admin@unig.demo | unig1234 |
| Secretaria | secretaria@unig.demo | unig1234 |
| Coordenação | coordenacao@unig.demo | unig1234 |
| Professor | professor@unig.demo | unig1234 |
| Aluno | aluno@unig.demo | unig1234 |
| Financeiro | financeiro@unig.demo | unig1234 |
| Atendimento | atendimento@unig.demo | unig1234 |
| Gestor Unidade | gestor@unig.demo | unig1234 |
| Operador Espaços | operador@unig.demo | unig1234 |

Cada um recebe uma linha em `user_roles` com o papel correspondente.

---

## 5. Tela de Login (`/auth`) com acessos rápidos

Refatorar `src/pages/Auth.tsx`:

- Layout novo em duas colunas (esquerda: branding UNIG-A azul; direita: form + acessos rápidos).
- Formulário padrão de e-mail/senha e "esqueci minha senha".
- Bloco **"Acessos rápidos de teste"** com um grid de 10 cards `QuickAction`-style, um por perfil, com ícone e cor do papel. Clicar chama `supabase.auth.signInWithPassword` com o e-mail/senha demo e redireciona para `/`.
- Bloco aparece sempre (é um sistema interno em desenvolvimento) mas com aviso "Ambiente de teste".

---

## 6. Sidebar e navegação novas

Reescrever `src/components/layout/Sidebar.tsx` com grupos filtrados por papel:

```
Início
Portal do Aluno            (aluno)
  ├ Minhas Disciplinas
  ├ Minha Grade
  ├ Notas e Frequência
  ├ Requerimentos
  ├ Financeiro
  ├ Documentos
  └ Comunicados
Portal do Professor        (professor)
  ├ Minhas Turmas
  ├ Grade Semanal
  └ Reservas de Sala
Atendimento Acadêmico      (secretaria, atendimento, admin)
  ├ Fila de Requerimentos
  └ Histórico do Aluno
Acadêmico                  (secretaria, coordenacao, admin)
  ├ Alunos
  ├ Professores
  ├ Cursos
  ├ Disciplinas
  ├ Turmas
  ├ Grade Curricular
  └ Grade de Aulas
Espaços Acadêmicos         (operador, gestor, admin, professor-limitado)
  ├ Dashboard
  ├ Agenda
  ├ Salas
  ├ Mapa de Salas
  ├ Solicitações de Espaço
  ├ Reservas
  └ Eventos
Comunicação                (admin, secretaria, gestor)
Financeiro                 (financeiro, admin, aluno-limitado)
Relatórios                 (gestor, admin)
Administração              (super_admin, admin)
  ├ Usuários
  ├ Permissões
  ├ Unidades
  ├ Configurações
  └ Logs
```

Fase 1 entrega os itens do menu como rotas registradas, mas a maioria abre uma página placeholder padrão (`ModulePlaceholder`) com título, breadcrumb e "em construção" — apenas para o menu funcionar. As telas reais virão nas próximas fases.

---

## 7. Dashboards por perfil (home)

Novo `src/pages/Index.tsx` faz switch para 10 dashboards, todos usando `RoleHomeCover` + `QuickAction`:

- `DashboardAluno`, `DashboardProfessor`, `DashboardSecretaria`, `DashboardCoordenacao`, `DashboardFinanceiro`, `DashboardAtendimento`, `DashboardGestorUnidade`, `DashboardOperadorEspacos`, `DashboardAdmin`, `DashboardSuperAdmin`.

Cada dashboard traz KPIs coerentes com o perfil (mockados no Fase 1 quando o dado real ainda não existir) e 4–8 QuickActions apontando para as rotas do menu. Mesmo padrão visual dos dashboards de hoje, sem quebrar tipografia/cores.

---

## 8. Ordem de execução (uma resposta por passo)

1. **Migração Supabase** (drop + create + seed de estrutura, sem seed de usuários — aguarda approval).
2. Após approval: edge function `seed-demo-users` + rodar via `supabase--curl_edge_functions`.
3. Reescrever `unigRoles.ts`, `useAuth.tsx`, `Auth.tsx` (com acessos rápidos), `App.tsx` (rotas), `Sidebar.tsx`, `Index.tsx` + 10 dashboards, `ModulePlaceholder.tsx`.
4. Apagar em massa as pastas/arquivos dos módulos antigos.
5. Validar build e login rápido.

---

## Fora do escopo desta fase

- Telas reais de Requerimentos, Salas, Agenda, Alunos, Professores, Cursos etc. (virão nas Fases 2–7 do seu plano).
- IA, WhatsApp, integração Google Calendar, financeiro real, BI.
- App nativo.

## Detalhes técnicos

- Paleta azul (HSL 211 89% 45%) e Nunito **não são alteradas**.
- Ícones Lucide (equivalentes a Phosphor) — mantemos por já estarem no projeto.
- Todas as novas tabelas seguem o padrão obrigatório: `CREATE TABLE` → `GRANT` → `ENABLE RLS` → `CREATE POLICY`, com `has_role()` SECURITY DEFINER e `SET search_path = public`.
- `student_requirements` é reaproveitada como tabela de requerimentos; se o schema real não bater com o plano do UNIG-A, ela é estendida por `ALTER TABLE` na mesma migração.
- Sem alterações em `.env` nem em segredos.
