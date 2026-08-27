CREATE OR REPLACE FUNCTION public.is_logistica_gestor(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin_master', 'coordenador_estadual', 'coordenador_regional',
                   'coordenador_municipal', 'gestor_operacional', 'operador_campo',
                   'gestor_administrativo')
  );
$function$;