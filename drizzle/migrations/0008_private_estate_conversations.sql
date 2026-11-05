CREATE TABLE public.estate_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), inquiry_id uuid NOT NULL REFERENCES public.ai_questions(id) ON DELETE CASCADE,
 sender text NOT NULL CHECK (sender IN ('owner','inquirer','admin')), body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000), created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.estate_messages TO authenticated;
GRANT ALL ON public.estate_messages TO service_role;
ALTER TABLE public.estate_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY estate_messages_admin_read ON public.estate_messages FOR SELECT TO authenticated USING (public.is_admin());
CREATE INDEX estate_messages_thread ON public.estate_messages(inquiry_id,created_at);
DROP POLICY estate_inquiry_private_read ON public.ai_questions;
CREATE POLICY estate_inquiry_private_read ON public.ai_questions FOR SELECT TO authenticated USING (public.is_admin() OR (estate_guest_access_hash IS NULL AND submitter_id=auth.uid()));
CREATE OR REPLACE FUNCTION public.estate_mobile_history(p_token text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_catalog AS $$
DECLARE token_hash text;
BEGIN
 IF p_token IS NULL OR p_token !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid receipt'; END IF;
 token_hash := encode(sha256(convert_to(p_token,'UTF8')),'hex');
 RETURN jsonb_build_object(
 'listings',COALESCE((SELECT jsonb_agg(to_jsonb(l)-'guest_access_hash' ORDER BY l.created_at DESC) FROM public.estate_listings l WHERE l.guest_access_hash=token_hash OR (l.guest_access_hash IS NULL AND auth.uid() IS NOT NULL AND l.user_id=auth.uid())), '[]'::jsonb),
 'inquiries',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',q.id,'estate_listing_id',q.estate_listing_id,'listing_title',l.title,'question',q.question,'answer',q.answer,'status',q.status,'created_at',q.created_at,'answered_at',q.answered_at,'role',CASE WHEN l.guest_access_hash=token_hash OR (l.guest_access_hash IS NULL AND l.user_id=auth.uid()) THEN 'owner' ELSE 'inquirer' END,'messages',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',m.id,'sender',m.sender,'body',m.body,'created_at',m.created_at) ORDER BY m.created_at,m.id) FROM public.estate_messages m WHERE m.inquiry_id=q.id),'[]'::jsonb)) ORDER BY q.created_at DESC) FROM public.ai_questions q JOIN public.estate_listings l ON l.id=q.estate_listing_id WHERE q.estate_guest_access_hash=token_hash OR l.guest_access_hash=token_hash OR (q.estate_guest_access_hash IS NULL AND auth.uid() IS NOT NULL AND q.submitter_id=auth.uid()) OR (l.guest_access_hash IS NULL AND auth.uid() IS NOT NULL AND l.user_id=auth.uid())), '[]'::jsonb));
END; $$;
REVOKE ALL ON FUNCTION public.estate_mobile_history(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.estate_mobile_history(text) TO anon,authenticated;
CREATE FUNCTION public.estate_send_message(p_token text,p_inquiry uuid,p_body text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_catalog AS $$
DECLARE token_hash text; q public.ai_questions; l public.estate_listings; sender_role text; message_id uuid;
BEGIN
 IF p_token IS NULL OR p_token !~ '^[a-f0-9]{64}$' OR p_body IS NULL OR char_length(btrim(p_body)) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'Invalid message'; END IF;
 token_hash := encode(sha256(convert_to(p_token,'UTF8')),'hex');
 SELECT * INTO q FROM public.ai_questions WHERE id=p_inquiry AND estate_listing_id IS NOT NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Conversation unavailable'; END IF;
 SELECT * INTO l FROM public.estate_listings WHERE id=q.estate_listing_id;
 IF public.is_admin() THEN sender_role := 'admin';
 ELSIF l.guest_access_hash=token_hash OR (l.guest_access_hash IS NULL AND auth.uid() IS NOT NULL AND l.user_id=auth.uid()) THEN sender_role := 'owner';
 ELSIF q.estate_guest_access_hash=token_hash OR (q.estate_guest_access_hash IS NULL AND auth.uid() IS NOT NULL AND q.submitter_id=auth.uid()) THEN sender_role := 'inquirer';
 ELSE RAISE EXCEPTION 'Conversation unavailable'; END IF;
 INSERT INTO public.estate_messages(inquiry_id,sender,body) VALUES(p_inquiry,sender_role,btrim(p_body)) RETURNING id INTO message_id;
 IF sender_role IN ('owner','admin') THEN
 UPDATE public.ai_questions SET answer=CASE WHEN answer IS NULL THEN btrim(p_body) ELSE answer END, answered_at=COALESCE(answered_at,now()),status='answered',auto_requested_at=NULL,auto_request_error=NULL WHERE id=p_inquiry;
 END IF;
 RETURN message_id;
END; $$;
REVOKE ALL ON FUNCTION public.estate_send_message(text,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.estate_send_message(text,uuid,text) TO anon,authenticated;