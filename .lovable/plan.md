
## Problema

No Netlify a logo aparece quebrada porque hoje ela é servida pela URL `/__l5e/assets-v1/...` (CDN interno da Lovable), que **só existe no domínio lovable.app**. Fora dele (Netlify, domínio próprio) esse caminho retorna 404 — daí o ícone quebrado no header e na sidebar.

Arquivo atual:
- `src/assets/uniga-logo.png.asset.json` → aponta para `/__l5e/assets-v1/…/uniga-logo.png`
- Usado em: `Header.tsx`, `Sidebar.tsx`, `Install.tsx`, `Auth.tsx`, `Index.tsx` (via `unigLogo.url`)

## Solução

### 1. Publicar a logo como arquivo real do bundle (corrige Netlify)
- Baixar o binário do CDN Lovable e salvar em `src/assets/uniga-logo.png` (arquivo PNG real).
- Trocar todos os imports de `@/assets/uniga-logo.png.asset.json` (`unigLogo.url`) para `import unigLogo from '@/assets/uniga-logo.png'` (`unigLogo` direto como src). O Vite empacota e gera hash — funciona em qualquer host (Netlify, domínio custom, Lovable).
- Remover o `.asset.json` antigo.

Arquivos tocados (apenas troca do import + `src={unigLogo}`):
- `src/components/layout/Header.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/pages/Install.tsx`
- `src/pages/Auth.tsx` (se referenciar)
- `src/pages/Index.tsx` (se referenciar)

### 2. Logo em destaque na tela inicial (Home / Index)
- No `RoleHomeCover` / `Index`, aumentar a logo do topo para ~`h-20 md:h-24` centralizada, com respiro. Sem mudar layout dos cards nem KPIs.

### 3. Logo grande com contorno branco acima da sidebar
Em `src/components/layout/Sidebar.tsx` (`SidebarHeader`):
- Quando expandida: logo em bloco branco arredondado (`bg-white rounded-xl p-2 shadow-sm ring-1 ring-black/5`), tamanho `h-14 w-14`, centralizada, com o texto "UNIG-A / Portal Acadêmico" abaixo.
- Quando colapsada: mesmo bloco branco em versão menor (`h-9 w-9`) para manter visibilidade sobre o fundo azul da sidebar.
- Nenhum outro item da sidebar é alterado.

### 4. Header (topo)
- Mantém a logo pequena atual (`h-7 w-7`) — não foi pedida alteração ali. Só corrige o `src`.

## Fora de escopo (não vou mexer)
- Rotas, permissões, RLS, hooks, dados, cores da paleta, demais componentes.
- Favicon (não solicitado).
- Nenhum refactor de layout além do necessário para exibir a logo maior.

## Como validar
1. `npm run build` local + preview → logo aparece.
2. Deploy Netlify → logo aparece em `/`, `/auth`, sidebar (expandida e colapsada) e Install.
3. Sidebar mostra logo grande com moldura branca destacada sobre o fundo azul.
