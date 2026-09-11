# Aplicação posterior — avaliação pós-atendimento

Esta migration habilita a avaliação de um atendimento concluído no portal do paciente e as médias agregadas no painel **Indicadores clínicos**.

## Pré-requisito

Entre no projeto Supabase correto (`hhwsqzaookfohqygihyc`) usando uma conta autorizada a executar SQL. A migration pressupõe que as migrations clínicas e de identidade já existentes neste repositório foram aplicadas.

## Aplicação

No SQL Editor, execute integralmente, nesta ordem:

1. `supabase/migrations/20260911230000_post_visit_feedback.sql`
2. `supabase/migrations/20260911231000_tutor_veterinary_feedback.sql`

Não altere as funções `private.*`, as permissões ou as revogações de acesso direto. Elas garantem que:

- só a conta vinculada ao paciente avalia seu próprio agendamento concluído e só o tutor avalia consulta de animal vinculado;
- cada agendamento ou consulta recebe uma única resposta;
- a gestão vê apenas médias agregadas por clínica autorizada;
- o navegador não recebe acesso direto à tabela de respostas;
- a auditoria registra o envio sem gravar as notas ou o comentário no log.

## Validação funcional

1. Entre com uma conta de paciente vinculada a um agendamento de status `completed`.
2. Abra **Portal do paciente** e preencha as quatro notas da seção **Avalie seu atendimento**.
3. Recarregue a página e confirme que o mesmo atendimento não aparece novamente como pendente.
4. Entre como gestor da mesma clínica e abra **Indicadores clínicos**.
5. Confirme que aparece a média agregada, sem nome, prontuário ou comentário do paciente.
6. Entre com gestor de outra clínica e confirme que não há média da clínica não autorizada.
7. Entre como tutor, avalie uma consulta de um animal vinculado e confirme que a média aparece somente para a gestão autorizada da clínica veterinária.
