
## Situação atual (verificada)

A edge function `redator-gazeta-chat` já cruza dados da base antes de chamar a IA. A cada pergunta ela injeta um JSON no system prompt com:

- **Emendas** (top 80 por valor): `exercicio, tipo, ente_federativo, municipio, area_tematica, finalidade, valor_total, status, unidade_beneficiaria` + totais e valor por município.
- **Ativos políticos** (60), **ações recentes** (40), **macrorregiões**.
- Filtro opcional por município.
- `web_search` da Anthropic para contexto público.

Base atual: **521 emendas, 156 municípios, R$ 299,08 mi, 2024–2026** — 100% do senador **Sergio Moro** (a tabela `emendas` da plataforma é dedicada às emendas dele; não há coluna de autor porque não precisa).

## Ajuste-chave: atribuição correta

Como toda a base é do Moro, o system prompt deve dizer isso explicitamente para a IA usar frases como "as emendas destinadas pelo senador Sergio Moro" em vez de formulações genéricas ("segundo o levantamento"). Isso muda o tom de todas as respostas argumentativas.

## Como testar depois da melhoria

Em `/redator-gazeta`, colar:

> "Pergunta da imprensa: 'Por que o senador Moro não entregou emendas para a saúde do interior?' Preciso de nota de contra-argumentação factual, tom Gazeta do Povo, até 1.500 caracteres."

Conferir que a resposta:
- cita valores reais da base (bate com `SELECT` direto),
- atribui explicitamente ao senador Sergio Moro,
- estrutura contra-argumento com evidência.

## Gaps a corrigir na edge function

1. Contexto envia só **top 80 por valor_total** — perguntas sobre saúde/educação podem ficar sem os registros relevantes se todos os 80 forem infraestrutura.
2. Faltam **agregações por área temática, por exercício e por status de pagamento** — a IA hoje somaria sozinha (e erra cifras).
3. `valor_pago` e `valor_empenhado` não vão no contexto — impede argumentação sobre execução real.
4. System prompt genérico sobre autoria (precisa afirmar "Sergio Moro").

## Melhorias em `supabase/functions/redator-gazeta-chat/index.ts`

1. **Filtros extras no body**: aceitar `area_tematica`, `exercicio`, `limit` (default 80, máx 300).
2. **Amostragem estratificada** (executada em paralelo, depois deduplicada por id):
   - top 40 por `valor_total`
   - top 40 por `valor_pago`
   - top 5 por cada `area_tematica` distinta
3. **Colunas adicionais no select**: `valor_pago`, `valor_empenhado`, `exercicio` já incluído.
4. **Agregações prontas no `dataContext`**:
   - `valor_total_por_area_tematica`
   - `valor_total_por_exercicio`
   - `valor_pago_total` vs `valor_empenhado_total` vs `valor_total`
   - `top_10_municipios_por_valor_pago`
5. **Reforço do system prompt**:
   - "A base de emendas da plataforma corresponde integralmente às emendas parlamentares do senador **Sergio Moro** (PR). Ao citar cifras, atribua explicitamente ao senador."
   - "Sempre cite ao menos 2 cifras absolutas + 1 percentual, extraídos literalmente do CONTEXTO."
   - Estrutura obrigatória para contra-argumento à imprensa: (a) reconhecimento factual da pergunta, (b) 3 evidências numéricas da base, (c) fechamento com dado comparativo (ex.: execução vs empenho, ou ano vs ano).

## Validação final

Rodar 3 perguntas simuladas (saúde interior, segurança pública, comparação 2024 vs 2025) e checar se os números batem com `SELECT` direto na tabela — devolver o resultado no chat para você validar antes de fechar.
