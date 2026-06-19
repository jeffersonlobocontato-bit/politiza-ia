## Objetivo

No "Por Camadas" da página **Hierarquia**, cada card de coordenador (níveis 3 Macrorregional, 4 Microrregional e 5 Municipal) passa a exibir:

1. **Cidade · Região** logo abaixo do nome e da função (tag territorial).
2. **Gestor imediato** (supervisor direto) abaixo, resolvido via `supervisor_id`.

E mantém a flexibilidade já planejada de vincular Macro/Micro/Municipal diretamente à Coordenação Política Estadual quando o nível intermediário não existir.

## Mudanças no card (`src/pages/Hierarquia.tsx`, função `renderCard`, ~linhas 614-712)

Estrutura visual nova, na ordem de cima para baixo, dentro do bloco `member ? (...)`:

```text
[Avatar]  Nome
          telefone/email
Função (cor do grupo)
[ Cidade · Macrorregião ( · Microrregião se houver ) ]   ← NOVO (tag pill discreta)
↑ Gestor: <Nome> · <papel curto>                          ← NOVO
[status]  [Equipe: N]
```

Detalhes:

- A tag de território usa os campos já existentes no membro: `member.municipality`, `member.macroregion_id` (resolvido pelo `macroRegions` já importado para nome legível) e `member.microregion` quando preenchido. Renderizada como `span` pill com `bg-muted/40 text-[10px]`.
- Linha de gestor: resolve `member.supervisor_id` em um lookup `memberById` (criar `useMemo(() => new Map(members.map(m => [m.id, m])), [members])`). Mostra `↑ Gestor: <Nome> · <papel resumido>`. Se vazio → texto cinza `— gestor não definido —`. Quando o supervisor for Nível 2 (Estadual), aparece o nome do coordenador estadual automaticamente.
- Aplica-se aos cards de Macro, Micro e Municipal (todos passam pelo `renderCard`). Nível 6 (Liderança Local), renderizado em bloco separado (~linha 872), **não muda** — já mostra cidade.

## Flexibilidade de vínculo (mantida do plano anterior)

Select "Vinculado a — supervisor direto" no formulário (`~linhas 415-449`) com `<optgroup>` por nível:

- Nível 4 (Micro): opções = Nível 3 (Macro filtrado pela macrorregião) **ou** Nível 2 (Estadual).
- Nível 5 (Municipal): opções = Nível 4 (Micro filtrado por macro+micro) **ou** Nível 3 (Macro filtrado) **ou** Nível 2 (Estadual).
- Nível 6: inalterado.

Nota curta abaixo do campo: "Se ainda não houver coordenador macro/micro, vincule diretamente ao estadual. Pode ser re-hierarquizado depois."

## Fora de escopo

- Sem mudanças de schema, RLS, hooks ou `HierarchyFlowchart.tsx`.
- Sem mudanças no card de Lideranças Locais (Nível 6).
- Sem migração de dados.

## Arquivo alterado

- `src/pages/Hierarquia.tsx` (único).
