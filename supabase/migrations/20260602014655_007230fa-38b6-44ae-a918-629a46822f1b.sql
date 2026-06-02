-- 1. Add new role values to enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'gestor_estadual_novo';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'gestor_estadual_pl';