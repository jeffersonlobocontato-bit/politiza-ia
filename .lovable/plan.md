

# Tooltip com dados demográficos no mapa do Tracking

## O que será feito

Quando o usuário passar o mouse sobre um pin no mapa de geolocalização, o tooltip/popup mostrará os dados demográficos do entrevistado: município, gênero, faixa etária, renda e escolaridade (além da data e coordenadas já existentes).

## Alterações

### 1. Expandir a interface `Interview` no TrackingMap

A interface atual só tem `id`, `round_id`, `municipality`, `lat`, `lng`, `created_at`. Adicionar os campos demográficos que já existem na tabela `tracking_interviews`:
- `respondent_gender`
- `respondent_age_range`
- `respondent_income`
- `respondent_education`

### 2. Atualizar o popup do marcador

Trocar `bindPopup` por `bindTooltip` (para aparecer no hover, não no click) ou manter popup mas exibir os dados demográficos com ícones visuais:
- 👤 Gênero
- 🎂 Faixa etária
- 💰 Renda
- 🎓 Escolaridade
- 📍 Município
- 📅 Data/hora

Manter o design system navy/dark do tracking nos estilos inline do tooltip.

### Arquivo editado
- `src/components/tracking/TrackingMap.tsx` — interface `Interview` e conteúdo do popup/tooltip

Nenhuma alteração no `TrackingDashboard.tsx` é necessária, pois `allInterviews` já retorna todos os campos da tabela via `select('*')`.

