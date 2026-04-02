

# Ajustes nos Gráficos do Tracking

## Problema 1: Respostas órfãs de perguntas excluídas

Atualmente, os gráficos buscam **todas as respostas** (`tracking_interview_answers`) das entrevistas, independentemente de a pergunta ainda existir em `tracking_round_questions`. Quando o usuário exclui uma pergunta da rodada, as respostas antigas continuam no banco e são exibidas nos gráficos.

**Solução:** No `TrackingCharts`, filtrar `filteredAnswers` para considerar apenas respostas cujo `question_key` existe na lista de `questions` (perguntas ativas). Isso garante que perguntas excluídas não poluam os gráficos.

**Arquivo:** `src/components/tracking/TrackingCharts.tsx`
- Criar um `Set` de `question_keys` válidos a partir das `questions` recebidas
- Filtrar `filteredAnswers` para incluir apenas respostas com `question_key` presente nesse Set

---

## Problema 2: Gênero — mostrar % de votos por candidato dentro de cada gênero

O card "Gênero dos Entrevistados" hoje mostra apenas a distribuição Masculino/Feminino (donut simples). Precisa mostrar, dentro de cada gênero, a intenção de voto por candidato.

**Solução:** Substituir o donut por um **stacked bar chart horizontal** (ou grouped bar), onde cada barra é um gênero e os segmentos representam os candidatos com suas respectivas %.

**Arquivo:** `src/components/tracking/TrackingCharts.tsx`
- Criar `genderVoteData`: para cada gênero, cruzar as entrevistas com as respostas de intenção de voto (perguntas `select` válidas), calculando % por candidato
- Trocar o `PieChart` por um `BarChart` stacked horizontal com uma barra por gênero e segmentos coloridos por candidato
- Manter legenda com os nomes dos candidatos

---

## Problema 3: Faixa Etária — mostrar % de votos por candidato em cada faixa

O card "Faixa Etária" hoje mostra apenas quantas entrevistas por faixa. Precisa mostrar a intenção de voto por candidato dentro de cada faixa.

**Solução:** Transformar em **stacked bar chart vertical**, onde cada barra é uma faixa etária e os segmentos são os candidatos.

**Arquivo:** `src/components/tracking/TrackingCharts.tsx`
- Criar `ageVoteData`: para cada faixa etária, cruzar entrevistas com respostas de voto, calcular % por candidato
- Trocar o `Bar` único por múltiplos `Bar` (um por candidato) com `stackId="age"`
- Usar as mesmas cores `CHART_COLORS` já atribuídas aos candidatos

---

## Detalhes técnicos

### Lógica de cruzamento gênero/idade × voto

Para ambos os gráficos, a lógica é similar:
1. Agrupar entrevistas filtradas por dimensão (gênero ou faixa etária)
2. Para cada grupo, encontrar as respostas de perguntas `select` válidas
3. Contar votos por candidato e calcular % sobre o total do grupo
4. Montar array de objetos `{ dimension, candidato1: %, candidato2: %, ... }`

### Filtragem de perguntas válidas (problema 1)

```text
validKeys = Set(questions.map(q => q.question_key))
filteredAnswers = answers.filter(a => validKeys.has(a.question_key) && interviewIds.has(a.interview_id))
```

Isso resolve os 3 problemas com edições apenas em `src/components/tracking/TrackingCharts.tsx`.

