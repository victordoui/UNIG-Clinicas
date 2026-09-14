# Plano Mestre — status de implementação

Este documento mantém o plano rastreável e evita que funcionalidades do UNIG Academy sejam removidas antes da análise de impacto. O código legado continua preservado; as rotas clínicas usam o núcleo UNIG Clínicas e o escopo por clínica.

## Entregue

- Auditoria inicial da base existente, identidade UNIG Clínicas, layout, autenticação e acessos rápidos de teste.
- Organizações, unidades, clínicas, serviços, perfis, permissões e `user_clinic_scopes` com RLS por clínica.
- Cadastro único de pessoas/pacientes e vínculo N:N `patient_clinic_links`.
- Agenda clínica inicial e fila operacional por clínica.
- Painel TV separado por clínica, sem nomes ou dados de prontuário.
- Atendimento (`encounters`), prontuário/evoluções versionadas, documentos privados, consentimentos e supervisões.
- Auditoria funcional, prevenção de exclusão física e armazenamento privado.
- CI de typecheck/lint/build, checklist de produção e ADR de isolamento.
- Realtime seletivo para eventos da fila e atualização por fallback no painel.

## Implementado nesta rodada

- Abertura de fila com horário inicial/final, capacidade máxima, atendimentos simultâneos e entrada manual/QR.
- Token UUID por sessão e rota pública `/fila/qr/:token`; o QR nunca escolhe a clínica por query string.
- Máquina de estados de senha validada no banco (`waiting → called → checked_in → in_service → waiting_supervision/completed`) com estados alternativos e limite de concorrência.
- `queue_events` append-only, disponível para Realtime e histórico operacional.
- Funções de transição de fila com implementação privilegiada em `private`; os wrappers públicos de QR, conversão e indicadores usam `SECURITY DEFINER` com `search_path` fixo e permissões explícitas, para não exigir execução direta das funções privadas.
- `patient_contacts` e `patient_addresses` com RLS no escopo do paciente.
- `encounter_participants`, `exam_results` e `security_events` como extensões do núcleo.
- Estruturas isoladas de especialidade para odontograma, avaliação/sessões de fisioterapia, protocolos/sessões de estética e consulta/peso/vacinação veterinária, com permissões próprias.
- Papéis `patient`/`tutor`, vínculo opcional de conta com `profiles.person_id`, jornada QR autenticada e shells dos portais `/portal/paciente` e `/portal/tutor`.
- Migrations remotas dos documentos de animais e avaliações pós-atendimento, com políticas de visibilidade para gestão; a base remota está alinhada a esses portais.
- Entrada de visitante na fila QR: consentimento administrativo separado, emissão transacional de senha, origem `qr_guest`, deduplicação conservadora e limitação de repetição por contato/sessão.
- Camada analítica agregada por clínica e período, com tendências de demanda, funil de fila e tempo de espera por horário no painel de indicadores.
- Jornada mobile da fila, pacientes, agenda, recepção e autenticação; a autenticação agora inclui cadastro, recuperação de senha e retorno à sessão de fila pendente após entrar.
- Lista de espera por clínica/serviço com oferta de encaixe, canal preferido e transições auditadas de contato, aceite e recusa; preferências administrativas de comunicação e acessibilidade foram adicionadas ao modelo do paciente.
- Conversão de visitante em conta: a senha QR pode registrar e-mail opcional; após confirmação do e-mail pelo Supabase, a conta é vinculada automaticamente ao paciente mínimo correspondente, com rejeição de correspondência ambígua, conta já vinculada e e-mail não confirmado.
- Carteira vacinal veterinária: o registro aceita a data do próximo reforço e destaca a prevenção vencendo nos próximos 30 dias, sem disparar contato externo automaticamente.
- Estética: protocolos podem registrar pacote, estimativa administrativa, intervalo de referência e alertas de contraindicação; cada sessão registra a confirmação de revisão desses alertas pelo profissional.
- Fisioterapia: avaliações registram escala funcional, linha de base e meta definidas pelo profissional; sessões acompanham pontuação de evolução e adesão ao plano domiciliar.
- Odontologia: planos registram aceite, estimativa e data sugerida de retorno preventivo, visível na linha do tratamento sem comunicação externa automática.
- Gestão: o painel de indicadores destaca alertas agregados de espera, faltas, volume de fila e satisfação, com limites iniciais declarados para calibração por clínica.

