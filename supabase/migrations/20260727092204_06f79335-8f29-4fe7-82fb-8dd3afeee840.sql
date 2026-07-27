
-- roles
CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin');
$$;

-- auto-grant admin to the reserved admin account
CREATE OR REPLACE FUNCTION public.grant_reserved_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF lower(NEW.email) = 'mohnyin_at_com@mohnyin-express.app' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created_grant_admin
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_reserved_admin();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- stations
CREATE TABLE public.stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.stations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stations TO authenticated;
GRANT ALL ON public.stations TO service_role;
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stations public read" ON public.stations FOR SELECT USING (true);
CREATE POLICY "stations admin write" ON public.stations FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- trains
CREATE TABLE public.trains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL,
  name text NOT NULL,
  origin text NOT NULL,
  destination text NOT NULL,
  depart_time text NOT NULL DEFAULT '00:00',
  direction text NOT NULL DEFAULT 'up',
  has_upper_class boolean NOT NULL DEFAULT true,
  is_visible boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.trains TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trains TO authenticated;
GRANT ALL ON public.trains TO service_role;
ALTER TABLE public.trains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trains public read" ON public.trains FOR SELECT USING (true);
CREATE POLICY "trains admin write" ON public.trains FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trains_touch BEFORE UPDATE ON public.trains FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- train stops
CREATE TABLE public.train_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  train_id uuid NOT NULL REFERENCES public.trains(id) ON DELETE CASCADE,
  station_name text NOT NULL,
  stop_order int NOT NULL DEFAULT 0,
  arrive_time text,
  depart_time text,
  fare_ordinary int,
  fare_upper int,
  stops boolean NOT NULL DEFAULT true,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX train_stops_train_idx ON public.train_stops(train_id, stop_order);
GRANT SELECT ON public.train_stops TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.train_stops TO authenticated;
GRANT ALL ON public.train_stops TO service_role;
ALTER TABLE public.train_stops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stops public read" ON public.train_stops FOR SELECT USING (true);
CREATE POLICY "stops admin write" ON public.train_stops FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- posts
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  image_url text,
  facebook_url text,
  tiktok_url text,
  website_url text,
  is_pinned boolean NOT NULL DEFAULT false,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "posts public read" ON public.posts FOR SELECT USING (true);
CREATE POLICY "posts admin write" ON public.posts FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER posts_touch BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- arrival reports
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_name text NOT NULL,
  train_name text NOT NULL,
  report_time text NOT NULL DEFAULT '',
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.reports TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports public read" ON public.reports FOR SELECT USING (true);
CREATE POLICY "reports public insert" ON public.reports FOR INSERT WITH CHECK (char_length(coalesce(note,'')) <= 300);
CREATE POLICY "reports admin update" ON public.reports FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "reports admin delete" ON public.reports FOR DELETE TO authenticated USING (public.is_admin());

-- suggestions
CREATE TABLE public.suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author text,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.suggestions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suggestions TO authenticated;
GRANT ALL ON public.suggestions TO service_role;
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "suggestions public read" ON public.suggestions FOR SELECT USING (true);
CREATE POLICY "suggestions public insert" ON public.suggestions FOR INSERT WITH CHECK (char_length(message) BETWEEN 1 AND 300);
CREATE POLICY "suggestions admin update" ON public.suggestions FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "suggestions admin delete" ON public.suggestions FOR DELETE TO authenticated USING (public.is_admin());

-- audios
CREATE TABLE public.audios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  url text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audios TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audios TO authenticated;
GRANT ALL ON public.audios TO service_role;
ALTER TABLE public.audios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audios public read" ON public.audios FOR SELECT USING (true);
CREATE POLICY "audios admin write" ON public.audios FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- marquees
CREATE TABLE public.marquees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL,
  color text NOT NULL DEFAULT '#0284c7',
  position text NOT NULL DEFAULT 'top',
  is_visible boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.marquees TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marquees TO authenticated;
GRANT ALL ON public.marquees TO service_role;
ALTER TABLE public.marquees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "marquees public read" ON public.marquees FOR SELECT USING (true);
CREATE POLICY "marquees admin write" ON public.marquees FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- splash slides
CREATE TABLE public.splash_slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL DEFAULT '',
  subtext text,
  image_url text,
  sort_order int NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.splash_slides TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.splash_slides TO authenticated;
