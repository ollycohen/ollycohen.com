-- Add image_url column to adventures for cover images on timeline + detail pages
ALTER TABLE adventures ADD COLUMN IF NOT EXISTS image_url text;

UPDATE adventures SET image_url = '/images/adventures/africa/cover.jpg' WHERE slug = 'africa-kilimanjaro';
UPDATE adventures SET image_url = '/images/adventures/asia/cover.jpg' WHERE slug = 'asia-india-japan';
UPDATE adventures SET image_url = '/images/adventures/north-america/cover.jpg' WHERE slug = 'north-america-jasper';

-- Adventure maps table: supports multiple maps per adventure (e.g. Asia has India + Japan)
CREATE TABLE IF NOT EXISTS adventure_maps (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  adventure_slug text NOT NULL,
  label text NOT NULL,
  map_url text NOT NULL,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE adventure_maps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read adventure_maps" ON adventure_maps;
CREATE POLICY "Public read adventure_maps" ON adventure_maps FOR SELECT USING (true);

-- Populate maps
INSERT INTO adventure_maps (adventure_slug, label, map_url, sort_order) VALUES
  ('africa-kilimanjaro', 'Route Map', 'https://www.google.com/maps/d/u/0/embed?mid=10D-9ifvMc2b5G_MHsaprzz7Dw_9F514&ehbc=2E312F', 0),
  ('asia-india-japan', 'India', 'https://www.google.com/maps/d/u/0/embed?mid=1L-D4fmN-YswK4exl2HZ7SRdqU_gqThw&ehbc=2E312F', 0),
  ('asia-india-japan', 'Japan', 'https://www.google.com/maps/d/u/0/embed?mid=1PawEXrgtyOnoiZWqyp-Rg_8LQbDwBAo&ehbc=2E312F', 1),
  ('north-america-jasper', 'Route Map', 'https://www.google.com/maps/d/u/0/embed?mid=1MapiHkW74jEYe18Yt6GOQ5QQ5h1kCxU&ehbc=2E312F', 0);
