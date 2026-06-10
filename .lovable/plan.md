## Problema

Na aba **Pesquisas → Cruzar**, ao clicar em um candidato na lista "Candidatos para cruzar", o checkbox não marca. A causa é um **double-toggle**: o mesmo clique dispara `toggleComparison` duas vezes, cancelando o efeito.

No arquivo `src/pages/Pesquisas.tsx` (linhas ~1228-1251), cada item da lista tem três gatilhos sobrepostos:

1. `<div onClick={() => toggleComparison(c)}>` no wrapper
2. `<Checkbox onCheckedChange={() => toggleComparison(c)}>`
3. `<label htmlFor="cmp-${c}">` — clique no texto também aciona o checkbox

Resultado: clique no texto → label aciona checkbox (toggle 1) + bubbling pro div pai (toggle 2) = estado volta ao original. Clique no checkbox → onCheckedChange (toggle 1) + bubbling pro div (toggle 2) = idem.

Há também um bug secundário na linha 1089: `useMemo` está sendo usado para executar `setComparisonCandidates` (side-effect), o que é incorreto e dispara warnings/loops. Deve ser `useEffect`.

## Correção

Em `src/pages/Pesquisas.tsx`, dentro de `TabCruzar`:

1. **Lista de comparação (linhas ~1232-1249)**: deixar apenas UM handler. Remover o `onClick` do `<div>` wrapper e o `htmlFor` do `<label>`. O `Checkbox` com `onCheckedChange` cuida sozinho; o `<label>` recebe `onClick={() => toggleComparison(c)}` direto (sem `htmlFor`), e o wrapper fica sem handler. Assim cada clique → 1 toggle.

2. **Linha 1089**: trocar `useMemo(() => { setComparisonCandidates(...) }, [...])` por `useEffect(() => { setComparisonCandidates(...) }, [...])`.

Nenhuma outra alteração — escopo restrito ao componente `TabCruzar`.

## Validação

- Abrir Pesquisas → Cruzar → marcar candidatos da lista: cada clique deve alternar o estado uma única vez.
- Trocar candidato principal: lista de comparação atualiza sem warnings de "setState during render" no console.
