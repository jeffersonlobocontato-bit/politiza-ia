## Objetivo

Na aba **Político** do cadastro de nova liderança (`/campo/liderancas/novo`), adicionar dentro de **Histórico Político** o campo **"Tem mandato"**. Quando marcado, exibir lista de cargos e, para dois deles, exibir um campo extra.

## Mudanças

### 1. Banco de dados (migration)

Adicionar 4 colunas em `public.leader_political_history`:

- `has_current_mandate boolean default false`
- `current_mandate_position text` — um dos valores: `lideranca_comunitaria`, `presidente_entidade`, `vereador`, `prefeito`, `deputado_estadual`, `deputado_federal`
- `current_mandate_community text` — bairro/comunidade (apenas quando cargo = liderança comunitária)
- `current_mandate_entity text` — nome da entidade (apenas quando cargo = presidente de entidade)

### 2. Formulário — `src/pages/CampoLiderancaForm.tsx` (aba Político, step 4)

Adicionar abaixo do bloco "Já teve mandato":

- Checkbox **"Tem mandato (atual)"**
- Se marcado, mostrar `<select>` **Cargo atual** com opções:
  - Liderança comunitária
  - Presidente de entidade
  - Vereador
  - Prefeito
  - Deputado estadual
  - Deputado federal
- Se cargo = "Liderança comunitária" → input **Comunidade / Bairro**
- Se cargo = "Presidente de entidade" → input **Nome da entidade**

Estados novos: `hasCurrentMandate`, `currentMandatePosition`, `currentMandateCommunity`, `currentMandateEntity`. Resetar campos condicionais ao trocar de cargo/desmarcar.

Adicionar uma linha de resumo no step 5 (revisão): **"Mandato atual"** com o cargo formatado (+ comunidade/entidade quando aplicável).

### 3. Persistência

Incluir os 4 campos no objeto `history` salvo via `useLeaders` (insert/update em `leader_political_history`) e no carregamento (`politicalHistory.*`) para pré-preenchimento ao editar.

### Fora de escopo

Sem alterações em outros formulários (ex.: `LeaderFormDialog.tsx` da aba Proporcional) — somente o wizard de cadastro de liderança de campo solicitado.