GRANT ALL ON public.splash_slides TO service_role;
ALTER TABLE public.splash_slides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "splash public read" ON public.splash_slides FOR SELECT USING (true);
CREATE POLICY "splash admin write" ON public.splash_slides FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- sections
CREATE TABLE public.sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true
);
GRANT SELECT ON public.sections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sections TO authenticated;
GRANT ALL ON public.sections TO service_role;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sections public read" ON public.sections FOR SELECT USING (true);
CREATE POLICY "sections admin write" ON public.sections FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- app settings
CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings public read" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "settings admin write" ON public.app_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- viewer counter (+5 per app open)
CREATE TABLE public.viewer_counter (
  id int PRIMARY KEY DEFAULT 1,
  count bigint NOT NULL DEFAULT 55,
  CONSTRAINT single_row CHECK (id = 1)
);
INSERT INTO public.viewer_counter (id, count) VALUES (1, 55);
GRANT SELECT ON public.viewer_counter TO anon;
GRANT SELECT, UPDATE ON public.viewer_counter TO authenticated;
GRANT ALL ON public.viewer_counter TO service_role;
ALTER TABLE public.viewer_counter ENABLE ROW LEVEL SECURITY;
CREATE POLICY "counter public read" ON public.viewer_counter FOR SELECT USING (true);
CREATE POLICY "counter admin write" ON public.viewer_counter FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.bump_viewers(_by int DEFAULT 5)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c bigint;
BEGIN
  UPDATE public.viewer_counter SET count = count + GREATEST(0, LEAST(_by, 5)) WHERE id = 1 RETURNING count INTO c;
  RETURN c;
END; $$;
GRANT EXECUTE ON FUNCTION public.bump_viewers(int) TO anon, authenticated;

-- seed sections
INSERT INTO public.sections (key, label, sort_order, is_visible) VALUES
  ('news', 'သတင်းနှင့် ပို့စ်များ', 1, true),
  ('schedule', 'ရထားအချိန်ဇယားနှင့် လက်မှတ်ခ', 2, true),
  ('reports', 'ရထားရောက်ရှိမှု တင်ပြချက်', 3, true),
  ('suggestions', 'အကြံပြုလွှာ', 4, true),
  ('audio', 'အသံဖိုင်များ', 5, true);

INSERT INTO public.splash_slides (text, subtext, sort_order) VALUES
  ('မိုးညှင်း ရထားခရီးစဉ်', 'အချိန်ဇယားနှင့် လက်မှတ်ခ အချက်အလက်', 1);

INSERT INTO public.marquees (text, color, position, sort_order) VALUES
  ('မိုးညှင်း – မြစ်ကြီးနား ရထားခရီးစဉ် အချိန်ဇယားများကို ဤနေရာတွင် ကြည့်ရှုနိုင်ပါသည်။', '#0369a1', 'top', 1),
  ('ရထားအချိန်များ ပြောင်းလဲမှုရှိပါက Admin မှ ချက်ချင်း အသိပေးပါမည်။', '#15803d', 'bottom', 1);

-- seed stations
INSERT INTO public.stations (name, sort_order) VALUES
 ('မိုးညှင်း',1),('ညောင်ကုန်း',2),('နမ္မာ',3),('မြို့သစ်ကလေး',4),('ဟိုပင်',5),('နန်းခွင်',6),
 ('ပင်ဘော',7),('မင်းကုန်း',8),('တောင်နီ',9),('ဆားမှော်',10),('ထိုပူး',11),('မိုးကောင်း',12),
 ('နမ္မတီး',13),('မရမ်း',14),('နန်းခမ်း',15),('မလီခ',16),('ပြည်ထောင်',17),('နန်းကွေ့',18),('မြစ်ကြီးနား',19);

-- seed trains
INSERT INTO public.trains (id, number, name, origin, destination, depart_time, direction, has_upper_class, sort_order) VALUES
 ('11111111-1111-4111-8111-000000000049','၄၉','အမှတ်(၄၉) အဆန်ရထား','မိုးညှင်း','မြစ်ကြီးနား','06:00','up',true,1),
 ('11111111-1111-4111-8111-000000000050','၅၀','အမှတ်(၅၀) အစုန်ရထား','မြစ်ကြီးနား','မိုးညှင်း','06:00','down',true,2),
 ('11111111-1111-4111-8111-000000000001','၁','အမှတ်(၁) အဆန်ရထား','မိုးကောင်း','မြစ်ကြီးနား','07:00','up',false,3),
 ('11111111-1111-4111-8111-000000000002','၂','အမှတ်(၂) အစုန်ရထား','မြစ်ကြီးနား','မိုးကောင်း','14:00','down',false,4);

