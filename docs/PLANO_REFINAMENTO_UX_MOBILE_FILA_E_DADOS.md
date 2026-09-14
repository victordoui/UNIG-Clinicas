# Plano de refinamento — UX/UI, mobile, fila e dados

## Decisão de escopo

Este plano evolui o sistema existente. Não recria pacientes, filas, prontuários ou permissões já implementados. Cada fase deve manter o isolamento por clínica, o RLS e a separação entre dados administrativos e conteúdo clínico.

## Diagnóstico atual

| Frente | Estado atual | Lacuna confirmada |
| --- | --- | --- |
| Plano Mestre | Núcleo clínico, agenda, fila, painel TV, especialidades, portais e indicadores básicos entregues | Portais pendentes de migrations remotas; produção/hardening e testes ainda pendentes |
| Fila QR | QR identifica uma sessão, mostra a fila e emite senha para paciente autenticado e já vinculado | Não há entrada de visitante sem conta nem conversão posterior para cadastro |
| Recepção | Opera chamada, repetição, atendimento e drawer administrativo | Precisa de revisão de uso em telas pequenas e de fluxos de exceção |
| Painel TV | Exibe fila e recebe eventos em tempo real; som e tela cheia estão sendo refinados | Validação em TV/monitor físico ainda é necessária |
| Indicadores | KPIs por clínica, listas por serviço/supervisão, CSV e satisfação quando a função remota existir | Não há período analítico completo, tendências, metas ou gráficos de gestão |

## Princípios de produto

1. **Mobile primeiro para paciente e recepção.** Uma ação primária por tela, campos grandes, linguagem simples, teclado correto e nenhuma tabela que exija rolagem horizontal.
2. **Desktop primeiro para gestão e painel TV.** Gestão mantém filtros e comparações; painel preserva leitura à distância e nenhum dado clínico identificável além da senha.
3. **Cadastro progressivo.** Para entrar na fila, solicitar somente o mínimo necessário; enriquecer o cadastro depois, com benefício claro para a pessoa.
4. **Privacidade por padrão.** O visitante não recebe acesso a prontuário, lista de pacientes ou dados de terceiros. O token QR identifica apenas uma sessão aberta.
5. **Dados úteis, não apenas números.** Todo gráfico deve responder uma decisão de gestão: capacidade, espera, ausência, conversão, qualidade ou produtividade.

## Fase 0 — base e validação de produção

### Entregas

- Aplicar e validar as migrations remotas pendentes do portal do tutor e das avaliações pós-atendimento, na ordem documentada no Plano Mestre.
- Confirmar os acessos de teste por clínica e validar isolamento com pelo menos recepção, profissional, gestor, paciente e tutor.
- Confirmar que o painel TV recebe chamadas e repetições em uma TV/monitor real, com volume configurado no dispositivo.
- Inventariar as telas prioritárias e registrar viewport, tarefa principal, tempo de execução e falhas observadas.

### Critérios de aceite

- Nenhum perfil acessa paciente ou clínica fora do próprio escopo.
- Chamar e chamar novamente atualiza o painel e toca o aviso sem recarregar a tela.
- Fluxos prioritários funcionam em 360 px, 390 px, 768 px e desktop.

## Fase 1 — experiência mobile e acessibilidade

### Prioridade 1: jornadas externas

- **Entrada na fila por QR:** cabeçalho curto, resumo da sessão, tempo estimado quando disponível, uma ação por etapa e confirmação clara da senha.
- **Portal do paciente/tutor:** cartões de próximos compromissos, documentos e avisos; navegação inferior em celular; formulários em etapas.
- **Autenticação:** recuperação de senha e cadastro com campos curtos, máscara de telefone/CPF, mensagens de erro junto ao campo e suporte a preenchimento automático.

### Prioridade 2: operação interna

