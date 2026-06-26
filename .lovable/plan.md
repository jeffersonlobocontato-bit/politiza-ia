## Problema

Hoje os pins do mapa da Sala de Guerra são coloridos por **origem** (4 cores: Ativos / Candidatos / Coordenadores / Eventos). Como ~80% dos registros vêm da base "Ativos Políticos" (nativos), o mapa fica **dominado por azul**, perdendo a leitura intuitiva.

## Proposta — colorir por TIPO/FUNÇÃO (não por origem)

Trocar a paleta de 4 cores por uma matriz de **cores agrupadas em famílias**, com tons que indicam hierarquia dentro de cada família. Assim diferentes categorias ficam visualmente distintas, mesmo vindo da mesma origem.

### Mapa de cores sugerido

**Família Executiva (tons de vermelho/laranja) — poder executivo**
- `#DC2626` Prefeito
- `#F97316` Vice-Prefeito
- `#FCD34D` Secretário municipal

**Família Legislativa (tons de roxo) — mandato parlamentar**
- `#7C3AED` Deputado Federal
- `#A855F7` Deputado Estadual
- `#C084FC` Vereador

**Família Candidatos & Coligação (tons de rosa/magenta)**
- `#EC4899` Candidato (majoritária)
- `#F472B6` Pré-candidato proporcional

**Família Coordenação / Campanha (tons de verde)**
- `#15803D` Coord. Geral / Estadual
- `#22C55E` Coord. Macrorregional
- `#4ADE80` Coord. Microrregional
- `#86EFAC` Coord. Municipal

**Família Lideranças & Base (tons de ciano/azul)**
- `#0891B2` Presidente de entidade
- `#06B6D4` Liderança comunitária
- `#22D3EE` Liderança partidária
- `#67E8F9` Apoiador / Militante / Voluntário

**Família Eventos & Captação (tons de âmbar)**
- `#F59E0B` Público de eventos (leads)

**Outros / Sem classificação**
- `#94A3B8` cinza neutro

### Legenda

Substituir a legenda atual de 4 itens por um painel **agrupado por família**, expansível, mostrando contagem ao lado de cada tag (ex.: `Prefeito · 287`). Permite ao usuário entender de relance a composição do mapa.

### Comportamento

- Mantém o toggle "Cores / Contornos / Oculto" do fundo do mapa.
- Mantém o toggle de exibição de pins de ativos (`showAssetPins`).
- Adiciona toggles **por família** na legenda (clicar oculta/exibe aquela família) para facilitar análise focada.
- Tooltip do pin continua mostrando nome, tipo, cidade e origem.

## Arquivos a alterar

- `src/pages/SalaDeGuerra.tsx` — substituir `ORIGIN_COLORS` por `TYPE_COLORS` mapeando `UnifiedAssetType` → cor + família; refatorar legenda; adicionar filtro por família.
- Sem alterações em hooks ou no banco — apenas camada de visualização.

## Validação

Após implementar, abrir `/sala-de-guerra`, conferir distribuição visual no mapa do Paraná e verificar a contagem por tipo na nova legenda.
