# Aplicação posterior — documentos veterinários

Esta etapa conclui a Fase 7 do UNIG Clínicas. Ela cria uma área privada de documentos para animais e libera cada arquivo apenas ao tutor que possui vínculo ativo com o animal.

## Pré-requisito

Entre no projeto Supabase correto (`hhwsqzaookfohqygihyc`) com uma conta que possa executar SQL no banco.

## Ordem obrigatória

No SQL Editor do Supabase, execute o conteúdo completo destes arquivos, um por vez e nesta ordem:

1. `supabase/migrations/20260911220000_tutor_animal_documents.sql`
2. `supabase/migrations/20260911220500_validate_animal_document_clinic.sql`

Após cada execução, o editor deve retornar sucesso. Não modifique os `create policy`, os `grant` ou as funções `private.*`: eles mantêm o isolamento entre clínica, animal e tutor.

## Validação funcional

Depois da aplicação:

1. Entre como um profissional da Clínica Veterinária e acesse **Veterinária**.
2. Anexe um arquivo em **Documentos do animal**.
3. Entre como o tutor vinculado ao mesmo animal e acesse **Portal do tutor**.
4. Confirme que o arquivo aparece em **Documentos dos animais** e abre por URL temporária.
5. Confirme que um tutor sem vínculo com o animal não vê o documento.

O sistema não reutiliza o bucket de documentos de pacientes humanos: os documentos veterinários ficam no bucket privado `animal-documents`.
