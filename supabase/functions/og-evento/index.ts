// Edge function pública que entrega meta tags Open Graph para crawlers
// (WhatsApp, Facebook, Telegram, X, LinkedIn, etc.) e redireciona humanos
// para a URL amigável do evento.
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

function notFoundHtml(slug: string): string {
  const url = `${SITE_ORIGIN}/${encodeURIComponent(slug)}`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=${url}"><title>Evento não encontrado</title></head><body><script>location.replace(${JSON.stringify(url)})</script><a href="${url}">${url}</a></body></html>`;
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);

    // Aceita /og-evento/{slug} ou ?slug=
    let slug = url.searchParams.get("slug") ?? "";
    if (!slug) {
      const parts = url.pathname.split("/").filter(Boolean);
      slug = parts[parts.length - 1] ?? "";
      if (slug === "og-evento") slug = "";
    }
    slug = slug.toLowerCase().trim();

    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      return new Response("Slug inválido", { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

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
    const image = evento.imagem_capa_url || `${SITE_ORIGIN}/og-image.png`;

    const html = `<!doctype html>
<html lang="pt-BR" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(fullTitle)}</title>
  <meta name="description" content="${escapeHtml(descricao)}">
  <link rel="canonical" href="${friendlyUrl}">

  <meta property="og:type" content="event">
  <meta property="og:site_name" content="Politiza.IA">
  <meta property="og:locale" content="pt_BR">
  <meta property="og:url" content="${friendlyUrl}">
  <meta property="og:title" content="${escapeHtml(fullTitle)}">
  <meta property="og:description" content="${escapeHtml(descricao)}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta property="og:image:secure_url" content="${escapeHtml(image)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${escapeHtml(titulo)}">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(fullTitle)}">
  <meta name="twitter:description" content="${escapeHtml(descricao)}">
  <meta name="twitter:image" content="${escapeHtml(image)}">

  <meta http-equiv="refresh" content="0; url=${friendlyUrl}">
  <script>window.location.replace(${JSON.stringify(friendlyUrl)});</script>
</head>
<body>
  <p>Redirecionando para <a href="${friendlyUrl}">${friendlyUrl}</a>…</p>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=600",
        "X-Robots-Tag": "all",
      },
    });
  } catch (e) {
    console.error("og-evento error", e);
    return new Response("Erro ao gerar preview", { status: 500 });
  }
});
