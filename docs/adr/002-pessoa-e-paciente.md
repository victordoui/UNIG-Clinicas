# ADR 002 — Pessoa é o cadastro mestre

## Decisão

`persons` representa a pessoa; `patients` representa sua participação assistencial. O mesmo modelo é usado por responsáveis de animais, evitando duplicação de identificação e contatos.

## Consequências

- Não criar cadastros paralelos de responsável, aluno ou paciente com os mesmos atributos pessoais.
- Veterinária usa `animals` e `animal_guardians`, que referenciam `persons`.
- Identificadores documentais são únicos por organização quando preenchidos.
