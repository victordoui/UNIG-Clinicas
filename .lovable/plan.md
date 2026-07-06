# Fase 6 — Gestão de Espaços (Salas & Reservas)

Implementa o módulo de espaços físicos: cadastro de salas, agenda de reservas, mapa de ocupação e workflow de solicitação/aprovação. Reutiliza os padrões já estabelecidos nas fases anteriores (StaffOnly, ConfirmDeleteDialog, formulários em Dialog, hooks tanstack-query, RLS via `is_staff`).

## Escopo

### 1. Modelo de dados

As tabelas `rooms` e `room_reservations` **já existem** no banco (15 e 14 colunas, com policies). A fase vai **consumir o schema existente** e adicionar apenas o que faltar via migração leve:

- Verificar colunas de `rooms`: `name`, `code`, `unit_id`, `building`, `floor`, `capacity`, `type` (sala/laboratório/auditório/etc.), `resources` (jsonb — projetor, ar, quadro), `status` (ativo/manutenção/inativo), `notes`.
- Verificar colunas de `room_reservations`: `room_id`, `title`, `purpose`, `requester_id`, `class_id` (opcional — vínculo com turma), `starts_at`, `ends_at`, `status` (pending/approved/rejected/cancelled), `approved_by`, `approved_at`, `rejection_reason`, `recurrence` (opcional).
- Se faltar índice de conflito, criar índice `btree (room_id, starts_at, ends_at)` e **função `check_reservation_conflict(room_id, starts_at, ends_at, exclude_id)`** para validar sobreposição antes do insert/update (chamada pelo hook, não trigger — mensagem amigável).
- Confirmar policies: staff faz CRUD; professor/aluno criam solicitação própria e leem apenas as próprias; leitura de agenda (calendário) permitida a staff + solicitante.

### 2. Camada compartilhada

- **`src/lib/rooms.ts`** — labels (tipo, status, situação da reserva), helpers de formato de horário, cores por status, cálculo de conflitos client-side (checagem visual).
- **`src/hooks/useRooms.ts`** — `useRooms(filters)`, `useRoom(id)`, `useCreateRoom/Update/Delete`, `useReservations(filters)`, `useRoomAgenda(roomId, weekStart)`, `useCreateReservation`, `useApproveReservation`, `useRejectReservation`, `useCancelReservation`, `useMyReservations()`.

### 3. Componentes (`src/components/espacos/`)

- `RoomFormDialog` — cadastro/edição de sala (reutiliza padrão de `CourseFormDialog`).
- `RoomCard` — card na listagem/mapa (capacidade, tipo, status, recursos).
- `RoomMapGrid` — grid visual agrupado por prédio/andar (reutiliza layout do `WeeklyScheduleGrid` como referência estética).
- `ReservationFormDialog` — solicitar reserva (sala + data + horário + finalidade + turma opcional).
- `ReservationCard` — item da lista de solicitações/reservas com badge de status.
- `ReservationApprovalPanel` — painel lateral com detalhes + aprovar/rejeitar (staff).
- `RoomWeekAgenda` — agenda semanal de uma sala (visualização de reservas confirmadas + pendentes).
- `OccupancyHeatmap` — grid de ocupação (sala × faixa horária) para o dashboard operador.

### 4. Páginas

**Operador de Espaços / staff** (substitui os placeholders atuais):

- `/espacos` — dashboard com KPIs (salas ativas, reservas hoje, solicitações pendentes) + próximas reservas.
- `/espacos/salas` — CRUD de salas (grid de `RoomCard` + `RoomFormDialog`).
- `/espacos/mapa` — mapa visual agrupado por unidade → prédio → andar (`RoomMapGrid`).
- `/espacos/agenda` — agenda consolidada (seletor de sala + `RoomWeekAgenda`).
- `/espacos/solicitacoes` — fila de solicitações pendentes com `ReservationApprovalPanel`.
- `/espacos/reservas` — todas as reservas (filtros por status/sala/data).
- `/espacos/eventos` — mantém placeholder ou pequena listagem de reservas marcadas como evento (fora do escopo o CRUD de eventos institucionais).

**Solicitante (professor, coordenação, atendimento etc.)**:

- `/espacos/solicitar` — página simplificada com `ReservationFormDialog` inline + lista das próprias solicitações via `useMyReservations()`.

**Relatórios**:

- `/relatorios/ocupacao` — `OccupancyHeatmap` semanal + tabela de ocupação por sala (%).

### 5. Integrações

- `App.tsx`: apontar as rotas acima para os novos componentes (hoje são `Placeholder`). Manter os `allowRoles` já configurados.
- `Sidebar`/dashboards existentes: nenhum ajuste — os links já apontam para essas rotas.
- Portal do professor: no `MinhasTurmas`, adicionar botão "Solicitar sala" que abre `ReservationFormDialog` pré-preenchido com `class_id`.

## Fora de escopo

- Recorrência automática de reservas (semanal por período letivo) — fase futura.
- Import de calendário externo (ICS).
- Notificações por e-mail/push ao aprovar/rejeitar (fica para o módulo de Comunicação).
- CRUD completo de "eventos institucionais" com público, inscrições e certificados.
- Cobrança por uso de sala.

## Permissões

- **Salas — CRUD**: `super_admin`, `administrador`, `operador_espacos`, `gestor_unidade` (somente da própria unidade).
- **Solicitar reserva**: qualquer usuário autenticado com papel diferente de `visitante`.
- **Aprovar/rejeitar**: `super_admin`, `administrador`, `operador_espacos`, `gestor_unidade`.
- **Ver todas as reservas**: staff (`is_staff`).
- **Ver próprias reservas**: solicitante.

## Estrutura técnica

```text
supabase/migrations/xxx_rooms_reservations_helpers.sql   (opcional — só se faltar índice/função de conflito)
src/lib/rooms.ts                                          (novo)
src/hooks/useRooms.ts                                     (novo)
src/components/espacos/
  ├── RoomFormDialog.tsx
  ├── RoomCard.tsx
  ├── RoomMapGrid.tsx
  ├── RoomWeekAgenda.tsx
  ├── ReservationFormDialog.tsx
  ├── ReservationCard.tsx
  ├── ReservationApprovalPanel.tsx
  └── OccupancyHeatmap.tsx
src/pages/espacos/
  ├── Dashboard.tsx
  ├── Salas.tsx
  ├── Mapa.tsx
  ├── Agenda.tsx
  ├── Solicitacoes.tsx
  ├── Reservas.tsx
  └── Solicitar.tsx
src/pages/relatorios/Ocupacao.tsx                         (novo)
src/App.tsx                                                (trocar placeholders pelas rotas reais)
```

## Ordem de execução

1. Ler schema atual de `rooms` e `room_reservations` (colunas + policies) e, se necessário, migração pequena com função `check_reservation_conflict` e índice.
2. `lib/rooms.ts` + `hooks/useRooms.ts`.
3. Componentes compartilhados (`RoomCard`, `RoomFormDialog`, `ReservationFormDialog`, `ReservationCard`, `ReservationApprovalPanel`).
4. Páginas de sala (Dashboard, Salas, Mapa, Agenda).
5. Fluxo de solicitação/aprovação (Solicitar, Solicitações, Reservas).
6. Heatmap + `/relatorios/ocupacao`.
7. Atualizar `App.tsx` e ligar botão "Solicitar sala" em `MinhasTurmas`.
8. Seed opcional: 3–4 salas demo + 2 reservas aprovadas + 1 pendente para validar telas.

## Próxima fase (Fase 7)

Financeiro — mensalidades, boletos, bolsas e relatórios financeiros para o portal do aluno e área da tesouraria.
