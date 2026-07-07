# Aplicação da nova logo institucional

Usar a imagem enviada (cap acadêmico + livro em tons de azul) como marca oficial do sistema em todos os pontos de contato visual. **Sem alterar layouts, cores, tipografia ou funcionalidades** — apenas trocar o ativo de marca nos slots existentes.

## Escopo

1. **Upload do arquivo como asset CDN** via `lovable-assets` a partir de `/mnt/user-uploads/`, gerando `src/assets/uniga-logo.png.asset.json`. O binário fica na CDN, o repo só guarda o ponteiro.

2. **Sidebar / Header** (`src/components/layout/Sidebar.tsx`, `src/components/layout/Header.tsx`)
   - Substituir o logo/mark atual pelo `<img src={logo.url}>`, mantendo tamanho, espaçamento e comportamento colapsado/expandido já existentes.

3. **Tela de login** (`src/pages/Auth.tsx`)
   - Exibir a logo em destaque no topo do card de login, mantendo o layout atual.

4. **Favicon + meta tags** (`index.html`, `public/`)
   - Copiar a imagem para `public/favicon.png` (a tag favicon exige caminho servido pela raiz, não CDN).
   - Substituir `<link rel="icon">` para apontar a `/favicon.png` (type `image/png`).
   - Remover `public/favicon.ico` padrão.
   - Atualizar `<meta property="og:image">` e `<meta name="twitter:image">` só se já existirem — sem inventar URL absoluta.
   - Definir `<link rel="apple-touch-icon" href="/favicon.png">` para iOS.

5. **PWA / Instalação**
   - Atualizar `public/manifest.webmanifest` (ou equivalente) para referenciar `/favicon.png` como ícone 512×512 e 192×192 (mesma imagem em ambos os slots — resolução é suficiente).
   - Atualizar `src/pages/Install.tsx` para mostrar a logo no preview de instalação.
   - Não recriar service worker nem cache; apenas trocar o ativo referenciado.

## Fora de escopo

- Nenhuma mudança em cores, temas, fontes, componentes shadcn, rotas, hooks ou lógica.
- Nenhuma alteração no service worker existente (`dev-dist/sw.js`) — só o manifest é tocado.
- Nenhum redesign de Sidebar/Header/Auth — só troca do `src` da imagem.

## Verificação

- Rodar `bun run build` para garantir que os imports resolvem.
- Screenshot rápido via Playwright em `/auth` para confirmar a logo renderizada.

Aprovando, entro em build mode e executo na ordem: upload → refs no código → favicon/manifest → verificação.
