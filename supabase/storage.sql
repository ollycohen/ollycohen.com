-- ============================================================
-- ollycohen.com CMS — Supabase Storage setup
-- ============================================================
-- Run this in Supabase SQL Editor AFTER migration.sql.
-- Creates a public "site-images" bucket and RLS policies.
-- ============================================================

-- 1. CREATE BUCKET
-- Creates a public bucket — objects are readable by anyone via URL.
-- URL pattern: https://<project-ref>.supabase.co/storage/v1/object/public/site-images/<path>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-images',
  'site-images',
  true,
  5242880,  -- 5 MB max per file
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
on conflict (id) do nothing;

-- 2. RLS POLICIES FOR storage.objects
-- Public: anyone can read (required for <img src="..."> to work without auth)
create policy "Public read site-images"
  on storage.objects for select
  using (bucket_id = 'site-images');

-- Authenticated: you (logged into Supabase dashboard) can upload
create policy "Auth upload site-images"
  on storage.objects for insert
  with check (bucket_id = 'site-images' and auth.role() = 'authenticated');

-- Authenticated: you can replace/update existing files
create policy "Auth update site-images"
  on storage.objects for update
  using (bucket_id = 'site-images' and auth.role() = 'authenticated');

-- Authenticated: you can delete files
create policy "Auth delete site-images"
  on storage.objects for delete
  using (bucket_id = 'site-images' and auth.role() = 'authenticated');

-- ============================================================
-- 3. ADD IMAGE COLUMNS TO EXISTING TABLES
-- ============================================================

-- adventures: real photo to replace the CSS gradient placeholder
--   Render as: background-image: url(image_url) on the card.
--   Falls back to gradient if image_url is null.
alter table adventures add column if not exists image_url text;

-- blog_posts: cover image for homepage featured cards
alter table blog_posts add column if not exists cover_image_url text;

-- ============================================================
-- 4. SUGGESTED FOLDER STRUCTURE IN THE BUCKET
-- ============================================================
-- site-images/
--   sponsors/
--     norda.png
--     black-diamond.png
--   adventures/
--     andes.jpg
--     asia.jpg
--     africa.jpg
--     north-america.jpg
--   blog/
--     <slug>.jpg
