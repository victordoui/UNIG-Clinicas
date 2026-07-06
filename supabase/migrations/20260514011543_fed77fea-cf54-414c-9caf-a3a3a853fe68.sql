
INSERT INTO suppliers (id, organization_id, nome_fantasia, razao_social, cnpj, categoria, contato_nome, telefone, email, ativo, avaliacao, observacoes, created_by) VALUES
('aa000001-0000-0000-0000-000000000001','b3bf86a2-5856-4d8e-93b4-9388d126bab7','TechMax Informática','TechMax Comércio LTDA','11.222.333/0001-44','Eletrônicos','Carlos Souza','(11) 3333-1010','vendas@techmax.com',true,5,'[SEED] Fornecedor de TI','a7f898f2-6dc8-419c-95dc-676c6579163b'),
('aa000001-0000-0000-0000-000000000002','b3bf86a2-5856-4d8e-93b4-9388d126bab7','PapelOffice','PapelOffice Suprimentos LTDA','22.333.444/0001-55','Escritório','Marina Lopes','(11) 4444-2020','contato@papeloffice.com',true,4,'[SEED] Material de escritório','a7f898f2-6dc8-419c-95dc-676c6579163b'),
('aa000001-0000-0000-0000-000000000003','b3bf86a2-5856-4d8e-93b4-9388d126bab7','LimpaTudo','LimpaTudo Indústria LTDA','33.444.555/0001-66','Limpeza','Roberto Lima','(11) 5555-3030','vendas@limpatudo.com',true,5,'[SEED] Produtos de limpeza','a7f898f2-6dc8-419c-95dc-676c6579163b'),
('aa000001-0000-0000-0000-000000000004','b3bf86a2-5856-4d8e-93b4-9388d126bab7','MecânicaPro','MecânicaPro Manutenção LTDA','44.555.666/0001-77','Manutenção','João Pereira','(11) 6666-4040','atendimento@mecanicapro.com',true,4,'[SEED] Manutenção predial','a7f898f2-6dc8-419c-95dc-676c6579163b'),
('aa000001-0000-0000-0000-000000000005','b3bf86a2-5856-4d8e-93b4-9388d126bab7','Cozinha & Cia','Cozinha & Cia Alimentos LTDA','55.666.777/0001-88','Alimentos','Patrícia Reis','(11) 7777-5050','pedidos@cozinhacia.com',true,5,'[SEED] Insumos de copa/cozinha','a7f898f2-6dc8-419c-95dc-676c6579163b'),
('aa000001-0000-0000-0000-000000000006','b3bf86a2-5856-4d8e-93b4-9388d126bab7','EletroBrasil','EletroBrasil Comércio LTDA','66.777.888/0001-99','Eletrônicos','André Castro','(11) 8888-6060','vendas@eletrobrasil.com',true,3,'[SEED] Eletrônicos diversos','a7f898f2-6dc8-419c-95dc-676c6579163b'),
('aa000001-0000-0000-0000-000000000007','b3bf86a2-5856-4d8e-93b4-9388d126bab7','SegurançaTotal','SegurançaTotal EPI LTDA','77.888.999/0001-00','EPI','Fernanda Dias','(11) 9999-7070','vendas@segurancatotal.com',true,4,'[SEED] EPIs e segurança','a7f898f2-6dc8-419c-95dc-676c6579163b'),
('aa000001-0000-0000-0000-000000000008','b3bf86a2-5856-4d8e-93b4-9388d126bab7','MoveisCorp','MoveisCorp Mobiliário LTDA','88.999.000/0001-11','Mobiliário','Lucas Andrade','(11) 2222-8080','contato@moveiscorp.com',true,4,'[SEED] Mobiliário corporativo','a7f898f2-6dc8-419c-95dc-676c6579163b')
ON CONFLICT (id) DO NOTHING;

