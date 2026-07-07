## Objetivo
Dar mais destaque à logo UNIG-A na tela de login (`src/pages/Auth.tsx`), aumentando seu tamanho tanto no painel lateral (desktop) quanto no topo (mobile), sem alterar mais nada da tela.

## Mudanças

**1. Painel esquerdo (desktop, `md:` acima)**
- Logo atual: `h-24 w-24` (96px)
- Nova: `h-40 w-40` (160px), com glow/drop-shadow reforçado para maior destaque
- Título "UNIG-A" abaixo continua igual

**2. Bloco mobile (topo do formulário, visível em telas pequenas)**
- Logo atual: `h-20 w-20` (80px)
- Nova: `h-32 w-32` (128px), com drop-shadow um pouco mais forte
- Texto "UNIG-A" abaixo continua igual

## Fora de escopo
- Sidebar interna do app (já ajustada anteriormente)
- Cores, gradiente do painel, textos, cards de login e acessos rápidos
- Qualquer outra tela ou componente

## Arquivos afetados
- `src/pages/Auth.tsx` (apenas as duas tags `<img>` da logo)
