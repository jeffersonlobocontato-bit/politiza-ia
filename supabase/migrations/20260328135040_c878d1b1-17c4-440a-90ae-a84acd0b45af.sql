-- Remove old check constraint and add new one for 1-6 levels
ALTER TABLE public.campaign_members DROP CONSTRAINT IF EXISTS campaign_members_hierarchy_level_check;
ALTER TABLE public.campaign_members ADD CONSTRAINT campaign_members_hierarchy_level_check CHECK (hierarchy_level >= 1 AND hierarchy_level <= 6);

-- Now shift existing hierarchy levels >= 2 up by 1 (start from highest to avoid conflicts)
UPDATE public.campaign_members SET hierarchy_level = 6 WHERE hierarchy_level = 5;
UPDATE public.campaign_members SET hierarchy_level = 5 WHERE hierarchy_level = 4;
UPDATE public.campaign_members SET hierarchy_level = 4 WHERE hierarchy_level = 3;
UPDATE public.campaign_members SET hierarchy_level = 3 WHERE hierarchy_level = 2;