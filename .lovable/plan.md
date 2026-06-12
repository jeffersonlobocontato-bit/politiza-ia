## Problema
Na aba **Lideranças** do app de campo (`/campo/liderancas`), o header estoura em mobile porque os dois CTAs — **Dashboard** e **Nova Liderança** — competem por espaço horizontal com o título. O botão verde principal fica comprimido e o layout quebra.

## Solução
Ajustar `src/pages/CampoLiderancas.tsx` para ser mobile-first no header e filtros:

1. **Header responsivo**
   - Em telas < sm: esconder o botão secundário **Dashboard** (deixa apenas o CTA principal visível).
   - Reduzir o botão **Nova Liderança** para ícone + label curto, ou apenas ícone em telas muito estreitas, garantindo que nunca estoure.
   - Manter o comportamento atual em desktop.

2. **Filtros**
   - Campo de busca ocupa largura total em mobile.
   - Dropdowns de filtro empilham verticalmente com `w-full` em telas pequenas, evitando overflow horizontal.

3. **Estado vazio**
   - Garantir que o CTA **Cadastrar primeira liderança** não estoure o card em larguras estreitas (permitir quebra de linha ou reduzir padding/fonte).

## Arquivo-alvo
- `src/pages/CampoLiderancas.tsx`