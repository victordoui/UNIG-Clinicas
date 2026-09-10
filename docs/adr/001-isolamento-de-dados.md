# ADR 001 — Isolamento de dados por organização

## Decisão

Cada registro de domínio clínico deve possuir `organization_id`. A autorização é aplicada no banco por RLS e permissions; ocultação no frontend não é controle de acesso.

## Consequências

- Consultas devem preservar o escopo organizacional e, quando aplicável, da clínica.
- Integrações não podem usar chaves de serviço no navegador.
- Novos dados clínicos precisam de RLS, grants mínimos e verificação de segurança antes de uso.
