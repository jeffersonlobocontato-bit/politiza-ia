## Incorporação do Design System MobNex (camada aditiva, sem quebrar a plataforma)

### Princípio
Adotar o MobNex como **camada de design opcional e aditiva**, exposta via classes utilitárias `mn-*` e tokens CSS `--mn-*`, **sem alterar** os tokens semânticos atuais (`--primary`, `--background`, etc.) usados por todo o app (shadcn, gráficos, sidebar, páginas existentes). Isso garante zero regressão visual nas telas em produção e permite migração gradual módulo a módulo.

### O que será feito

**1. Tokens MobNex (aditivos)**
- Criar `src/styles/mobnex-tokens.css` com todas as variáveis da Seção 2 (`--mn-navy`, `--mn-green`, `--mn-blue`, espaçamentos, raios, sombras, transições).
- Importar no `src/index.css` antes do Tailwind. Não substituir os tokens existentes — apenas coexistir.

**2. Tipografia DM Sans**
- Importar DM Sans no topo do `index.css` (mantendo Inter como fallback).
- **Não** trocar a fonte global do `body` automaticamente para evitar mudança visual brusca em todas as páginas atuais. Em vez disso, expor a fonte via classe `.mn-font` e aplicá-la nas novas telas/componentes MobNex.
- Adicionar a classe `.mn-font` no container raiz dos novos módulos MobNex quando criados.

**3. Componentes CSS MobNex**
- `src/styles/mobnex-typography.css` — escalas `.mn-text-hero`, `.mn-label`, `.mn-text-metric`, etc.
- `src/styles/mobnex-components.css` — todas as classes da Seção 4 (app-bar, btn, metric-card, task-card, badge, points-block, rank-list, feature-icon, sidebar, dashboard, notif-row, hero-dark, divider, profile-card).
- `src/styles/mobnex-animations.css` — keyframes da Seção 5 + `prefers-reduced-motion`.
- Importar todos no `index.css`.

**4. Wrappers React em `src/components/mobnex/`**
- `MnButton`, `MnMetricCard`, `MnTaskCard`, `MnBadge`, `MnPointsBlock`, `MnRankList`, `MnFeatureIcon`, `MnAppBar`, `MnProfileCard`, `MnDivider`.
- Cada um aplica as classes `mn-*` correspondentes; usam `lucide-react` (já presente no projeto) com `strokeWidth={1.8}`.
- Tipados em TS, prontos para uso nas próximas features (gamificação, app de mobilização, perfil de eleitor).

**5. Showcase / página de referência (opcional, não roteada por padrão)**
- `src/pages/MobnexShowcase.tsx` exibindo todos os componentes MobNex em ambos os contextos (dark/light) — útil para QA visual e referência da equipe. Não adicionar ao sidebar; acessível apenas via rota direta `/mobnex` se desejado.

### O que **não** será feito (para preservar funcionalidades existentes)

- Não substituir o `Button` do shadcn nem alterar `variant="default"`/`primary` global.
- Não trocar a fonte do `body` para DM Sans (alteraria toda a UI de uma vez).
- Não remapear `--primary`, `--secondary`, `--background`, `--sidebar-*` para os valores MobNex — isso quebraria a paleta Navy-Teal já consolidada nos módulos analíticos (Tracking, Pesquisas, Sala de Guerra) e nos gráficos.
- Não converter cards/botões existentes em massa. A migração para MobNex será feita **sob demanda**, módulo a módulo, conforme você priorizar (provável candidato natural: novo módulo de gamificação/mobilização do eleitor).

### Estrutura de arquivos
```text
src/
├── styles/
│   ├── mobnex-tokens.css
│   ├── mobnex-typography.css
│   ├── mobnex-components.css
│   └── mobnex-animations.css
├── components/mobnex/
│   ├── MnButton.tsx
│   ├── MnMetricCard.tsx
│   ├── MnTaskCard.tsx
│   ├── MnBadge.tsx
│   ├── MnPointsBlock.tsx
│   ├── MnRankList.tsx
│   ├── MnFeatureIcon.tsx
│   ├── MnAppBar.tsx
│   ├── MnProfileCard.tsx
│   └── MnDivider.tsx
└── pages/MobnexShowcase.tsx   (opcional)
```
`src/index.css` recebe 4 `@import` adicionais e o `@import` do Google Fonts para DM Sans.

### Próximo passo após implementar
Escolher o **primeiro módulo a migrar visualmente** para MobNex (sugestão: criar um novo módulo "Mobilização/Gamificação do Eleitor" usando 100% MobNex desde o início, ou aplicar gradualmente em Municípios/Territórios).

### Riscos e mitigações
- **Conflito de classes Tailwind vs `mn-*`**: prefixo `mn-` evita colisão.
- **Peso extra de CSS**: ~6KB adicionais, irrelevante.
- **DM Sans só carrega quando usada**: import existe mas só é aplicada via `.mn-font`, sem FOUT global.