INSERT INTO cost_centers (id, organization_id, nome, codigo, responsavel_id, ativo) VALUES
('bb000001-0000-0000-0000-000000000001','b3bf86a2-5856-4d8e-93b4-9388d126bab7','Administrativo','CC-ADM','baf2cc34-daca-4906-8a35-85973366e4ad',true),
('bb000001-0000-0000-0000-000000000002','b3bf86a2-5856-4d8e-93b4-9388d126bab7','Tecnologia da Informação','CC-TI','baf2cc34-daca-4906-8a35-85973366e4ad',true),
('bb000001-0000-0000-0000-000000000003','b3bf86a2-5856-4d8e-93b4-9388d126bab7','Operações','CC-OPS','baf2cc34-daca-4906-8a35-85973366e4ad',true),
('bb000001-0000-0000-0000-000000000004','b3bf86a2-5856-4d8e-93b4-9388d126bab7','Manutenção','CC-MAN','baf2cc34-daca-4906-8a35-85973366e4ad',true),
('bb000001-0000-0000-0000-000000000005','b3bf86a2-5856-4d8e-93b4-9388d126bab7','Comercial','CC-COM','baf2cc34-daca-4906-8a35-85973366e4ad',true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_cost_centers (user_id, cost_center_id, organization_id, is_default, can_request, can_approve_cc, created_by) VALUES
('baf2cc34-daca-4906-8a35-85973366e4ad','bb000001-0000-0000-0000-000000000001','b3bf86a2-5856-4d8e-93b4-9388d126bab7',true,true,true,'a7f898f2-6dc8-419c-95dc-676c6579163b'),
('baf2cc34-daca-4906-8a35-85973366e4ad','bb000001-0000-0000-0000-000000000002','b3bf86a2-5856-4d8e-93b4-9388d126bab7',false,true,true,'a7f898f2-6dc8-419c-95dc-676c6579163b'),
('869200f9-d76b-439a-84cf-4d63f9267f18','bb000001-0000-0000-0000-000000000002','b3bf86a2-5856-4d8e-93b4-9388d126bab7',true,true,false,'a7f898f2-6dc8-419c-95dc-676c6579163b'),
('869200f9-d76b-439a-84cf-4d63f9267f18','bb000001-0000-0000-0000-000000000005','b3bf86a2-5856-4d8e-93b4-9388d126bab7',false,true,false,'a7f898f2-6dc8-419c-95dc-676c6579163b'),
('85cc7167-92ec-48bd-a510-e089b3eb5820','bb000001-0000-0000-0000-000000000003','b3bf86a2-5856-4d8e-93b4-9388d126bab7',true,true,false,'a7f898f2-6dc8-419c-95dc-676c6579163b'),
('85cc7167-92ec-48bd-a510-e089b3eb5820','bb000001-0000-0000-0000-000000000004','b3bf86a2-5856-4d8e-93b4-9388d126bab7',false,true,false,'a7f898f2-6dc8-419c-95dc-676c6579163b')
ON CONFLICT DO NOTHING;

INSERT INTO purchase_requests (id, organization_id, numero, solicitante_id, setor, unidade, prioridade, categoria, item_descricao, quantidade, valor_estimado, justificativa, prazo_desejado, status, responsavel_id, observacoes, cost_center_id, created_at) VALUES
('cc000001-0000-0000-0000-000000000001','b3bf86a2-5856-4d8e-93b4-9388d126bab7','REQ-2025-001','85cc7167-92ec-48bd-a510-e089b3eb5820','Operações','UN','urgente','manutencao','[SEED] Compressor industrial 5HP',1,8500.00,'Equipamento queimou','2026-05-25','aguardando_aprovacao',NULL,'[SEED]','bb000001-0000-0000-0000-000000000003',now()-interval '2 days'),
('cc000001-0000-0000-0000-000000000002','b3bf86a2-5856-4d8e-93b4-9388d126bab7','REQ-2025-002','baf2cc34-daca-4906-8a35-85973366e4ad','TI','UN','alta','eletronicos','[SEED] 5 monitores 24" Full HD',5,1200.00,'Renovação','2026-05-30','aguardando_aprovacao',NULL,'[SEED]','bb000001-0000-0000-0000-000000000002',now()-interval '3 days'),
('cc000001-0000-0000-0000-000000000003','b3bf86a2-5856-4d8e-93b4-9388d126bab7','REQ-2025-003','869200f9-d76b-439a-84cf-4d63f9267f18','Comercial','CX','normal','escritorio','[SEED] Resmas papel A4 cx c/10',20,250.00,'Estoque baixo','2026-06-10','nova',NULL,'[SEED]','bb000001-0000-0000-0000-000000000005',now()-interval '1 day'),
('cc000001-0000-0000-0000-000000000004','b3bf86a2-5856-4d8e-93b4-9388d126bab7','REQ-2025-004','85cc7167-92ec-48bd-a510-e089b3eb5820','Manutenção','UN','alta','manutencao','[SEED] Kit ferramentas mecânica',2,1500.00,'Equipamentos antigos','2026-06-05','aguardando_aprovacao',NULL,'[SEED]','bb000001-0000-0000-0000-000000000004',now()-interval '4 hours'),
('cc000001-0000-0000-0000-000000000005','b3bf86a2-5856-4d8e-93b4-9388d126bab7','REQ-2025-005','baf2cc34-daca-4906-8a35-85973366e4ad','TI','UN','alta','eletronicos','[SEED] 3 notebooks Dell i7 16GB',3,5800.00,'Novos colaboradores','2026-06-15','aprovada','869200f9-d76b-439a-84cf-4d63f9267f18','[SEED] Designado','bb000001-0000-0000-0000-000000000002',now()-interval '7 days'),
('cc000001-0000-0000-0000-000000000006','b3bf86a2-5856-4d8e-93b4-9388d126bab7','REQ-2025-006','85cc7167-92ec-48bd-a510-e089b3eb5820','Operações','KG','normal','limpeza','[SEED] Detergente neutro 50kg',50,12.00,'Reposição','2026-06-01','em_cotacao','869200f9-d76b-439a-84cf-4d63f9267f18','[SEED]','bb000001-0000-0000-0000-000000000003',now()-interval '5 days'),
('cc000001-0000-0000-0000-000000000007','b3bf86a2-5856-4d8e-93b4-9388d126bab7','REQ-2025-007','baf2cc34-daca-4906-8a35-85973366e4ad','Administrativo','UN','normal','escritorio','[SEED] Cadeiras ergonômicas',8,1800.00,'Substituição','2026-06-20','em_cotacao','869200f9-d76b-439a-84cf-4d63f9267f18','[SEED]','bb000001-0000-0000-0000-000000000001',now()-interval '6 days'),
('cc000001-0000-0000-0000-000000000008','b3bf86a2-5856-4d8e-93b4-9388d126bab7','REQ-2025-008','85cc7167-92ec-48bd-a510-e089b3eb5820','Operações','UN','alta','eletronicos','[SEED] Impressora multifuncional laser',2,2400.00,'Setor sem impressora','2026-05-20','compra_realizada','869200f9-d76b-439a-84cf-4d63f9267f18','[SEED]','bb000001-0000-0000-0000-000000000003',now()-interval '15 days'),
('cc000001-0000-0000-0000-000000000009','b3bf86a2-5856-4d8e-93b4-9388d126bab7','REQ-2025-009','baf2cc34-daca-4906-8a35-85973366e4ad','TI','UN','normal','eletronicos','[SEED] 10 mouses sem fio',10,85.00,'Reposição','2026-05-22','aguardando_entrega','869200f9-d76b-439a-84cf-4d63f9267f18','[SEED]','bb000001-0000-0000-0000-000000000002',now()-interval '12 days'),
('cc000001-0000-0000-0000-00000000000a','b3bf86a2-5856-4d8e-93b4-9388d126bab7','REQ-2025-010','869200f9-d76b-439a-84cf-4d63f9267f18','Comercial','UN','normal','outros','[SEED] 50 pastas plásticas L',50,8.00,'Documentos','2026-05-25','aguardando_entrega','869200f9-d76b-439a-84cf-4d63f9267f18','[SEED]','bb000001-0000-0000-0000-000000000005',now()-interval '10 days'),
('cc000001-0000-0000-0000-00000000000b','b3bf86a2-5856-4d8e-93b4-9388d126bab7','REQ-2025-011','85cc7167-92ec-48bd-a510-e089b3eb5820','Manutenção','UN','normal','manutencao','[SEED] Lâmpadas LED 20W cx c/10',5,180.00,'Reposição','2026-04-30','finalizada','869200f9-d76b-439a-84cf-4d63f9267f18','[SEED]','bb000001-0000-0000-0000-000000000004',now()-interval '25 days'),
('cc000001-0000-0000-0000-00000000000c','b3bf86a2-5856-4d8e-93b4-9388d126bab7','REQ-2025-012','baf2cc34-daca-4906-8a35-85973366e4ad','Administrativo','UN','baixa','escritorio','[SEED] Grampeadores médios',15,35.00,'Reposição','2026-04-25','recebida','869200f9-d76b-439a-84cf-4d63f9267f18','[SEED]','bb000001-0000-0000-0000-000000000001',now()-interval '20 days'),
('cc000001-0000-0000-0000-00000000000d','b3bf86a2-5856-4d8e-93b4-9388d126bab7','REQ-2025-013','85cc7167-92ec-48bd-a510-e089b3eb5820','Operações','UN','normal','cozinha','[SEED] Café em pó 500g',30,18.00,'Copa','2026-04-20','finalizada','869200f9-d76b-439a-84cf-4d63f9267f18','[SEED]','bb000001-0000-0000-0000-000000000003',now()-interval '30 days'),
('cc000001-0000-0000-0000-00000000000e','b3bf86a2-5856-4d8e-93b4-9388d126bab7','REQ-2025-014','85cc7167-92ec-48bd-a510-e089b3eb5820','Operações','UN','baixa','outros','[SEED] Geladeira sala descanso',1,3500.00,'Conforto','2026-07-01','reprovada',NULL,'[SEED] Reprovado: orçamento','bb000001-0000-0000-0000-000000000003',now()-interval '8 days'),
('cc000001-0000-0000-0000-00000000000f','b3bf86a2-5856-4d8e-93b4-9388d126bab7','REQ-2025-015','baf2cc34-daca-4906-8a35-85973366e4ad','TI','UN','normal','eletronicos','[SEED] iPad Pro 12.9"',1,12000.00,'Apresentações','2026-06-30','reprovada',NULL,'[SEED] Reprovado: similar disponível','bb000001-0000-0000-0000-000000000002',now()-interval '11 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO ci_requests (id, organization_id, protocol, channel, requester_name, requester_sector, requester_email, source_sector, destination_sector, request_type, subject, description, priority, status, created_by, assigned_to, created_at) VALUES
('dd000001-0000-0000-0000-000000000001','b3bf86a2-5856-4d8e-93b4-9388d126bab7','CI-2025-0001','interno','Almoxarife Teste','Operações','almox@teste.com','Operações','Compras','solicitacao','[SEED] Solicitação de novos uniformes','Equipe operacional precisa de 12 uniformes','alta','aguardando_aprovacao','85cc7167-92ec-48bd-a510-e089b3eb5820',NULL,now()-interval '2 days'),
('dd000001-0000-0000-0000-000000000002','b3bf86a2-5856-4d8e-93b4-9388d126bab7','CI-2025-0002','interno','Admin Teste','Administrativo','admin@teste.com','Administrativo','Manutenção','autorizacao','[SEED] Autorização reforma sala reuniões','Solicito autorização','media','aguardando_aprovacao','baf2cc34-daca-4906-8a35-85973366e4ad',NULL,now()-interval '3 days'),
('dd000001-0000-0000-0000-000000000003','b3bf86a2-5856-4d8e-93b4-9388d126bab7','CI-2025-0003','interno','Comprador Teste','TI','compras@teste.com','TI','Diretoria','solicitacao','[SEED] Aquisição licenças software','20 licenças Office 365','urgente','aguardando_aprovacao','869200f9-d76b-439a-84cf-4d63f9267f18',NULL,now()-interval '1 day'),
('dd000001-0000-0000-0000-000000000004','b3bf86a2-5856-4d8e-93b4-9388d126bab7','CI-2025-0004','interno','Almoxarife Teste','Operações','almox@teste.com','Operações','Compras','solicitacao','[SEED] EPIs adicionais','10 conjuntos de EPI','alta','aprovada','85cc7167-92ec-48bd-a510-e089b3eb5820','869200f9-d76b-439a-84cf-4d63f9267f18',now()-interval '6 days'),
('dd000001-0000-0000-0000-000000000005','b3bf86a2-5856-4d8e-93b4-9388d126bab7','CI-2025-0005','interno','Admin Teste','Administrativo','admin@teste.com','Administrativo','Compras','solicitacao','[SEED] Material gráfico evento','Para feira mensal','media','em_cotacao','baf2cc34-daca-4906-8a35-85973366e4ad','869200f9-d76b-439a-84cf-4d63f9267f18',now()-interval '5 days'),
('dd000001-0000-0000-0000-000000000006','b3bf86a2-5856-4d8e-93b4-9388d126bab7','CI-2025-0006','interno','Victor','Diretoria','victordoui02@gmail.com','Diretoria','TI','informativo','[SEED] Atualização sistemas','Comunicado','baixa','em_analise','a7f898f2-6dc8-419c-95dc-676c6579163b','869200f9-d76b-439a-84cf-4d63f9267f18',now()-interval '4 days'),
('dd000001-0000-0000-0000-000000000007','b3bf86a2-5856-4d8e-93b4-9388d126bab7','CI-2025-0007','interno','Almoxarife Teste','Operações','almox@teste.com','Operações','Compras','solicitacao','[SEED] Manutenção empilhadeira','Preventiva','alta','finalizada','85cc7167-92ec-48bd-a510-e089b3eb5820','869200f9-d76b-439a-84cf-4d63f9267f18',now()-interval '20 days'),
('dd000001-0000-0000-0000-000000000008','b3bf86a2-5856-4d8e-93b4-9388d126bab7','CI-2025-0008','interno','Admin Teste','Administrativo','admin@teste.com','Administrativo','RH','solicitacao','[SEED] Treinamento equipe','Concluído','media','finalizada','baf2cc34-daca-4906-8a35-85973366e4ad','869200f9-d76b-439a-84cf-4d63f9267f18',now()-interval '25 days'),
('dd000001-0000-0000-0000-000000000009','b3bf86a2-5856-4d8e-93b4-9388d126bab7','CI-2025-0009','interno','Comprador Teste','TI','compras@teste.com','TI','Diretoria','solicitacao','[SEED] Servidor adicional','Reprovado','media','reprovada','869200f9-d76b-439a-84cf-4d63f9267f18',NULL,now()-interval '12 days'),
('dd000001-0000-0000-0000-00000000000a','b3bf86a2-5856-4d8e-93b4-9388d126bab7','CI-2025-0010','interno','Almoxarife Teste','Operações','almox@teste.com','Operações','Compras','solicitacao','[SEED] Climatizador área externa','Reprovado: prioridade baixa','baixa','reprovada','85cc7167-92ec-48bd-a510-e089b3eb5820',NULL,now()-interval '15 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO purchase_quotes (id, request_id, organization_id, supplier_id, valor_unitario, quantidade, prazo_entrega_dias, condicao_pagamento, status, observacoes, created_by) VALUES
('ee000001-0000-0000-0000-000000000001','cc000001-0000-0000-0000-000000000005','b3bf86a2-5856-4d8e-93b4-9388d126bab7','aa000001-0000-0000-0000-000000000001',5800.00,3,7,'30 dias','recebida','[SEED]','869200f9-d76b-439a-84cf-4d63f9267f18'),
('ee000001-0000-0000-0000-000000000002','cc000001-0000-0000-0000-000000000005','b3bf86a2-5856-4d8e-93b4-9388d126bab7','aa000001-0000-0000-0000-000000000006',6100.00,3,5,'À vista','recebida','[SEED]','869200f9-d76b-439a-84cf-4d63f9267f18'),
('ee000001-0000-0000-0000-000000000003','cc000001-0000-0000-0000-000000000006','b3bf86a2-5856-4d8e-93b4-9388d126bab7','aa000001-0000-0000-0000-000000000003',12.50,50,3,'15 dias','recebida','[SEED]','869200f9-d76b-439a-84cf-4d63f9267f18'),
('ee000001-0000-0000-0000-000000000004','cc000001-0000-0000-0000-000000000006','b3bf86a2-5856-4d8e-93b4-9388d126bab7','aa000001-0000-0000-0000-000000000005',11.80,50,5,'30 dias','recebida','[SEED]','869200f9-d76b-439a-84cf-4d63f9267f18'),
('ee000001-0000-0000-0000-000000000005','cc000001-0000-0000-0000-000000000007','b3bf86a2-5856-4d8e-93b4-9388d126bab7','aa000001-0000-0000-0000-000000000008',1750.00,8,10,'30/60 dias','recebida','[SEED]','869200f9-d76b-439a-84cf-4d63f9267f18'),
('ee000001-0000-0000-0000-000000000006','cc000001-0000-0000-0000-000000000007','b3bf86a2-5856-4d8e-93b4-9388d126bab7','aa000001-0000-0000-0000-000000000002',1900.00,8,7,'30 dias','recebida','[SEED]','869200f9-d76b-439a-84cf-4d63f9267f18')
ON CONFLICT (id) DO NOTHING;

INSERT INTO purchase_orders (id, numero, request_id, quote_id, supplier_id, organization_id, valor_total, quantidade, prazo_entrega_dias, condicao_pagamento, status, emitido_por, cost_center_id) VALUES
('ff000001-0000-0000-0000-000000000001','PO-2025-001','cc000001-0000-0000-0000-000000000008','ee000001-0000-0000-0000-000000000001','aa000001-0000-0000-0000-000000000001','b3bf86a2-5856-4d8e-93b4-9388d126bab7',4800.00,2,7,'30 dias','emitido','869200f9-d76b-439a-84cf-4d63f9267f18','bb000001-0000-0000-0000-000000000003'),
('ff000001-0000-0000-0000-000000000002','PO-2025-002','cc000001-0000-0000-0000-000000000009','ee000001-0000-0000-0000-000000000002','aa000001-0000-0000-0000-000000000001','b3bf86a2-5856-4d8e-93b4-9388d126bab7',850.00,10,5,'À vista','enviado_fornecedor','869200f9-d76b-439a-84cf-4d63f9267f18','bb000001-0000-0000-0000-000000000002'),
('ff000001-0000-0000-0000-000000000003','PO-2025-003','cc000001-0000-0000-0000-00000000000a','ee000001-0000-0000-0000-000000000003','aa000001-0000-0000-0000-000000000002','b3bf86a2-5856-4d8e-93b4-9388d126bab7',400.00,50,5,'30 dias','confirmado','869200f9-d76b-439a-84cf-4d63f9267f18','bb000001-0000-0000-0000-000000000005'),
('ff000001-0000-0000-0000-000000000004','PO-2025-004','cc000001-0000-0000-0000-00000000000b','ee000001-0000-0000-0000-000000000004','aa000001-0000-0000-0000-000000000003','b3bf86a2-5856-4d8e-93b4-9388d126bab7',900.00,5,3,'15 dias','recebido_total','869200f9-d76b-439a-84cf-4d63f9267f18','bb000001-0000-0000-0000-000000000004')
ON CONFLICT (id) DO NOTHING;

INSERT INTO alerts (organization_id, type, severity, title, message, product_id, is_read) VALUES
('b3bf86a2-5856-4d8e-93b4-9388d126bab7','low_stock','high','[SEED] Estoque baixo: TINTA EPSON 504 MAGENTA','Produto abaixo do estoque mínimo','c11585b9-ab73-4405-898e-0405203e19f0',false),
('b3bf86a2-5856-4d8e-93b4-9388d126bab7','low_stock','critical','[SEED] Estoque zerado: PAPEL FORMULARIO 240mm','Produto sem estoque','88a9a780-e1f9-466d-a0d2-86d2c1336abb',false),
('b3bf86a2-5856-4d8e-93b4-9388d126bab7','low_stock','medium','[SEED] Estoque baixo: TINTA EPSON 504 CIANO','Reposição recomendada','a1c05864-ee36-4865-bd25-b908e46b39f8',false),
('b3bf86a2-5856-4d8e-93b4-9388d126bab7','system','low','[SEED] Backup concluído','Backup realizado',NULL,true),
('b3bf86a2-5856-4d8e-93b4-9388d126bab7','low_stock','high','[SEED] Estoque baixo: TINTA EPSON 504 AMARELA','Produto abaixo do mínimo','83a8b419-c38d-4e17-b2c6-c5af4ccfeefe',false);

INSERT INTO movements (organization_id, type, product_id, quantity, previous_stock, new_stock, reason, created_by, unit_price, total_value, created_at)
SELECT 
  'b3bf86a2-5856-4d8e-93b4-9388d126bab7',
  (CASE WHEN gs % 3 = 0 THEN 'entrada' ELSE 'saida' END)::movement_type,
  '63b9b11c-1655-4146-a15d-30dbe78f1709',
  (1 + (gs % 5))::int,
  10,
  (10 + (CASE WHEN gs % 3 = 0 THEN (gs % 5) ELSE -(gs % 5) END))::int,
  '[SEED] Movimentação teste',
  (ARRAY['85cc7167-92ec-48bd-a510-e089b3eb5820'::uuid,'869200f9-d76b-439a-84cf-4d63f9267f18'::uuid,'baf2cc34-daca-4906-8a35-85973366e4ad'::uuid])[1 + (gs % 3)],
  45.00,
  45.00 * (1 + (gs % 5)),
  now() - (gs || ' days')::interval
FROM generate_series(1, 24) gs;
