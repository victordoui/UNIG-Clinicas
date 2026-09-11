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
- Funções de transição de fila com implementação privilegiada em `private` e wrapper público sem `SECURITY DEFINER`.
- `patient_contacts` e `patient_addresses` com RLS no escopo do paciente.
- `encounter_participants`, `exam_results` e `security_events` como extensões do núcleo.
- Estruturas isoladas de especialidade para odontograma, avaliação/sessões de fisioterapia, protocolos/sessões de estética e consulta/peso/vacinação veterinária, com permissões próprias.
- Papéis `patient`/`tutor`, vínculo opcional de conta com `profiles.person_id`, jornada QR autenticada e shells dos portais `/portal/paciente` e `/portal/tutor`.

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

O portal do paciente está concluído no escopo atual. No portal do tutor, a interface de documentos de animais e as migrations correspondentes estão prontas, mas sua ativação depende de aplicar no projeto Supabase, nesta ordem: `20260911220000_tutor_animal_documents.sql` e `20260911220500_validate_animal_document_clinic.sql`. Até isso ocorrer, a tela informa a indisponibilidade sem expor ou misturar dados.

A avaliação pós-atendimento está preparada localmente para paciente e tutor: formulários nos portais, médias agregadas no painel de indicadores e migrations com acesso exclusivo do titular. A aplicação no Supabase e a validação com contas reais ainda são necessárias.

### Ciclo 10 — gestão e hardening

Dashboard executivo e por clínica, versões documentais, assinatura autenticada, URLs temporárias para arquivos privados e auditoria estão entregues. Permanecem pendentes MFA, backups/restauração testados, proteção contra senhas vazadas, retenção LGPD/Lei 13.787 e revisão institucional pelo DPO/TI/responsáveis técnicos.

O Security Advisor do projeto está sem achados de RLS ou `SECURITY DEFINER`; resta habilitar no painel do Supabase a proteção contra senhas comprometidas (Auth → Password Security).

### Qualidade

Os testes automatizados unitários, integração, E2E e matriz de RLS permanecem explicitamente fora do escopo desta execução, conforme orientação do usuário. O CI executa typecheck, lint e build.

## Ordem de continuidade

1. Aplicar `20260911232000_seed_clinical_demo_accesses.sql` para habilitar os acessos rápidos de teste e validar o isolamento entre clínicas.
2. Aplicar as duas migrations de documentos veterinários no Supabase e validar o isolamento com uma conta de tutor.
3. Aplicar `20260911230000_post_visit_feedback.sql` e `20260911231000_tutor_veterinary_feedback.sql`; validar avaliações de paciente e tutor, além das médias agregadas por clínica.
4. Quando o escopo adiado for retomado, executar testes unitários, integração, E2E e matriz de RLS.
5. Concluir MFA, backups, retenção e revisão institucional de produção.
