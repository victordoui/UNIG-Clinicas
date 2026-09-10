# UNIG Clínicas

Plataforma institucional para atendimento, agenda, fila, prontuário,
supervisão acadêmica e gestão das clínicas universitárias da UNIG.

## Stack

- React 18 + TypeScript + Vite
- React Router, TanStack Query e shadcn/ui/Radix
- Supabase Auth, Postgres, RLS, Storage e Edge Functions
- PWA com Workbox

## Executar localmente

1. Copie `.env.example` para `.env.local` e informe a URL do projeto e a chave **publishable** do Supabase.
2. Instale as dependências com `npm ci`.
3. Inicie com `npm run dev`.

O servidor local usa a porta configurada pelo processo de desenvolvimento (neste ambiente: `5173`).

## Validação

```bash
npm run typecheck
npm run lint -- --quiet
npm run build
```

O workflow em `.github/workflows/ci.yml` executa os três comandos em todo push e pull request para `main`.

## Acessos de demonstração

A tela `/auth` organiza os acessos rápidos por clínica. Todas as contas abaixo
usam `unig1234` somente no ambiente de teste:

- Administração: `super-admin@unig.demo` e `organization-admin@unig.demo`.
- Clínica: `clinic-manager-{odonto|fisio|vet|estetica}@unig.demo`,
  `clinician-{odonto|fisio|vet|estetica}@unig.demo` e
  `receptionist-{odonto|fisio|vet|estetica}@unig.demo`.
- Acadêmico Odonto: `academic-supervisor-odonto@unig.demo` e `student-odonto@unig.demo`.
- Auditoria transversal: `auditor@unig.demo`.

As contas clínicas são limitadas por RLS à clínica indicada. Não reutilize as
contas ou a senha em produção.

## Operação por clínica

- `/agenda-fila`: agenda e fila operacional com clínica selecionável.
- `/fila/qr/<token>`: entrada pública por QR de uma sessão específica; o token é validado no Supabase antes da identificação.
- `/painel-tv?clinic=<clinic_id>`: painel de chamada dedicado para uma clínica,
  com atualização automática e sem nomes ou conteúdo de prontuário.
- `/indicadores-clinicos`: indicadores agregados ou filtrados por clínica.
- `/portal/paciente` e `/portal/tutor`: shells de portal protegidos por papel e vínculo de identidade.

## Supabase

O projeto vinculado é `hhwsqzaookfohqygihyc`. As migrations clínicas novas são
reversíveis e mantêm o legado preservado. Nunca commit chaves secret/service
role; a aplicação web deve usar somente a chave publishable.

Consulte [supabase/README.md](supabase/README.md),
[docs/PRODUCAO_CHECKLIST.md](docs/PRODUCAO_CHECKLIST.md) e os
[ADRs](docs/adr/) antes de promover o ambiente. O acompanhamento detalhado do
Plano Mestre está em [docs/PLANO_MESTRE_STATUS.md](docs/PLANO_MESTRE_STATUS.md).
## Publicação no Netlify

Antes de publicar, configure no Netlify (em **Site configuration → Environment variables**) as variáveis abaixo para os contextos de produção e preview:

- `VITE_SUPABASE_URL`: URL do projeto Supabase.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: chave pública/publicável do projeto Supabase.

Use `.env.example` como referência. Essas variáveis são incorporadas no build; após cadastrá-las, execute um novo deploy.
