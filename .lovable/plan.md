## Objetivo
Aumentar a logo na sidebar e remover o texto "UNIG-A / Portal Acadêmico" que aparece abaixo dela.

## Mudanças

### `src/components/layout/Sidebar.tsx`
- **Aumentar a logo**:
  - Expandida: de `h-14 w-14` → `h-24 w-24`
  - Recolhida: de `h-10 w-10` → `h-12 w-12` (mantém caber no modo icon)
- **Remover** o bloco de texto abaixo da logo (`<span>UNIG-A</span>` + `<span>Portal Acadêmico</span>`).
- Manter o mesmo contorno branco (drop-shadow) já aplicado.
- Manter padding do header consistente.

## Fora de escopo
Header, Auth, Install, cores, rotas, permissões, dados, demais componentes.

## Validação
Visual: sidebar expandida (logo grande, sem texto) e recolhida (logo proporcional, com halo branco).
