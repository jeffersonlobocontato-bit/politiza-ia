
-- Fix soft-delete failing due to SELECT policy hiding rows after deleted_at is set,
-- which causes PostgREST to return 42501 "new row violates RLS" on the UPDATE returning.
-- Adjust SELECT policies to allow the owner/subtree/admin to still see soft-deleted rows;
-- app-level queries already filter deleted_at IS NULL.

-- leaders
DROP POLICY IF EXISTS "Leaders visible by scope" ON public.leaders;
CREATE POLICY "Leaders visible by scope" ON public.leaders
FOR SELECT USING (
  is_admin(auth.uid())
  OR created_by = auth.uid()
  OR is_in_my_subtree(auth.uid(), created_by)
  OR (
    deleted_at IS NULL AND candidate_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_candidates uc
      WHERE uc.user_id = auth.uid() AND uc.candidate_id = leaders.candidate_id
    )
  )
);

-- political_assets: apply same relaxation if SELECT policy hides soft-deleted rows
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname, qual
    FROM pg_policies
    WHERE schemaname='public' AND tablename='political_assets' AND cmd='SELECT'
      AND qual LIKE '%deleted_at IS NULL%'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.political_assets', r.policyname);
  END LOOP;
END $$;

-- actions: same
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname, qual
    FROM pg_policies
    WHERE schemaname='public' AND tablename='actions' AND cmd='SELECT'
      AND qual LIKE '%deleted_at IS NULL%'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.actions', r.policyname);
  END LOOP;
END $$;

-- Recreate SELECT policies without deleted_at filter (app filters it)
CREATE POLICY "Political assets visible by scope" ON public.political_assets
FOR SELECT USING (
  is_admin(auth.uid())
  OR created_by = auth.uid()
  OR is_in_my_subtree(auth.uid(), created_by)
);

CREATE POLICY "Actions visible by scope" ON public.actions
FOR SELECT USING (
  is_admin(auth.uid())
  OR created_by = auth.uid()
  OR is_in_my_subtree(auth.uid(), created_by)
  OR (
    candidate_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_candidates uc
      WHERE uc.user_id = auth.uid() AND uc.candidate_id = actions.candidate_id
    )
  )
);
