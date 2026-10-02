CREATE TABLE public.ai_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL,
  question text NOT NULL CHECK (char_length(question) BETWEEN 1 AND 500),
  answer text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  answered_at timestamptz
);
CREATE INDEX ai_questions_device_idx ON public.ai_questions(device_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.ai_questions TO anon, authenticated;
GRANT ALL ON public.ai_questions TO service_role;
ALTER TABLE public.ai_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read questions" ON public.ai_questions FOR SELECT USING (true);
CREATE POLICY "anyone ask" ON public.ai_questions FOR INSERT WITH CHECK (answer IS NULL AND status = 'pending' AND char_length(device_id) BETWEEN 8 AND 64);
CREATE POLICY "answer once" ON public.ai_questions FOR UPDATE USING (answer IS NULL) WITH CHECK (status = 'answered');
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_questions;