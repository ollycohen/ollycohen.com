-- ============================================================
-- ollycohen.com CMS — Additions to initial schema
-- Run this AFTER migration.sql if you already ran that.
-- Supabase SQL Editor → New query → Paste → Run
-- ============================================================

-- Add rendering fields to adventures that are needed for
-- dynamic card/timeline generation on the frontend.
ALTER TABLE adventures ADD COLUMN IF NOT EXISTS card_href  text;   -- href for homepage card
ALTER TABLE adventures ADD COLUMN IF NOT EXISTS section_id text;   -- HTML id for timeline anchor
ALTER TABLE adventures ADD COLUMN IF NOT EXISTS card_year  text;   -- short year label for card overlay

-- Populate all fields (gradient was already in schema, just had no data)
UPDATE adventures SET
  card_href  = '/pages/andes.html',
  section_id = 'andes',
  card_year  = 'May 2026',
  gradient   = 'linear-gradient(135deg, #1a3a2a, #2d5a3d, #1a3a2a)'
WHERE slug = 'andes-fkt';

UPDATE adventures SET
  card_href  = '/pages/adventures.html#asia',
  section_id = 'asia',
  card_year  = '2025',
  gradient   = 'linear-gradient(135deg, #2a1a3a, #5a2d4d, #2a1a3a)'
WHERE slug = 'asia-india-japan';

UPDATE adventures SET
  card_href  = '/pages/adventures.html#africa',
  section_id = 'africa',
  card_year  = '2024',
  gradient   = 'linear-gradient(135deg, #3a2a1a, #5a4d2d, #3a2a1a)'
WHERE slug = 'africa-kilimanjaro';

UPDATE adventures SET
  card_href  = '/pages/adventures.html#northamerica',
  section_id = 'northamerica',
  card_year  = '2024',
  gradient   = 'linear-gradient(135deg, #1a2a3a, #2d4a5a, #1a2a3a)'
WHERE slug = 'north-america-jasper';
