# Roteiro de testes manuais — UNIG Clínicas

Use este roteiro em **homologação**, com contas e pacientes fictícios. Registre em cada caso: data, perfil usado, clínica, navegador/dispositivo, resultado esperado, resultado obtido e captura de tela/vídeo quando houver falha.

## 1. Preparação

- Confirmar que a URL, ambiente e banco exibidos são os de homologação, nunca produção.
- Criar ou separar contas de teste para: administrador, gestor de unidade, recepção/atendimento, professor, aluno, paciente e tutor.
- Preparar uma clínica por especialidade e uma fila de teste com ao menos quatro senhas fictícias.
- Usar dois navegadores ou dispositivos para testar recepção e Painel TV ao mesmo tempo.
- Testar em janela normal e anônima, com cache limpo, nos navegadores Chrome e Edge atuais.

## 2. Acesso, sessão e permissões

| Teste | Resultado esperado |
| --- | --- |
| Login com cada perfil | Entra somente nas páginas permitidas para seu papel. |
| Tentativa de abrir uma rota restrita pela URL | Acesso bloqueado ou redirecionado; dados não aparecem. |
| Logout | A sessão termina e páginas protegidas não ficam acessíveis pelo botão Voltar. |
| Sessão expirada ou aba reaberta | O sistema pede autenticação sem tela quebrada. |
| Troca de clínica ativa | Dados, fila e menu passam a refletir somente a clínica escolhida. |
| Troca de perfil em outro navegador | Não mistura permissões, dados ou clínica da outra conta. |

## 3. Sidebar e navegação

| Teste | Resultado esperado |
| --- | --- |
| Expandir dois ou mais módulos | Todos ficam abertos ao mesmo tempo. |
| Abrir um módulo e navegar por seus itens | O módulo permanece aberto até o usuário clicar nele para fechar. |
| Fechar um módulo, trocar de página e voltar | Ele continua fechado; não reabre sozinho por causa da rota ativa. |
| Atualizar o navegador | A preferência de módulos abertos/fechados é mantida para aquele perfil. |
| Clicar em Fila e Agenda | O item correto fica destacado, mesmo usando a mesma página com seções diferentes. |
| Rolar a sidebar e clicar em um item inferior | Só o conteúdo principal troca; não há piscar de tela nem retorno inesperado da rolagem. |
| Recolher a sidebar e abrir um módulo pelo ícone | A barra expande e o módulo selecionado fica aberto. |
| Mobile/tablet | O menu fecha ao abrir uma página, mas a preferência de módulos permanece para a próxima abertura. |
| Mudar a clínica enquanto há módulos abertos | Itens incompatíveis somem sem travar, duplicar ou alterar a página atual. |

## 4. Novo módulo “Painéis e mídia”

| Teste | Resultado esperado |
| --- | --- |
| Localizar o módulo na sidebar | Ele aparece em **Comunicação**, separado de Atendimento. |
| Abrir “Painel de chamadas” | Direciona para `/painel-tv`. |
| Abrir “Campanhas institucionais” | Direciona para `/painel-tv/campanhas` e mostra a estrutura do futuro módulo. |
| Revisar a tela de campanhas | Nenhuma propaganda fictícia é criada, enviada ou exibida. |
| Validar acesso por perfil | Perfis sem permissão não devem enxergar ou acessar a futura gestão de campanhas quando a regra de publicação for implementada. |

## 5. Fila e recepção — fluxo ponta a ponta

| Teste | Resultado esperado |
| --- | --- |
| Abrir fila para uma clínica | A fila fica disponível apenas para a clínica e data selecionadas. |
| Gerar senha por visitante | Número, prioridade e posição são coerentes; dados obrigatórios são validados. |
| Inserir o mesmo documento/e-mail novamente | O sistema trata a duplicidade conforme a regra definida, sem gerar atendimento duplicado indevido. |
| Chamar próximo | A senha correta muda para chamada, o painel atualiza e a próxima posição é recalculada. |
| Chamar novamente a mesma senha | A mesma senha é anunciada outra vez sem avançar a fila nem criar novo atendimento. |
| Iniciar atendimento | Apenas a senha chamada pode iniciar; cronômetro e responsável ficam registrados. |
| Salvar andamento | Observações e destino persistem após atualizar a página. |
| Encerrar atendimento | Status final, histórico e opção de chamar a próxima senha obedecem à ação escolhida. |
| Fechar a fila | Novas entradas são bloqueadas com mensagem clara; atendimentos já iniciados seguem a regra definida. |
| Duas clínicas simultâneas | Nenhuma senha, chamado ou contagem vaza entre as clínicas. |
| Dois atendentes na mesma fila | Não há chamada duplicada ou disputa silenciosa ao clicar quase ao mesmo tempo. |
| Atualização em tempo real | Uma ação na recepção aparece no painel e na outra sessão sem recarregar manualmente. |

