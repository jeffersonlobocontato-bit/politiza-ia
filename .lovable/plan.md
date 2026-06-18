## Objetivo

Quando alguém compartilhar a URL de um evento (ex.: `politiza.ia.br/curitiba25-12-2026`) em WhatsApp, Telegram, Facebook, X, LinkedIn etc., o preview do link deve mostrar:

- **Imagem**: banner do evento (com o recorte/posição configurados)
- **Título**: título do evento
- **Descrição**: descrição do evento
- **URL**: link amigável do evento

## Contexto técnico

Hoje a página `EventoPublico` define o `<title>` e meta tags via JavaScript (React), mas crawlers de redes sociais (WhatsApp, Facebook, etc.) **não executam JS** — eles leem só o HTML estático servido. Resultado: o preview hoje mostra título/imagem genéricos do `index.html`, não os do evento.

A solução é renderizar as meta tags Open Graph / Twitter Card no servidor, antes do HTML chegar ao crawler.

## Implementação

### 1. Edge function `og-evento` (Deno, pública, sem JWT)

- Rota: chamada a partir de uma reescrita para qualquer URL de evento
- Recebe o `slug` do evento
- Busca o evento na tabela `eventos` (somente publicados)
- Detecta o User-Agent:
  - **Crawler** (WhatsApp, facebookexternalhit, Twitterbot, LinkedInBot, Slackbot, TelegramBot, Discordbot, etc.): retorna um HTML mínimo só com as meta tags Open Graph + Twitter Card preenchidas com dados do evento
  - **Navegador humano**: faz redirect 302 para `/<slug>` (a SPA continua funcionando como hoje)
- Imagem: usa a URL pública do banner do evento (bucket `evento-banners`); se o bucket for privado, gera URL assinada de longa duração. Tamanho recomendado 1200×630.

### 2. Roteamento público

- Em `index.html` ou via `_redirects` (Lovable/Netlify-style), configurar que requisições de bots para `/{slug}` caiam na edge function antes da SPA.
- Como detectar bot no edge sem alterar nginx: a edge function é chamada **para todos** e ela decide entre devolver HTML-meta ou redirect — assim humanos veem a SPA normalmente.

### 3. Meta tags geradas

```text
<title>{titulo} — {cidade}</title>
<meta name="description" content="{descricao curta}">
<link rel="canonical" href="https://politiza.ia.br/{slug}">

<meta property="og:type" content="event">
<meta property="og:url" content="https://politiza.ia.br/{slug}">
<meta property="og:title" content="{titulo}">
<meta property="og:description" content="{descricao}">
<meta property="og:image" content="{banner_url}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:site_name" content="Politiza.IA">
<meta property="og:locale" content="pt_BR">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{titulo}">
<meta name="twitter:description" content="{descricao}">
<meta name="twitter:image" content="{banner_url}">
```

### 4. Fallback dentro da SPA

Manter no `EventoPublico.tsx` o ajuste de `document.title` e meta tags via React (já existe) — útil para abas de navegador e para usuários que chegam direto.

### 5. Cache

Resposta da edge function com `Cache-Control: public, max-age=300, s-maxage=600` para acelerar previews repetidos sem ficar desatualizada por muito tempo.

## Fora de escopo

- Não alteramos o slug atual nem o fluxo de inscrição.
- Não geramos imagem dinâmica (OG image gerada on-the-fly) — usamos o próprio banner do evento.
- Não tocamos no design da página pública.

## Pontos a confirmar

1. O bucket `evento-banners` é privado hoje. Posso torná-lo **público** para que o WhatsApp consiga buscar a imagem direto? (Alternativa: gerar URLs assinadas com validade longa, mais frágil.)
2. A descrição usada no preview deve ser a `descricao` do evento truncada em ~200 caracteres, OK?
