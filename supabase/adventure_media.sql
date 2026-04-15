-- ============================================================
-- ollycohen.com CMS — Adventure Media & Sections
-- ============================================================
-- Run in Supabase SQL Editor AFTER storage.sql.
-- Creates tables for per-adventure galleries and text sections,
-- plus new columns on the adventures table.
-- ============================================================

-- ── 1. ADVENTURE_MEDIA ─────────────────────────────────────
-- Each row is one gallery item (photo or video) on an adventure page.
-- Images: thumbnail_path points to GitHub-hosted file (e.g. /images/adventures/andes/summit.webp)
-- Videos: thumbnail_path is the thumbnail image, youtube_id is the video ID

create table adventure_media (
  id              uuid primary key default gen_random_uuid(),
  adventure_slug  text not null references adventures(slug) on delete cascade,
  type            text not null check (type in ('image', 'video')),
  title           text,
  thumbnail_path  text not null,
  youtube_id      text,
  tags            text[],
  taken_date      date not null,
  sort_order      integer not null default 0,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create trigger adventure_media_updated_at
  before update on adventure_media
  for each row execute function update_updated_at();

alter table adventure_media enable row level security;
create policy "Public read adventure_media"  on adventure_media for select using (true);
create policy "Auth write adventure_media"   on adventure_media for all   using (auth.role() = 'authenticated');

-- ── 2. ADVENTURE_SECTIONS ──────────────────────────────────
-- Generalises andes_sections so every adventure can have text blocks.
-- slug is unique per adventure (e.g. 'intro', 'route', 'cause').

create table adventure_sections (
  id              uuid primary key default gen_random_uuid(),
  adventure_slug  text not null references adventures(slug) on delete cascade,
  slug            text not null,
  heading         text,
  paragraphs      jsonb not null,
  link_url        text,
  link_label      text,
  sort_order      integer not null default 0,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique(adventure_slug, slug)
);

create trigger adventure_sections_updated_at
  before update on adventure_sections
  for each row execute function update_updated_at();

alter table adventure_sections enable row level security;
create policy "Public read adventure_sections"  on adventure_sections for select using (true);
create policy "Auth write adventure_sections"   on adventure_sections for all   using (auth.role() = 'authenticated');

-- ── 3. NEW COLUMNS ON ADVENTURES ───────────────────────────
-- eyebrow: small text above the title (e.g. "May 18, 2026")
-- map_url: iframe-embeddable URL — CalTopo or Google My Maps
--          e.g. "https://caltopo.com/m/UV171MJ"
--          e.g. "https://www.google.com/maps/d/embed?mid=..."
--          Map section only renders when map_url is not null.

alter table adventures add column if not exists eyebrow text;
alter table adventures add column if not exists map_url  text;

-- Seed the Andes adventure with its existing map
update adventures set
  eyebrow = 'May 18, 2026',
  map_url  = 'https://caltopo.com/m/UV171MJ'
where slug = 'andes-fkt';
