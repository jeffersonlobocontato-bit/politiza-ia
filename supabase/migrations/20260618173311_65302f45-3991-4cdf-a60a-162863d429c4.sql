-- Backfill slugs dos eventos existentes para o novo formato: {cidade}{DD-MM-AAAA}
-- Usa unaccent quando disponível; fallback para regex simples.
CREATE EXTENSION IF NOT EXISTS unaccent;

UPDATE public.eventos e
SET slug = sub.novo_slug
FROM (
  SELECT
    id,
    (
      regexp_replace(
        regexp_replace(
          lower(unaccent(COALESCE(NULLIF(trim(municipio), ''), titulo, 'evento'))),
          '[^a-z0-9\s-]', '', 'g'
        ),
        '\s+', '-', 'g'
      )
      || to_char(data_inicio, 'DD-MM-YYYY')
    ) AS novo_slug
  FROM public.eventos
) sub
WHERE e.id = sub.id
  AND e.slug IS DISTINCT FROM sub.novo_slug;
