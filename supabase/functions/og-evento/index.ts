// Edge function pública que entrega meta tags Open Graph para crawlers
// (WhatsApp, Facebook, Telegram, X, LinkedIn, etc.) e redireciona humanos
// para a URL amigável do evento.
//
// Rotas:
//   GET /og-evento?slug=xxx          → HTML com meta tags + redirect
//   GET /og-evento/{slug}            → idem
//   GET /og-evento/image/{slug}      → bytes da imagem de capa (proxy limpo,
//                                       sem signed URL gigante — WhatsApp gosta)
import { createClient } from "npm:@supabase/supabase-js@2";

const SITE_ORIGIN = "https://politiza.ia.br";

function escapeHtml(s: string): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function truncate(s: string, n: number): string {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

function isSocialCrawler(userAgent: string): boolean {
  return /whatsapp|facebookexternalhit|facebot|telegrambot|twitterbot|x-twitter|linkedinbot|slackbot|discordbot|googlebot|bingbot|pinterest|vkshare|skypeuripreview|embedly|quora link preview|outbrain|ia_archiver/i
    .test(userAgent);
}

function resolveImageType(pathOrUrl: string | null): string {
  const clean = (pathOrUrl ?? "").split("?")[0].toLowerCase();
  if (clean.endsWith(".png")) return "image/png";
  if (clean.endsWith(".webp")) return "image/webp";
  if (clean.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

function notFoundHtml(slug: string): string {
  const url = `${SITE_ORIGIN}/${encodeURIComponent(slug)}`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=${url}"><title>Evento não encontrado</title></head><body><script>location.replace(${JSON.stringify(url)})</script><a href="${url}">${url}</a></body></html>`;
}

// Extrai o caminho do objeto no bucket "evento-banners" a partir de uma URL
// salva no banco (pode ser signed URL antiga ou public URL).
function extractBannerPath(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\/evento-banners\/(.+)$/);
    if (m) return decodeURIComponent(m[1]);
  } catch (_) {/* ignore */}
  return null;
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    // Remove o prefixo da função, se presente
    const idx = parts.indexOf("og-evento");
    const sub = idx >= 0 ? parts.slice(idx + 1) : parts;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ───────── Rota: proxy de imagem ─────────
    if (sub[0] === "image" && sub[1]) {
      const slug = sub[1].toLowerCase().trim();
      if (!/^[a-z0-9-]+$/.test(slug)) {
        return new Response("Slug inválido", { status: 400 });
      }
      const { data: ev } = await supabase
        .from("eventos")
        .select("imagem_capa_url")
        .eq("slug", slug)
        .maybeSingle();

      const path = extractBannerPath(ev?.imagem_capa_url ?? null);
      if (!path) {
        // Fallback: redireciona para o og-image padrão do site
        return Response.redirect(`${SITE_ORIGIN}/og-image.png`, 302);
      }

      const { data: file, error: dErr } = await supabase.storage
        .from("evento-banners")
        .download(path);
      if (dErr || !file) {
        return Response.redirect(`${SITE_ORIGIN}/og-image.png`, 302);
      }

      const mime = resolveImageType(path);

      return new Response(file, {
        status: 200,
        headers: {
          "Content-Type": mime,
          "Content-Length": String(file.size),
          "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // ───────── Rota: HTML com Open Graph ─────────
    let slug = url.searchParams.get("slug") ?? "";
    if (!slug) slug = sub[sub.length - 1] ?? "";
    slug = slug.toLowerCase().trim();

    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      return new Response("Slug inválido", { status: 400 });
    }

    const { data: evento, error } = await supabase
      .from("eventos")
      .select(
        "slug, titulo, descricao, imagem_capa_url, municipio, local_nome, data_inicio, status",
      )
      .eq("slug", slug)
      .maybeSingle();

    if (error || !evento) {
      return new Response(notFoundHtml(slug), {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const friendlyUrl = `${SITE_ORIGIN}/${encodeURIComponent(slug)}`;
    const titulo = evento.titulo || "Evento";
    const cidade = evento.municipio || "";
    const fullTitle = cidade ? `${titulo} — ${cidade}` : titulo;
    const descricao = truncate(
      evento.descricao ||
        `Inscreva-se no evento ${titulo}${cidade ? ` em ${cidade}` : ""}.`,
      200,
    );

    // og:image SEMPRE via proxy limpo desta função — URL curta, sem token,
    // funciona em WhatsApp/Telegram/Facebook sem drama.
    const functionsBase = `${Deno.env.get("SUPABASE_URL")!}/functions/v1/og-evento`;
    const image = evento.imagem_capa_url
      ? `${functionsBase}/image/${encodeURIComponent(slug)}`
      : `${SITE_ORIGIN}/og-image.png`;
    const imageType = resolveImageType(evento.imagem_capa_url);
    const userAgent = req.headers.get("user-agent") ?? "";
    const crawler = isSocialCrawler(userAgent);

    const html = `<!doctype html>
<html lang="pt-BR" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(fullTitle)}</title>
  <meta name="description" content="${escapeHtml(descricao)}">
  <link rel="canonical" href="${friendlyUrl}">

  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Politiza.IA">
  <meta property="og:locale" content="pt_BR">
  <meta property="og:url" content="${friendlyUrl}">
  <meta property="og:title" content="${escapeHtml(fullTitle)}">
  <meta property="og:description" content="${escapeHtml(descricao)}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta property="og:image:secure_url" content="${escapeHtml(image)}">
  <meta property="og:image:type" content="${imageType}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${escapeHtml(titulo)}">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(fullTitle)}">
  <meta name="twitter:description" content="${escapeHtml(descricao)}">
  <meta name="twitter:image" content="${escapeHtml(image)}">

  ${crawler ? "" : `<meta http-equiv="refresh" content="0; url=${friendlyUrl}">`}
  ${crawler ? "" : `<script>window.location.replace(${JSON.stringify(friendlyUrl)})</script>`}
</head>
<body>
  <p>Redirecionando para <a href="${friendlyUrl}">${friendlyUrl}</a>…</p>
</body>
</html>`;

    if (!crawler) {
      return Response.redirect(friendlyUrl, 302);
    }

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=300",
        "X-Robots-Tag": "all",
        "Vary": "User-Agent",
      },
    });
  } catch (e) {
    console.error("og-evento error", e);
    return new Response("Erro ao gerar preview", { status: 500 });
  }
});
