# Inserções TV — atualização de 15/09/2026

O editor envia mídias antes da escolha do formato, mantém uma biblioteca persistida no bucket `tv-campaigns` (uploads do usuário e mídias das campanhas acessíveis) e mostra a mesma composição visual usada pela TV. Há quatro espaços iniciais e suporte a mais imagens e vídeos.

O painel alterna 30 segundos de chamadas com uma campanha publicada pelo tempo configurado, mesmo com senha em atendimento. Novas chamadas reiniciam esse intervalo. Campanhas são filtradas pela organização e vigência.

O botão **Chamar inserção** na Recepção solicita a campanha publicada de maior prioridade da organização para o painel da clínica. O painel consulta pedidos a cada 2 segundos. A mensagem na Recepção indica solicitação, não confirmação de reprodução; é necessário manter a TV aberta e conectada. Chamadas de senha têm prioridade. Ao terminar, o ciclo automático retorna.

## Banco — aplicação pendente

Aplicar em ordem no projeto Supabase usado pelo aplicativo:

1. `supabase/migrations/20260915210000_update_tv_campaign_content.sql`
2. `supabase/migrations/20260915213000_tv_insertion_requests.sql`

A primeira permite edição dos campos de conteúdo por gestores da mesma organização, sem alterar autoria, organização ou status. A segunda cria o pedido de inserção por clínica com validação do perfil e escopo do solicitante. Nenhuma das duas foi aplicada remotamente nesta sessão: o conector administrativo está indisponível.

## Validação

`e2e/campaign-editor.spec.ts` usa respostas simuladas, sem tocar dados reais, para testar quatro uploads, persistência da galeria, prévias, edição/publicação, rejeição de imagem corrompida, alternância automática com senha ativa e pedido manual.

Após aplicar as migrations, testar com Recepção e TV em dispositivos diferentes na mesma clínica. Publicar uma campanha, aguardar o ciclo, solicitar manualmente e chamar novamente uma senha durante a inserção. Confirmar o retorno das chamadas e depois do automático.
