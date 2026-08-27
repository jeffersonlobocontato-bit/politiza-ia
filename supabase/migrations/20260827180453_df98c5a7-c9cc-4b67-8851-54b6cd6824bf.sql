CREATE TABLE public.logistica_estoque_entradas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES public.logistica_itens_campanha(id) ON DELETE SET NULL,
  tipo_material text NOT NULL,
  quantidade integer NOT NULL CHECK (quantidade > 0),
  data_entrada date NOT NULL DEFAULT CURRENT_DATE,
  fornecedor text,
  observacoes text,
  deleted_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.logistica_estoque_entradas TO authenticated;
GRANT ALL ON public.logistica_estoque_entradas TO service_role;

ALTER TABLE public.logistica_estoque_entradas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view estoque entradas"
ON public.logistica_estoque_entradas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Gestores can insert estoque entradas"
ON public.logistica_estoque_entradas FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()) OR public.is_logistica_gestor(auth.uid()));

CREATE POLICY "Gestores can update estoque entradas"
ON public.logistica_estoque_entradas FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()) OR public.is_logistica_gestor(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()) OR public.is_logistica_gestor(auth.uid()));

CREATE POLICY "Gestores can delete estoque entradas"
ON public.logistica_estoque_entradas FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()) OR public.is_logistica_gestor(auth.uid()));

CREATE INDEX idx_estoque_entradas_material ON public.logistica_estoque_entradas (tipo_material);
CREATE INDEX idx_estoque_entradas_data ON public.logistica_estoque_entradas (data_entrada DESC);

CREATE TRIGGER update_logistica_estoque_entradas_updated_at
BEFORE UPDATE ON public.logistica_estoque_entradas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();