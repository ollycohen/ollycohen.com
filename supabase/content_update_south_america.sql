-- ============================================================
-- ollycohen.com — Content update: South America run
-- Removes all Andes FKT language. Reflects the correct framing:
-- departing Colombia on May 18, 2026 for the next 1,000 miles
-- on every continent.
--
-- Run in Supabase SQL Editor (paste → Run).
-- Safe to run multiple times (uses UPDATE/DELETE by slug/id).
-- ============================================================


-- ── 1. ADVENTURES ────────────────────────────────────────────
-- Remove FKT framing, correct miles and date_range

UPDATE adventures SET
  title           = 'South America Run',
  subtitle        = '1,000 miles through South America',
  date_range      = 'Starting May 2026',
  miles           = 1000,
  description     = 'Starting in Colombia on May 18, 2026. Running 1,000 miles through South America — solo, self-supported, and fueled by local hospitality.',
  teaser_title    = 'South America',
  teaser_subtitle = '1,000 miles. Colombia. May 2026.'
WHERE slug = 'andes-fkt';


-- ── 2. ABOUT ─────────────────────────────────────────────────
-- Fix "Next up: the Andes." → "Next up: South America."

UPDATE about SET
  paragraphs = '[
    "I''m an adventurer and software engineer based in Seattle. In 2024, I ran 1,500 miles from Seattle to Jasper, Alberta, and back pushing a baby stroller with my skis strapped to it. Then, I ran 1,000 continuous miles from the Indian Ocean to the top of Kilimanjaro to East Africa''s only public children''s hospital.",
    "In 2025, I ran 1,000 miles across India and Japan. My goal is to travel 1,000 continuous miles on foot on every continent. Next up: South America."
  ]'::jsonb;


-- ── 3. STATS ─────────────────────────────────────────────────
-- Remove "Andes Miles Planned" — it names the FKT framing

DELETE FROM stats WHERE label = 'Andes Miles Planned';


-- ── 4. ANDES_STATS ───────────────────────────────────────────
-- Replace FKT stats with simple South America run stats

DELETE FROM andes_stats;

INSERT INTO andes_stats (value, label, show_on_homepage, sort_order) VALUES
  ('1,000',    'Miles',        true,  1),
  ('May 18',   'Departure',    true,  2),
  ('Colombia', 'Starting In',  true,  3),
  ('4th',      'Continent',    true,  4);


-- ── 5. ANDES_SECTIONS ────────────────────────────────────────
-- Rewrite concept section. Delete waypoints (reveals full route).

UPDATE andes_sections SET
  heading    = 'The Plan',
  paragraphs = '[
    "My goal is to travel 1,000 continuous miles on foot on every continent. South America is next. I depart Colombia on May 18, 2026.",
    "The Andes span the entire length of South America — from the Caribbean coast of Colombia through some of the highest terrain on Earth. My route will follow existing trekking paths, horse trails, and rugged mountain terrain through the continent''s spine, relying on roads only when absolutely necessary.",
    "Each of my runs is solo and self-supported, fueled by local hospitality, local food, and whatever I can carry. South America will be no different."
  ]'::jsonb,
  link_url   = NULL,
  link_label = NULL
WHERE slug = 'concept';

DELETE FROM andes_sections WHERE slug = 'waypoints';


-- ── 6. ANDES_FAQS ────────────────────────────────────────────
-- Remove "Why set an FKT?" entirely.
-- Update sponsor FAQ to remove FKT language.

DELETE FROM andes_faqs WHERE question = 'Why set an FKT?';

UPDATE andes_faqs SET
  answer = 'My blogs have been read thousands of times and videos watched hundreds of thousands of times. A run through South America will generate months of content reaching a global audience. Email olly.k.cohen@gmail.com to discuss.'
WHERE question = 'I''m a business. Why should I sponsor this?';


-- ── 7. BLOG_POSTS ────────────────────────────────────────────

-- 7a. Add south-america as a valid category
ALTER TABLE blog_posts DROP CONSTRAINT IF EXISTS blog_posts_category_check;
ALTER TABLE blog_posts ADD CONSTRAINT blog_posts_category_check
  CHECK (category IN ('tech','north-america','africa','asia','personal','south-america'));

-- 7b. Fix incorrect dates (cross-referenced against Substack archive)
UPDATE blog_posts SET date = '2026-02-06' WHERE url = 'https://irunearth.substack.com/p/whats-a-human-for';
UPDATE blog_posts SET date = '2026-01-29' WHERE url = 'https://irunearth.substack.com/p/youre-fired';
UPDATE blog_posts SET date = '2024-04-18' WHERE url = 'https://irunearth.substack.com/p/farewell-canada';

-- 7c. Add missing posts (newest first, all non-featured — update featured as desired)
INSERT INTO blog_posts (title, url, category, tag, excerpt, date, featured, sort_order) VALUES
  ('Love Never Fails',
   'https://irunearth.substack.com/p/love-never-fails',
   'personal', 'Personal', NULL, '2026-03-19', false, 100),

  ('Out of the Wild',
   'https://irunearth.substack.com/p/out-of-the-wild',
   'personal', 'Personal', NULL, '2026-03-12', false, 101),

  ('Parallel Worlds in 2026',
   'https://irunearth.substack.com/p/parallel-worlds-in-2026',
   'personal', 'Personal', NULL, '2026-03-05', false, 102),

  ('Ecological Damage is the Best',
   'https://irunearth.substack.com/p/ecological-damage-is-the-best',
   'personal', 'Personal', NULL, '2026-02-27', false, 103),

  ('Get it while you can (AI)',
   'https://irunearth.substack.com/p/how-to-play-ai-like-a-chess-grand',
   'tech', 'Tech', NULL, '2026-02-19', false, 104),

  ('Bullfrog',
   'https://irunearth.substack.com/p/bullfrog',
   'personal', 'Personal', NULL, '2026-02-12', false, 105),

  ('To have kids or not to have kids',
   'https://irunearth.substack.com/p/to-have-kids-or-not-to-have-kids',
   'personal', 'Personal', NULL, '2026-01-22', false, 106),

  ('Reluctant Leaders',
   'https://irunearth.substack.com/p/reluctant-leaders',
   'personal', 'Personal', NULL, '2026-01-15', false, 107),

  ('The year ahead: 2026',
   'https://irunearth.substack.com/p/the-year-ahead-2026',
   'personal', 'Personal', NULL, '2026-01-08', false, 108),

  ('2025 in review',
   'https://irunearth.substack.com/p/2025-in-review-and-the-year-ahead',
   'personal', 'Personal', NULL, '2026-01-02', false, 109),

  ('That''s a wrap',
   'https://irunearth.substack.com/p/thats-a-wrap',
   'north-america', 'North America', NULL, '2024-05-02', false, 110),

  ('The Amazon Pivot Program',
   'https://irunearth.substack.com/p/the-amazon-pivot-program',
   'tech', 'Tech', NULL, '2023-09-12', false, 111);
