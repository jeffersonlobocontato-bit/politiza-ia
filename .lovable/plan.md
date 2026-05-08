## Aplicar MobNex como design system global da plataforma

### Objetivo
Trocar a identidade visual atual (Navy-Teal Emerald/Gold + Inter) pela identidade **MobNex** (Navy escuro + Verde + DM Sans) em **todas as telas**, sem quebrar funcionalidades. Os componentes shadcn/Tailwind atuais continuam funcionando, mas passam a renderizar com as cores e a tipografia do MobNex automaticamente, via reescrita dos tokens semânticos em `index.css`.

---

### Estratégia
A plataforma já usa tokens semânticos HSL (`--background`, `--primary`, `--card`, `--sidebar-*`, etc.) consumidos por Tailwind e pelos componentes shadcn. Em vez de tocar componente por componente, **reescrevemos os valores desses tokens** para casarem com a paleta MobNex. Resultado: todas as telas mudam de aparência simultaneamente.

---

### Mudanças

**1. `src/index.css` — reescrita dos tokens (tema dark padrão + light + dark)**
- `--background`, `--card`, `--popover`, `--sidebar-background`: passam ao **Navy MobNex** (`--mn-navy` / `--mn-navy-2`).
- `--primary`: passa ao **Verde MobNex** (`#22B14C` em HSL). `--ring` e `--sidebar-primary` acompanham.
- `--secondary`: tom de apoio MobNex (cinza-azulado claro no light, navy-2 no dark).
- `--border`, `--input`, `--muted`: ajustados para os cinzas neutros do MobNex.
- `--gradient-primary`, `--shadow-glow`: recalculados em torno do verde.
- Tema `.light`: fundo claro MobNex (`--mn-surface-alt` / branco), texto navy, primary verde.
- Mantém estrutura existente (mesmos nomes de variáveis) — zero alteração nos componentes consumidores.

**2. `src/index.css` — tipografia global**
- Trocar `body { font-family: 'Inter', ... }` por `body { font-family: 'DM Sans', 'Inter', sans-serif; }`.
- Manter Inter como fallback para evitar FOUT.
- Headings herdam DM Sans automaticamente.

**3. `tailwind.config.ts` — fontes**
- Adicionar `fontFamily.sans: ['DM Sans', 'Inter', ...]` para que utilitários `font-sans` reflitam a mudança.
- Manter `font-mono` (JetBrains Mono) para números técnicos (mapas, KPIs monoespaçados).

**4. Memória do projeto**
- Atualizar `mem://style/design-system-palette` e `mem://style/branding` para refletir a nova paleta MobNex como padrão.
- Atualizar Core do `mem://index.md`: trocar "Navy-Teal Emerald" por "Navy MobNex + Verde MobNex, DM Sans".

---

### O que NÃO muda
- **Lógica de negócio, hooks, queries, rotas**: intocados.
- **Componentes shadcn/Mn\***: mantidos como estão; só renderizam diferente porque os tokens mudaram.
- **Mapas Leaflet, gráficos Recharts**: continuam usando os mesmos tokens semânticos, então acompanham automaticamente.
- **Cores específicas de status** (`--status-error`, `--risk-high`, etc.): preservadas para não quebrar alertas, riscos e indicadores.
- **Cores de candidatos** (paleta `mem://style/candidate-color-logic`): preservadas.
- **Rota `/mobnex`** (showcase): segue funcionando como referência.

---

### Riscos e mitigação
- **Contraste em alguns componentes customizados** (ex.: cards com background hardcoded): se aparecer, ajusto pontualmente após a aplicação global.
- **Leaflet popups e tooltips**: já usam tokens semânticos — devem acompanhar sem ajuste.
- **Validação visual**: após aplicar, abro Sala de Guerra, Territórios, Municípios e Tracking para conferir e corrijo qualquer regressão visível.

---

### Arquivos tocados
- `src/index.css` (tokens + body font)
- `tailwind.config.ts` (fontFamily)
- `mem://style/design-system-palette`, `mem://style/branding`, `mem://index.md`
