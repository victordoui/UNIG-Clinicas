# Checklist de produção — UNIG Clínicas

Esta lista separa o que já está preparado no código do que precisa ser
confirmado no projeto Supabase e na infraestrutura antes de dados reais.

## Aplicação e CI

- [x] `typecheck`, lint e build executados no CI.
- [x] Chave publishable usada no navegador; nenhuma service role/secret no bundle.
- [x] Respostas da API Supabase não são armazenadas no cache offline do PWA.
- [ ] Configurar domínio oficial, HTTPS, headers de segurança e política de CSP.
- [ ] Definir política de sessão em dispositivos compartilhados e limpeza no logout.

## Supabase

- [x] RLS aplicada ao núcleo clínico e escopo de clínica validado.
- [x] Bucket `clinical-documents` privado e policies vinculadas ao paciente/clínica.
- [ ] Ativar proteção contra senhas vazadas e exigir senha forte no Auth.
- [ ] Habilitar MFA para administradores e revisar expiração/reauthentication.
- [ ] Configurar SMTP de produção, backups, retenção e alertas de acesso.
- [ ] Executar Security Advisor e tratar findings antes do go-live.
- [ ] Desabilitar a Edge Function `seed-demo-users` ou exigir uma flag/secreto de
      desenvolvimento antes de disponibilizar o ambiente clínico.

## Dados e operação

- [ ] Fazer revisão formal de LGPD, retenção, exportação e anonimização.
- [ ] Definir processo de correção/retificação de prontuário e resposta a incidentes.
- [ ] Criar ambiente de staging separado do projeto de produção.
- [ ] Validar cada TV com a conta da clínica correta e configurar a URL do painel.
- [ ] Aprovar migração de dados legados somente após reconciliação e plano de rollback.

Os itens não marcados exigem decisão operacional ou configuração no Dashboard;
não devem ser resolvidos com chaves ou dados sensíveis no repositório.
