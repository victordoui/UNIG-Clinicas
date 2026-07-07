## Objetivo
Após publicar uma nova versão, o app deve **detectar automaticamente** e mostrar um **banner "Atualizar agora"** com feedback visual (spinner "Carregando atualização...") durante o reload. Corrigir também a configuração PWA atual, que atualiza silenciosamente e pode servir HTML em cache stale.

## Diagnóstico do estado atual
- `vite.config.ts` usa `VitePWA` com `registerType: 'autoUpdate'` + `skipWaiting: true` + `clientsClaim: true` + `injectRegister` padrão (auto) + `devOptions.enabled: true`.
- Não existe wrapper de registro guardado nem UI de update — a atualização acontece sem aviso ao usuário e sem garantia contra HTML stale.
- Isso conflita com o padrão recomendado (skill/pwa): dev/preview não devem registrar SW, e navegações HTML devem ser NetworkFirst.

## Mudanças

### 1. `vite.config.ts` — PWA configurado para prompt controlado
- `registerType: 'autoUpdate'` mantido.
- **Adicionar** `injectRegister: null` (registramos manualmente pelo wrapper).
- **Adicionar** `strategies: 'generateSW'` (mantém geração automática).
- **Remover** `skipWaiting: true` e `clientsClaim: true` do bloco `workbox` (o novo SW só ativa quando o usuário clicar em "Atualizar", evitando reload no meio da digitação).
- **Definir** `devOptions.enabled: false` (não registra SW em dev/preview).
- **Adicionar** em `workbox.runtimeCaching` uma entrada `NetworkFirst` para navegações HTML (`navigateFallback` já cobre offline; a runtime rule garante busca da versão nova primeiro).
- Manter demais opções (icons, manifest, glob patterns, supabase/images/fonts caches).

### 2. Wrapper de registro guardado — `src/pwa/registerSW.ts`
Novo arquivo. Usa `useRegisterSW` do `virtual:pwa-register/react`. Wrapper recusa registro quando:
- `!import.meta.env.PROD`
- dentro de iframe (`window.top !== window.self`)
- hostname começa com `id-preview--` ou `preview--`
- hostname é/termina em `lovableproject.com`, `lovableproject-dev.com`, `beta.lovable.dev`
- URL tem `?sw=off` → também faz `unregister()` de qualquer SW `/sw.js` existente

Expõe hook `usePwaUpdate()` que retorna `{ needRefresh, updating, update() }` — `update()` chama `updateServiceWorker(true)` e seta `updating=true`.

### 3. Componente `src/components/pwa/UpdateBanner.tsx`
- Consome `usePwaUpdate()`.
- Se `needRefresh` e não `updating`: renderiza banner fixo no rodapé (mobile) / topo-direita (desktop) usando `Alert` shadcn:
  - Texto: "Nova versão do sistema disponível."
  - Botão primário "Atualizar agora" → chama `update()`.
  - Botão secundário "Depois" (fecha o banner até próxima detecção).
- Se `updating`: renderiza overlay tela cheia com `Loader2` girando + texto "Carregando atualização..." até o reload acontecer.
- Estilo alinhado ao design system (tokens semânticos, sem cores hardcoded).

### 4. `src/App.tsx`
- Importar wrapper para efeito de registro (`import '@/pwa/registerSW'` no topo).
- Montar `<UpdateBanner />` uma única vez dentro do provider raiz (ao lado do `<Toaster />`).

### 5. Limpeza
- Remover pasta `dev-dist/` (artefato antigo do `devOptions.enabled: true` que agora é `false`; será regenerada só se preciso).

## Fora de escopo
Rotas, permissões, dados, layout, Sidebar/Header/Auth, cores, favicon, ícones. Nada de mudar business logic.

## Validação
- Build local do Vite gera `sw.js` sem erros.
- Preview (`id-preview--*`) e dev: SW **não** registra (verificar em DevTools → Application → Service Workers vazio).
- Publicado: após novo deploy, o banner aparece em uma sessão aberta; ao clicar em "Atualizar agora", o overlay de "Carregando atualização..." aparece e o app recarrega já na versão nova.
- `?sw=off` desregistra o SW corrente.