- **Recepção:** ações de chamar, repetir, iniciar e encerrar em área fixa no rodapé em celular; fila como cartões e não tabela; confirmação para ações irreversíveis.
- **Agenda e atendimento:** filtros em drawer, calendário em lista no celular e preservação do paciente/contexto ao alternar telas.
- **Gestão:** filtros recolhíveis, KPIs em carrossel ou grade de duas colunas e exportação acessível.

### Padrões obrigatórios

- Alvos de toque de no mínimo 44 × 44 px, contraste AA, foco visível e textos que não dependam apenas de cor.
- Campos com `autocomplete`, tipo de teclado correto (`tel`, `email`, `date`) e validação sem apagar o que a pessoa digitou.
- Carregamento, vazio, erro e sucesso desenhados para cada fluxo; sem depender de `alert` do navegador.
- Medição de layout nos viewports definidos e teste de teclado, leitor de tela e zoom de 200%.

## Fase 2 — entrada na fila sem conta e conversão para cadastro

### Jornada proposta

1. A pessoa abre o QR de uma sessão específica e escolhe **“Entrar como visitante”** ou **“Já tenho conta”**.
2. Visitante informa nome completo e celular; data de nascimento e CPF são opcionais, usados apenas para reduzir duplicidade quando fornecidos. Mostra-se o aviso de finalidade e o link de privacidade.
3. O servidor cria ou localiza uma pessoa/paciente administrativo vinculado exclusivamente à clínica da sessão, emite a senha e registra a origem `qr_guest`.
4. A tela mostra somente a senha, posição/estimativa se autorizada e o caminho para acompanhar a chamada.
5. Depois da emissão da senha e novamente após o atendimento, o sistema convida: **“Crie sua conta para acompanhar agenda, documentos e próximos atendimentos.”** A conta deve ser vinculada à mesma pessoa, sem criar duplicidade.

### Modelo de dados a evoluir

- Reutilizar `persons`, `patients`, `patient_clinic_links`, `queue_sessions`, `queue_tickets` e `queue_events`; não criar uma tabela paralela de pacientes temporários.
- Adicionar à senha a origem de entrada (`staff`, `qr_authenticated`, `qr_guest`) e, se necessário, ao paciente o estado de completude cadastral (`minimal`, `complete`).
- Criar um registro de consentimento administrativo específico para coleta de dados do visitante, sem misturá-lo ao consentimento clínico.
- Criar uma função transacional restrita para visitante: validar token/sessão/capacidade, normalizar telefone/documento, deduplicar de forma conservadora, vincular à clínica e emitir a senha em uma única transação.

### Segurança e prevenção de abuso

- A função pública retorna apenas senha e dados mínimos da sessão; nunca retorna listas de pacientes, CPF, telefone ou prontuário.
- Aplicar limite por token/IP/dispositivo no Edge Function ou gateway, CAPTCHA adaptativo após risco e bloqueio de repetição de senha ativa pelo mesmo contato.
- Não conceder `INSERT` anônimo direto em `persons`, `patients` ou `queue_tickets`; todo acesso público passa pela função transacional revisada.
- Registrar eventos de criação, deduplicação, falha de limite e conversão para conta em trilha de auditoria sem armazenar dados sensíveis no metadata.
- Revisar RLS, grants, Data API e retenção antes da publicação; executar matriz de testes anon/autenticado/recepção/gestor.

### Critérios de aceite

- Um visitante recebe uma senha válida sem criar conta.
- Dois envios equivalentes não produzem duas senhas ativas nem dois pacientes para a mesma pessoa.
- A conta criada posteriormente se vincula ao registro mínimo já existente.
- Nenhuma chamada anônima enumera pacientes ou acessa dados de outra clínica.

## Fase 3 — analytics e gráficos para gestão

### Painel executivo

- Filtros por período, unidade, clínica, serviço e especialidade; comparação com período anterior.
- KPIs: atendimentos realizados, taxa de ocupação, tempo médio/mediano de espera, abandono/no-show, capacidade usada, novos pacientes, retorno e satisfação.
- Alertas: espera acima da meta, fila próxima da capacidade, aumento de faltas, queda de satisfação e gargalo de supervisão.

