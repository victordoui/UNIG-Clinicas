# Próximos passos — UNIG-A pós-MVP

Divido o trabalho em **4 blocos**, do mais urgente (fechar o ciclo do MVP) ao mais estratégico (integrações e app nativo). Cada bloco pode ser aprovado e executado separadamente — recomendo seguir na ordem.

---

## Bloco 1 — QA end-to-end por perfil (fechamento do MVP)

Objetivo: validar cada um dos 10 papéis navegando pelos fluxos reais com os dados semeados (`seed-demo-users` + dados de demo já existentes).

Para cada papel: login via botão de acesso rápido → percorrer telas do menu → executar 1 ação de escrita representativa → conferir permissões (o que aparece / o que é bloqueado) → registrar bugs.

| # | Papel | Fluxo mínimo validado |
|---|---|---|
| 1 | Aluno | Disciplinas · Grade · Notas · Frequência · Documentos · Financeiro · Novo requerimento |
| 2 | Professor | Minhas Turmas · Lançar Notas · Registrar Frequência · Grade Semanal |
| 3 | Secretaria | Alunos · Turmas · Matriz · Requerimentos (fila) · Comunicados |
| 4 | Coordenação | Cursos · Disciplinas · Matriz · Turmas · Relatórios acadêmicos |
| 5 | Financeiro | Mensalidades · Boletos · Marcar pago · Bolsas · Dashboard |
| 6 | Atendimento | Fila de Requerimentos · Histórico do Aluno · Mensagens |
| 7 | Gestor de Unidade | Unidades · Ocupação · Relatórios operacionais |
| 8 | Operador de Espaços | Salas · Reservas · Solicitações · Agenda |
| 9 | Administrador | Usuários · Permissões · Unidades · Configurações · Logs |
| 10 | Super Admin | Todos os módulos + verificação `is_super_admin` bypass |

Entrega: **relatório de QA** (arquivo `.lovable/qa-report.md`) listando por papel: telas OK, telas com bug, prints/observações, e correções aplicadas em seguida (patch mínimo).

Ferramenta: Playwright headless dentro do sandbox — script único parametrizado por papel, screenshots em `/tmp/browser/qa/<role>/`.

---

## Bloco 2 — Revisão de segurança (RLS + linter)

1. Rodar `supabase--linter` e catalogar todos os findings.
2. Para cada finding: classificar em **crítico / warning / informativo** e aplicar fix via migration.
3. Rodar `security--run_security_scan` e resolver criticals antes de publicar.
4. Revisar manualmente as 28 tabelas com foco em:
   - `GRANT`s presentes para `authenticated` / `service_role`.
   - Nenhuma policy usando `true` sem justificativa.
   - Funções `SECURITY DEFINER` com `SET search_path = public`.
   - Storage bucket `requirement-attachments` com policies por dono.
5. Atualizar `@security-memory` com decisões tomadas (findings ignorados + justificativa).

Entrega: migration(s) de hardening + relatório curto de findings fechados.

---

## Bloco 3 — Publicação

1. Rodar `security--get_scan_results` — bloquear publicação se houver critical aberto.
2. Confirmar metadados de `index.html` (título, description, OG) — já feitos na fase da logo.
3. Publicar via `preview_ui--publish` (URL Lovable primeiro: `u-academy.lovable.app` já ativa; renomear se desejado).
4. Guiar conexão de **domínio custom** em Project Settings → Domains:
   - Preciso que você me diga **qual domínio** quer usar (ex.: `portal.unig.br`, `sistema.unig.br`).
   - Passo a passo dos registros DNS (A → `185.158.133.1` para `@` e `www`, TXT `_lovable`).
   - Aguardar propagação + SSL automático.
5. Verificação pós-deploy: abrir URL final, login demo, checar PWA install e favicon.

---

## Bloco 4 — Integrações futuras (fora do MVP, planejar apenas)

Estes são módulos grandes — cada um vira uma **Fase** própria depois de aprovado. Aqui só listo escopo e dependências para você priorizar:

| Integração | Escopo resumido | Dependências / custo |
|---|---|---|
| **WhatsApp** | Notificações de boleto, comunicados e requerimentos via WhatsApp Business API | Conta Meta Business + provedor (Twilio/Z-API) + secret · edge function `send-whatsapp` |
| **Google Calendar** | Sincronizar aulas, reservas de sala e eventos acadêmicos com agendas Google dos usuários | OAuth Google (connector) + escopo Calendar + edge function de sync bidirecional |
| **UNIG Facilities** | Módulo de manutenção predial (chamados de infra, patrimônio, ordens de serviço) integrado às salas | Novas tabelas (`facility_tickets`, `assets`, `work_orders`) + novo papel `manutencao` + dashboards |
| **BI avançado** | Data warehouse leve (views materializadas) + dashboards com drill-down, coortes, previsão de evasão | Views/materialized views no Supabase + biblioteca de charts avançada (Recharts já usada, avaliar Tremor) |
| **App nativo (Capacitor)** | Empacotar como iOS + Android usando Capacitor, com push nativo e câmera para anexos | `@capacitor/*` + export para GitHub + Xcode/Android Studio no lado do usuário |

Não implemento nada disso agora — apenas fica registrado para você escolher a ordem quando quiser abrir a Fase 12.

---

## Ordem sugerida e o que preciso de você

1. **Aprovar Bloco 1** → eu rodo o QA e volto com o relatório e correções.
2. **Aprovar Bloco 2** → hardening de segurança.
3. **Aprovar Bloco 3** → me diga o **domínio custom** desejado (ou confirme manter só `u-academy.lovable.app`) e publico.
4. **Bloco 4** → me diga qual integração quer priorizar primeiro; abro uma Fase dedicada.

Posso começar direto pelo Bloco 1 assim que você aprovar.
