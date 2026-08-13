# Importação do inventário de espaços — Campus Nova Iguaçu

Origem: `Controle de Capacidade de Salas e Mapa UNIG Nova Iguaçu.xlsx`.

O arquivo `supabase/seeds/import_unig_ni_rooms.sql` contém 91 espaços e é
idempotente: uma nova execução não duplica códigos já importados para a unidade
`UNIG-NI`.

No terminal aberto na raiz do projeto, execute nesta ordem:

```cmd
npx supabase db query --linked --file supabase\migrations\20260813025730_room_inventory_metadata.sql
npx supabase db query --linked --file supabase\seeds\import_unig_ni_rooms.sql
```

Não use `supabase db push`: o histórico de migrations remoto ainda precisa ser
reconciliado. Ao final da importação, a própria consulta exibirá a quantidade de
espaços cadastrados para a unidade `UNIG-NI`.

Os dados trazidos incluem bloco, capacidade, número de cadeiras, projetor,
ar-condicionado, áudio, TV, quadro, tela interativa, mobiliário, nível do
ambiente e restrição de uso. O script de geração está em
`scripts/build_unig_ni_room_import.py` para atualização futura da planilha.
