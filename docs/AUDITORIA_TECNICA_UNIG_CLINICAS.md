# Auditoria Técnica — UNIG Clínicas

**Data:** 10 de setembro de 2026  
**Escopo da auditoria inicial:** análise estática da base publicada na branch
`main` antes da transformação. A seção de atualização abaixo registra o que
foi implementado depois da aprovação do plano.

## Atualização de implementação — 10 de setembro de 2026

Após a aprovação do plano, o núcleo clínico foi implementado em migrations
novas e reversíveis no projeto Supabase `hhwsqzaookfohqygihyc`. O estado atual
inclui escopo efetivo por clínica em RLS, pacientes vinculados por clínica,
agenda/fila, atendimentos, procedimentos, exames, documentos privados,
supervisões, extensão veterinária, auditoria e bloqueio de exclusões físicas.
As contas demo estão separadas por clínica e a tela de autenticação as agrupa
por finalidade. O painel `/painel-tv` e os indicadores filtráveis por clínica
completam a operação básica sem expor prontuários.

O CI agora executa typecheck, lint e build. Testes automatizados unitários,
integração, E2E e matriz de RLS foram deliberadamente deixados fora desta
etapa, conforme decisão do responsável pelo projeto. Hardening de produção,
MFA, proteção contra senhas vazadas, seed demo e configurações de infraestrutura
continuam listados em `docs/PRODUCAO_CHECKLIST.md`.

## 1. Resumo executivo

A base é uma SPA React/Vite originalmente iniciada como sistema de estoque (VStock) e progressivamente ampliada para portal acadêmico UNIG-A. Ela reúne, no mesmo repositório e no mesmo schema `public` do Supabase, domínios de estoque, compras, financeiro, acadêmico, espaços, comunicação e administração. Há material valioso para reaproveitamento — shell de aplicação, biblioteca de UI, autenticação Supabase, navegação por papéis, unidades e partes da auditoria —, mas a base ainda não é uma plataforma clínica nem possui os controles necessários para dados de saúde.

O principal risco não é a tecnologia escolhida; é a heterogeneidade histórica do banco e das políticas RLS. O histórico contém muitas migrations incrementais, redefinições de funções/policies e políticas permissivas. Portanto, antes de dados clínicos reais, é obrigatório criar um projeto Supabase separado para UNIG Clínicas, preservar a base atual como referência e estabelecer um schema clínico novo com RLS revisada e testes de autorização.

## 2. Stack identificada

| Camada | Tecnologia |
|---|---|
| Frontend | React 18, TypeScript, Vite 5 |
| Roteamento | React Router DOM 6 (`BrowserRouter`) |
| Dados no cliente | TanStack React Query; hooks por domínio |
| Backend/BaaS | Supabase (Postgres, Auth, Edge Function, Realtime/REST via `supabase-js`) |
| UI | Tailwind CSS, shadcn/ui/Radix UI, Lucide, Sonner |
| Formulários/validação | React Hook Form, Zod |
| PWA | `vite-plugin-pwa`/Workbox |
| Relatórios/exportação | Recharts, SheetJS/XLSX, jsPDF, html2canvas |

Na auditoria inicial o Supabase CLI não estava instalado nesta máquina; o
estado remoto foi posteriormente validado pelo conector do Supabase. A build
de produção e o empacotamento PWA foram corrigidos e agora passam no CI.

## 3. Arquitetura e estrutura atuais

```
src/
  pages/             # páginas organizadas por domínio atual
  components/        # UI compartilhada e componentes de domínio
  hooks/              # queries/mutations Supabase e AuthProvider
  lib/                # tipos, mapeamentos de papéis e helpers de domínio
  integrations/      # cliente e tipos gerados do Supabase
  assets/             # marcas e imagens herdadas
supabase/
  migrations/        # histórico extenso de alterações no schema público
  functions/         # Edge Function seed-demo-users
```

