# Matriz de validação — refinamento UX, fila e dados

Use uma conta e uma clínica de homologação. Não execute estes cenários com dados reais sem autorização institucional. Registre data, ambiente, perfil, clínica, viewport, resultado e evidência em cada execução.

## Viewports e acessibilidade

| Tela | 360 px | 390 px | 768 px | Desktop | Critério |
| --- | --- | --- | --- | --- | --- |
| Fila QR | obrigatório | obrigatório | obrigatório | obrigatório | Sem rolagem horizontal; nome, telefone, consentimento e emissão de senha legíveis. |
| Autenticação | obrigatório | obrigatório | obrigatório | obrigatório | Cadastro, recuperação e mensagens de erro preservam valores digitados. |
| Recepção operacional | obrigatório | obrigatório | obrigatório | obrigatório | Ações têm pelo menos 44 px; barra permanece acessível; encerramento pede confirmação. |
| Agenda/Fila/Espera | obrigatório | obrigatório | obrigatório | obrigatório | Filtros e formulários não cortam conteúdo; cartões substituem tabela em celular. |
| Pacientes | obrigatório | obrigatório | obrigatório | obrigatório | Cartões mobile e editor de preferências funcionam sem zoom lateral. |
| Indicadores | — | — | obrigatório | obrigatório | Gráficos têm período/escopo claros e não mostram dados identificáveis. |
| Painel TV | — | — | — | obrigatório | Senha legível a distância; sem nome, prontuário ou diagnóstico. |

Em cada viewport, testar teclado, zoom de 200%, foco visível e leitor de tela para botões, inputs e diálogos.

## Matriz por papel e isolamento

| Perfil | Escopo permitido | Verificação obrigatória |
| --- | --- | --- |
| Recepção | Própria clínica | Abrir fila, emitir/chamar/repetir senha, iniciar/encerrar recepção e registrar lista de espera. Não consulta prontuário clínico de outra clínica. |
| Profissional | Própria clínica | Consulta agenda e registra somente conteúdos clínicos autorizados. Não altera configurações administrativas. |
| Gestor | Clínicas atribuídas | Consulta indicadores agregados e exporta apenas o escopo permitido. |
| Paciente | Própria pessoa | Consulta agenda, documentos e avisos próprios; não vê outro paciente nem dados de clínica sem vínculo. |
| Tutor | Próprios animais | Consulta animais, vacinas, documentos e avaliações autorizadas; não vê animais de terceiros. |
| Anônimo | Sessão QR específica | Só consulta a sessão pública e emite uma senha de visitante. Não enumera paciente, telefone, CPF, prontuário ou outra clínica. |

## Cenários de fila

1. Abrir uma sessão com QR, capacidade e janela de horário.
2. Emitir senha autenticada e confirmar que o painel atualiza sem recarga.
3. Emitir senha de visitante; repetir o envio com o mesmo contato e confirmar que não cria segunda senha ativa.
4. Chamar uma senha, chamar novamente e confirmar que a mesma senha é anunciada, sem avançar a fila.
5. Iniciar e encerrar atendimento; confirmar evento de auditoria e próximo destino.
6. Encerrar fila pelo celular e confirmar que o diálogo exige confirmação.
7. Incluir uma pessoa na lista de espera, registrar oferta, aceite e recusa; confirmar trilha de contato.
8. Emitir senha de visitante com e-mail opcional, criar a conta com o mesmo e-mail, confirmar o e-mail e verificar que o cadastro mínimo foi vinculado sem duplicar pessoa ou senha.
9. Repetir o cenário anterior com e-mail já associado a mais de um cadastro mínimo e confirmar que o sistema recusa o vínculo ambíguo.

## Registro de execução

| Data/hora | Ambiente | Perfil | Clínica | Tela/cenário | Viewport/dispositivo | Resultado | Evidência | Responsável |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
|  | Homologação |  |  |  |  | Aprovado / Reprovado | URL, captura ou ID de auditoria |  |

## Cobertura automatizada local

Sem criar contas, senhas ou atendimentos, os testes unitários cobrem as regras puras que antecedem as RPCs: validação de visitante, normalização de telefone, e-mail opcional, escolha de clínica ativa em conta multi-clínica e estados permitidos para rechamada. O E2E local cobre a autenticação em 360, 390, 768 e desktop, zoom de 200%, navegação por teclado, proteção do Painel TV e dos portais sem sessão, além da validação e emissão simulada de senha por QR. Isso não substitui a matriz de homologação, RLS, integração das RPCs ou o dispositivo físico; registra somente a cobertura que pode ser executada localmente com `npm test` e `npm run test:e2e`.

Para contas de teste, use somente a homologação e contas criadas especificamente para a matriz. Não reutilize senhas conhecidas, dados pessoais reais ou a migration de demonstração em produção.

## Painel TV em dispositivo físico

1. Abrir o Painel TV em TV/monitor real pelo navegador suportado.
2. Usar o botão de tela cheia; o navegador não permite acionar `F11` por código.
3. Fazer a primeira interação manual no painel para liberar áudio, conforme a política de autoplay do navegador.
4. Ajustar volume do dispositivo e chamar/repetir uma senha na recepção.
5. Confirmar que o som alto é reproduzido e que não existe controle de desligar som na tela pública.
6. Registrar modelo do dispositivo, navegador, resolução, volume, data e resultado.

## Critérios de bloqueio de publicação

- Qualquer acesso cruzado entre clínicas ou pacientes.
- Falha de RLS, permissão, auditoria ou consentimento na entrada de visitante.
- Painel TV sem atualização em tempo real ou sem anúncio após interação inicial.
- Fluxo prioritário quebrado em 360 px ou com alvo de toque menor que 44 px.
- MFA, backup/restauração, política de retenção e proteção contra senhas vazadas sem validação institucional.
- Conversão de visitante que crie duplicidade ou vincule uma conta a paciente diferente do titular confirmado.
