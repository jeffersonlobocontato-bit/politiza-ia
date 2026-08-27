-- Módulo: Distribuição de Material — adiciona número de eleitores por município
-- Complementa o levantamento de domicílios já existente com o eleitorado de cada cidade,
-- para exibição junto à cobertura de material distribuído.

ALTER TABLE public.logistica_domicilios_municipio
  ADD COLUMN IF NOT EXISTS eleitores_estimado integer;

-- Carga inicial — eleitorado das cidades já disponíveis em public.municipalities
-- (mesma fonte usada para a estimativa de domicílios). As demais cidades ficam
-- pendentes e podem ser preenchidas manualmente pela tela de Distribuição de Material.
UPDATE public.logistica_domicilios_municipio AS d
SET eleitores_estimado = v.eleitores
FROM (VALUES
  ('4101408', 87000),
  ('4104303', 63000),
  ('4104808', 228000),
  ('4105805', 160000),
  ('4106407', 32000),
  ('4106902', 1181000),
  ('4108304', 167000),
  ('4108403', 62000),
  ('4109401', 116000),
  ('4110706', 39000),
  ('4111803', 27000),
  ('4113700', 363000),
  ('4115200', 288000),
  ('4118204', 96000),
  ('4118501', 55000),
  ('4119905', 228000),
  ('4125506', 218000),
  ('4127700', 96000),
  ('4128104', 73000)
) AS v(codigo_ibge, eleitores)
WHERE d.codigo_ibge = v.codigo_ibge;
