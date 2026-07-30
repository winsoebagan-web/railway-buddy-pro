CREATE TABLE public.live_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  style text NOT NULL DEFAULT 'plain',
  color text NOT NULL DEFAULT '#0ea5e9',
  sound_url text,
  is_visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.live_notices TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_notices TO authenticated;
GRANT ALL ON public.live_notices TO service_role;
ALTER TABLE public.live_notices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "live_notices public read" ON public.live_notices FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "live_notices admin write" ON public.live_notices FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.live_board_settings (
  id integer PRIMARY KEY DEFAULT 1,
  auto_enabled boolean NOT NULL DEFAULT true,
  style text NOT NULL DEFAULT 'plain',
  color text NOT NULL DEFAULT '#0284c7',
  sound_url text,
  lead_minutes integer NOT NULL DEFAULT 1,
  CONSTRAINT live_board_settings_singleton CHECK (id = 1)
);
GRANT SELECT ON public.live_board_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_board_settings TO authenticated;
GRANT ALL ON public.live_board_settings TO service_role;
ALTER TABLE public.live_board_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "live_board_settings public read" ON public.live_board_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "live_board_settings admin write" ON public.live_board_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

INSERT INTO public.live_board_settings (id) VALUES (1);