# Auditoria do módulo de filas — 14/09/2026

## Escopo e evidência

Auditoria estática do checkout `main` após a integração de
`codex/queue-clinic-isolation` (merge `33dd99c`). Nenhuma migration, função,
RLS ou dado do Supabase remoto foi executado ou modificado nesta auditoria.

## Arquitetura atual

- O núcleo é compartilhado: `clinics -> queue_sessions -> queue_tickets`, com
  `queue_events` para rastreabilidade. `appointments` é uma entidade distinta
  e o ticket tem `appointment_id` opcional.
- `queue_sessions` tem `clinic_id`, `organization_id`, estado, data de serviço,
  capacidade e modo de entrada. A regra `unique (clinic_id, service_date)`
  evita duas sessões para a mesma clínica no mesmo dia.
- `queue_tickets` pertence à sessão; o escopo de clínica é obtido por
  `queue_session_id`, mas não há uma coluna `clinic_id` materializada no
  ticket.
- A emissão é feita por RPC e usa advisory lock por sessão antes de calcular a
  próxima senha. As jornadas QR autenticada e visitante passam por RPCs; o QR
  permanente está associado à clínica.
- A interface operacional está em `FilaOperacional`, `AgendaFila`,
  `RecepcaoOperacional`, `PainelTV` e `FilaQR`.

## Pontos corretos já existentes

1. A separação Agenda/Fila existe no schema: `appointments` não é ticket.
2. A sessão e os tickets são associados a uma clínica, e há políticas RLS com
   `has_clinic_permission` para operadores.
3. QR fixo por clínica (`clinics.queue_qr_token`) resolve a sessão aberta atual
   sem expor pacientes.
4. A criação de senha está no banco e é serializada por sessão; não há geração
   de número no frontend.
5. A TV já filtra os eventos por `clinic_id`.

## Bugs e lacunas encontrados

### Críticos

1. `RecepcaoOperacional.tsx` assina `queue_events` sem filtro de `clinic_id`.
   Qualquer evento de outra clínica provoca reload da recepção atual. Não
   vaza dados pela query posterior, mas viola isolamento de realtime e gera
   reatividade cruzada.
2. `FilaOperacional.tsx` tem a mesma subscription global sem filtro.
3. `RecepcaoOperacional.tsx` inicia com fila, senha atual e pacientes estáticos
   (`O-014` a `O-016`) e persiste a simulação em
   `localStorage['unig-recepcao-simulacao']`. Quando a consulta remota falha ou
   não há clínica selecionada, a tela pode representar uma fila inexistente.
4. A sessão é localizada com `service_date = current_date` em UI e RPCs. Isso
   não suporta corretamente uma fila excepcional que atravesse meia-noite,
   contrariando a exigência de `opened_at`/`closed_at` como fonte da
   existência.

### Altos

5. `queue_tickets` não contém `clinic_id`. A relação com a sessão é segura nas
   políticas atuais, mas o requisito de escopo explícito em toda entidade
   operacional, filtros de realtime e índices analíticos fica incompleto.
6. A abertura ainda é `insert` direto pela UI. A constraint impede duplicação,
   porém a abertura não é uma operação atômica com evento e não registra os
   campos semânticos `opened_at`/`opened_by`.
7. O estado atual não tem `closing` nem `accepting_new_entries`; `closed`
   bloqueia entradas e não modela a finalização dos tickets existentes.
8. A numeração segura usa `max(ticket_number) + 1` dentro de advisory lock.
   Isso evita corrida na implementação atual, mas não atende o modelo pedido
   de contador explícito por sessão (`last_ticket_number`) e deixa a garantia
   dependente de todas as futuras entradas respeitarem o mesmo lock.
9. Prefixos de senha são reconstruídos no frontend. O número é seguro, mas o
   código exibido não é uma propriedade persistida (`ticket_code`) do ticket.

### Médios

10. `FilaOperacional` usa `new Date().toISOString().slice(0, 10)`, que pode
    trocar de dia em UTC antes/depois do horário local brasileiro.
