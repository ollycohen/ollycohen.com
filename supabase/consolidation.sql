-- ============================================================
-- ollycohen.com CMS — Content Consolidation Migration
-- Eliminates hardcoded content from andes.html and engineering.html.
-- Run in Supabase SQL Editor after migration.sql and cms_additions.sql.
-- ============================================================

-- ── ADVENTURES: add homepage teaser columns ─────────────────
alter table adventures add column if not exists teaser_title    text;
alter table adventures add column if not exists teaser_subtitle text;

update adventures set
  teaser_title    = 'The Andes Line',
  teaser_subtitle = '8,000 miles. 7 countries. 1 year.'
where slug = 'andes-fkt';

-- ── ANDES_STATS ─────────────────────────────────────────────
create table andes_stats (
  id               uuid primary key default gen_random_uuid(),
  value            text not null,
  label            text not null,
  show_on_homepage boolean not null default false,
  sort_order       integer not null default 0,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create trigger andes_stats_updated_at
  before update on andes_stats
  for each row execute function update_updated_at();

alter table andes_stats enable row level security;
create policy "Public read andes_stats" on andes_stats for select using (true);
create policy "Auth write andes_stats"  on andes_stats for all   using (auth.role() = 'authenticated');

insert into andes_stats (value, label, show_on_homepage, sort_order) values
  ('8,000',  'Total Miles',       true,  1),
  ('~667',   'Miles / Month',     true,  2),
  ('~167',   'Miles / Week',      false, 3),
  ('12',     'Months',            false, 4),
  ('22,838', 'Ft Peak Elevation', true,  5),
  ('7',      'Countries',         true,  6);

-- ── ANDES_SECTIONS ──────────────────────────────────────────
create table andes_sections (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  heading    text not null,
  paragraphs jsonb not null,
  link_url   text,
  link_label text,
  sort_order integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create trigger andes_sections_updated_at
  before update on andes_sections
  for each row execute function update_updated_at();

alter table andes_sections enable row level security;
create policy "Public read andes_sections" on andes_sections for select using (true);
create policy "Auth write andes_sections"  on andes_sections for all   using (auth.role() = 'authenticated');

insert into andes_sections (slug, heading, paragraphs, link_url, link_label, sort_order) values
  ('concept', 'The Concept', '[
    "The Andes stretch 5,500 miles from Venezuela to Patagonia — the longest continental mountain range on Earth. The route I''m building will cover an estimated 8,000 miles of footpaths, horse trails, and rugged mountain terrain, relying on roads only when absolutely necessary.",
    "The route will traverse 7 countries: Colombia, Ecuador, Peru, Bolivia, Chile, Argentina, and potentially Venezuela. I''ll pass through some of the highest inhabited places on Earth, cross the Altiplano at 13,000+ feet, and navigate terrain ranging from tropical cloud forests to glaciated peaks to the driest desert on Earth.",
    "Deia Schlosberg and Gregg Treinish pioneered a route across the Andes that avoids roads in 2008. My goal is to evolve their route into a trophy for professional endurance athletes and a culminating journey for thru-hikers — an Andes equivalent of the Appalachian Trail or Pacific Crest Trail."
  ]'::jsonb, null, null, 1),
  ('waypoints', 'Waypoints', '[
    "The route will include notable waypoints such as Aconcagua (22,838 ft — highest peak in the Western Hemisphere), Cotopaxi, Machu Picchu, the Bolivian Salt Flats (Salar de Uyuni), and the Patagonian Ice Cap. Exact routing is being finalized using existing trekking routes, bikepacking routes, and original pathfinding."
  ]'::jsonb, null, null, 2),
  ('cause', 'The Cause', '[
    "This adventure supports the Kilimanjaro Aid Project, an NGO building chicken coops to provide food and a self-sustaining income source to underfed families in the foothills of Kilimanjaro. Corporate sponsors are encouraged to reach out — individual supporters can follow along on Substack and Instagram."
  ]'::jsonb, 'https://kilimanjaroaidproject.org', 'Learn about Kilimanjaro Aid Project →', 3);

-- ── ANDES_FAQS ──────────────────────────────────────────────
create table andes_faqs (
  id         uuid primary key default gen_random_uuid(),
  question   text not null,
  answer     text not null,
  sort_order integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create trigger andes_faqs_updated_at
  before update on andes_faqs
  for each row execute function update_updated_at();

alter table andes_faqs enable row level security;
create policy "Public read andes_faqs" on andes_faqs for select using (true);
create policy "Auth write andes_faqs"  on andes_faqs for all   using (auth.role() = 'authenticated');

insert into andes_faqs (question, answer, sort_order) values
  ('Why would you do this?',
   'I see myself as an artist and adventure as my medium. This is an act of creative expression.',
   1),
  ('Why set an FKT?',
   'I want to evolve the Schlosberg-Treinish route into a recognized classic — a trophy for endurance athletes and a dream trek for thru-hikers. Setting an FKT establishes the benchmark.',
   2),
  ('How will you be supported?',
   'I rely heavily on local support for routing, food, and shelter — though technically my run falls under "solo" and "self-supported" categories. A small group of close friends and mentors will serve as emergency contacts from the US.',
   3),
  ('How can I follow along?',
   'I share my journey through my Substack blog and Instagram whenever I can connect to the internet.',
   4),
  ('I''m a business. Why should I sponsor this?',
   'My blogs have been read thousands of times and videos watched hundreds of thousands of times. The Andes FKT could reach millions over the course of a year. Email olly.k.cohen@gmail.com to discuss.',
   5);

-- ── ENGINEERING_SECTIONS ────────────────────────────────────
create table engineering_sections (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  heading    text not null,
  paragraphs jsonb not null,
  sort_order integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create trigger engineering_sections_updated_at
  before update on engineering_sections
  for each row execute function update_updated_at();

alter table engineering_sections enable row level security;
create policy "Public read engineering_sections" on engineering_sections for select using (true);
create policy "Auth write engineering_sections"  on engineering_sections for all   using (auth.role() = 'authenticated');

insert into engineering_sections (slug, heading, paragraphs, sort_order) values
  ('philosophy', 'Philosophy', '[
    "The most important skill for software engineers to hone is setting up feedback loops for AI to build and test integrated components of a system. As implementation gets cheaper, the value shifts entirely to problem selection.",
    "I work with Claude to build software. The mobile app wasn''t receiving tags from the API server — I didn''t debug the mobile code and the server code separately. I gave Claude access to both layers, described what I could see on the phone screen, and let it trace the problem across the boundary. Claude''s fix touched three files in two repositories. No frontend or backend specialist would have written the same solution alone.",
    "This is what I mean by integration being the skill. All software engineers are full stack engineers now."
  ]'::jsonb, 1),
  ('background', 'Background', '[
    "I took my first computer science class second semester freshman year of college. I worked at Amazon for a year in their lowest-ranking engineering role before being let go. I spent the following year running. Then I joined the Sailor''s Union of the Pacific as an Ordinary Sailor, at which point I met someone at Alpental Ski Area whom I told I would never go back to tech — and that person hired me to write software.",
    "I have 18 total months of full-time software engineering experience. I still can''t write code fast on my own. But with Claude, I''ve delivered systems that principal engineers with 10+ years of experience couldn''t finish — not because they lacked skill, but because they didn''t test rigorously, refine iteratively, and integrate into live applications. And Claude could write all the code they did in a fraction of the time."
  ]'::jsonb, 2),
  ('beliefs', 'What I Believe', '[
    "Our role is knowing what game is worth playing — then setting up games that Claude will win. My high school friend Tom, who works on a search engine for AI, argued that software engineers can now do what they''ve always been meant to do: build at the speed of ideas instead of getting bogged down by tedious implementation.",
    "I do choose to solve different problems with Claude than I would without. The human''s job is to steer toward building new control systems rather than chasing potential bugs. The human facilitates the last-mile delivery of bug-free, well-functioning software."
  ]'::jsonb, 3),
  ('website', 'This Website', '[
    "This website was built entirely with Claude. It''s a static site — no frameworks, no build tools, no dependencies. HTML, CSS, JavaScript. It loads fast, it''s accessible, and it''s deployable anywhere. The source code is on GitHub."
  ]'::jsonb, 4);
