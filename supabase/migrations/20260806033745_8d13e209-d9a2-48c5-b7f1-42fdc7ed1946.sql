CREATE TABLE public.notice_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  url text NOT NULL,
  is_visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.notice_videos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notice_videos TO authenticated;
GRANT ALL ON public.notice_videos TO service_role;
ALTER TABLE public.notice_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notice videos public read" ON public.notice_videos FOR SELECT USING (true);
CREATE POLICY "notice videos admin write" ON public.notice_videos FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE TRIGGER notice_videos_updated_at BEFORE UPDATE ON public.notice_videos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();