`App.tsx` concentra providers e todas as rotas. `AuthProvider` obtém sessão do Supabase, perfil e o primeiro papel ativo de `user_roles`; `ProtectedRoute` protege a navegação no cliente. As páginas chamam hooks de domínio, que por sua vez consultam diretamente tabelas do `public` pelo cliente Supabase. Não há camada de API de aplicação própria, BFF, módulos de domínio isolados ou boundaries formais entre contextos.

## 4. Mapa de rotas

| Área | Rotas principais | Classificação |
|---|---|---|
| Acesso | `/auth`, `/install` | [ADAPTAR] |
| Início | `/` | [ADAPTAR] |
| Aluno | `/aluno/*` | [REMOVER FUTURAMENTE] |
| Professor | `/professor/*` | [REMOVER FUTURAMENTE] |
| Acadêmico | `/academico/*` | [ADAPTAR] — somente supervisão/integração futura, não reaproveitar o domínio atual |
| Espaços | `/espacos/*` | [ADAPTAR] — unidades/salas podem servir às clínicas |
| Atendimento | `/atendimento/*` | [SUBSTITUIR] — hoje trata requerimentos e histórico acadêmico |
| Comunicação | `/comunicados`, `/comunicacao/*` | [REUTILIZAR] com revisão de audiência e RLS |
| Financeiro | `/financeiro/*` | [REMOVER FUTURAMENTE] do core clínico; manter apenas se houver escopo institucional explícito |
| Relatórios | `/relatorios/*` | [ADAPTAR] |
| Administração | `/admin/*` | [ADAPTAR] |

Todas as rotas de negócio recebem `ProtectedRoute`; somente as rotas administrativas passam `allowRoles` explicitamente. O menu esconde itens por papel, mas ocultação no frontend não é autorização.

## 5. Banco de dados e Supabase

O projeto aponta para um único `project_id` Supabase e concentra centenas de entidades no schema `public`. O inventário de migrations identifica, entre outras famílias:

- **identidade/administração:** `profiles`, `user_roles`, `units`, `organizations`, sessões, aprovações, auditoria e configurações;
- **acadêmico:** matrículas, notas, frequência, grades, `academic_schedules`, `class_meetings` e versões de grade;
- **espaços:** salas, reservas, blocos, andares, setores e subespaços;
- **comunicação:** comunicações, notificações e mensagens diretas;
- **financeiro:** bolsas, mensalidades, boletos, pagamentos, contas a pagar/receber;
- **estoque/compras/operações:** produtos, movimentos, ativos, armazéns, fornecedores, pedidos e demandas operacionais.

Há RLS, policies e funções SQL no histórico, inclusive `SECURITY DEFINER`. Contudo, migrations antigas incluem `USING (true)`, `WITH CHECK (true)` e uma policy com `auth.role() = 'authenticated'`; outras migrations substituem policies anteriores. Como não foi feita inspeção do banco remoto, não é possível afirmar a política efetiva de cada tabela. O histórico não é uma fonte confiável, por si só, para liberar dados clínicos.

**Storage na auditoria inicial:** não havia configuração de bucket nem políticas
claramente versionadas. Essa lacuna foi coberta no núcleo clínico: o bucket
`clinical-documents` é privado e as policies validam organização, paciente e
clínica.

## 6. Autenticação e autorização atuais

- Autenticação via `supabase.auth.signInWithPassword`, sessão persistida em `localStorage` e refresh automático.
- Perfil em `profiles`; papel principal derivado do primeiro registro ativo de `user_roles`.
- Papéis atuais são acadêmico-administrativos: super admin, administrador, secretaria, coordenação, professor, aluno, financeiro, atendimento, gestor de unidade e operador de espaços.
- A UI usa `ProtectedRoute`, `allowRoles` e grupos de menu para controle visual.
- A autorização de dados depende de RLS e helpers SQL, mas não há evidência de testes automatizados de matriz papel × recurso × unidade.

