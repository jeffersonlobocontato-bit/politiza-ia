CREATE TABLE public.municipalities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  mayor_name text,
  phone text,
  address text,
  neighborhood text,
  cep text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.municipalities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Municípios visíveis por autenticados"
  ON public.municipalities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin gerencia municípios"
  ON public.municipalities FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));