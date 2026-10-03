DROP POLICY IF EXISTS "answer once" ON public.ai_questions;
GRANT ALL ON public.ai_questions TO service_role;