**Conclusão:** há uma fundação RBAC inicial, porém ela precisa evoluir para permissions explícitas e escopo por clínica; escolher apenas o primeiro papel ativo não atende usuários com múltiplos papéis ou múltiplas clínicas.

## 7. Design system e UX

O design system está centralizado em tokens CSS em `src/index.css` e mapeado no Tailwind. Usa shadcn/ui, variáveis CSS, tema claro/escuro, `Nunito Sans`, radius e sombras padronizadas. A identidade atual é azul corporativo, inclusive sidebar, PWA, logos, tokens de sombra e cores hard-coded em componentes.

**Estratégia recomendada de migração visual (sem executar agora):**

1. Inventariar tokens e remover referências semânticas a “azul” somente quando o novo shell estiver aprovado.
2. Mapear a nova paleta para tokens semânticos, não para nomes de cor: primary `#01413D`, interaction `#0A736B`, highlight `#08A899`, soft `#DCF5EF`, background `#F6FAF9`, surface `#FFFFFF` e texto `#142826`.
3. Atualizar primeiro tokens, componentes UI básicos e layout; então páginas por domínio.
4. Trocar assets, manifest PWA, metadados e screenshots apenas ao final da migração visual.
5. Validar contraste WCAG e responsividade desktop/mobile em cada marco.

## 8. Classificação de código reutilizável

| Área | Classificação | Motivo |
|---|---|---|
| React/Vite/TypeScript e aliases | [REUTILIZAR] | Base moderna e adequada para SPA corporativa. |
| Componentes `src/components/ui` | [REUTILIZAR] | Biblioteca genérica shadcn/Radix bem aproveitável. |
| Layout, header, sidebar e tema | [ADAPTAR] | Estrutura útil; conteúdo, identidade e regras de navegação são acadêmicos. |
| `AuthProvider` e cliente Supabase | [ADAPTAR] | Padrão útil; deve apontar para novo projeto e novo modelo de permissões. |
| `profiles`, `user_roles`, `units` | [ADAPTAR] | Conceitos aproveitáveis após revisão de schema/RLS e compatibilidade com pessoas. |
| Auditoria, logs e versionamento de grade | [ADAPTAR] | Boas referências; clínico exige trilha imutável e versionamento mais rigoroso. |
| Agenda, salas e reservas | [ADAPTAR] | Pode apoiar unidades/consultórios, com regras clínicas próprias. |
| Comunicação/notificações | [ADAPTAR] | Reutilizar padrões, não policies nem audiências atuais. |
| Relatórios e exportadores | [ADAPTAR] | Componentes de apresentação são úteis; consultas e dados devem ser novos. |
| Acadêmico aluno/professor/notas/matriz | [REMOVER FUTURAMENTE] | Não pertence ao core UNIG Clínicas. |
| Estoque, compras, fiscal, vendas e VStock | [REMOVER FUTURAMENTE] | Domínio distinto e grande fonte de acoplamento. |
| Financeiro educacional | [REMOVER FUTURAMENTE] | Fora do escopo inicial; preservar somente até decisão de integração. |
| Atendimento por requerimentos | [SUBSTITUIR] | Fluxo não representa triagem, agenda, fila ou encontro clínico. |
| Entidades clínicas multi-clínica | [NOVO] | Necessitam modelo, RLS, auditoria e LGPD específicos. |

## 9. Problemas técnicos e de segurança encontrados

