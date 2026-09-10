# ADR 004 — Documentos clínicos privados

## Decisão

Arquivos clínicos são armazenados exclusivamente no bucket privado `clinical-documents`. O primeiro segmento do caminho identifica a organização e é validado por RLS.

## Consequências

- Não usar URLs públicas para exames, consentimentos ou anexos.
- Metadados de arquivo ficam em `documents` e são sujeitos a RLS.
- Uploads devem usar caminhos no formato `<organization_id>/<identificador>/arquivo`.
