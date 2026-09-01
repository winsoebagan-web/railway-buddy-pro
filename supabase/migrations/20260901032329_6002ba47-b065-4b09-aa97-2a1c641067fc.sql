CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  image_url text,
  send_at timestamptz NOT NULL DEFAULT now(),
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.notifications TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications public read" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "notifications admin write" ON public.notifications FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TRIGGER notifications_updated_at BEFORE UPDATE ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

UPDATE public.sections SET key = 'notifications', label = 'နိုတီများ' WHERE key = 'suggestions';

DROP TABLE IF EXISTS public.suggestions;