-- Add precise date ranges to each map row.
-- Stored as raw date columns; the frontend formats them.

ALTER TABLE adventure_maps
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date   date;

UPDATE adventure_maps SET start_date = '2024-07-01', end_date = '2024-10-16'
  WHERE adventure_slug = 'africa-kilimanjaro';

UPDATE adventure_maps SET start_date = '2025-05-26', end_date = '2025-06-18'
  WHERE adventure_slug = 'asia-india-japan' AND label = 'India';

UPDATE adventure_maps SET start_date = '2025-06-28', end_date = '2025-07-23'
  WHERE adventure_slug = 'asia-india-japan' AND label = 'Japan';

UPDATE adventure_maps SET start_date = '2024-01-01', end_date = '2024-05-01'
  WHERE adventure_slug = 'north-america-jasper';
