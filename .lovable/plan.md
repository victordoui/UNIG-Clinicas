## Fase 8 — Comunicação

Módulo institucional de comunicação do UNIG-A. Consome tabelas existentes (`announcements`, `communications`, `notifications`) e adiciona **mensagens diretas** (`direct_messages`) para chat 1:1 entre usuários. Segue os mesmos padrões (StaffOnly, hooks tanstack-query, dialogs de formulário, badges semânticas, RLS via `is_staff`).

### Status do plano geral

Fases concluídas: 1–7 (Auth, Perfis, Acadêmico, Portal Aluno, Portal Professor, Espaços, Financeiro).
**Agora: Fase 8 — Comunicação.**
Restam depois: Fase 9 (Relatórios avançados), Fase 10 (Administração — usuários, permissões, unidades, configurações, logs).

### Escopo

**1. Migração nova (apenas mensagens diretas + policies faltantes)**

As tabelas já existem — vou apenas:
- Criar **`direct_messages`** (`id`, `sender_id`, `recipient_id`, `subject`, `body`, `read_at`, `parent_id` nullable p/ thread, timestamps) + GRANTs + RLS (remetente e destinatário leem; qualquer usuário autenticado envia; staff full).
- Função `mark_notification_read(_id)` e `mark_all_notifications_read()` (security definer, escopadas a `auth.uid()`).
- Função `broadcast_announcement(announcement_id)` → insere `notifications` para todos os usuários do público-alvo (audience = `todos` | `alunos` | `docentes` | `staff`).
- Realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications, public.direct_messages;`

**2. Camada compartilhada**

- `src/lib/communication.ts` — labels/cores de audience/priority/status/channel, `formatRelativeTime`, `groupByThread`, helper `audienceMatchesRole`.
- `src/hooks/useCommunication.ts` — `useAnnouncements(filters)`, `useCreateAnnouncement/Update/Delete`, `useCommunications`, `useCreateCommunication`, `useMyNotifications`, `useUnreadNotificationCount`, `useMarkNotificationRead`, `useMarkAllRead`, `useMyMessages`, `useConversation(otherUserId)`, `useSendMessage`, com Realtime subscription encapsulada (dentro de `useEffect` + `removeChannel` cleanup, conforme regra).

**3. Componentes (`src/components/comunicacao/`)**

- `AnnouncementFormDialog` — CRUD (título, corpo rich-text simples via textarea, audience select, data de publicação).
- `AnnouncementCard` — exibição pública (usado no feed do aluno/docente e na página `/comunicados`).
- `AudienceBadge` / `PriorityBadge` / `ChannelBadge` — badges semânticas.
- `CommunicationFormDialog` — envio de comunicado direcionado (target_type: curso/turma/unidade/usuário, canal, prioridade, agendamento).
- `CommunicationListTable` — tabela staff com filtros (status, canal, período).
- `NotificationBell` — dropdown no Header com badge de não lidas (integrado ao Header existente, sem redesign).
- `NotificationList` — lista completa (página).
- `ConversationList` — sidebar de conversas.
- `MessageThread` — thread de mensagens 1:1 com input.
- `NewMessageDialog` — nova mensagem (seletor de destinatário via `profiles`).

**4. Páginas**

- `/comunicados` (existente placeholder) → **feed público** de announcements filtrados pelo `unigRole` do usuário.
- `/comunicacao/comunicados` → **gestão staff** (lista + CRUD de announcements + envio de communications direcionadas).
- `/comunicacao/notificacoes` → central de notificações do usuário (todas / não lidas / marcar todas como lidas).
- `/comunicacao/mensagens` → caixa de mensagens diretas (ConversationList + MessageThread + NewMessageDialog).

**5. Integrações mínimas (sem redesign)**

- Substituir os 4 placeholders em `App.tsx` pelas páginas reais.
- Adicionar `<NotificationBell />` no `Header.tsx` (única alteração fora do módulo — reusa espaço já existente ao lado do avatar; sem mudar layout).
- **Nada mais** é alterado (Sidebar, dashboards, outros módulos permanecem intactos).

### Permissões

- **Publicar/editar/apagar announcements**: `super_admin`, `administrador`, `coordenacao`, `secretaria`.
- **Enviar communications direcionadas**: `super_admin`, `administrador`, `coordenacao`, `secretaria`, `atendimento`.
- **Ler announcements**: qualquer usuário autenticado (filtrado por audience).
- **Ler communications**: staff (`is_staff`) + destinatário quando `target_type='usuario'` e `target_id=auth.uid()`.
- **Notificações**: apenas o próprio usuário lê/marca; staff pode criar via função.
- **Mensagens diretas**: qualquer usuário envia e lê apenas as próprias (remetente ou destinatário).

### Fora de escopo

- Rich-text editor completo (usar textarea + quebras de linha).
- E-mail/SMS/WhatsApp real (canal fica registrado, envio é mock — pronto p/ integração futura).
- Anexos em mensagens diretas.
- Grupos/canais multi-usuário.
- Push notifications no navegador.

### Estrutura técnica

```text
supabase/migrations/xxx_comunicacao.sql
src/lib/communication.ts
src/hooks/useCommunication.ts
src/components/comunicacao/
  ├── AnnouncementFormDialog.tsx
  ├── AnnouncementCard.tsx
  ├── AudienceBadge.tsx
  ├── PriorityBadge.tsx
  ├── ChannelBadge.tsx
  ├── CommunicationFormDialog.tsx
  ├── CommunicationListTable.tsx
  ├── NotificationBell.tsx
  ├── NotificationList.tsx
  ├── ConversationList.tsx
  ├── MessageThread.tsx
  └── NewMessageDialog.tsx
src/pages/comunicacao/
  ├── Comunicados.tsx        (gestão staff)
  ├── Notificacoes.tsx
  └── Mensagens.tsx
src/pages/Comunicados.tsx    (feed público — rota /comunicados)
src/components/layout/Header.tsx  (adicionar NotificationBell)
src/App.tsx                  (4 rotas)
```

### Ordem de execução

1. Migração: `direct_messages` + funções + realtime + GRANTs/RLS.
2. `lib/communication.ts` + `hooks/useCommunication.ts`.
3. Componentes compartilhados (dialogs, badges, bell, listas).
4. Páginas (feed, gestão, notificações, mensagens).
5. Integrar `NotificationBell` no Header.
6. Atualizar `App.tsx` (4 rotas).
7. `tsgo` typecheck.
8. Atualizar `.lovable/plan.md` marcando Fase 8 concluída e apontando para Fase 9.

### Próxima fase (Fase 9)

Relatórios avançados — consolidar os relatórios acadêmicos/operacionais que ainda são placeholders (`/relatorios/academicos`, `/relatorios/operacionais`).