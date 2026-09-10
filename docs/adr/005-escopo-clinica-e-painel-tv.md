# ADR 005 — Escopo por clínica e painéis de chamada

## Decisão

O núcleo clínico permanece único, mas cada registro operacional recebe o
`clinic_id` apropriado. O acesso efetivo é decidido por RLS e pela combinação
de `user_roles` com `user_clinic_scopes`; a interface apenas reflete esse
escopo. Filas usam `queue_sessions` por clínica e cada TV abre o painel com a
clínica selecionada, atualizando a cada cinco segundos.

O painel TV mostra somente senha, estado da fila e contagem de espera. Nomes,
documentos e conteúdo do prontuário não são exibidos em tela pública.

## Consequências

- Um colaborador alocado em Odontologia não consegue consultar dados de Fisio,
  Vet ou Estética pela API, mesmo que tente alterar filtros no navegador.
- Usuários globais podem selecionar uma clínica para operar ou visualizar
  indicadores, enquanto contas clínicas ficam limitadas à sua alocação.
- A URL do painel pode ser configurada em cada dispositivo de TV sem duplicar
  sistemas ou tabelas.
- Qualquer novo módulo clínico deve carregar `clinic_id`, criar policies
  correspondentes e validar a matriz de acesso antes da publicação.