1. **Crítico — função de seed demo:** `seed-demo-users` possui senha previsível fixa, cria usuários com privilégios inclusive `super_admin`, usa `service_role` no servidor e permite CORS `*`. Ela não deve existir habilitada em ambiente de produção clínico.
2. **Crítico — legado de RLS permissiva:** migrations antigas contêm várias policies `FOR ALL USING (true)`/`WITH CHECK (true)` e leitura ampla. O núcleo clínico novo não reutiliza essas policies e possui escopo por clínica; os domínios legados continuam fora do escopo de dados clínicos reais.
3. **Alto — autorização incompleta no cliente:** menu e `ProtectedRoute` não substituem RLS. A maioria das rotas aceita qualquer usuário autenticado na camada de UI.
4. **Alto — PWA na auditoria inicial cacheava chamadas Supabase:** a regra foi removida para o núcleo atual. Respostas da API Supabase agora não entram no cache offline; a política de sessão e limpeza no logout ainda precisa ser definida para produção.
5. **Alto — schema e migrations com drift:** há redefinições de tabelas, funções e policies, histórico longo e domínios incompatíveis no mesmo `public`. Reaplicar ou “limpar” migrations existentes é arriscado.
6. **Médio — configuração no repositório:** `.env` é versionado. A chave publishable/anon pode ser pública, mas variáveis de ambiente não devem ser tratadas como mecanismo de segredo nem versionadas como padrão. A URL/chave também estão hard-coded em `client.ts`.
7. **Médio — falta de testes:** não foram encontrados testes unitários, de integração, E2E ou testes de RLS.
8. **Médio — dependências/build:** versões ainda usam faixas (`^`) e o lockfile deve ser atualizado de forma controlada. O pipeline atual valida typecheck, lint e build; alertas de dados de browsers são apenas manutenção periódica.
9. **Médio — dados de exemplo e legado:** migrations históricas e módulos acadêmicos ainda mencionam VStock/UNIG-A. A navegação e a documentação principal já usam a identidade UNIG Clínicas, mas os domínios legados devem permanecer isolados até sua descontinuação formal.
10. **Médio — exclusões destrutivas em legados:** várias relações históricas usam `ON DELETE CASCADE`. Esse padrão não é aceitável para prontuários ou documentos consolidados.

## 10. Riscos da migração UNIG Academy → UNIG Clínicas

- Misturar dados clínicos ao projeto Supabase acadêmico atual pode expor informações de saúde por policies herdadas.
- Reusar `profiles` sem separar “conta autenticada” de “pessoa/paciente” causará duplicação e inconsistência.
- Reutilizar papéis acadêmicos como autorização clínica impede granularidade e escopo por unidade/clínica.
- PWA/offline, exportações e logs atuais não têm classificação de dados, retenção ou política LGPD definida.
- O uso de um banco compartilhado dificulta isolamento operacional, backup, auditoria e descarte seguro.

## 11. Arquitetura de dados recomendada

Criar **um novo projeto Supabase UNIG Clínicas**, sem migration destrutiva ou cópia cega do banco atual. Preservar a base atual como legado/read-only durante a transição.

```text
organization
  └─ units
      └─ clinics ── clinic_services

persons ── patients ── appointments ── encounters
                 │                     └─ clinical_records ── clinical_notes ── clinical_note_versions
                 └─ consents, documents, attachments, exams, procedures

persons ── animal_guardians ── animals            (extensão veterinária)
auth.users ── user_roles ── roles ── permissions
                       └─ user_clinic_scopes

audit_logs (append-only) ← eventos clínicos e administrativos
```

- `persons` é o cadastro mestre; `patients` é especialização clínica. Não duplicar pessoas entre clínicas.
- Veterinária entra como módulo especializado: `animals` e `animal_guardians`, mantendo o responsável como `person`/paciente quando aplicável.
- Usar UUIDs, `created_at`, `updated_at`, `created_by`, `updated_by`, status e `archived_at`/soft delete onde necessário.
- Prontuário/evolução deve ter versão, autoria, instante de assinatura, motivo de retificação e trilha de auditoria append-only.
- RBAC: `roles` e `permissions` definem capacidade; `user_clinic_scopes` restringe organização, unidade e clínica. RLS deve ser a fonte de verdade.
- Buckets privados por categoria (`clinical-documents`, `consents`, `exams`), com paths não adivinháveis e policies vinculadas a escopo clínico.

## 12. Sequência de migrations recomendada

