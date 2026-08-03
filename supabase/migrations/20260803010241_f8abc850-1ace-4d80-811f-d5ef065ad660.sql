CREATE TABLE public.notice_letters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  style TEXT NOT NULL DEFAULT 'plain',
  color TEXT NOT NULL DEFAULT '#0284c7',
  is_visible BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.notice_letters TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notice_letters TO authenticated;
GRANT ALL ON public.notice_letters TO service_role;

ALTER TABLE public.notice_letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read notice letters"
  ON public.notice_letters FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage notice letters"
  ON public.notice_letters FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_notice_letters_updated_at
  BEFORE UPDATE ON public.notice_letters
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();