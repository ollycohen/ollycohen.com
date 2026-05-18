-- Add Cripple Creek Backcountry as a sponsor.
-- They handle Olly's ski mounts and gear maintenance.
--
-- logo_url is left null here; upload the logo with scripts/upload-images.sh
-- (drop the file under images/sponsors/Cripple Creek Backcountry/logo/),
-- then PATCH the row with the returned Cloudinary URL.

INSERT INTO sponsors (name, url, description, sort_order, active)
VALUES (
  'Cripple Creek Backcountry',
  'https://cripplecreekbc.com/',
  'Ski shop and backcountry specialists handling my ski mounts, bindings, and maintenance — the gear care that keeps every descent dialed.',
  3,
  true
)
ON CONFLICT DO NOTHING;