1. Provisionar novo projeto Supabase, ambientes e segredo fora do Git; configurar backup, logs e acesso administrativo.
2. Criar baseline de identidade: `profiles` mínimo, `organizations`, `units`, `roles`, `permissions`, `user_roles`, `user_clinic_scopes`.
3. Aplicar RLS e testes de negação antes de inserir qualquer dado de negócio.
4. Criar `clinics` e `clinic_services`, com escopo organizacional/unidade.
5. Criar `persons`, `patients`, contatos e consentimentos.
6. Criar extensão veterinária (`animals`, `animal_guardians`) sem contaminar o modelo humano.
7. Criar agenda, fila, atendimentos e encounters.
8. Criar prontuário, evoluções, versões, procedimentos, exames e anexos privados.
9. Criar auditoria append-only, retenção, exportação controlada e alertas de acesso.
10. Só então migrar dados aprovados, com mapeamento, reconciliação, logs e rollback operacional — nunca com `DROP` no legado.

## 13. Nova estrutura de pastas sugerida

```text
src/
  app/                 # providers, router, configuração
  shared/              # UI, lib, tipos e utilitários transversais
  modules/
    identity/
    administration/
    clinics/
    patients/
    scheduling/
    queue/
    encounters/
    clinical-records/
    veterinary/
    academic-supervision/
    reporting/
  services/            # contratos Supabase/API por módulo
  features/            # composição de casos de uso de UI
supabase/
  migrations/
  functions/
  seed/                # somente desenvolvimento, sem contas privilegiadas previsíveis
tests/
  unit/
  integration/
  e2e/
  rls/
```

## 14. Roadmap técnico e backlog da primeira sprint

### Roadmap

1. Aprovar esta auditoria e definir responsável de negócio, perfis, clínicas e ambiente-alvo.
2. Criar projeto Supabase isolado e baseline de segurança.
3. Extrair shell UI e migrar identidade visual aprovada.
4. Implementar identidade, RBAC e escopo clínico com testes RLS.
5. Implementar cadastros de clínica/serviço/unidade e pessoa/paciente.
6. Implementar agenda e fila.
7. Implementar encounter/prontuário/auditoria/versionamento.
8. Implementar módulos especializados, relatórios e integrações.

### Sprint 1 (proposta)

- Definir matriz de papéis, permissions e escopos por clínica.
- Criar projeto Supabase novo e configuração de ambientes sem chaves no Git.
- Escrever ADRs: isolamento de dados, identidade de pessoa, prontuário versionado, storage privado e soft deletion.
- Configurar qualidade: lint, build confiável, testes e pipeline de CI.
- Criar modelo de tokens Verde Petróleo e inventário visual, sem redesenho de páginas.
- Criar migrations somente do baseline administrativo e respectivos testes RLS, após aprovação explícita.
- Desabilitar/remover da implantação clínica a função demo e impedir contas demo no ambiente de produção.

## 15. Plano de execução (pare aqui)

1. Aprovar a estratégia de **novo Supabase isolado** para UNIG Clínicas e confirmar se algum dado acadêmico deve ser integrado.
2. Validar matriz de papéis, permissões, unidades e escopos para Odontologia, Fisioterapia, Veterinária e Estética.
3. Aprovar o modelo `persons`/`patients` e a extensão veterinária proposta.
4. Criar ADRs e baseline de segurança; não migrar dados ainda.
5. Corrigir o pipeline de build e estabelecer testes automatizados, incluindo RLS.
6. Implementar o núcleo administrativo multi-clínica em migrations novas e reversíveis no novo projeto.
7. Migrar a identidade visual por tokens e o shell de aplicação, mantendo as páginas legadas fora da navegação clínica.
8. Evoluir, em ordem, pacientes → agenda/fila → atendimentos → prontuário/auditoria → módulos especializados.
9. Executar migração de dados somente com plano de mapeamento, validação, reconciliação e aprovação formal.

**Nenhuma implementação adicional deve iniciar sem aprovação explícita deste plano.**
