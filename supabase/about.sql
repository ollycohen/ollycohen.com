-- ============================================================
-- ollycohen.com CMS — About section table
-- Run in Supabase SQL Editor after migration.sql
-- ============================================================

create table about (
  id         uuid primary key default gen_random_uuid(),
  heading    text not null,
  paragraphs jsonb not null,            -- ordered array of paragraph strings
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create trigger about_updated_at
  before update on about
  for each row execute function update_updated_at();

alter table about enable row level security;

create policy "Public read about" on about for select using (true);
create policy "Auth write about"  on about for all   using (auth.role() = 'authenticated');

-- ── SEED DATA ──────────────────────────────────────────────
insert into about (heading, paragraphs) values (
  'Adventure Artist',
  '[
    "I''m an adventurer and software engineer based in Seattle. In 2024, I ran 1,500 miles from Seattle to Jasper, Alberta, and back pushing a baby stroller with my skis strapped to it. Then, I ran 1,000 continuous miles from the Indian Ocean to the top of Kilimanjaro to East Africa''s only public children''s hospital.",
    "In 2025, I ran 1,000 miles across India and Japan. My goal is to travel 1,000 continuous miles on foot on every continent. Next up: the Andes."
  ]'::jsonb
);


