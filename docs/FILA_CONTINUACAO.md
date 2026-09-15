# Continuidade — reconstrução do módulo de filas

Atualizado em 15/09/2026. Este arquivo registra a meta integral, o estado
verificado e o roteiro seguro para continuar o trabalho sem redescobrir o
contexto.

## Objetivo

Reconstruir a fila do UNIG Clínicas como um núcleo compartilhado em um único
PostgreSQL/Supabase, mas com isolamento lógico rigoroso por `clinic_id` para
Odontologia, Fisioterapia, Veterinária e Estética. Não criar quatro bancos.

O resultado só é aceito quando as quatro clínicas conseguem operar filas ao
mesmo tempo, com sessões, senhas, TV, recepção, QR, eventos, permissões e
Realtime completamente independentes.

## Regras imutáveis

1. Todas as entidades e todas as consultas operacionais carregam e validam
   `clinic_id`; nunca localizar uma fila apenas por `status = 'open'`.
2. Agenda e fila são módulos distintos. `appointment` pode ser vinculado a um
   ticket no check-in, mas nunca substitui `queue_session` ou `queue_ticket`.
3. Uma sessão representa uma abertura operacional de uma clínica; o histórico
   não pode ser apagado ao fechar a fila.
4. Uma clínica não pode ter duas sessões `open` simultaneamente.
5. A sequência pertence à sessão: Odonto pode ter `O-018` ao mesmo tempo que
   Estética tem `E-004`. O prefixo é UX; `clinic_id` é a verdade.
6. Próxima senha é operação atômica no PostgreSQL. Nunca usar frontend nem
   `MAX(ticket_number) + 1` para emitir senha.
7. Realtime, recepção e Painel TV devem filtrar ao menos por `clinic_id` e,
   quando aplicável, pela sessão da fila.
8. Não manter mocks, arrays fake ou fila em `localStorage` na operação real.
9. RLS e RPCs devem validar a permissão e o escopo da clínica no servidor.
10. Não executar `DROP` destrutivo nem apagar histórico durante a migração.

## Arquitetura alvo

```text
clinics
  └─ queue_sessions
       └─ queue_tickets
            └─ queue_events
```

### `queue_sessions`

- `clinic_id`, `organization_id`, `service_date`, `opened_at`, `opened_by`;
- `closed_at`, `closed_by`, `status` (`open`, `paused`, `closing`, `closed`);
- `accepting_new_entries`, `last_ticket_number`, capacidade e configuração
  operacional;
- somente uma sessão `open` por clínica, garantida por índice parcial.

### `queue_tickets`

- `queue_session_id`, `clinic_id`, `ticket_number`, `ticket_code`, `joined_at`;
- paciente opcionalmente vinculado, agendamento opcionalmente vinculado;
- modo/origem de entrada, prioridade e timestamps de cada etapa;
- estados padronizados: `waiting`, `called`, `checked_in`, `in_service`,
  `waiting_supervision`, `completed`, `cancelled`, `no_show`, `transferred`,
  `paused`.

### Entrada, atendimento e encerramento

- funcionário com `queue.open`/`queue.manage` da clínica abre a fila;
- abrir registra autor/hora e não pode abrir outra fila na mesma clínica;
- recepção pode emitir senha manual para paciente existente ou visitante;
- `closing` bloqueia novas entradas mas permite finalizar quem já está na
  fila; `closed` finaliza a sessão com auditoria;
- histórico deve apresentar abertura, fechamento, totais e responsáveis.

## QR e portal público

1. O QR é permanente por clínica, por exemplo `/fila/qr/<token-da-clinica>`;
   não aponta para uma sessão diária temporária.
2. O backend resolve clínica + sessão `open` atual. Sem fila, mostra “fila
   fechada”; não cria ticket oculto.
3. Suportar entrada autenticada, criação de conta e visitante com dados
   mínimos e consentimento.
4. Usuário com ticket ativo recebe o ticket existente, não um duplicado.
5. Visitante deve poder criar/associar conta posteriormente sem duplicar
   paciente ou ticket.
6. Depois da emissão, mostrar senha, posição/pessoas antes, estado e previsão
   quando disponíveis; atualizar em tempo real.

## Interfaces que devem permanecer separadas

- **Fila operacional:** abrir, pausar, encerrar entradas, fechar, QR e estado
  da sessão da clínica ativa.
- **Recepção:** apenas a sessão atual e tickets da clínica ativa; estações
  atendem a mesma fila da clínica, nunca outra clínica.
- **Painel TV:** seleciona uma clínica e recebe apenas eventos/tickets dela.
- **Agenda:** agenda é calendário; check-in pode gerar ticket com
  `appointment_id`, mas a agenda não é uma fila.
- **Histórico/indicadores:** sempre filtrados pelo escopo de clínica.

## Auditoria concluída

Relatório detalhado: [AUDITORIA_FILAS_2026-09-14.md](./AUDITORIA_FILAS_2026-09-14.md).

Achados principais:

- havia consultas por data local/UTC para localizar sessão em vez da sessão
  operacional atual;
- havia abertura e atualização direta de `queue_sessions` no frontend;
- emissão de tickets ainda usava `MAX(ticket_number) + 1` em três caminhos;
- havia Realtime sem filtro de clínica em versões anteriores;
- a recepção possuía dados fake e uma simulação em `localStorage`;
- no banco havia 12 sessões históricas, de 10 a 14/09, ainda com status
  `open` (2 a 4 por clínica), contrariando a regra central.

## Mudanças locais implementadas

Commit local: `3299363 fix(queue): isolate clinic sessions and ticket allocation`.

