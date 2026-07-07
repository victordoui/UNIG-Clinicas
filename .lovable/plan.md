## Fase 10 — Administração

Substitui os 5 placeholders em `/admin/*` por páginas reais de administração do sistema, mantendo padrões existentes (StaffOnly, hooks tanstack-query, tabelas simples, sem redesign global).

### Escopo

**1. Camada de dados**

Migração SQL adicionando funções RPC seguras para operações administrativas (todas `SECURITY DEFINER` com checagem `has_role(super_admin/administrador)`):
- `admin_assign_role(_user_id, _role, _unit_id?)` — adiciona role em `user_roles`.
- `admin_revoke_role(_user_role_id)` — desativa (`is_active=false`).
- `admin_set_password_reset(_user_id)` — marca `password_change_required=true` no `profiles`.
- `admin_upsert_setting(_key, _value, _description?)` — insert/update em `system_settings`.

Nenhuma nova tabela — usa as existentes: `profiles`, `user_roles`, `units`, `system_settings`, `audit_logs`, `role_permissions`.

**2. Camada de lógica**

- `src/lib/admin.ts` — helpers de formatação (data/hora do log, cor por ação, filtros de log).
- `src/hooks/useAdmin.ts` — hooks tanstack-query:
  - `useAdminUsers(filters)` — join `profiles` + `user_roles` ativos.
  - `useAssignRole()`, `useRevokeRole()`, `useResetPassword()` — mutations.
  - `useAdminUnits()`, `useCreateUnit()`, `useUpdateUnit()`, `useToggleUnitStatus()`.
  - `useSystemSettings()`, `useUpsertSetting()`.
  - `useAuditLogs(filters)` — leitura paginada.
  - `useRolePermissions()` — leitura da matriz `role_permissions`.

**3. Componentes (`src/components/admin/`)**

- `UserRolesTable` — tabela de usuários com roles ativos, ações "Adicionar papel" / "Revogar" / "Resetar senha".
- `AssignRoleDialog` — seleciona role (enum) e unidade opcional.
- `UnitFormDialog` — form CRUD de unidades (nome, código, endereço, telefone).
- `PermissionsMatrixTable` — leitura da matriz (role × module × action) somente-visualização.
- `SettingsForm` — lista chave/valor de `system_settings` editável inline (JSON).
- `AuditLogTable` — tabela com filtros (ação, tabela, período, usuário) + paginação.
- `AuditLogFilters` — barra de filtros reutilizável.

**4. Páginas (substituem placeholders)**

- `/admin/usuarios` — lista + gerenciamento de papéis, reset de senha.
- `/admin/permissoes` — matriz somente-leitura de `role_permissions`.
- `/admin/unidades` — CRUD de unidades (já usadas por espaços/turmas).
- `/admin/configuracoes` — editor de `system_settings` (chave/valor).
- `/admin/logs` — visualização de `audit_logs` com filtros.

**5. Integrações**

- Substituir 5 placeholders em `App.tsx`.
- Acesso restrito a `super_admin` e `administrador` (guard via `ProtectedRoute allowRoles`).
- Sidebar já expõe `/admin/*` — nada a alterar.
- Reusa: `Table`, `Dialog`, `Select`, `Input`, `Badge`, `SituationBadge`, `CoverKpiCard`.

### Fora de escopo

- Edição da matriz de permissões (leitura apenas — mudanças exigem migração).
- Impersonation / login-as-user.
- Backup/restore.
- Logs em tempo real (usa polling padrão do tanstack-query).

### Permissões

- Todas as páginas `/admin/*`: `allowRoles={['super_admin','administrador']}`.
- RPCs verificam `has_role` no servidor (defesa em profundidade).

### Ordem de execução

1. Migração SQL (RPCs administrativas).
2. `lib/admin.ts` + `hooks/useAdmin.ts`.
3. Componentes compartilhados.
4. 5 páginas.
5. `App.tsx` — trocar placeholders + `allowRoles`.
6. Typecheck.
7. Atualizar `.lovable/plan.md` marcando Fase 10 concluída.
