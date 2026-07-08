
CREATE TABLE IF NOT EXISTS public.cruzamento_moro_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  granted_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

GRANT SELECT ON public.cruzamento_moro_access TO authenticated;
GRANT ALL ON public.cruzamento_moro_access TO service_role;

ALTER TABLE public.cruzamento_moro_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_master manages cruzamento_moro_access"
  ON public.cruzamento_moro_access
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'));

CREATE POLICY "user sees own cruzamento_moro_access"
  ON public.cruzamento_moro_access
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
