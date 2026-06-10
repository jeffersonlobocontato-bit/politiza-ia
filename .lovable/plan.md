## Problema

Na aba **Pesquisas → Cruzar**, a lista "Candidatos para cruzar" é extraída dinamicamente dos resultados das pesquisas selecionadas. Como cada instituto grava o nome de forma diferente ("Sergio Moro", "Sergio Moro (PL)", "Requião Filho", "Requião Filho (PDT)"), a lista duplica e o gráfico fica ilegível — uma linha por variação de nome em vez de uma linha por candidato.

A plataforma já tem uma **lista mestre** (tabela `candidates`, com candidatos ativos por cargo) que deveria ser a fonte da verdade.

## Solução

### 1. Aliases de candidato (banco)
Adicionar coluna `name_aliases text[] default '{}'` em `public.candidates`. Cada candidato mestre passa a ter uma lista de "como esse nome aparece nas pesquisas" (ex.: Sergio Moro → `['sergio moro', 'sergio moro (pl)', 'moro']`). Comparação sempre por nome **normalizado** (sem acento, minúsculo, sem partido entre parênteses).

### 2. Cadastro / Configurações
Na tela onde os candidatos ativos são gerenciados, expor um campo "Variações de nome em pesquisas" (chips editáveis). Default: o próprio nome canônico já entra como alias automaticamente.

### 3. Importação de pesquisa (`parse-survey-pdf` + UI de revisão)
Ao salvar uma pesquisa, para cada `candidate_name` em `survey_results`:
- normaliza e tenta casar com algum alias da lista mestre **do mesmo cargo**;
- se casar, marca visualmente "✓ vinculado a {Candidato Mestre}";
- se não casar, mostra um alerta inline com 2 ações: **"Vincular a candidato existente"** (dropdown da lista mestre + grava o alias) ou **"Ignorar"** (mantém solto, não entra em cruzamentos).

Sem mudança destrutiva: `survey_results.candidate_name` continua armazenando o nome original do instituto. O vínculo é resolvido em runtime via aliases.

### 4. Aba Cruzar — nova mecânica
Substituir o `availableCandidates` dinâmico por: **lista mestre filtrada por cargo selecionado** (apenas candidatos `is_active`).

Fluxo:
1. Usuário escolhe cargo + pesquisas (1..4).
2. Sistema lista todos os candidatos ativos daquele cargo com um indicador ao lado:
   - **verde** "presente em N/N pesquisas"
   - **amarelo** "presente em X/N"
   - **cinza** "não aparece" (checkbox desabilitado)
3. Candidato principal = dropdown da mesma lista mestre.
4. Checkbox liga/desliga linha no gráfico. Desmarcar = remove a linha imediatamente.
5. Para montar o gráfico, cada ponto de cada pesquisa procura no resultado um `candidate_name` cujo nome normalizado esteja nos aliases do candidato mestre — uma linha por candidato mestre, independentemente de como cada instituto escreveu.

### 5. Tabela "Variação entre cenários"
Mesma normalização: colunas = candidatos mestre selecionados; deltas calculados sobre o valor consolidado por alias (não duplica mais).

## Detalhes técnicos

- **Migration**: `alter table public.candidates add column name_aliases text[] not null default '{}';` + índice GIN opcional. Sem novas policies (a tabela já tem RLS).
- **Helper novo** `src/lib/candidateMatch.ts`:
  ```ts
  export const normalizeName = (s: string) =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
     .replace(/\([^)]*\)/g, '')        // remove "(PL)", "(PDT)"
     .toLowerCase().replace(/\s+/g, ' ').trim();
  export const matchesCandidate = (resultName: string, master: Candidate) => {
    const n = normalizeName(resultName);
    return n === normalizeName(master.name)
      || (master.name_aliases ?? []).some(a => normalizeName(a) === n);
  };
  ```
- **`Pesquisas.tsx` → `TabCruzar`**: trocar `availableCandidates` (Set extraído de results) pelo array vindo de `useCandidate().candidates.filter(c => c.is_active && cargoMatches(c.cargo, targetCargo))`. Refatorar `chartData` para usar `matchesCandidate`. Adicionar contagem "presente em X/N pesquisas" por candidato e desabilitar quem tem 0.
- **`Configuracoes.tsx`** (ou onde candidatos são editados): adicionar input de aliases (chips).
- **Importação de pesquisa**: na confirmação atual (após parse do PDF), inserir um painel "Vincular candidatos detectados" antes do save final — lista os `candidate_name` não casados + dropdown + botão que grava no `name_aliases` do candidato escolhido.

## Validação

- Subir 2 pesquisas com grafias diferentes ("Sergio Moro" e "Sergio Moro (PL)") → após vincular, a aba Cruzar mostra **uma única linha** "Sergio Moro" cobrindo as duas pesquisas.
- Selecionar pesquisa onde Luiz França não aparece → checkbox aparece desabilitado com "não aparece".
- Desmarcar candidato → linha some imediatamente do gráfico e da tabela.
- Trocar candidato principal → lista de comparação se mantém estável (mesma fonte mestre).
