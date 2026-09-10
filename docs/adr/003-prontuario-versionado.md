# ADR 003 — Prontuário clínico append-only

## Decisão

Evoluções clínicas não são alteradas ou removidas diretamente. Uma correção gera uma nova nota que referencia a anterior; cada nota possui versão inicial e evento de auditoria.

## Consequências

- Registros clínicos consolidados não usam exclusão física.
- Funções privilegiadas ficam em schema privado e verificam autorização explicitamente.
- Auditoria deve ser estendida para eventos clínicos e administrativos relevantes.