## 6. QR da fila e conversão para conta

| Teste | Resultado esperado |
| --- | --- |
| Abrir QR em aba anônima | Mostra a clínica/fila correta e não exige sessão para a etapa pública permitida. |
| Enviar dados válidos | A senha é criada uma única vez e a posição é mostrada. |
| Campos inválidos, limite de caracteres e falha de rede | Validação clara, sem perda silenciosa ou duplicidade. |
| E-mail já cadastrado | Mensagem segura; não revela dados da conta existente. |
| Criar/confirmar conta após entrada na fila | A senha e o histórico permanecem associados ao paciente correto. |
| Token inválido, expirado ou de outra clínica | Não expõe fila nem dados internos. |

## 7. Painel TV em monitor físico

| Teste | Resultado esperado |
| --- | --- |
| Abrir o painel no segundo dispositivo | A clínica selecionada e o estado inicial são claros. |
| Chamada nova e rechamada | A senha exibida, animação e anúncio correspondem ao evento recebido. |
| Áudio | O som de chamada toca alto o suficiente no equipamento da TV após a permissão inicial do navegador; testar também uma rechamada. |
| Bloqueio automático de áudio do navegador | A tela informa de forma objetiva como liberar som, sem depender de um botão de desligar áudio no painel. |
| Tela cheia | O comando de tela cheia é acionado após interação do operador; validar saída com `Esc`. Navegadores não permitem apertar `F11` automaticamente por segurança. |
| Resolução e zoom | Testar 1366x768, 1920x1080 e 4K; números, contraste e relógio devem permanecer legíveis sem barras importantes cortadas. |
| Queda e retorno de conexão | Painel indica reconexão e volta a receber a próxima chamada sem dados antigos incorretos. |
| Privacidade | Exibe somente senha e instrução necessária; não mostra CPF, telefone, prontuário ou dados clínicos. |

## 8. Paciente, tutor e atendimento clínico

| Teste | Resultado esperado |
| --- | --- |
| Portal do paciente | Vê somente seu próprio perfil, histórico, documentos e solicitações permitidas. |
| Portal do tutor | Vê somente os animais e dados vinculados à sua conta. |
| Prontuário, anamnese e planos | Salvar, editar, cancelar e voltar não perde ou duplica dados. |
| Especialidades | Dados de Odonto, Fisio, Vet e Estética ficam segregados pela clínica. |
| Documentos e consentimentos | Arquivo, versão, data e aceite permanecem rastreáveis. |
| Estoque/procedimentos | Permissões e alterações refletem o usuário responsável. |

## 9. Segurança, LGPD e auditoria

| Teste | Resultado esperado |
| --- | --- |
| Alterar URL/ID de paciente manualmente | Nunca retorna registro de outro paciente, clínica ou tutor. |
| Consultas em telas administrativas | Perfil não autorizado não lê dados pelo front-end nem por chamadas de rede. |
| Dados sensíveis no Painel TV e QR | Não aparecem em URL, mensagens de erro, logs visíveis ou tela pública. |
| Ações relevantes | Chamada, rechamada, início, encerramento e alterações críticas ficam auditáveis com usuário e horário. |
| Arquivos enviados | Tipo, tamanho, permissão de acesso e remoção seguem a política definida. |

## 10. Qualidade de uso e regressão

| Teste | Resultado esperado |
| --- | --- |
| Desktop, tablet e celular | Layout não sobrepõe botões, textos ou rodapé; formulários continuam utilizáveis. |
| Zoom do navegador em 100%, 125%, 150% e 200% | Conteúdo principal e ações críticas continuam acessíveis. |
| Teclado | Tab, Enter, Esc e foco visível funcionam em menu, modal, formulário e tela cheia. |
| Leitor de tela básico | Botões, campos, erros e ícones têm nomes compreensíveis. |
| Navegação repetida por 10–15 minutos | Sem tela piscando, recarregamento completo, perda de scroll ou aumento perceptível de lentidão. |
| Erro de API/rede | Mensagem acionável, possibilidade de tentar novamente e nenhum estado enganoso de “salvo”. |

## Critério para aprovar uma rodada

Não aprovar enquanto houver falha que permita vazamento entre clínicas/pessoas, chamada ou encerramento duplicado, perda de prontuário, acesso indevido, painel expondo dados pessoais ou bloqueio da recepção. Itens visuais devem entrar em uma lista de refinamento com imagem, rota, perfil, tamanho de tela e passo para reproduzir.
