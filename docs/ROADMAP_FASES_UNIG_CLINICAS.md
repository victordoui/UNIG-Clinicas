# Roadmap por fases — UNIG Clínicas

Este roteiro organiza a continuidade do Plano Mestre. Uma fase só é marcada como concluída após implementação, typecheck/build e envio ao repositório.

## Fase 1 — Fundação, identidade e isolamento por clínica

**Status: concluída.**

- Identidade visual, autenticação, acessos rápidos e publicação pelo Git/Netlify.
- Estrutura multiclínica, papéis, escopos por clínica e RLS.
- Pacientes, filas, agenda inicial, painel TV, atendimentos, documentos e supervisões.

## Fase 2 — Navegação clínica inteligente

**Status: concluída.**

- Sidebar organizada por Atendimento, especialidade, Ensino/Supervisão, Gestão e Apoio.
- Módulos especializados exibidos conforme a clínica vinculada.
- Seletor de contexto de clínica para usuários com mais de uma unidade autorizada.

## Fase 3 — Fluxos das especialidades

**Status: concluída.**

- Odontologia: odontograma visual, achados por dente/face, planos e execução inicial: entregue.
- Fisioterapia: avaliação, sessões, reavaliação e alta: entregue.
- Estética: protocolos, sessões, áreas, produtos, evolução e consentimento de imagem: entregue.
- Veterinária: animais, tutores, consultas, peso e vacinação: entregue.
- Internação veterinária: admissão por box, programação de medicação/exame/procedimento/parâmetro, conclusão rastreável e alta: entregue.

## Fase 4 — Prontuário e documentos clínicos completos

**Status: concluída.**

- Anamnese estruturada, contexto de encounter e resumo longitudinal por paciente: entregues.
- Exames, imagens e anexos vinculados ao prontuário: entregues.
- Central de documentos e consentimentos, com arquivo protegido: entregue.
- Assinatura eletrônica com atestação do usuário autenticado, trilha de auditoria e histórico imutável de versões: entregues. A assinatura certificada por provedor externo/ICP-Brasil permanece uma evolução contratual futura.

## Fase 5 — Operação e gestão clínica

**Status: concluída.**

- Agenda dia/semana/mês/lista, serviços e check-in por prontuário/CPF/documento: entregues.
- Tela de encounter com início, evolução, rascunho, envio para supervisão, conclusão, exames, documentos e supervisões no mesmo contexto; resumo longitudinal por paciente: entregues.
- Indicadores por clínica, relatórios por serviço e supervisão acadêmica, com exportação CSV operacional: entregues.
- Busca global e central de notificações clínicas: entregues.

## Fase 6 — Insumos e comunicação

**Status: concluída.**

- Estoque por clínica, lotes, validade, mínimo/máximo, inventário, movimentação e alertas: entregue.
- Lembretes preparados, confirmação e remarcação auditadas, com preparação para WhatsApp sem disparo externo automático: entregues.

## Fase 7 — Portais

**Status: em andamento.**

- Portal do paciente: agenda detalhada, histórico, documentos e notificações próprias: entregues.
- Portal do tutor: animais, vacinas, consultas e notificações próprias: entregues. Interface e migrações para documentos do animal: prontas; aplicação remota da migração no Supabase: pendente.

## Fase 8 — Qualidade e produção

**Status: adiada conforme orientação anterior.**

- Testes unitários, integração, E2E e matriz de RLS.
- MFA, backup/restauração, retenção LGPD, observabilidade e revisão institucional.

## Próxima fase

**Fase 7 — Documentos do portal do tutor.**

Entrega prevista: arquivos de animais com acesso exclusivo do tutor vinculado, sem misturar documentos de pacientes humanos.
