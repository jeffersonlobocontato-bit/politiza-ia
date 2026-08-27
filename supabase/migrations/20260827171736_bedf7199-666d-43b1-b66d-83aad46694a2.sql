CREATE TABLE public.logistica_itens_campanha (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  descricao text,
  unidade text NOT NULL DEFAULT 'unidade',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT ON public.logistica_itens_campanha TO authenticated;
GRANT ALL ON public.logistica_itens_campanha TO service_role;

ALTER TABLE public.logistica_itens_campanha ENABLE ROW LEVEL SECURITY;

CREATE POLICY "logistica_itens_select" ON public.logistica_itens_campanha
  FOR SELECT TO authenticated USING (ativo = true);

CREATE POLICY "logistica_itens_write" ON public.logistica_itens_campanha
  FOR ALL TO authenticated
  USING (public.is_logistica_gestor(auth.uid()))
  WITH CHECK (public.is_logistica_gestor(auth.uid()));

CREATE OR REPLACE FUNCTION public.update_logistica_itens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_logistica_itens_campanha_updated_at
BEFORE UPDATE ON public.logistica_itens_campanha
FOR EACH ROW EXECUTE FUNCTION public.update_logistica_itens_updated_at();

INSERT INTO public.logistica_itens_campanha (nome, unidade)
SELECT DISTINCT tipo_material, 'unidade'
FROM public.logistica_envios_material
WHERE tipo_material IS NOT NULL
  AND tipo_material NOT IN (SELECT nome FROM public.logistica_itens_campanha)
ORDER BY tipo_material;