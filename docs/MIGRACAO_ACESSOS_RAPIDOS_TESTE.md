# Acessos rápidos de teste

Os botões da tela de login usam contas reais do Supabase. Esta etapa cria essas contas e seus escopos corretos para demonstrar cada clínica sem misturar os dados.

## Atenção

Esta migration é exclusiva para homologação/demonstração: ela cria contas com a senha conhecida `unig1234`. Não a aplique em produção com dados reais. Antes de uma publicação produtiva, remova ou desative as contas `@unig.demo`.

## Aplicação

No SQL Editor do projeto Supabase `hhwsqzaookfohqygihyc`, execute integralmente:

`supabase/migrations/20260911232000_seed_clinical_demo_accesses.sql`

A migration é idempotente: pode ser executada novamente para restaurar as contas de teste e seus vínculos.

## O que ela prepara

- Super Admin, administrador e auditor com acesso institucional.
- Gestor, profissional e recepção separados para Odontologia, Fisioterapia, Veterinária e Estética.
- Supervisor acadêmico e aluno da Odontologia.
- Um paciente de teste por clínica, vinculado ao respectivo portal.
- Um tutor veterinário e o animal de teste **Thor**.

Todos os acessos rápidos usam a senha `unig1234`. Os perfis específicos de clínica recebem um único `user_clinic_scope`; por isso, um gestor da Odontologia não verá a Veterinária, por exemplo.

## Validação

1. Abra `/auth` e use **Gestor da clínica** em Odontologia.
2. Confirme que a sidebar não apresenta Veterinária, Fisioterapia ou Estética.
3. Saia e entre como gestor de outra clínica; confirme a mudança de escopo.
4. Entre como **Cliente / Paciente** e como **Cliente / Tutor veterinário** para validar os dois portais.
5. Antes de produção, remova as contas de teste ou troque as senhas e restrinja o acesso à página de demonstração.
