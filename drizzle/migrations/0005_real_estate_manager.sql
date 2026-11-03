CREATE TABLE public.estate_listings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, guest_name text NOT NULL DEFAULT '',
 title text NOT NULL, property_type text NOT NULL DEFAULT 'မြေကွက်', land_type text NOT NULL DEFAULT '',
 price numeric NOT NULL DEFAULT 0, area text NOT NULL DEFAULT '', length text NOT NULL DEFAULT '', width text NOT NULL DEFAULT '',
 phone text NOT NULL DEFAULT '', viber text NOT NULL DEFAULT '', location text NOT NULL DEFAULT '', description text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.estate_listings TO anon, authenticated;
GRANT UPDATE, DELETE ON public.estate_listings TO authenticated;
GRANT ALL ON public.estate_listings TO service_role;
ALTER TABLE public.estate_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY estate_public_read ON public.estate_listings FOR SELECT TO anon, authenticated USING (status='approved');
CREATE POLICY estate_owner_read ON public.estate_listings FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE POLICY estate_submit ON public.estate_listings FOR INSERT TO anon, authenticated WITH CHECK (status='pending' AND (user_id IS NULL OR user_id=auth.uid()));
CREATE POLICY estate_admin_manage ON public.estate_listings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER estate_updated_at BEFORE UPDATE ON public.estate_listings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER estate_knowledge_revision AFTER INSERT OR UPDATE OR DELETE ON public.estate_listings FOR EACH STATEMENT EXECUTE FUNCTION public.ai_knowledge_changed();
ALTER TABLE public.ai_questions ADD COLUMN estate_listing_id uuid REFERENCES public.estate_listings(id) ON DELETE CASCADE, ADD COLUMN submitter_id uuid, ADD COLUMN guest_name text NOT NULL DEFAULT '';
DROP POLICY "anyone read questions" ON public.ai_questions;
CREATE POLICY "anyone read questions" ON public.ai_questions FOR SELECT TO public USING (estate_listing_id IS NULL);
CREATE POLICY estate_inquiry_private_read ON public.ai_questions FOR SELECT TO authenticated USING (public.is_admin() OR submitter_id=auth.uid());
CREATE POLICY estate_inquiry_submission ON public.ai_questions AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (estate_listing_id IS NULL OR ((submitter_id IS NULL OR submitter_id=auth.uid()) AND EXISTS (SELECT 1 FROM public.estate_listings l WHERE l.id=estate_listing_id AND l.status='approved')));
CREATE INDEX estate_inquiries_listing ON public.ai_questions(estate_listing_id);
CREATE TABLE public.estate_comments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), listing_id uuid NOT NULL REFERENCES public.estate_listings(id) ON DELETE CASCADE,
 user_id uuid, guest_name text NOT NULL DEFAULT '', body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000), created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.estate_comments TO anon, authenticated;
GRANT DELETE ON public.estate_comments TO authenticated;
GRANT ALL ON public.estate_comments TO service_role;
ALTER TABLE public.estate_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY estate_comments_public_read ON public.estate_comments FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.estate_listings l WHERE l.id=listing_id AND l.status='approved'));
CREATE POLICY estate_comments_submit ON public.estate_comments FOR INSERT TO anon, authenticated WITH CHECK ((user_id IS NULL OR user_id=auth.uid()) AND EXISTS (SELECT 1 FROM public.estate_listings l WHERE l.id=listing_id AND l.status='approved'));
CREATE POLICY estate_comments_admin_read ON public.estate_comments FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY estate_comments_admin_delete ON public.estate_comments FOR DELETE TO authenticated USING (public.is_admin());
CREATE INDEX estate_comments_listing ON public.estate_comments(listing_id);