### Gráficos prioritários

| Gráfico | Pergunta respondida | Fonte principal |
| --- | --- | --- |
| Linha de atendimentos por dia/semana | A demanda está crescendo ou caindo? | `appointments`, `encounters` |
| Barras de espera por hora e clínica | Em quais horários a fila precisa de reforço? | `queue_tickets`, `queue_events` |
| Funil de fila | Quantos entraram, foram chamados, compareceram e concluíram? | estados de `queue_tickets` |
| No-show e cancelamento | Onde há perda de agenda? | `appointments`, `queue_tickets` |
| Capacidade × utilização | A equipe/estrutura atende à demanda? | `queue_sessions`, atendimentos |
| Novos × recorrentes | O relacionamento está gerando retorno? | pacientes e atendimentos por período |
| Satisfação por clínica/serviço | Onde priorizar melhoria? | avaliações agregadas |
| Ensino e supervisão | Qual o volume e a carga de supervisão? | `student_supervisions`, `encounters` |

### Implementação técnica recomendada

- Criar RPCs ou views analíticas com `security_invoker = true` e agregação por período/escopo, em vez de carregar milhares de linhas no navegador.
- Incluir índices para filtros de data, clínica, serviço e status somente após medir as consultas reais.
- Exibir estado sem dados, intervalo selecionado, definição de cada métrica e exportação CSV no mesmo escopo do gráfico.
- Não expor identificação de pacientes nos gráficos executivos; usar somente agregados e limitar drill-down a papéis autorizados.

## Fase 4 — melhorias por área

### Todas as clínicas

- Lista de espera com oferta de encaixe e auditoria de contato.
- Lembretes configuráveis por canal, confirmação e redução de no-show.
- Preferências de comunicação, acessibilidade e idioma do paciente.
- Check-in por QR no local, sinalização de chegada e triagem administrativa.
- Pesquisa curta pós-atendimento e acompanhamento de recuperação de insatisfação.

### Odontologia

- Orçamento/plano com aceite, etapas e estimativa de custo.
- Linha do tempo visual do tratamento e lembrete de retorno preventivo.

### Fisioterapia

- Metas funcionais, escalas padronizadas e curva de evolução por sessão.
- Plano domiciliar com exercícios aprovados pelo profissional e registro de adesão.

### Estética

- Pacotes, sessões restantes, fotos com consentimento e comparação temporal protegida.
- Alertas de contraindicação e intervalo seguro entre procedimentos.

### Veterinária

- Carteira vacinal, lembretes de prevenção e portal de documentos do animal.
- Monitoramento de internação com atualizações autorizadas ao tutor.

### Gestão e ensino

- Metas por clínica e serviço, previsão simples de demanda e escala de equipe.
- Painel de supervisão: carga por professor, casos aguardando revisão e tempo de retorno.
- Auditoria pesquisável de ações administrativas e indicadores de qualidade de dados.

## Ordem de execução proposta

1. Validar migrations remotas, acessos de teste e painel TV em dispositivo real.
2. Fazer a rodada de UX mobile das jornadas QR, autenticação, recepção e agenda com protótipos/testes de tarefa.
3. Implementar a fila de visitante com a função transacional, limite de abuso, consentimento, RLS e matriz de testes.
4. Criar a camada agregada de dados e o primeiro painel com os seis gráficos prioritários.
5. Expandir os módulos específicos de cada clínica conforme métricas e responsáveis técnicos.
6. Fechar qualidade/produção: E2E, matriz RLS, MFA, backup/restauração, retenção LGPD e revisão institucional.

## Medidas de sucesso

- Entrada na fila no celular em até dois minutos, com taxa de abandono acompanhada.
- Redução mensurável do tempo de espera e no-show por clínica.
- Pelo menos 90% das tarefas prioritárias concluídas em teste mobile sem assistência.
- Conversão de visitante para conta medida e sem duplicação de cadastro.
- Gestores conseguem identificar demanda, capacidade e gargalos sem exportação manual.