## Entregue nas fases operacionais

- Check-in por agenda, prontuário/CPF/documento e QR autenticado; abertura de fila por serviço, janela e capacidade.
- Agenda nas visões dia, semana, mês e lista, com confirmação, remarcação auditada e preparação de lembretes sem disparo externo automático.
- Tela operacional de encounter com resumo, anamnese, evoluções versionadas, rascunho, envio para supervisão, conclusão, procedimentos, exames e documentos no mesmo contexto.
- Busca global sujeita à autorização, central de notificações, indicadores por clínica e relatórios operacionais/acadêmicos com exportação CSV.
- Fluxos completos das especialidades: odontograma e planos de tratamento; avaliação, sessões e alta em fisioterapia; protocolos e sessões de estética; e consulta, vacinação, peso, internação e alta veterinárias.
- Portais: o paciente consulta agenda, histórico, documentos e avisos próprios; o tutor consulta animais, vacinas, consultas e avisos próprios.

## Pendente por ciclo do plano

### Ciclo 8 — especialidades

Concluído para o escopo atual. Os módulos especializados permanecem separados do núcleo comum e filtrados pela clínica autorizada. Evoluções adicionais de cada especialidade devem ser priorizadas junto aos responsáveis técnicos antes de aumentar a estrutura clínica.

### Ciclo 9 — portais

O portal do paciente está concluído no escopo atual. Os documentos de animais e as avaliações pós-atendimento de paciente/tutor estão aplicados no Supabase com controles de visibilidade. Falta validar os fluxos com contas reais de paciente e tutor sem usar dados clínicos fora de escopo.

### Ciclo 10 — gestão e hardening

Dashboard executivo e por clínica, versões documentais, assinatura autenticada, URLs temporárias para arquivos privados e auditoria estão entregues. Permanecem pendentes MFA, backups/restauração testados, proteção contra senhas vazadas, retenção LGPD/Lei 13.787 e revisão institucional pelo DPO/TI/responsáveis técnicos.

O Security Advisor do projeto está sem achados de RLS ou `SECURITY DEFINER`; resta habilitar no painel do Supabase a proteção contra senhas comprometidas (Auth → Password Security).

O [runbook de homologação e hardening](RUNBOOK_HOMOLOGACAO_E_HARDENING.md) consolida os gates institucionais de Auth, MFA, backup/restauração e LGPD.

### Qualidade

O build de produção, typecheck, testes unitários da entrada de visitante e das regras de recepção, E2E local e a verificação de diff passam. A cobertura unitária protege a normalização de telefone, nome/consentimento/e-mail do visitante, seleção da clínica ativa para contas multi-clínica e os estados permitidos para rechamar uma senha. O E2E sem login verifica autenticação sem rolagem horizontal em 360, 390, 768 e desktop, foco em zoom de 200%, navegação de teclado com alvos de 44 px, proteção do Painel TV e dos portais sem sessão e a entrada QR de visitante com validação local e RPC simulada. A recepção remota agora usa RPCs para abrir/encerrar fila e chamar a próxima senha, sem alterar apenas a prévia local. O lint fecha sem erros, com avisos legados de tipagem a reduzir gradualmente. A [matriz de validação de refinamento](MATRIZ_VALIDACAO_REFINAMENTO.md) documenta os cenários por papel, viewport e TV física. Ainda faltam a execução com papéis de homologação, a integração real das RPCs, a aplicação/validação da migração de wrappers e o dispositivo físico para concluir o ciclo de produção.

## Ordem de continuidade

1. Validar os acessos de teste por clínica e o isolamento entre recepção, profissional, gestor, paciente e tutor.
2. Validar chamada/repetição e som do Painel TV em TV ou monitor físico.
3. Validar em homologação a conversão por e-mail confirmado do visitante para conta e decidir se SMS/WhatsApp OTP será uma segunda alternativa de prova de posse.
4. Executar testes unitários, integração, E2E e matriz de RLS.
5. Concluir MFA, backups/restauração, retenção e revisão institucional de produção.
