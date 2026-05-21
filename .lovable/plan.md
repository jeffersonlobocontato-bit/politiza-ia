# Geolocalização Universal dos Cadastros nos Mapas

## Objetivo
Todo nome cadastrado na plataforma aparece como ponto nos mapas, com legenda própria por tipo de cadastro. Registros antigos sem GPS recebem coordenada do centróide do município (com leve jitter); novos cadastros passam a exigir GPS.

## Camadas (fontes de dados)
Cada fonte vira uma camada toggleável com cor/ícone próprios e popup com nome + papel + município:

| Camada | Tabela | Cor | Ícone |
|---|---|---|---|
| Lideranças (CRM) | `leaders` | Verde | Estrela |
| Ativos Políticos | `political_assets` | Azul | Bandeira |
| Membros da Campanha | `campaign_members` | Navy | Coroa (por nível) |
| Ações de Campo | `actions` | Âmbar | Megafone |
| Entrevistas Tracking | `tracking_interviews` | Ciano | Microfone |
| Alertas Operacionais | `alerts` | Vermelho | Alerta |

## Estratégia para registros sem lat/lng

1. **Helper `resolveGeo(record)`** em `src/lib/geo.ts`:
   - Se `lat/lng` existem → usa direto.
   - Senão, busca centróide do município em uma tabela `municipality_centroids` (a popular via migration com as 399 cidades do PR).
   - Aplica jitter determinístico (hash do `id` → offset ±0.008°) para evitar sobreposição.
   - Marca o ponto como "aproximado" no popup.

2. **Migration**: criar `public.municipality_centroids (name text PK, lat numeric, lng numeric, macroregion_id text)` e popular via `insert` tool com dataset das 399 cidades + Curitiba/RMC separados.

3. **Forms** (Lideranças, Ativos, Membros): tornar `GeoLocationInput` obrigatório nos novos cadastros (validação client-side), mantendo retrocompatibilidade com registros antigos.

## Mapas afetados

- **`src/pages/MapaEstrategico.tsx`** — adicionar as 6 camadas com toggles e legenda agregada.
- **`src/pages/SalaDeGuerra.tsx`** — mesmas camadas, controladas pelo candidato ativo.
- **`src/components/tracking/TrackingMap.tsx`** — manter foco em entrevistas, mas permitir overlay opcional de lideranças/membros para contexto.

## Componente reutilizável

`src/components/maps/LeadsLayer.tsx` — recebe `source: 'leaders' | 'assets' | 'members' | 'actions' | 'interviews' | 'alerts'` e renderiza marcadores + popup padronizados (nome, papel, território, badge "Aproximado" se geocodificado). Cada mapa importa só as camadas que quiser.

## Hook

`src/hooks/useGeoLeads.ts` — agrega todas as fontes com TanStack Query, escopadas ao candidato ativo, retornando `{ leaders, assets, members, actions, interviews, alerts }` já com `lat/lng` resolvidos via `resolveGeo`.

## Fora de escopo
- Edição em massa de coordenadas antigas (continuam usando centróide).
- Reverse geocoding online (usaremos apenas o dataset estático de centróides).
- Heatmap de leads (camada de pontos apenas; heatmap existente do tracking permanece como está).

## Entregáveis
1. Migration `municipality_centroids` + popular dados.
2. `src/lib/geo.ts` (resolveGeo, jitter, tipos).
3. `src/hooks/useGeoLeads.ts`.
4. `src/components/maps/LeadsLayer.tsx` + legenda.
5. Integração em `MapaEstrategico`, `SalaDeGuerra`, `TrackingMap`.
6. Validação obrigatória de GPS nos formulários de Lideranças, Ativos e Membros.
