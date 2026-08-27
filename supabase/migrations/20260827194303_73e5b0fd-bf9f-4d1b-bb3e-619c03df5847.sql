UPDATE public.user_roles ur
SET allowed_modules = (
  SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(ur.allowed_modules, ARRAY[]::text[]) || ARRAY['/distribuicao-material']))
)
FROM public.profiles p
WHERE p.id = ur.user_id
  AND lower(p.email) = 'daniela@politiza.ia.br';