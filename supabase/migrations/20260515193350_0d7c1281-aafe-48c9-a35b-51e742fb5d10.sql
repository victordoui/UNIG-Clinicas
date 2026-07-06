
DO $$
DECLARE
  v_org uuid := 'b3bf86a2-5856-4d8e-93b4-9388d126bab7';
  u_admin uuid := 'baf2cc34-daca-4906-8a35-85973366e4ad';
  u_victor uuid := 'a7f898f2-6dc8-419c-95dc-676c6579163b';
  u_compras uuid := '869200f9-d76b-439a-84cf-4d63f9267f18';
  u_almox uuid := '85cc7167-92ec-48bd-a510-e089b3eb5820';
  u_almoxni uuid := 'aa7c87e2-7275-46b5-9571-82b2dd96af1b';
  p1 uuid; p2 uuid; p3 uuid; p4 uuid; p5 uuid;
  p6 uuid; p7 uuid; p8 uuid; p9 uuid; p10 uuid;
BEGIN
  INSERT INTO public.council_members (organization_id, user_id, ativo, created_by)
  VALUES
    (v_org, u_admin, true, u_admin),
    (v_org, u_victor, true, u_admin),
    (v_org, u_compras, true, u_admin),
    (v_org, u_almox, true, u_admin),
    (v_org, u_almoxni, true, u_admin)
  ON CONFLICT (organization_id, user_id) DO UPDATE SET ativo = true;

  -- 1: APROVADA UNÂNIME
  INSERT INTO public.council_proposals (organization_id, created_by, titulo, justificativa, location, status, total_membros, min_votos_aprovacao, decidido_em, created_at)
  VALUES (v_org, u_compras,
    '[TESTE] Cadeiras ergonômicas Herman Miller — Diretoria',
    'A diretoria executiva relatou desconforto físico recorrente após longas reuniões e jornadas administrativas. As atuais cadeiras possuem mais de 8 anos de uso e apresentam falhas mecânicas (regulagem travada, espuma comprimida). Estudos de ergonomia da NR-17 reforçam que mobiliário inadequado eleva afastamentos por LER/DORT em até 32%. A aquisição de 6 cadeiras Herman Miller Aeron é o padrão internacional para postos críticos e tem garantia estendida de 12 anos. ROI estimado em 18 meses considerando redução de absenteísmo.',
    'Diretoria — Matriz', 'aprovada', 5, 3, now() - interval '20 days', now() - interval '28 days')
  RETURNING id INTO p1;
  INSERT INTO public.council_proposal_quotes (proposal_id, posicao, fornecedor, valor_unit, qtd, frete, condicoes) VALUES
    (p1, 1, 'Herman Miller Brasil Oficial', 12500, 6, 850, 'À vista • Entrega 25d • Garantia 12 anos'),
    (p1, 2, 'Officemix Mobiliário Corporativo', 13200, 6, 1200, '3x sem juros • Entrega 30d'),
    (p1, 3, 'Flexform SP', 13800, 6, 0, 'Boleto 30 dias • Entrega 20d');
  INSERT INTO public.council_votes (proposal_id, membro_user_id, voto, comentario, votado_em) VALUES
    (p1, u_admin, 'aprovado', 'Atende plenamente. Fornecedor oficial com nota fiscal e garantia estendida. Aprovo.', now() - interval '22 days'),
    (p1, u_victor, 'aprovado', 'Investimento justificado pelo risco ergonômico. Aprovo a primeira cotação.', now() - interval '21 days'),
    (p1, u_compras, 'aprovado', 'Cotação 1 já é a mais econômica e tem o melhor prazo. Aprovado.', now() - interval '21 days'),
    (p1, u_almox, 'aprovado', 'Sem ressalvas operacionais. Aprovo.', now() - interval '20 days'),
    (p1, u_almoxni, 'aprovado', 'Aprovo. Solicito que o recebimento seja agendado com antecedência.', now() - interval '20 days');

  -- 2: APROVADA COM ABSTENÇÃO
  INSERT INTO public.council_proposals (organization_id, created_by, titulo, justificativa, location, status, total_membros, min_votos_aprovacao, decidido_em, created_at)
  VALUES (v_org, u_compras,
    '[TESTE] Servidor Dell PowerEdge R760 — Datacenter SP',
    'Substituição do servidor principal de aplicações ERP que opera há 6 anos e atingiu 92% de uso de CPU em horários de pico. O equipamento atual está fora de garantia e a Dell não oferece mais peças de reposição. A nova máquina tem o dobro de núcleos, 256GB RAM ECC e SSD NVMe em RAID 10. Estimativa de redução de 40% no tempo de processamento de relatórios financeiros mensais. Migração planejada para janela noturna sem impacto operacional.',
    'TI — Datacenter São Paulo', 'aprovada', 5, 3, now() - interval '15 days', now() - interval '24 days')
  RETURNING id INTO p2;
  INSERT INTO public.council_proposal_quotes (proposal_id, posicao, fornecedor, valor_unit, qtd, frete, condicoes) VALUES
    (p2, 1, 'Dell Technologies Brasil', 87500, 1, 0, '10x sem juros • Garantia 5 anos ProSupport • Entrega 15d'),
    (p2, 2, 'TechBiz Distribuidora', 91200, 1, 450, 'Boleto 30/60/90 • Garantia 3 anos • Entrega 10d'),
    (p2, 3, 'Servix Informática', 89900, 1, 280, 'À vista • Garantia 3 anos • Entrega 20d');
  INSERT INTO public.council_votes (proposal_id, membro_user_id, voto, comentario, votado_em) VALUES
    (p2, u_admin, 'aprovado', 'Crítico para continuidade. Aprovo cotação Dell pela garantia ProSupport.', now() - interval '18 days'),
    (p2, u_victor, 'aprovado', 'Aprovo. Risco de falha do servidor atual é alto demais para postergar.', now() - interval '17 days'),
    (p2, u_compras, 'aprovado', 'Cotação 1 tem melhor TCO em 5 anos. Aprovado.', now() - interval '16 days'),
    (p2, u_almox, 'abstencao', 'Não tenho competência técnica para avaliar especificações. Abstenho-me.', now() - interval '16 days'),
    (p2, u_almoxni, 'aprovado', 'Aprovo conforme parecer do TI.', now() - interval '15 days');

  -- 3: APROVADA DIVIDIDA
  INSERT INTO public.council_proposals (organization_id, created_by, titulo, justificativa, location, status, total_membros, min_votos_aprovacao, decidido_em, created_at)
  VALUES (v_org, u_compras,
    '[TESTE] Reforma do refeitório — Filial Nova Iguaçu',
    'O refeitório atual atende 120 colaboradores em 3 turnos e apresenta infiltrações no teto, piso desnivelado e bancadas em mau estado. A Vigilância Sanitária emitiu notificação preventiva no último relatório. A reforma contempla: troca de revestimentos, nova bancada em granito, sistema de exaustão, climatização e adequação às normas ANVISA RDC 216. Prazo total: 45 dias com atendimento em refeitório provisório.',
    'Refeitório — Nova Iguaçu', 'aprovada', 5, 3, now() - interval '10 days', now() - interval '20 days')
  RETURNING id INTO p3;
  INSERT INTO public.council_proposal_quotes (proposal_id, posicao, fornecedor, valor_unit, qtd, frete, condicoes) VALUES
    (p3, 1, 'Construtora Bandeirantes Eireli', 145000, 1, 0, 'Boleto 30/60/90 • Prazo 45d • ART incluída'),
    (p3, 2, 'Reform&Cia Engenharia', 138500, 1, 0, '6x sem juros • Prazo 60d • ART incluída'),
    (p3, 3, 'Construbase RJ', 162000, 1, 0, 'À vista • Prazo 35d • ART e seguro incluídos'),
    (p3, 4, 'M.J. Reformas Comerciais', 154200, 1, 0, '3x sem juros • Prazo 40d');
  INSERT INTO public.council_votes (proposal_id, membro_user_id, voto, comentario, votado_em) VALUES
    (p3, u_admin, 'aprovado', 'Aprovo. Risco sanitário e legal não pode ser postergado.', now() - interval '15 days'),
    (p3, u_victor, 'rejeitado', 'Valor alto para o momento. Sugiro paliativo até próximo trimestre.', now() - interval '14 days'),
    (p3, u_compras, 'aprovado', 'Cotação 2 tem melhor custo-benefício. Aprovado.', now() - interval '13 days'),
    (p3, u_almox, 'aprovado', 'Aprovo. Refeitório atual é constrangedor para os colaboradores.', now() - interval '12 days'),
    (p3, u_almoxni, 'rejeitado', 'Discordo do escopo. Acredito que reforma parcial atenderia.', now() - interval '11 days');

  -- 4: REPROVADA (1x4)
  INSERT INTO public.council_proposals (organization_id, created_by, titulo, justificativa, location, status, total_membros, min_votos_aprovacao, decidido_em, created_at)
  VALUES (v_org, u_compras,
    '[TESTE] Frota de 8 notebooks Lenovo ThinkPad X1 — TI',
    'Solicitação para substituir 8 notebooks da equipe de desenvolvimento. Os equipamentos atuais têm em média 2,5 anos e ainda estão dentro da garantia padrão. Modelo proposto: ThinkPad X1 Carbon Gen 11, i7-1365U, 32GB RAM, 1TB SSD. Valor unitário considerável.',
    'TI — Desenvolvimento', 'reprovada', 5, 3, now() - interval '8 days', now() - interval '18 days')
  RETURNING id INTO p4;
  INSERT INTO public.council_proposal_quotes (proposal_id, posicao, fornecedor, valor_unit, qtd, frete, condicoes) VALUES
    (p4, 1, 'Lenovo Brasil Oficial', 14800, 8, 0, '12x com juros • Garantia 3 anos • Entrega 20d'),
    (p4, 2, 'Kabum Empresas', 13950, 8, 350, '10x sem juros • Garantia 1 ano • Entrega 7d'),
    (p4, 3, 'Officer Distribuidora', 14500, 8, 0, 'Boleto 30 dias • Garantia 2 anos • Entrega 15d');
  INSERT INTO public.council_votes (proposal_id, membro_user_id, voto, comentario, votado_em) VALUES
    (p4, u_admin, 'rejeitado', 'Notebooks atuais ainda estão sob garantia. Reprovo até próximo ciclo de renovação.', now() - interval '14 days'),
    (p4, u_victor, 'rejeitado', 'Não há justificativa técnica suficiente. Solicitar laudo de obsolescência.', now() - interval '13 days'),
    (p4, u_compras, 'aprovado', 'Vejo benefício em produtividade. Aprovo.', now() - interval '12 days'),
    (p4, u_almox, 'rejeitado', 'Reprovo. Investimento elevado sem urgência demonstrada.', now() - interval '10 days'),
    (p4, u_almoxni, 'rejeitado', 'Concordo com os pareceres. Reprovado.', now() - interval '9 days');

  -- 5: REPROVADA (2x3)
  INSERT INTO public.council_proposals (organization_id, created_by, titulo, justificativa, location, status, total_membros, min_votos_aprovacao, decidido_em, created_at)
  VALUES (v_org, u_compras,
    '[TESTE] Aquisição de van utilitária Fiat Ducato — Logística',
    'Atualmente terceirizamos entregas urbanas a R$ 18.500/mês. A aquisição de uma Fiat Ducato Cargo Maxi 2024 permitiria internalizar o serviço, com motorista próprio. Análise de payback: 36 meses. Inclui adaptação para câmara fria, IPVA, seguro anual e manutenção preventiva.',
    'Logística — Matriz', 'reprovada', 5, 3, now() - interval '5 days', now() - interval '14 days')
  RETURNING id INTO p5;
  INSERT INTO public.council_proposal_quotes (proposal_id, posicao, fornecedor, valor_unit, qtd, frete, condicoes) VALUES
    (p5, 1, 'Fiat Concessionária Norte', 245000, 1, 0, '10x sem juros • Entrega 45d • IPVA 2026 grátis'),
    (p5, 2, 'Stellantis Frotas', 238000, 1, 0, 'À vista • Entrega 30d • Garantia estendida 5 anos'),
    (p5, 3, 'Saga Veículos Comerciais', 252500, 1, 0, '12x com juros • Entrega 20d');
  INSERT INTO public.council_votes (proposal_id, membro_user_id, voto, comentario, votado_em) VALUES
    (p5, u_admin, 'aprovado', 'Internalização traz controle e redução de custo no longo prazo. Aprovo.', now() - interval '12 days'),
    (p5, u_victor, 'rejeitado', 'Payback de 36 meses é longo demais. Reprovo.', now() - interval '11 days'),
    (p5, u_compras, 'aprovado', 'Aprovo. Tercerização tem reajustado 12% ao ano.', now() - interval '10 days'),
    (p5, u_almox, 'rejeitado', 'Não temos estrutura de manutenção própria. Reprovo.', now() - interval '8 days'),
    (p5, u_almoxni, 'rejeitado', 'Reprovo. Custo total de propriedade subestimado na proposta.', now() - interval '6 days');

  -- 6: EM VOTAÇÃO (2 aprov, 1 rej, 2 pendentes)
  INSERT INTO public.council_proposals (organization_id, created_by, titulo, justificativa, location, status, total_membros, min_votos_aprovacao, created_at)
  VALUES (v_org, u_compras,
    '[TESTE] Sistema de CFTV com 24 câmeras IP — Matriz',
    'Modernização do sistema de monitoramento da matriz. As câmeras analógicas atuais têm baixa resolução (480p), não cobrem o estacionamento externo e não possuem gravação em nuvem. Proposta inclui 24 câmeras IP 4MP com visão noturna, NVR de 32 canais, 16TB de armazenamento, instalação e treinamento. Atende exigência da seguradora para renovação da apólice patrimonial.',
    'Segurança — Matriz', 'em_votacao', 5, 3, now() - interval '5 days')
  RETURNING id INTO p6;
  INSERT INTO public.council_proposal_quotes (proposal_id, posicao, fornecedor, valor_unit, qtd, frete, condicoes) VALUES
    (p6, 1, 'Hikvision Brasil Autorizada', 78400, 1, 0, 'Boleto 30/60 • Garantia 3 anos • Instalação inclusa'),
    (p6, 2, 'Intelbras Solutions', 82100, 1, 0, '6x sem juros • Garantia 2 anos • Instalação inclusa'),
    (p6, 3, 'Segurança Total RJ', 75900, 1, 380, 'À vista • Garantia 1 ano • Instalação extra');
  INSERT INTO public.council_votes (proposal_id, membro_user_id, voto, comentario, votado_em) VALUES
    (p6, u_admin, 'aprovado', 'Crítico para a renovação da apólice. Aprovo cotação Hikvision.', now() - interval '3 days'),
    (p6, u_compras, 'aprovado', 'Cotação 1 tem o melhor custo-benefício considerando garantia. Aprovado.', now() - interval '2 days'),
    (p6, u_almox, 'rejeitado', 'Sugiro buscar mais 2 cotações antes de decidir. Reprovo nesta forma.', now() - interval '1 day');

  -- 7: EM VOTAÇÃO (1 aprov, 1 abst, 3 pendentes)
  INSERT INTO public.council_proposals (organization_id, created_by, titulo, justificativa, location, status, total_membros, min_votos_aprovacao, created_at)
  VALUES (v_org, u_compras,
    '[TESTE] Licenças Microsoft 365 E5 (50 usuários) — Renovação anual',
    'Renovação anual das licenças corporativas do Microsoft 365 com upgrade do plano E3 para E5. O E5 inclui Power BI Pro, Defender for Endpoint e ferramentas avançadas de compliance — exigências do nosso recente certificado ISO 27001. Substituiria 3 contratos isolados (Power BI, antivírus corporativo, MFA), com economia consolidada de R$ 32k/ano.',
    'TI — Toda a empresa', 'em_votacao', 5, 3, now() - interval '4 days')
  RETURNING id INTO p7;
  INSERT INTO public.council_proposal_quotes (proposal_id, posicao, fornecedor, valor_unit, qtd, frete, condicoes) VALUES
    (p7, 1, 'Microsoft via Softline', 285, 600, 0, 'Mensal • Faturamento anual • Suporte premier'),
    (p7, 2, 'TD Synnex Brasil', 298, 600, 0, 'Anual antecipado • Desconto 8% • Suporte standard'),
    (p7, 3, 'Allied Tecnologia', 292, 600, 0, 'Anual • Suporte dedicado em PT-BR');
  INSERT INTO public.council_votes (proposal_id, membro_user_id, voto, comentario, votado_em) VALUES
    (p7, u_admin, 'aprovado', 'Consolidação faz sentido financeiro e operacional. Aprovo.', now() - interval '2 days'),
    (p7, u_almox, 'abstencao', 'Sem visibilidade técnica suficiente sobre as ferramentas adicionais. Abstenho-me.', now() - interval '1 day');

  -- 8: EM VOTAÇÃO RECÉM ABERTA (0 votos)
  INSERT INTO public.council_proposals (organization_id, created_by, titulo, justificativa, location, status, total_membros, min_votos_aprovacao, created_at)
  VALUES (v_org, u_compras,
    '[TESTE] Equipamentos de áudio profissional para auditório',
    'O auditório principal será utilizado para treinamentos corporativos, palestras e reuniões com investidores. A infraestrutura atual de áudio é amadora (mesa de 4 canais, microfones com falhas). Proposta inclui: mesa digital Allen & Heath SQ-5, 6 microfones sem fio Shure ULXD, 4 caixas line array, processamento DSP e instalação.',
    'Auditório — Matriz', 'em_votacao', 5, 3, now() - interval '6 hours')
  RETURNING id INTO p8;
  INSERT INTO public.council_proposal_quotes (proposal_id, posicao, fornecedor, valor_unit, qtd, frete, condicoes) VALUES
    (p8, 1, 'Áudio Pro RJ', 96400, 1, 0, 'Boleto 30/60/90 • Instalação e treinamento • Garantia 2 anos'),
    (p8, 2, 'Sonus Brasil', 102800, 1, 0, '6x sem juros • Instalação inclusa • Garantia 3 anos'),
    (p8, 3, 'Studio Sound SP', 91200, 1, 1850, 'À vista • Instalação extra • Garantia 1 ano');

  -- 9: RASCUNHO
  INSERT INTO public.council_proposals (organization_id, created_by, titulo, justificativa, location, status, total_membros, min_votos_aprovacao, created_at)
  VALUES (v_org, u_compras,
    '[TESTE] Treinamento NR-35 (trabalho em altura) — equipe de manutenção',
    'A equipe de manutenção predial (12 colaboradores) executa serviços em telhado, fachadas e torres de iluminação. A NR-35 exige treinamento inicial de 8h e reciclagem bienal. O último treinamento expirou há 4 meses, expondo a empresa a multas e responsabilização. Proposta inclui treinamento presencial in-company com certificação válida.',
    'RH — Manutenção', 'rascunho', 5, 3, now() - interval '2 days')
  RETURNING id INTO p9;
  INSERT INTO public.council_proposal_quotes (proposal_id, posicao, fornecedor, valor_unit, qtd, frete, condicoes) VALUES
    (p9, 1, 'Instituto SafeWork', 580, 12, 0, 'À vista • In-company • Certificado MTE'),
    (p9, 2, 'CETESQ Treinamentos', 650, 12, 0, 'Boleto 30 dias • In-company • Material didático incluso'),
    (p9, 3, 'Senai Regional', 520, 12, 0, 'À vista • Em centro de treinamento • Certificado oficial');

  -- 10: RETIRADA
  INSERT INTO public.council_proposals (organization_id, created_by, titulo, justificativa, location, status, total_membros, min_votos_aprovacao, decidido_em, created_at)
  VALUES (v_org, u_compras,
    '[TESTE] Renovação de contrato com fornecedor Alpha Suprimentos',
    'Renovação anual do contrato de fornecimento de materiais de escritório com a Alpha Suprimentos. Histórico de 5 anos de relacionamento, com SLA de entrega em 48h. Após início da votação, identificamos uma proposta superior da concorrente Beta Office (-12% no valor anual e mesmo SLA). Proposta retirada para reanálise antes da decisão do conselho.',
    'Compras — Toda a empresa', 'retirada', 5, 3, now() - interval '3 days', now() - interval '12 days')
  RETURNING id INTO p10;
  INSERT INTO public.council_proposal_quotes (proposal_id, posicao, fornecedor, valor_unit, qtd, frete, condicoes) VALUES
    (p10, 1, 'Alpha Suprimentos LTDA', 8500, 12, 0, 'Mensal • SLA 48h • Reajuste IGPM'),
    (p10, 2, 'Beta Office', 7480, 12, 0, 'Mensal • SLA 48h • Reajuste IPCA');
  INSERT INTO public.council_votes (proposal_id, membro_user_id, voto, comentario, votado_em) VALUES
    (p10, u_admin, 'aprovado', 'Histórico positivo. Aprovo renovação.', now() - interval '5 days');

END $$;
