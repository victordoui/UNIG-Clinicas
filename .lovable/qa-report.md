# Relatório QA end-to-end — UNIG-A (Bloco 1)

Data: 2026-07-07 · Ferramenta: Playwright headless + Supabase Auth API · Ambiente: preview `localhost:8080`.

Método: login programático via `POST /auth/v1/token` com credenciais demo (`{role}-demo@unig.demo` / `unig1234`), sessão injetada em `localStorage`, navegação por cada rota-chave do menu real (`src/components/layout/Sidebar.tsx`), captura de screenshot, console errors e status HTTP de todos os requests.

## Resultado agregado

| Papel | Rotas testadas | Renderizou | Redirect indevido | HTTP 4xx | Console errors |
|---|---|---|---|---|---|
| super_admin | 3 | 3 ✓ | 0 | 0 (após fix) | 0 |
| administrador | 4 | 4 ✓ | 0 | 0 (após fix) | 0 |
| secretaria | 4 | 4 ✓ | 0 | 0 | 0 |
| coordenacao | 4 | 4 ✓ | 0 | 0 | 0 |
| professor | 4 | 4 ✓ | 0 | 0 | 0 |
| aluno | 5 | 5 ✓ | 0 | 0 | 0 |
| financeiro | 4 | 4 ✓ | 0 | 0 | 0 |
| atendimento | 3 | 3 ✓ | 0 | 0 | 0 |
| gestor_unidade | 3 | 3 ✓ | 0 | 0 | 0 |
| operador_espacos | 4 | 4 ✓ | 0 | 0 | 0 |
| **TOTAL** | **38** | **38 ✓** | **0** | **0** | **0** |

## Bug encontrado e corrigido

**#1 — `/admin/usuarios` retornava HTTP 400 no embed `profiles → user_roles`**

- Sintoma: `useAdminUsers` faz `.from('profiles').select('..., user_roles(...)')` e o PostgREST respondia `PGRST200: Could not find a relationship between 'profiles' and 'user_roles'`.
- Causa: `user_roles.user_id` tem FK apenas para `auth.users(id)` (schema fora do PostgREST). Não havia FK dentro de `public` conectando `user_roles` a `profiles`, então o embed falhava.
- Fix aplicado (migration): `ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_profile_fk FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;` + `NOTIFY pgrst, 'reload schema'`.
- Validação: re-executado o QA — tela `/admin/usuarios` carrega sem 4xx.

## Screenshots

Salvos em `/tmp/browser/qa/shots/<role>/<rota>.png` durante a execução (efêmero, não versionado).

## Fase 11 — Hardening aplicado neste ciclo

- Função `public.set_updated_at` corrigida com `SET search_path = public` (lint 0011 fechado).
- `@security-memory` atualizada documentando o modo demo intencional (`Allow public demo` + `SECURITY DEFINER` chamáveis por autenticados).
- Ação manual pendente (Auth do Supabase): ativar **Leaked Password Protection**.

## Conclusão

Todos os 10 papéis conseguem logar e navegar pelas rotas principais do menu. Nenhum ProtectedRoute rebate indevidamente. Único bug de rede foi o embed FK de `profiles/user_roles`, já corrigido. Sistema apto para publicação (Bloco 3).
