GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_questions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT SELECT ON public.app_settings TO anon;
GRANT ALL ON public.app_settings TO service_role;
CREATE POLICY "admin update questions" ON public.ai_questions FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin delete questions" ON public.ai_questions FOR DELETE TO authenticated USING (public.is_admin());
INSERT INTO public.app_settings (key, value) VALUES ('ai_mode', '{"enabled": true}'::jsonb) ON CONFLICT (key) DO NOTHING;