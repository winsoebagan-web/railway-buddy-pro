ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS facebook_label text,
  ADD COLUMN IF NOT EXISTS tiktok_label text,
  ADD COLUMN IF NOT EXISTS website_label text,
  ADD COLUMN IF NOT EXISTS link_color text;