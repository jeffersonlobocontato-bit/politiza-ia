
DROP VIEW IF EXISTS public.juridico_users;
CREATE VIEW public.juridico_users WITH (security_invoker = on) AS
SELECT p.id, p.full_name, p.email
FROM public.profiles p
WHERE EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = p.id
    AND ur.role IN ('juridico','admin_master','coordenador_geral','coordenador_estadual')
);
GRANT SELECT ON public.juridico_users TO authenticated;

DROP POLICY IF EXISTS "notif_insert_authn" ON public.notifications;
-- Only service_role / SECURITY DEFINER triggers insert. No policy = no INSERT for authenticated.
