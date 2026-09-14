# Runbook — homologação e hardening de produção

Execute somente no projeto e ambiente aprovados institucionalmente. Registre cada resultado na `MATRIZ_VALIDACAO_REFINAMENTO.md`.

## 1. Confirmação de ambiente

1. Confirme o identificador do projeto, URL e ambiente de homologação antes de criar contas ou emitir senhas.
2. Use clínicas e contas artificiais, cada uma limitada ao respectivo papel da matriz.
3. Não aplique migrations de acessos demonstrativos ou senhas conhecidas no ambiente de produção.

## 2. Supabase Auth

No Dashboard do Supabase, em **Authentication → Password Security**, habilite a proteção contra senhas vazadas. Este é o único alerta atualmente retornado pelo Security Advisor do projeto.

Em **Authentication → Multi-factor**, defina com DPO/TI quais perfis administrativos exigem MFA, habilite o fator aprovado e valide login, recuperação e troca de dispositivo em homologação. Não imponha MFA a pacientes/tutores sem comunicação e fluxo de recuperação aprovados.

## 3. Backup e restauração

1. Defina proprietário, frequência e retenção dos backups com TI.
2. Faça uma restauração em ambiente isolado, nunca sobre a produção ativa.
3. Verifique migrações, RLS, Storage privado, login e uma consulta agregada após a restauração.
4. Registre RTO/RPO observados, data, responsável e limitações.

## 4. LGPD e retenção

1. DPO e responsáveis técnicos definem a tabela de retenção por tipo de dado: administrativo, clínico, documento, auditoria e backup.
2. Defina base legal, canal de solicitação do titular, responsáveis por exportação/correção e processo de eliminação quando permitido.
3. Preserve trilhas obrigatórias e proibições legais antes de qualquer exclusão.
4. Revise os avisos de finalidade no QR e os consentimentos administrativos antes da publicação.

## 5. Liberação

Só libere após: matriz de papéis aprovada; cenário QR/conta aprovado; TV física aprovada; `npm test`, typecheck, lint e build aprovados; Advisor sem achados críticos; e aceite formal de DPO/TI/responsáveis técnicos.
