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

## Acessos rápidos de desenvolvimento

As contas de demonstração são criadas pela Edge Function `seed-demo-users` e
usam a senha comum `unig1234` apenas no ambiente de teste. A tela de entrada
as apresenta separadas por clínica:

- Administração geral: `super-admin@unig.demo` e `organization-admin@unig.demo`.
- Cada clínica: `clinic-manager-{clinica}@unig.demo`,
  `clinician-{clinica}@unig.demo` e `receptionist-{clinica}@unig.demo`, usando
  os identificadores `odonto`, `fisio`, `vet` e `estetica`.
- Odontologia também possui `academic-supervisor-odonto@unig.demo` e
  `student-odonto@unig.demo`.
- Auditoria transversal: `auditor@unig.demo`.

As contas clínicas têm escopo RLS restrito à clínica indicada. Não reutilize
essas contas ou a senha em produção.