- `FilaOperacional.tsx`: busca sessão operacional por clínica, abre pela RPC
  `open_clinic_queue`, filtra Realtime por `clinic_id` e oferece o fluxo
  `open → paused/closing → closed`.
- `RecepcaoOperacional.tsx`: removeu fila fake/localStorage, usa a sessão
  operacional da clínica, filtra eventos por clínica, abre pela RPC e exibe
  `ticket_code` do banco.
- `PainelTV.tsx`: localiza sessões operacionais, sem limitar a data UTC, e
  já filtra eventos da clínica selecionada.
- `AgendaFila.tsx`: não cria/edita mais sessão diretamente; abre e configura
  por RPC. Agenda continua distinta da fila.
- `queueReception.ts` e testes: prefixos Odonto/Fisio/Vet/Estética e cobertura
  de cinco testes para os códigos visuais.

## Migração preparada

Arquivo: `supabase/migrations/20260915005600_queue_session_isolation_hardening.sql`.

Ela é aditiva e inclui:

1. campos de auditoria e contador da sessão;
2. `clinic_id`, `ticket_code` e `joined_at` em tickets, com backfill e trigger
   que deriva o escopo da sessão;
3. índices de leitura por clínica/sessão e unicidade de código por sessão;
4. reparo auditável de sessões históricas abertas: encerra as sem tickets
   ativos e coloca as demais em `closing`, sem apagar dados;
5. índice parcial para impedir duas sessões `open` na mesma clínica;
6. `open_clinic_queue` e `configure_queue_session`, ambos validados por
   permissão de clínica;
7. máquina de estados com `closing`, timestamps de fechamento e eventos;
8. `private.allocate_queue_ticket_number`, que incrementa
   `last_ticket_number` sob lock de linha;
9. redefinição de `issue_queue_ticket`, `join_queue_as_patient` e
   `join_queue_as_guest` para usar o contador atômico;
10. resolução do QR pela clínica e sessão operacional, sem `current_date` na
    jornada pública.

## Estado do Supabase — evidência importante

Projeto confirmado pelo usuário: `hhwsqzaookfohqygihyc` (UNIG-Clinicas,
ambiente `main`/Production).

Já aplicado manualmente no Dashboard SQL Editor:

- campos de abertura/fechamento, `accepting_new_entries` e
  `last_ticket_number` em `queue_sessions`;
- `clinic_id`, `joined_at` e `ticket_code` em `queue_tickets`, com trigger de
  escopo/código, índices e backfill;
- função privada `allocate_queue_ticket_number`.

Ainda **não aplicado** no Dashboard:

- reparo das sessões históricas abertas;
- índice de uma sessão aberta por clínica;
- redefinição das RPCs de abertura/configuração/transição/entrada atômica;
- correção do QR sem dependência da data atual.

### Bloqueio atual e ação autorizável

Antes de executar a migração restante, pedir confirmação explícita para a
mudança de estado das 12 sessões históricas. A ação:

- não apaga sessões, tickets, pacientes, eventos ou agenda;
- bloqueia novas entradas nas sessões antigas;
- muda para `closed` quando não há ticket ativo e para `closing` quando há;
- cria evento `session.legacy_repaired` para auditoria.

Após a confirmação, abrir o projeto correto no SQL Editor, aplicar a migração
em transação quando possível e executar a pré-checagem abaixo.

## Pré-checagem e verificação pós-migração

Arquivo: [SUPABASE_QUEUE_PREFLIGHT.sql](./SUPABASE_QUEUE_PREFLIGHT.sql).

Executar adicionalmente:

```sql
select clinic_id, count(*)
from public.queue_sessions
where status = 'open'
group by clinic_id
having count(*) > 1;
```

Resultado esperado: zero linhas.

Validar no Dashboard e no app:

1. abrir Odonto e Estética, simultaneamente;
2. emitir entradas concorrentes em cada sessão e confirmar números únicos por
   sessão, prefixos corretos e sem colisão;
3. confirmar que recepção, QR e TV da Odonto não recebem eventos da Estética;
4. pausar/encerrar novas entradas/fechar uma clínica sem alterar outra;
5. consultar QR com fila fechada e confirmar que nenhum ticket é criado;
6. testar autenticado, visitante e segunda tentativa do mesmo paciente;
7. testar check-in de agendamento criando ticket opcionalmente vinculado;
8. testar RLS com usuário limitado a uma única clínica;
9. conferir histórico e `queue_events` para abertura, emissão, chamada,
   transições e fechamento.

## Pendências para finalizar a meta

- aplicar e verificar a migração no projeto Supabase após confirmação;
- atualizar os tipos gerados do Supabase se necessário;
- criar testes de integração PostgreSQL para concorrência, RLS, isolamento de
  clínica, transições e QR;
- criar testes de UI/integração para TV, recepção e portal QR;
- revisar `Indicadores.tsx`, página inicial e qualquer consulta de relatórios
  para garantir filtro explícito por clínica;
- validar os fluxos de visitante/claim de conta em produção controlada;
- conferir políticas RLS e grants efetivos no projeto remoto;
- fazer revisão final de dados legados/mocks e remover apenas o que for
  comprovadamente obsoleto;
- publicar frontend e verificar o runtime real; build verde não comprova RLS,
  Realtime ou o banco remoto.

## Comandos já validados nesta etapa

```text
npm run typecheck                  # passou
npm run test -- src/lib/queueReception.test.ts  # 5 testes passaram
npm run build                      # passou
git diff --check                   # passou antes do commit
```

## Git

- branch: `main`;
- commit anterior de integração: `33dd99c`;
- commit desta continuidade: `3299363`;
- este commit deve ser enviado para `origin/main` antes de continuar em outra
  máquina; aplicar o SQL continua sendo uma etapa separada e confirmada.
