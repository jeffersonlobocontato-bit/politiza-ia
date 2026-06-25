INSERT INTO public.user_candidates (user_id, candidate_id)
SELECT p.id, c.id
FROM public.profiles p
CROSS JOIN public.candidates c
WHERE p.email = 'marcelo@politiza.ia.br'
  AND c.is_active = true
ON CONFLICT (user_id, candidate_id) DO NOTHING;