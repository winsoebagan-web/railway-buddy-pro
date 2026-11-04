ALTER TABLE public.estate_listings ADD COLUMN guest_access_hash text;
ALTER TABLE public.ai_questions ADD COLUMN estate_guest_access_hash text;
COMMENT ON COLUMN public.estate_listings.guest_access_hash IS 'SHA-256 of a private phone-app receipt secret, used only for guest history lookup.';
COMMENT ON COLUMN public.ai_questions.estate_guest_access_hash IS 'SHA-256 of private phone-app receipt secret; never authorize guest reads with a public device ID.';
CREATE OR REPLACE FUNCTION public.estate_mobile_history(p_token text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_catalog AS $$
DECLARE token_hash text;
BEGIN
 IF p_token IS NULL OR char_length(p_token)<64 OR char_length(p_token)>128 THEN RAISE EXCEPTION 'Invalid receipt'; END IF;
 token_hash := encode(sha256(convert_to(p_token,'UTF8')),'hex');
 RETURN jsonb_build_object(
 'listings',COALESCE((SELECT jsonb_agg(to_jsonb(l)-'guest_access_hash' ORDER BY l.created_at DESC) FROM public.estate_listings l WHERE (l.user_id IS NULL AND l.guest_access_hash=token_hash) OR (auth.uid() IS NOT NULL AND l.user_id=auth.uid())), '[]'::jsonb),
 'inquiries',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',q.id,'estate_listing_id',q.estate_listing_id,'listing_title',l.title,'question',q.question,'answer',q.answer,'status',q.status,'created_at',q.created_at,'answered_at',q.answered_at) ORDER BY q.created_at DESC) FROM public.ai_questions q JOIN public.estate_listings l ON l.id=q.estate_listing_id WHERE (q.submitter_id IS NULL AND q.estate_guest_access_hash=token_hash) OR (auth.uid() IS NOT NULL AND q.submitter_id=auth.uid())), '[]'::jsonb));
END; $$;
REVOKE ALL ON FUNCTION public.estate_mobile_history(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.estate_mobile_history(text) TO anon,authenticated;
CREATE POLICY estate_mobile_listing_receipt_bound ON public.estate_listings AS RESTRICTIVE FOR INSERT TO anon,authenticated WITH CHECK (guest_access_hash IS NULL OR guest_access_hash ~ '^[a-f0-9]{64}$');
CREATE POLICY estate_mobile_inquiry_receipt_bound ON public.ai_questions AS RESTRICTIVE FOR INSERT TO anon,authenticated WITH CHECK (estate_guest_access_hash IS NULL OR (estate_listing_id IS NOT NULL AND estate_guest_access_hash ~ '^[a-f0-9]{64}$'));
CREATE INDEX estate_mobile_listing_receipts ON public.estate_listings(guest_access_hash) WHERE guest_access_hash IS NOT NULL;
CREATE INDEX estate_mobile_inquiry_receipts ON public.ai_questions(estate_guest_access_hash) WHERE estate_guest_access_hash IS NOT NULL;