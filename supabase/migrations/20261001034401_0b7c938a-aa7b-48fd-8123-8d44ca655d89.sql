CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;
CREATE TABLE public.ai_info (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('electricity','road','phone')),
  content TEXT NOT NULL,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_info TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_info TO authenticated;
GRANT ALL ON public.ai_info TO service_role;
ALTER TABLE public.ai_info ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read visible ai_info" ON public.ai_info FOR SELECT TO anon USING (is_visible = true);
CREATE POLICY "Authenticated can read all ai_info" ON public.ai_info FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage ai_info" ON public.ai_info FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_ai_info_updated_at BEFORE UPDATE ON public.ai_info FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();