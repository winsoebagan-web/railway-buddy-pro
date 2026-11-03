CREATE POLICY estate_inquiry_initial_fields ON public.ai_questions AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (estate_listing_id IS NULL OR (answer IS NULL AND status='pending' AND answered_at IS NULL AND auto_attempts=0 AND auto_attempted_at IS NULL AND auto_knowledge_version=-1 AND auto_requested_at IS NULL AND auto_request_error IS NULL AND char_length(question) BETWEEN 1 AND 2000 AND char_length(guest_name)<=100));
CREATE POLICY estate_listing_input_bounds ON public.estate_listings AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (char_length(title) BETWEEN 1 AND 300 AND price>=0 AND char_length(guest_name)<=100 AND char_length(description)<=10000);
CREATE POLICY estate_comment_name_bound ON public.estate_comments AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (char_length(guest_name)<=100);
CREATE OR REPLACE FUNCTION public.save_estate_ai_answer(p_question uuid, p_revision timestamptz, p_answer text) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE matched integer;
BEGIN
 PERFORM 1 FROM public.estate_listings l JOIN public.ai_questions q ON q.estate_listing_id=l.id WHERE q.id=p_question AND l.status='approved' AND l.updated_at=p_revision FOR SHARE OF l;
 IF NOT FOUND THEN RETURN 0; END IF;
 UPDATE public.ai_questions SET answer=p_answer,status='answered',answered_at=now(),auto_requested_at=NULL,auto_request_error=NULL WHERE id=p_question AND estate_listing_id IS NOT NULL AND status IN ('pending','needs_admin_review') AND answer IS NULL;
 GET DIAGNOSTICS matched=ROW_COUNT;
 RETURN matched;
END $$;
REVOKE ALL ON FUNCTION public.save_estate_ai_answer(uuid,timestamptz,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_estate_ai_answer(uuid,timestamptz,text) TO service_role;