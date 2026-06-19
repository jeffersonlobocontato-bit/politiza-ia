Entendi a frustração. O problema real não é o texto do botão: é que o WhatsApp não executa React/JavaScript e precisa receber uma página HTML já pronta com Open Graph no primeiro carregamento.

O que identifiquei:
- `https://politiza.ia.br/cascavel18-06-2026b` hoje entrega a página React da LP, como um app estático. Para humanos funciona, mas para WhatsApp não há HTML inicial com `og:title`, `og:description` e `og:image` específicos do evento.
- A edge function `/og-evento/...` já busca o título, descrição e imagem corretos, mas ainda está com comportamento que pode atrapalhar o WhatsApp: ela inclui redirecionamento automático no mesmo HTML que contém os metadados.
- O Sympla faz de forma mais robusta: o próprio link compartilhável entrega HTML server-side com metadados do evento e imagem pública/CDN já no primeiro HTML. A imagem não depende de JavaScript nem de URL assinada longa.

Plano de correção:

1. Ajustar a edge function `og-evento` para separar humanos de robôs
   - Detectar User-Agent de WhatsApp, Facebook, Telegram, LinkedIn, X/Twitter e crawlers sociais.
   - Para robôs: retornar HTML estático com `title`, `description`, `og:title`, `og:description`, `og:image`, `twitter:*` e sem meta refresh / sem script de redirect.
   - Para humanos: redirecionar para `https://politiza.ia.br/<slug>`.

2. Corrigir a URL da imagem para ficar no padrão aceito por WhatsApp
   - Melhor opção: tornar o bucket `evento-banners` público, porque o banner já é exibido publicamente na LP de inscrição.
   - Passar a usar URL pública curta do storage/CDN no `og:image`, em vez de signed URL gigante.
   - Manter fallback para imagem padrão se o evento não tiver banner.

3. Ajustar o botão “Enviar no WhatsApp”
   - Enviar prioritariamente o link crawleável `/functions/v1/og-evento/<slug>`.
   - Simplificar a mensagem para não competir com o preview do WhatsApp.
   - Garantir que o link compartilhado seja o último/único URL da mensagem.

4. Validar como crawler
   - Testar a função com User-Agent de WhatsApp.
   - Confirmar que o HTML retornado contém os dados do evento `cascavel18-06-2026b`.
   - Confirmar que `og:image` retorna imagem pública com `200` e `Content-Type` correto.

Limite técnico importante:
- O link direto `https://politiza.ia.br/<slug>` não consegue ter Open Graph dinâmico por evento enquanto for servido como SPA estática. Para preview correto no WhatsApp, o link compartilhado precisa passar pela rota crawleável da edge function, exatamente para entregar metadados antes do React carregar.