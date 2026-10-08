BEGIN;
ALTER TABLE public.fcds_courses
  ADD COLUMN IF NOT EXISTS specialization text NOT NULL DEFAULT 'computer-data-science';
ALTER TABLE public.fcds_courses DROP CONSTRAINT IF EXISTS fcds_courses_specialization_check;
ALTER TABLE public.fcds_courses ADD CONSTRAINT fcds_courses_specialization_check
  CHECK (specialization IN ('computer-data-science', 'ai', 'cyber-security', 'healthcare'));
NOTIFY pgrst, 'reload schema';
COMMIT;
