## Objetivo

No mapa da chapa (`/chapas/:party`), substituir o basemap "vivo" do OpenStreetMap (que aparece colorido como satélite/ruas) por um mapa político limpo do Paraná, com a divisão por **Associações de Municípios** (AMUNPAR, AMCG, AMOP, ...) coloridas — mantendo as interações vivas (zoom, pan, hover, tooltip) e os pins/heatmap dos candidatos por cima.

É totalmente possível, usando GeoJSON dos 399 municípios do Paraná + a tabela `association_members` que já existe no banco para agrupar e colorir por associação.

## Como vai funcionar

1. **Basemap neutro**: troca o tile do OSM colorido por um basemap claro/discreto (CartoDB Positron) — fica só como referência geográfica suave, sem competir visualmente com as cores das associações. (Opcionalmente, podemos remover o tile completamente e deixar fundo da cor do tema.)

2. **Polígonos das Associações**: carrega o GeoJSON dos municípios do Paraná da API pública do IBGE (1x, cacheado). Usando o hook `useMunicipalityAssociationMap` (já existente), agrupa os municípios por `association_id` e desenha cada município como `<GeoJSON>` colorido conforme a associação a que pertence — gerando o efeito de "manchas" da imagem de referência.

3. **Paleta por associação**: cada uma das 19 associações recebe uma cor consistente (gerada uma vez, determinística por acrônimo, em tons pastéis similares à referência: verde, amarelo, rosa, lilás, azul, etc.). Curitiba fica destacada como célula independente da RMC, conforme a regra do projeto.

4. **Camadas mantidas vivas**:
   - Pan / zoom / scroll wheel continuam ativos.
   - Hover em município mostra tooltip com `Município` e `Associação`.
   - Pins dos candidatos e o modo "Calor" continuam funcionando por cima dos polígonos.
   - Filtros existentes (Federal / Estadual / Ambos, Pins / Calor) ficam iguais.

5. **Legenda**: adiciona um pequeno bloco lateral/colapsável com as 19 associações e suas cores (similar aos rótulos da imagem de referência, mas como legenda, não sobreposta no mapa).

## Detalhes técnicos

- **Arquivo único alterado**: `src/components/chapas/MapaChapa.tsx`.
- **Fonte do GeoJSON**: `https://servicodados.ibge.gov.br/api/v3/malhas/estados/41?formato=application/vnd.geo+json&qualidade=intermediaria&intrarregiao=municipio` (PR = 41). Cacheado via `useQuery` com `staleTime` longo.
- **Join**: `feature.properties.codarea` (código IBGE) ou `nome` → normaliza → lookup no `useMunicipalityAssociationMap()` → obtém `association.acronym` → cor.
- **Cor por associação**: função `colorForAssoc(acronym)` retornando HSL pastel determinística (mesma cor sempre para a mesma sigla).
- **Render**: `<GeoJSON data={fc} style={(f) => ({ fillColor, fillOpacity: 0.55, color: '#ffffff', weight: 0.6 })} onEachFeature={...tooltip...} />`.
- **Basemap**: `TileLayer` do CartoDB Positron (`https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png`) com `opacity: 0.4` — fica discreto e não conflita com as cores das associações.

## Sem mudanças

- Sem alterações no banco, hooks de dados, RLS, ou no `ChapaPartido.tsx` (continua passando `rows` e `party` para `MapaChapa`).
- Filtros, pins e heatmap continuam idênticos em comportamento.

## Observação

Municípios sem vínculo na tabela `association_members` ficam em cinza neutro com label "Sem associação" no tooltip — isso evidencia eventuais lacunas no cadastro sem quebrar o mapa.
