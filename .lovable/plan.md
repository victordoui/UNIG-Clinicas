## Objetivo
Remover a "caixa branca" atrás da logo. Deixá-la com fundo transparente e aplicar um **contorno/halo branco** só quando o fundo for escuro (sidebar azul, hero do login). Padronizar tamanho entre sidebar expandida e recolhida.

## Mudanças

### 1. Sidebar (`src/components/layout/Sidebar.tsx`)
- Remover o container `bg-white rounded-xl shadow-sm ring-1 ring-black/5`.
- Logo com fundo **transparente** sobre o azul, com **contorno branco** via `drop-shadow` empilhado:
  ```
  className="object-contain [filter:drop-shadow(0_0_1px_#fff)_drop-shadow(0_0_2px_#fff)_drop-shadow(0_1px_3px_rgba(0,0,0,0.25))]"
  ```
- **Padronizar tamanho** entre estados:
  - Expandida: `h-14 w-14`
  - Recolhida: `h-10 w-10` (mesmo contorno, mesma proporção — não mais uma "caixinha")
- Manter texto "UNIG-A / Portal Acadêmico" apenas no expandido.

### 2. Auth (`src/pages/Auth.tsx`)
- **Painel esquerdo (fundo azul gradiente)**: remover a caixa branca (`bg-white/95 ... border ... shadow-xl p-3`). Logo direta com o mesmo contorno branco (drop-shadow) para destacar sobre o azul. Tamanho `h-24 w-24`.
- **Bloco mobile (fundo claro)**: remover `bg-white border shadow-md p-2`. Logo transparente, **sem** contorno branco (fundo já é claro) — apenas um `drop-shadow` sutil escuro para leve profundidade. Tamanho `h-20 w-20`.

### 3. Header (`src/components/layout/Header.tsx`)
- Sem mudança visual (fundo claro, logo já aparece bem). Mantém `h-7 w-7`.

### 4. Install / Index
- Se usarem a logo sobre fundo claro, garantir que **não** tenham caixa branca; se sobre fundo escuro, aplicar o mesmo utilitário de contorno. Só ajustar se houver caixa branca hoje (verificar durante implementação, sem mudar layout).

## "Variações claro/escuro"
Sem gerar dois arquivos PNG diferentes. A logo PNG atual é usada em ambos os modos e o **contorno branco é aplicado condicionalmente via CSS** apenas quando o fundo é escuro (sidebar azul, hero do login). Isso evita duplicar assets e mantém consistência. Se depois você quiser uma versão monocromática branca, aí sim geramos um segundo arquivo — hoje não é necessário.

## Fora de escopo
Rotas, permissões, dados, cores da paleta, favicon, demais componentes.

## Validação
- Build local.
- Visual: sidebar expandida e recolhida (logo com halo branco, sem caixa), login desktop (halo sobre azul) e mobile (sem halo sobre fundo claro).
