-- ============================================================
-- ollycohen.com — Populate Andes adventure page content
-- Adds text sections and CalTopo map URL for the slug-based
-- /adventure/?slug=andes page.
--
-- Run in Supabase SQL Editor (paste → Run).
-- Safe to run multiple times (deletes + re-inserts by slug).
-- ============================================================

-- ── 1. Set CalTopo map URL on the adventure row ─────────────
UPDATE adventures
SET map_url = 'https://caltopo.com/m/UV171MJ'
WHERE slug = 'andes';

-- ── 2. Add text sections ────────────────────────────────────
DELETE FROM adventure_sections WHERE adventure_slug = 'andes';

INSERT INTO adventure_sections (adventure_slug, heading, paragraphs, link_url, link_label, sort_order) VALUES
  ('andes', NULL,
   '[
     "My only intention is to head south through the Andes, on foot as much as possible, chasing joy, doing epic things.",
     "I would like to \"find a nice way,\" as Kilian Jornet says.",
     "I will continue until I feel like stopping."
   ]'::jsonb,
   'https://irunearth.substack.com', 'Subscribe to Newsletter →', 1);