11. A recepção não implementa ainda a inclusão manual completa (busca,
    cadastro rápido/guest e emissão normal) pedida no fluxo.
12. Não há inventário de testes cobrindo as 12 situações de aceite nem teste
    de concorrência de 20/50 entradas. Os testes atuais de fila cobrem apenas
    validações auxiliares de formulário.

## Dados de teste e legado

| Local | Classificação | Ação proposta |
| --- | --- | --- |
| `RecepcaoOperacional.tsx` (fila inicial e `localStorage`) | Remover da operação | Substituir por estado vazio até a fonte remota carregar; manter simulação somente atrás de flag explícita de desenvolvimento. |
| `PainelTV.tsx` (simulação e campanhas de fallback) | Separar | Manter apenas como demonstração explícita, nunca como fallback de painel operacional. |
| `src/lib/unigRoles.ts` e `seed-demo-users` | Manter em desenvolvimento | Marcar como DEMO/TEST e impedir uso fora de ambiente autorizado. |
| `supabase/seeds/*` | Manter | São seeds explícitos e não devem ser executados em produção. |
| `.tmp-mocks/*` | Remover do fluxo de produção | Não é consumido pelo módulo de filas; manter somente para testes/artefatos ou remover após confirmação. |

## Arquitetura alvo proposta

1. Evoluir, sem `DROP`, `queue_sessions` com `opened_at`, `opened_by`,
   `closed_at`, `closed_by`, `accepting_new_entries`, `last_ticket_number` e
   estado `closing`.
2. Evoluir `queue_tickets` com `clinic_id`, `ticket_code`, identidade guest
   opcional e timestamps de operação; validar por trigger que o `clinic_id` é
   o da sessão.
3. Criar RPCs transacionais únicas para abrir sessão, encerrar novas entradas,
   fechar sessão e ingressar/emitir ticket. Elas devem travar a sessão com
   `FOR UPDATE`, incrementar `last_ticket_number` e gravar evento na mesma
   transação.
4. Restringir RLS e privilégios para que somente RPCs operacionais alterem
   estado/contador; manter escopo por clínica inclusive em eventos e realtime.
5. Resolver QR pela clínica e pela sessão operacional aberta, não pela data;
   uma sessão atravessando meia-noite permanece válida até o encerramento.
6. Migrar UI gradualmente para as RPCs e uma fonte de `currentClinic` já
   existente em `useAuth`; preservar o design atual.
7. Criar testes de banco e integração para isolamento, duplicidade, QR fechado,
   autorização cruzada, realtime e concorrência (50 entradas).

## Componentes

- **Podem ser preservados:** layout de `FilaOperacional`, QR visual,
  `FilaQR`, cards da recepção e painel TV.
- **Precisam mudar:** camada de carregamento/abertura em `FilaOperacional`,
  estado e subscription de `RecepcaoOperacional`, resolução de sessão nas RPCs
  QR, e contratos de realtime.
- **Precisam ser adicionados:** operação manual de entrada, histórico por
  clínica, acompanhamento seguro do ticket e testes de integração.

## Estratégia de migração segura

1. Confirmar projeto Supabase e autorização antes de criar/aplicar schema/RLS.
2. Adicionar colunas, índices, constraints e RPCs novos de forma compatível.
3. Fazer backfill de `queue_tickets.clinic_id` a partir da sessão e validar as
   inconsistências antes de tornar a coluna obrigatória.
4. Migrar UI e Edge Functions para as RPCs novas.
5. Executar testes e validar RLS com contas de clínicas diferentes.
6. Só então desativar o caminho legado; não apagar histórico nem tabelas.

## Riscos

- A aplicação de migrations sem confirmar o projeto pode alterar o Supabase
  errado; por isso a auditoria não aplicou nenhuma.
- Backfill e constraints podem falhar se houver tickets históricos órfãos.
- Alterar a regra de data para sessão operacional requer testes explícitos de
  virada de dia e reabertura.
