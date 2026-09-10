# Supabase — UNIG Clínicas

O projeto Supabase vinculado a este repositório é `hhwsqzaookfohqygihyc`.

A fundação de acesso foi aplicada no ambiente remoto como a migration
`20260910143139_create_unig_clinicas_access_foundation`. Ela cria a estrutura
organizacional, clínicas, perfis, papéis, permissões, vínculos de usuário e
escopos por clínica, todos com RLS habilitada.

As migrations anteriores desta pasta pertencem à aplicação-base e não devem
ser aplicadas novamente neste projeto. Antes de usar `supabase db push`, a
história local deve ser separada/normalizada para não levar o esquema legado ao
banco do UNIG Clínicas.

Nunca inclua chaves do Supabase em migrations, commits ou documentação.
