# Fase 3 — Requerimentos Acadêmicos (fluxo completo)

Substitui os placeholders dos requerimentos por um módulo real com abertura pelo aluno, fila de atendimento (secretaria/atendimento), comentários, anexos, SLA e histórico. Aproveita `student_requirements` + `requirement_categories` já existentes.

## Escopo

### Aluno (papel `aluno`)
1. **Meus Requerimentos** (`/requerimentos`)
   - Lista de todos os meus requerimentos (protocolo, categoria, título, status, prioridade, SLA restante).
   - Filtro por status (abertos / em análise / concluídos / rejeitados) e busca por protocolo/título.
   - Card visual com badge de prioridade e barra de SLA.
2. **Novo Requerimento** (`/requerimentos/novo`)
   - Formulário: categoria (select das 9 seed), título, descrição, prioridade, anexo(s).
   - Se categoria tem `requires_attachment=true`, força upload.
   - Gera `protocol_number` automático (formato `REQ-AAMMDD-#####`).
   - Calcula `due_date` = agora + `sla_days` da categoria.
3. **Detalhe do Requerimento** (`/requerimentos/:id`)
   - Cabeçalho: protocolo, status, prioridade, categoria, SLA, datas.
   - Linha do tempo: aberto → em análise → resposta → concluído.
   - Comentários (aluno ↔ atendente) em tempo real leve (fetch on focus, sem realtime nesta fase).
   - Anexos: lista + upload novo.

### Atendimento / Secretaria (`atendimento`, `secretaria`, `administrador`, `super_admin`)
4. **Fila de Requerimentos** (`/atendimento/requerimentos`)
   - Tabela com todos os requerimentos (aluno, categoria, protocolo, status, prioridade, SLA restante, atribuído a).
   - Filtros: status, prioridade, categoria, atrasados (SLA vencido), meus (assigned_to = eu).
   - Ordenação por vencimento de SLA.
   - Contadores no topo (abertos, em análise, atrasados, concluídos hoje).
   - Ações rápidas por linha: atribuir a mim, mudar status, abrir detalhe.
5. **Detalhe do Requerimento (atendente)** — mesma rota `/requerimentos/:id`, mas com painel de ações:
   - Alterar status (open → in_progress → completed / rejected).
   - Atribuir a outro atendente.
   - Escrever resposta oficial (`response`) que fecha o requerimento e preenche `completed_at`.
   - Comentários internos + comentários visíveis ao aluno.

### Histórico do Aluno (`/atendimento/historico`)
6. Busca de aluno por nome/matrícula → lista de todos os requerimentos daquele aluno + link de detalhe.

## O que NÃO entra nesta fase

- Assinatura digital / emissão de PDF do documento final (Fase futura).
- Notificação por e-mail / WhatsApp (Fase 7 — Comunicação).
- Chatbot / atendimento por IA (fora do MVP).
- Realtime Supabase Channels (fica para depois se necessário).

## Estrutura técnica

**Migração** (1 migração):
- `requirement_comments(id, requirement_id, author_id, body, is_internal, created_at)` + GRANT + RLS + trigger updated_at
- `requirement_attachments(id, requirement_id, uploaded_by, file_name, file_path, mime_type, size_bytes, created_at)` + GRANT + RLS
- **Storage bucket** `requirement-attachments` (privado) + policies (aluno lê seus próprios; staff lê todos; upload por autenticados).
- Índices em `student_requirements(status, priority, category_id, assigned_to, due_date)` para a fila.

**Hooks** (`src/hooks/`):
- `useRequirements.ts` — lista com filtros; suporta escopo `mine` (aluno) e `all` (staff).
- `useRequirementDetail.ts` — item + comentários + anexos.
- `useRequirementMutations.ts` — create, updateStatus, assign, addComment, uploadAttachment, respond.

**Componentes** (`src/components/requerimentos/`):
- `RequirementStatusBadge`, `RequirementPriorityBadge`, `SLAProgress`
- `RequirementListCard` (visão aluno) e `RequirementQueueRow` (visão staff)
- `RequirementFilters` (status, prioridade, categoria, atrasado, "meus")
- `NewRequirementDialog` (formulário)
- `RequirementTimeline` (histórico de eventos derivado dos campos)
- `RequirementCommentThread` (com toggle `is_internal` para staff)
- `RequirementAttachmentList` (upload + download)
- `RequirementActionPanel` (staff: status, assign, resposta)

**Páginas** (`src/pages/requerimentos/`):
- `MeusRequerimentos.tsx` (aluno) — `/requerimentos`
- `NovoRequerimento.tsx` — `/requerimentos/novo`
- `RequerimentoDetalhe.tsx` — `/requerimentos/:id` (renderiza aluno OU staff conforme papel)
- `src/pages/atendimento/FilaRequerimentos.tsx` — `/atendimento/requerimentos`
- `src/pages/atendimento/HistoricoAluno.tsx` — `/atendimento/historico`

**Utilitário**:
- `src/lib/requirements.ts` — labels, cores, helper de SLA (`daysLeft`, `isOverdue`), gerador de protocolo.

## UI/UX

- 100% dentro do padrão atual (paleta azul, Nunito, shadcn, Card, Badge, Dialog, Table, Skeleton).
- Reaproveita `ModulePlaceholder` (não usado aqui) e mantém `RoleHomeCover` no dashboard.
- Todos os componentes responsivos (tabela vira lista no mobile).
- Estados: loading (Skeleton), vazio (mensagem + CTA), erro (toast).

## Ordem de execução

1. Migração (`requirement_comments`, `requirement_attachments`, storage bucket + policies).
2. Seed opcional: 2–3 requerimentos demo para o aluno demo (para a fila não ficar vazia).
3. `lib/requirements.ts` + hooks.
4. Componentes reutilizáveis.
5. Páginas do aluno.
6. Páginas do staff (fila + histórico).
7. Atualizar `App.tsx` para trocar Placeholders pelas rotas reais.
8. Testar: abrir requerimento com `aluno@unig.demo`, atender com `atendimento@unig.demo`, verificar SLA.

## Próxima fase (Fase 4)

CRUD Acadêmico completo: Alunos, Professores, Cursos, Disciplinas, Turmas, Grade Curricular. Base para o resto do sistema.
