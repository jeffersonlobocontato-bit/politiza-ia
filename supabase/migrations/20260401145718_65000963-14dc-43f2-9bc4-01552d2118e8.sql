
-- Add missing columns to tracking_rounds
ALTER TABLE public.tracking_rounds ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.tracking_rounds ADD COLUMN IF NOT EXISTS state text DEFAULT 'PR';
ALTER TABLE public.tracking_rounds ADD COLUMN IF NOT EXISTS start_time time;
ALTER TABLE public.tracking_rounds ADD COLUMN IF NOT EXISTS end_time time;
ALTER TABLE public.tracking_rounds ADD COLUMN IF NOT EXISTS share_code text UNIQUE;

-- Add 'rascunho' to tracking_round_status enum
ALTER TYPE public.tracking_round_status ADD VALUE IF NOT EXISTS 'rascunho' BEFORE 'aberta';

-- Add description column to tracking_round_questions
ALTER TABLE public.tracking_round_questions ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.tracking_round_questions ADD COLUMN IF NOT EXISTS allow_other boolean DEFAULT false;
ALTER TABLE public.tracking_round_questions ADD COLUMN IF NOT EXISTS conditional_question_key text;
ALTER TABLE public.tracking_round_questions ADD COLUMN IF NOT EXISTS conditional_value text;
