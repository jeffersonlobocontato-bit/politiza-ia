## Problema
Hoje o card "Projeção Bom" no Dashboard de Chapas mostra apenas o cenário Bom, mas a confusão é que os totais por cenário (Bom, Médio, Ruim) não devem ser somados entre si — cada um é um cenário independente. Além disso, o usuário quer poder alternar qual cenário visualizar.

## Mudanças (apenas UI em `src/pages/Chapas.tsx`)

1. **Big Number "Projeção" com seletor de cenário**
   - Substituir o card fixo `Projeção Bom` por um card único `Projeção de Votos` com um seletor compacto (3 pills/toggle: `Bom` · `Médio` · `Ruim`) no canto superior direito do card.
   - O valor exibido muda conforme o cenário selecionado (sem somar cenários — apenas troca a fonte: `votes_bom`, `votes_medio` ou `votes_ruim` agregados pelos pré-candidatos dos partidos permitidos).
   - Cenário padrão: `Médio` (cenário base de planejamento). Estado local `scenario: 'bom' | 'medio' | 'ruim'`.
   - Microcopy abaixo do número: "Soma do cenário {Bom/Médio/Ruim} entre os pré-candidatos exibidos".

2. **Cards por Partido × Cargo (PL/Novo × Fed/Est)**
   - O MiniStat "Projeção" de cada card também passa a respeitar o cenário escolhido no Big Number (fonte única de verdade no topo).
   - Label do MiniStat vira `Proj. (Bom|Médio|Ruim)` para deixar explícito.

3. **Card resumo na Sala de Guerra (`SalaDeGuerra.tsx`)**
   - Mesma lógica: trocar a pílula fixa de "Bom" por um mini-toggle de cenário, mantendo Médio como padrão. (Apenas se já existir o resumo — não criar nada novo.)

4. **DetailSheet**
   - O total no header (`Projeção (Bom): X votos`) passa a refletir o cenário selecionado no dashboard que abriu o sheet. Passar `scenario` como prop.

## Não muda
- Schema do banco, hooks, RLS, dados.
- Os 3 valores por cenário continuam visíveis no DetailSheet (linha Bom/Médio/Ruim de cada pré-candidato).
- Outros big numbers (Pré-candidatos, Federal, Estadual, Filiação OK/Pendente).

## Componente visual do seletor
Um pequeno grupo de 3 botões `text-[10px]` dentro do card, estilo segmented control com o ativo em `bg-primary/15 text-primary`, inativos em `text-muted-foreground hover:text-foreground`. Sem dependência nova.