INSERT INTO public.train_stops (train_id, station_name, stop_order, arrive_time, depart_time, fare_ordinary, fare_upper, stops, note) VALUES
 ('11111111-1111-4111-8111-000000000049','မိုးညှင်း',1,NULL,'06:00',NULL,NULL,true,'စတင်ထွက်ခွာ'),
 ('11111111-1111-4111-8111-000000000049','ညောင်ကုန်း',2,NULL,NULL,NULL,NULL,false,'ရထား မရပ်ပါ (ဖြတ်သန်းသွား)'),
 ('11111111-1111-4111-8111-000000000049','နမ္မာ',3,'06:28','06:33',2000,4000,true,NULL),
 ('11111111-1111-4111-8111-000000000049','မြို့သစ်ကလေး',4,'06:56','06:58',3000,5000,true,NULL),
 ('11111111-1111-4111-8111-000000000049','ဟိုပင်',5,'07:22','07:23',4000,6000,true,NULL),
 ('11111111-1111-4111-8111-000000000049','နန်းခွင်',6,'07:50','07:52',5000,7000,true,NULL),
 ('11111111-1111-4111-8111-000000000049','ပင်ဘော',7,'08:02','08:07',6000,9000,true,NULL),
 ('11111111-1111-4111-8111-000000000049','မင်းကုန်း',8,'08:32','08:34',6000,11000,true,NULL),
 ('11111111-1111-4111-8111-000000000049','တောင်နီ',9,'08:49','08:51',7000,12000,true,NULL),
 ('11111111-1111-4111-8111-000000000049','ဆားမှော်',10,'09:13','09:20',8000,14000,true,NULL),
 ('11111111-1111-4111-8111-000000000049','ထိုပူး',11,'10:00','10:02',9000,15000,true,NULL),
 ('11111111-1111-4111-8111-000000000049','မိုးကောင်း',12,'10:27','10:37',10000,16000,true,NULL),
 ('11111111-1111-4111-8111-000000000049','နမ္မတီး',13,'11:02','11:07',10000,17000,true,NULL),
 ('11111111-1111-4111-8111-000000000049','မရမ်း',14,'11:30','11:32',11000,18000,true,NULL),
 ('11111111-1111-4111-8111-000000000049','နန်းခမ်း',15,'11:44','11:46',12000,20000,true,NULL),
 ('11111111-1111-4111-8111-000000000049','မလီခ',16,'11:59','12:00',13000,21000,true,NULL),
 ('11111111-1111-4111-8111-000000000049','ပြည်ထောင်',17,'12:23','12:25',14000,23000,true,NULL),
 ('11111111-1111-4111-8111-000000000049','နန်းကွေ့',18,'12:50','12:52',14000,24000,true,NULL),
 ('11111111-1111-4111-8111-000000000049','မြစ်ကြီးနား',19,'13:15',NULL,15000,25000,true,'ခရီးစဉ်ပြီးဆုံး'),

 ('11111111-1111-4111-8111-000000000050','မြစ်ကြီးနား',1,NULL,'06:00',NULL,NULL,true,'စတင်ထွက်ခွာ'),
 ('11111111-1111-4111-8111-000000000050','နန်းကွေ့',2,'06:25','06:27',1000,2000,true,NULL),
 ('11111111-1111-4111-8111-000000000050','ပြည်ထောင်',3,'06:51','06:53',2000,4000,true,NULL),
 ('11111111-1111-4111-8111-000000000050','မလီခ',4,'07:15','07:17',3000,5000,true,NULL),
 ('11111111-1111-4111-8111-000000000050','နန်းခမ်း',5,'07:27','07:28',4000,6000,true,NULL),
 ('11111111-1111-4111-8111-000000000050','မရမ်း',6,'07:42','07:44',5000,7000,true,NULL),
 ('11111111-1111-4111-8111-000000000050','နမ္မတီး',7,'08:07','08:12',6000,9000,true,NULL),
 ('11111111-1111-4111-8111-000000000050','မိုးကောင်း',8,'08:37','08:47',6000,11000,true,NULL),
 ('11111111-1111-4111-8111-000000000050','ထိုပူး',9,'09:09','09:11',7000,12000,true,NULL),
 ('11111111-1111-4111-8111-000000000050','ဆားမှော်',10,'09:33','09:35',8000,14000,true,NULL),
 ('11111111-1111-4111-8111-000000000050','တောင်နီ',11,'10:00','10:02',9000,15000,true,NULL),
 ('11111111-1111-4111-8111-000000000050','မင်းကုန်း',12,'10:20','10:22',10000,16000,true,NULL),
 ('11111111-1111-4111-8111-000000000050','ပင်ဘော',13,'10:47','10:52',10000,17000,true,NULL),
 ('11111111-1111-4111-8111-000000000050','နန်းခွင်',14,'11:12','11:14',11000,18000,true,NULL),
 ('11111111-1111-4111-8111-000000000050','ဟိုပင်',15,'11:37','11:42',12000,20000,true,NULL),
 ('11111111-1111-4111-8111-000000000050','မြို့သစ်ကလေး',16,'12:02','12:04',13000,21000,true,NULL),
 ('11111111-1111-4111-8111-000000000050','နမ္မာ',17,'12:27','12:32',14000,23000,true,NULL),
 ('11111111-1111-4111-8111-000000000050','ညောင်ကုန်း',18,NULL,NULL,NULL,NULL,false,'ရထား မရပ်ပါ (ဖြတ်သန်းသွား)'),
 ('11111111-1111-4111-8111-000000000050','မိုးညှင်း',19,'13:00',NULL,15000,25000,true,'ခရီးစဉ်ပြီးဆုံး'),

 ('11111111-1111-4111-8111-000000000001','မိုးကောင်း',1,NULL,'07:00',NULL,NULL,true,'စတင်ထွက်ခွာ'),
 ('11111111-1111-4111-8111-000000000001','နမ္မတီး',2,'07:20','07:22',1000,NULL,true,NULL),
 ('11111111-1111-4111-8111-000000000001','မရမ်း',3,'07:40','07:45',2000,NULL,true,NULL),
 ('11111111-1111-4111-8111-000000000001','နန်းခမ်း',4,'08:02','08:03',3000,NULL,true,NULL),
 ('11111111-1111-4111-8111-000000000001','မလီခ',5,'08:16','08:18',4000,NULL,true,NULL),
 ('11111111-1111-4111-8111-000000000001','ပြည်ထောင်',6,'08:43','08:45',4000,NULL,true,NULL),
 ('11111111-1111-4111-8111-000000000001','နန်းကွေ့',7,'09:08','09:10',6000,NULL,true,NULL),
 ('11111111-1111-4111-8111-000000000001','မြစ်ကြီးနား',8,'09:30',NULL,6000,NULL,true,'ခရီးစဉ်ပြီးဆုံး'),

 ('11111111-1111-4111-8111-000000000002','မြစ်ကြီးနား',1,NULL,'14:00',NULL,NULL,true,'စတင်ထွက်ခွာ'),
 ('11111111-1111-4111-8111-000000000002','နန်းကွေ့',2,'14:20','14:22',1000,NULL,true,NULL),
 ('11111111-1111-4111-8111-000000000002','ပြည်ထောင်',3,'14:43','14:45',2000,NULL,true,NULL),
 ('11111111-1111-4111-8111-000000000002','မလီခ',4,'15:10','15:12',3000,NULL,true,NULL),
 ('11111111-1111-4111-8111-000000000002','နန်းခမ်း',5,'15:22','15:23',4000,NULL,true,NULL),
 ('11111111-1111-4111-8111-000000000002','မရမ်း',6,'15:35','15:40',4000,NULL,true,NULL),
 ('11111111-1111-4111-8111-000000000002','နမ္မတီး',7,'16:03','16:05',6000,NULL,true,NULL),
 ('11111111-1111-4111-8111-000000000002','မိုးကောင်း',8,'16:30',NULL,6000,NULL,true,'ခရီးစဉ်ပြီးဆုံး');
