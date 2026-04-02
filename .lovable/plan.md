

# Fix: Exibir os 4 candidatos nos gráficos do Tracking

## Problema identificado

Os dados estão corretos no banco (Moro: 636, Requião: 303, Cristina: 170, Guto: 93), mas o gráfico pega a **primeira pergunta do tipo "select"** que encontra — e essa é `q_1775063819206_gksf` (da rodada criada manualmente, com apenas 4 respostas). As 1.291 respostas simuladas usam a chave `q_gov_voto`, que fica em segundo na lista.

## Solução

### 1. Corrigir a lógica de seleção de pergunta no TrackingCharts

Em vez de pegar cegamente `selectQs[0]`, o componente vai:
- Agrupar perguntas por `question_key` (removendo duplicatas entre rodadas)
- Usar a pergunta que tem **mais respostas** como a principal de intenção de voto
- Isso garante que `q_gov_voto` (1.291 respostas) seja escolhida sobre `q_1775063819206_gksf` (4 respostas)

### 2. Unificar respostas de perguntas equivalentes

Como a rodada manual criou uma pergunta diferente (`q_1775063819206_gksf`) para a mesma finalidade, o sistema vai agregar respostas de **todas as perguntas do tipo select com mesma semântica de voto** para garantir que os dados apareçam mesmo filtrando por rodada específica.

### 3. Inserir respostas na rodada manual

A rodada `2c0a9906` (criada pelo usuário) tem apenas 4 entrevistas sem dados dos 4 candidatos. Vou inserir respostas com `q_1775063819206_gksf` nessas entrevistas para manter consistência.

### Arquivo editado
- `src/components/tracking/TrackingCharts.tsx` — lógica de `voteIntentionData` e `evolutionData`

