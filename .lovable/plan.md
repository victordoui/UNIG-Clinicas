
# Plano — Módulo Patrimônio (Home, Painel e Relatórios)

Três frentes, todas mantendo estrutura, permissões e componentes existentes. Nenhuma outra parte do sistema é tocada.

---

## 1. Nova tela INÍCIO adaptada ao acesso Patrimônio

Hoje o `src/pages/Index.tsx` faz switch por `unigRole` (almoxarifado, compras, admin, solicitante). Não existe caso para `patrimonio`, então usuários desse perfil caem no `DashboardSolicitante`.

**Mudanças:**
- Criar `src/components/dashboard/DashboardPatrimonio.tsx` seguindo o mesmo padrão visual dos outros dashboards (usa `RoleHomeCover` + `QuickAction` cards + listas), para manter identidade.
- Adicionar `case "patrimonio": content = <DashboardPatrimonio />;` em `Index.tsx`.

**Conteúdo do DashboardPatrimonio (reaproveita `useAssetsAggregates`):**
- **Capa (`RoleHomeCover`)** — chip "Painel do Patrimônio", ícone `Package`, descrição institucional, CTAs:
  - primário: "Novo Patrimônio" → `/patrimonio/novo`
  - secundário: "Ver Itens" → `/patrimonio/itens`
  - KPIs na capa: Total de bens, Ativos, Em manutenção, Valor total.
- **Atalhos rápidos** (grid de `QuickAction`): Itens, Categorias, Movimentações, Inventário, Etiquetas, Importação, Relatórios.
- **Blocos inferiores:**
  - "Últimas movimentações" — reusa `PatrimonyRecentMovements`.
  - "Pendências principais" — reusa `PatrimonyPendingIssues` (versão compacta).

Sem novos hooks, sem mexer em rotas nem sidebar.

---

## 2. Painel de Patrimônio — mais cards e blocos

Arquivo: `src/pages/patrimonio/PatrimonioLista.tsx`.

Adicionar, mantendo o layout atual, mais opções de cards analíticos usando componentes que já existem em `src/components/patrimonio/`:

- `ValueByCategoryChart` (top 10 categorias por valor R$).
- `ConditionChart` (condição física dos bens).
- `CategorySummaryTable` (top categorias com qtd/valor/%).
- `UnitSummaryTable` (unidades com qtd/valor/%).
- `PatrimonyInsights` (frases gerenciais automáticas).

Reorganização visual (mesma grid `lg:grid-cols-2`):
```text
[Categoria - qtd]   [Status donut]
[Valor por categ.]  [Condição]
[Ranking unidades]  [Insights]
[Pendências]        [Movimentações recentes]
[Resumo categoria]  [Resumo unidade]
```
Nenhuma remoção de bloco existente.

---

## 3. Relatórios de Patrimônio — filtros avançados + exportação de gráficos

Arquivo: `src/pages/patrimonio/PatrimonioRelatorios.tsx` e `src/components/patrimonio/AssetFilters.tsx`.

### 3.1 Filtros mais completos (barra global no topo)
Manter os filtros atuais e acrescentar:
- Seletor **Unidade** com opção "Todas" ou uma específica (dropdown único; hoje já existe filtro por unidade — deixar explícito com opção "Todas as unidades").
- **Categoria** (todas ou específica).
- **Tipo**, **Status**, **Condição física**.
- **Faixa de valor** (min / max R$).
- **Período de aquisição** (data de/até).
- Botão "Limpar filtros" e badge com contagem de filtros ativos.

Todos os KPIs, gráficos, tabelas e exportações passam a respeitar os filtros (já usam `useAssetsAggregates(filters)` — só ampliar a barra de filtros e o hook conforme necessário).

### 3.2 Mais dashboards informativos
Adicionar novos blocos gráficos reutilizando `PatrimonyChartCard`:
- **Valor médio por categoria** (barra horizontal).
- **Distribuição por condição × status** (barras empilhadas).
- **Aquisições por ano** (linha) — a partir de `acquisition_date`.
- **Ranking de blocos/salas** com mais bens (top 10).
- **Bens sem movimentação recente** (contador + link).

Cada novo gráfico vira um componente pequeno em `src/components/patrimonio/` para reuso.

### 3.3 Exportação de gráficos e dashboards
Adicionar em cada card de gráfico um botão "Exportar" (ícone `Download`) com opções:
- **PNG** do gráfico (via `html-to-image` — dependência leve; salva o `ref` do card).
- **CSV** dos dados do gráfico.

E no topo da página, além do atual Exportar (CSV/Excel/PDF da base):
- **Exportar dashboard completo em PDF**: captura todos os cards de gráfico (via `html-to-image` + `jsPDF`) e monta um relatório paginado com cabeçalho (filtros aplicados, data, totais).
- **Exportar dashboard completo em PNG** (imagem única de alta resolução).

Sem quebrar as exportações CSV/Excel/PDF já existentes.

---

## Detalhes técnicos

- **Arquivos criados**
  - `src/components/dashboard/DashboardPatrimonio.tsx`
  - `src/components/patrimonio/PatrimonyAcquisitionsChart.tsx`
  - `src/components/patrimonio/PatrimonyConditionStatusChart.tsx`
  - `src/components/patrimonio/PatrimonyLocationRanking.tsx`
  - `src/components/patrimonio/ChartExportMenu.tsx` (botão reutilizável PNG/CSV por card)
- **Arquivos editados**
  - `src/pages/Index.tsx` — novo case `patrimonio`.
  - `src/pages/patrimonio/PatrimonioLista.tsx` — mais cards.
  - `src/pages/patrimonio/PatrimonioRelatorios.tsx` — novos gráficos, exportações e wrapper de captura.
  - `src/components/patrimonio/AssetFilters.tsx` — filtros novos (valor min/max, período, unidade "Todas").
  - `src/hooks/useAssets.ts` — aplicar novos campos de filtro (faixa de valor / período) somente se ainda não suportados.
- **Dependência nova**: `html-to-image` (~10 KB gzip) para captura de gráficos. `jsPDF` e `xlsx` já estão no projeto.
- **Padrões preservados**: paleta azul corporativo, `RoleHomeCover`, `QuickAction`, componentes shadcn, responsividade desktop/tablet/mobile, permissões atuais (sem mudanças em `App.tsx`, `Sidebar.tsx`, RLS).
- **Nada é removido** — apenas adições e a nova rota de dashboard por perfil.

## Fora de escopo
- Alterações em outros perfis (`DashboardAdmin`, etc.), sidebar, permissões, tabelas do Supabase ou lógica de negócio dos bens.
