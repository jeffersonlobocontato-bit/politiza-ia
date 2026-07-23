## Diagnóstico

No `src/pages/CampoLiderancaForm.tsx`, linhas 276-285, os campos **Influência (1-10)** e **Mobilização (1-10)** usam `<input type="number">` com:

```
onChange={e => setInfluence(parseInt(e.target.value) || 5)}
```

Dois problemas juntos:

1. **Não dá para apagar o 5**: quando o usuário limpa o campo, `parseInt('')` = `NaN`, o `|| 5` reinsere `5` imediatamente. O valor "cola" em 5.
2. **Setas nativas ruins no mobile**: o stepper do `type="number"` no celular é minúsculo/ausente, forçando o teclado numérico para uma alteração de 1-10 que seria muito mais rápida por toque.

## O que ajustar

Somente frontend, arquivo `src/pages/CampoLiderancaForm.tsx`. Sem mudanças em outros campos, backend ou lógica de salvamento (continua enviando `influence_level` e `mobilization_level` como inteiros 1-10).

1. Criar um pequeno componente local `ScoreStepper` (dentro do próprio arquivo) com:
   - Botão `−` à esquerda, valor grande centralizado, botão `+` à direita.
   - Alto o suficiente para toque confortável no mobile (≥44px de área tocável), estilizado com as classes/cores do design `campo` já usadas na página.
   - Clamp entre `min` e `max` (1-10). Botões desativam visualmente nos extremos.
   - Suporta digitação direta no valor (mantém `inputMode="numeric"` e permite campo vazio temporariamente enquanto edita; ao sair do foco, se estiver vazio ou inválido, restaura o valor anterior — não força "5").
   - Toque prolongado (opcional/simples): apenas incrementa por clique; sem auto-repeat para manter simples.

2. Substituir os dois `<input type="number">` (Influência e Mobilização) pelo `ScoreStepper`, mantendo o mesmo grid de 2 colunas e os mesmos labels.

3. Manter o estado como `number` (default 5 na criação, valor do banco na edição). Remover o `|| 5` do handler para não sobrescrever entradas legítimas.

## Verificação

- Novo cadastro: valores iniciam em 5, botões `+`/`−` alteram de 1 em 1 respeitando 1-10.
- Edição de cadastro existente: valores carregam do banco e podem ser alterados.
- Digitar direto no campo do stepper: aceita apagar e redigitar; sair do foco vazio restaura o último valor válido.
- Submissão salva `influence_level` e `mobilization_level` corretamente (mesmo shape que hoje).
