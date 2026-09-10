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

## Parcial / próximo ciclo

- Check-in manual e QR autenticado já em operação; ainda falta a jornada por CPF/código (localizar ou cadastrar → confirmar dados → emitir senha). A abertura da fila já permite serviço, janela e capacidade.
- Seleção de serviço na abertura da fila e agenda completa dia/semana/mês/lista.
- Tela operacional de atendimento com abas de resumo, prontuário, evoluções, exames, documentos, anexos e rascunho/envio para supervisão.
- Adendos/correções com versionamento de conteúdo e revisão de evoluções já disponíveis; a tela operacional de encounter com todas as abas clínicas ainda falta.
- Busca global respeitando RLS, central de notificações clínicas e Realtime de supervisões/status do atendimento.
- Indicadores operacionais e acadêmicos completos (tempo de espera/atendimento, faltas, capacidade, satisfação, por serviço/horário/dia/clínica).

## Pendente por ciclo do plano

### Ciclo 8 — especialidades

As tabelas e políticas dos módulos já estão criadas. Falta entregar as interfaces clínicas de odontograma/histórico dental; avaliação e sequência de sessões de fisioterapia; protocolos, regiões e fotografias de estética; e consulta veterinária com prescrição, cirurgia e internação.

### Ciclo 9 — portais

Papéis, vínculo de identidade, entrada autenticada na fila por QR e telas iniciais já estão disponíveis. Faltam histórico/documentos completos, agenda detalhada, notificações e cadastro de animais pelo tutor.

### Ciclo 10 — gestão e hardening

Dashboard executivo e por clínica, templates documentais, URLs assinadas com expiração, MFA, backups/restauração testados, proteção contra senhas vazadas, retenção LGPD/Lei 13.787 e revisão institucional pelo DPO/TI/responsáveis técnicos.

O Security Advisor do projeto está sem achados de RLS ou `SECURITY DEFINER`; resta habilitar no painel do Supabase a proteção contra senhas comprometidas (Auth → Password Security).

### Qualidade

Os testes automatizados unitários, integração, E2E e matriz de RLS permanecem explicitamente fora do escopo desta execução, conforme orientação do usuário. O CI executa typecheck, lint e build.

## Ordem de continuidade

1. Entregar as interfaces clínicas das quatro especialidades.
2. Completar histórico/documentos e notificações dos portais.
3. Fechar indicadores, busca global e avaliação pós-atendimento.
4. Concluir MFA, backups, retenção e revisão institucional de produção.
