-- ============================================================
-- ollycohen.com CMS — Supabase Schema
-- ============================================================
-- Paste this into Supabase SQL Editor (https://supabase.com/dashboard)
-- Project → SQL Editor → New query → Paste → Run
-- ============================================================

-- 1. ADVENTURES
create table adventures (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  continent text not null,
  title text not null,
  subtitle text,
  date_range text not null,           -- e.g. "May 2026 — May 2027"
  miles integer not null,
  description text not null,
  badge text,                          -- e.g. "Next" for upcoming
  gradient text,                       -- CSS gradient for card bg
  dedicated_page text,                 -- e.g. "/pages/andes.html"
  sort_order integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. BLOG POSTS
create table blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null,                   -- Substack link
  category text not null check (category in ('tech','north-america','africa','asia','personal')),
  tag text not null,                   -- Display tag (e.g. "Tech", "Africa Run")
  excerpt text,                        -- For homepage preview cards
  date date not null,
  featured boolean default false,      -- Show on homepage preview
  sort_order integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. PRESS / MEDIA
create table press_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null,
  source text not null,                -- e.g. "Clearwater Times"
  tag text not null default 'Press',   -- Press, Speaking, etc.
  date text not null,                  -- e.g. "Mar 2024" or "2025"
  sort_order integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. PHILANTHROPY / CAUSES
create table causes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  adventure_label text not null,       -- e.g. "Andes 2026", "Africa 2024"
  description text not null,
  url text,
  sort_order integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5. SPONSORS
create table sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  description text not null,
  logo_url text,
  active boolean default true,
  sort_order integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6. SITE STATS (homepage counters)
create table stats (
  id uuid primary key default gen_random_uuid(),
  label text not null,                 -- e.g. "Miles Run"
  value integer not null,              -- e.g. 4500
  suffix text default '+',             -- e.g. "+", "K+", ""
  sort_order integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger adventures_updated_at before update on adventures for each row execute function update_updated_at();
create trigger blog_posts_updated_at before update on blog_posts for each row execute function update_updated_at();
create trigger press_items_updated_at before update on press_items for each row execute function update_updated_at();
create trigger causes_updated_at before update on causes for each row execute function update_updated_at();
create trigger sponsors_updated_at before update on sponsors for each row execute function update_updated_at();
create trigger stats_updated_at before update on stats for each row execute function update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY — public read, authenticated write
-- ============================================================
alter table adventures enable row level security;
alter table blog_posts enable row level security;
alter table press_items enable row level security;
alter table causes enable row level security;
alter table sponsors enable row level security;
alter table stats enable row level security;

-- Public read access (uses anon key from your site)
create policy "Public read adventures" on adventures for select using (true);
create policy "Public read blog_posts" on blog_posts for select using (true);
create policy "Public read press_items" on press_items for select using (true);
create policy "Public read causes" on causes for select using (true);
create policy "Public read sponsors" on sponsors for select using (true);
create policy "Public read stats" on stats for select using (true);

-- Authenticated write access (for you in the dashboard)
create policy "Auth write adventures" on adventures for all using (auth.role() = 'authenticated');
create policy "Auth write blog_posts" on blog_posts for all using (auth.role() = 'authenticated');
create policy "Auth write press_items" on press_items for all using (auth.role() = 'authenticated');
create policy "Auth write causes" on causes for all using (auth.role() = 'authenticated');
create policy "Auth write sponsors" on sponsors for all using (auth.role() = 'authenticated');
create policy "Auth write stats" on stats for all using (auth.role() = 'authenticated');

-- ============================================================
-- SEED DATA
-- ============================================================

-- Adventures
insert into adventures (slug, continent, title, subtitle, date_range, miles, description, badge, dedicated_page, sort_order) values
  ('andes-fkt', 'South America', 'Andes FKT', '8,000 miles across the world''s longest mountain range', 'May 2026 — May 2027', 8000, '8,000 miles across 7 countries, north to south. Footpaths, horse trails, and rugged mountain terrain. The goal: finish in one year.', 'Next', '/pages/andes.html', 1),
  ('asia-india-japan', 'Asia', 'India & Japan', '379 miles through the Himalayas, 600 miles across Japan', 'May — July 2025', 1000, '379 miles through the Indian Himalayas climbing over 100,000 feet. 294 miles over Mt Fuji and the Japanese Alps. 305 miles along Japan''s tsunami-affected coast. 1,000 total miles in 8 weeks.', null, null, 2),
  ('africa-kilimanjaro', 'Africa', 'Indian Ocean to Kilimanjaro', '1,000 miles through East Africa', 'June — October 2024', 1000, '1,000 miles with Rocky Mtui from the Indian Ocean to the top of Kilimanjaro and on to the Shoe 4 Africa Hospital. Through villages, desert, jungle, and the Great Rift Valley.', null, null, 3),
  ('north-america-jasper', 'North America', 'Seattle to Jasper & Back', '1,500 miles pushing a stroller through winter', 'January — May 2024', 1500, '1,500 miles from Seattle to Jasper, Alberta, and back pushing a baby stroller with skis strapped to it. 51 marathons in 108 days.', null, null, 4);

-- Blog posts
insert into blog_posts (title, url, category, tag, excerpt, date, featured, sort_order) values
  ('What''s a Human For', 'https://irunearth.substack.com/p/whats-a-human-for', 'tech', 'Tech', 'The most important skill for software engineers is setting up feedback loops for AI to build and test integrated components of a system.', '2026-02-01', true, 1),
  ('You''re Fired', 'https://irunearth.substack.com/p/youre-fired', 'tech', 'Tech', 'Today, I''m planning to fire two highly talented Principal Engineers with 10+ years of experience because I think I can do their job with Claude.', '2026-01-01', true, 2),
  ('Miyako (1000 Miles Asia)', 'https://irunearth.substack.com/p/miyako-1000-miles-asia', 'asia', 'Asia', null, '2025-07-15', false, 3),
  ('Kirikiri', 'https://irunearth.substack.com/p/kirikiri', 'asia', 'Asia', null, '2025-07-01', false, 4),
  ('Asia Launch', 'https://irunearth.substack.com/p/asia-launch', 'asia', 'Asia', null, '2025-05-01', false, 5),
  ('Millbrook Alumni Summit', 'https://irunearth.substack.com/p/millbrook-alumni-summit', 'personal', 'Personal', 'Our culture raises men to believe their value is tied to money. I crested a hill in the rain, feeling the weight of my soaking backpack, and broke into tears.', '2025-04-15', true, 6),
  ('2025 Rainier Ski Descent', 'https://irunearth.substack.com/p/2025-rainier-ski-descent', 'personal', 'Personal', null, '2025-04-01', false, 7),
  ('How to Run with the Kenyans Pt. 1', 'https://irunearth.substack.com/p/how-to-run-with-the-kenyans-pt-1', 'africa', 'Africa Run', 'My introduction to running with Kenyan pros in the legendary town of Iten — the daily routines of the world''s greatest athletes.', '2024-09-01', true, 8),
  ('Dar es Salaam', 'https://irunearth.substack.com/p/dar-es-salaam', 'africa', 'Africa', null, '2024-06-01', false, 9),
  ('Welcome to the USA', 'https://irunearth.substack.com/p/welcome-to-the-usa', 'north-america', 'North America', null, '2024-04-15', false, 10),
  ('Farewell Canada', 'https://irunearth.substack.com/p/farewell-canada', 'north-america', 'North America', null, '2024-04-01', false, 11),
  ('Jasper', 'https://irunearth.substack.com/p/jasper', 'north-america', 'North America', null, '2024-03-15', false, 12),
  ('Onward', 'https://irunearth.substack.com/p/onward', 'north-america', 'North America', null, '2024-03-01', false, 13),
  ('Welcome to Clearwater', 'https://irunearth.substack.com/p/welcome-to-clearwater', 'north-america', 'North America', null, '2024-02-01', false, 14),
  ('Gone Skiing Take 2', 'https://irunearth.substack.com/p/gone-skiing-take-2', 'north-america', 'North America', null, '2024-01-01', false, 15);

-- Press items
insert into press_items (title, url, source, tag, date, sort_order) values
  ('A Human-Powered Adventure into the Rockies with Olly', 'https://www.clearwatertimes.com/local-news/a-human-powered-adventure-into-the-rockies-with-olly-7326150', 'Clearwater Times', 'Press', 'Mar 2024', 1),
  ('Millbrook School Alumni Summit Speaker', 'https://www.millbrook.org/school-life/academics/alumni-summit/alumni-summit-speakers-2025/oliver-cohen-16', 'Millbrook School', 'Speaking', '2025', 2);

-- Causes
insert into causes (name, adventure_label, description, url, sort_order) values
  ('Kilimanjaro Aid Project', 'Andes 2026', 'Building chicken coops to provide food and self-sustaining income to underfed families in the foothills of Kilimanjaro.', null, 1),
  ('Rise Against Hunger', 'Asia 2025', 'Providing school feeding programs across the world, including India, Africa, and the United States. 4-star Charity Navigator rating.', null, 2),
  ('Children''s Hospital & GiveDirectly', 'Africa 2024', 'Ran to the Shoe 4 Africa Hospital — East Africa''s only public children''s hospital. Raised nearly $10K for direct cash transfers.', null, 3);

-- Sponsors
insert into sponsors (name, url, description, sort_order) values
  ('Norda', 'https://nordarun.com/', 'Premium trail running footwear built for the most demanding terrain on Earth. Norda shoes have carried me across continents.', 1),
  ('Black Diamond', 'https://blackdiamondequipment.com/', 'Mountain equipment for climbing, skiing, and trail running. Black Diamond Helio 88 skis powered my Rainier descent and backcountry adventures.', 2);

-- Stats
insert into stats (label, value, suffix, sort_order) values
  ('Miles Run', 4500, '+', 1),
  ('Continents', 4, '', 2),
  ('Raised for Charity', 20, 'K+', 3),
  ('Andes Miles Planned', 8000, '', 4);
