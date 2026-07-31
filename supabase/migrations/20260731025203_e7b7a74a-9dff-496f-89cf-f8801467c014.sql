CREATE TABLE public.demu_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  train_no text NOT NULL DEFAULT '',
  route text NOT NULL DEFAULT '',
  depart_time text,
  arrive_time text,
  fare_ordinary integer,
  fare_upper integer,
  note text,
  is_visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.demu_schedules TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demu_schedules TO authenticated;
GRANT ALL ON public.demu_schedules TO service_role;

ALTER TABLE public.demu_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "demu public read" ON public.demu_schedules FOR SELECT USING (true);
CREATE POLICY "demu admin write" ON public.demu_schedules FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_demu_schedules_updated_at
BEFORE UPDATE ON public.demu_schedules
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.sections (key, label, sort_order, is_visible)
VALUES ('demu', 'ရထားအချိန်ဇယားနှင့် လက်မှတ်ခ — DEMU ရထားများ', 100, true)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.demu_schedules (city, train_no, route, depart_time, arrive_time, fare_ordinary, fare_upper, sort_order) VALUES
('ရန်ကုန်', '၀၀၁', 'ရန်ကုန် → စက်မှုတက္ကသိုလ်', '06:10', '07:05', 300, 500, 1),
('ရန်ကုန်', '၀၀၂', 'စက်မှုတက္ကသိုလ် → ရန်ကုန်', '07:30', '08:25', 300, 500, 2),
('မန္တလေး', '၁၀၁', 'မန္တလေး → မြစ်သား', '06:00', '08:15', 500, 900, 3),
('နေပြည်တော်', '၂၀၁', 'နေပြည်တော် → ပျဉ်းမနား', '07:00', '07:40', 200, 400, 4),
('မော်လမြိုင်', '၃၀၁', 'မော်လမြိုင် → ကျိုက်ထို', '06:30', '08:00', 400, 700, 5),
('ပြည်', '၄၀၁', 'ပြည် → အုတ်တွင်း', '06:45', '08:10', 400, 700, 6);