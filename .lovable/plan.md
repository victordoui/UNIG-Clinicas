## Fase 10 — Administração ✅ concluída

Substituiu os 5 placeholders `/admin/*` por páginas reais.

### Entregue

**Backend (RPCs SECURITY DEFINER, restritas a super_admin/administrador)**
- `admin_assign_role`, `admin_revoke_role`, `admin_set_password_reset`, `admin_upsert_setting`

**Lógica**
- `src/lib/admin.ts` — formatação de logs, JSON helpers.
- `src/hooks/useAdmin.ts` — `useAdminUsers`, `useAssignRole`, `useRevokeRole`, `useResetPassword`, `useAdminUnits`, `useCreateUnit`, `useUpdateUnit`, `useToggleUnitStatus`, `useSystemSettings`, `useUpsertSetting`, `useAuditLogs`, `useRolePermissions`.

**Componentes** (`src/components/admin/`)
- `UserRolesTable`, `AssignRoleDialog`, `UnitFormDialog`, `PermissionsMatrixTable`, `SettingsForm`, `AuditLogFilters`, `AuditLogTable`.

**Páginas**
- `/admin/usuarios` — gerenciamento de papéis, reset de senha.
- `/admin/permissoes` — matriz de permissões (leitura).
- `/admin/unidades` — CRUD de unidades.
- `/admin/configuracoes` — editor JSON de `system_settings`.
- `/admin/logs` — auditoria com filtros.

**Guard**: `ProtectedRoute allowRoles={['super_admin','administrador']}` em todas as rotas `/admin/*`.

### Próxima fase (Fase 11)

A definir com o usuário — o plano original cobria até administração. Sugestões: PWA/offline refinement, dashboards por perfil aprimorados, integrações externas (e-mail transacional, gateway de pagamento), ou hardening de segurança (fix dos 77 warnings de linter existentes).
