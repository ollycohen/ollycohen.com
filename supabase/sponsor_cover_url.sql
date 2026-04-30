-- Add cover_url to sponsors for an optional hero image at the top of each
-- sponsor card. logo_url stays as the small brand mark inside the card body.

ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS cover_url text;

UPDATE sponsors
SET cover_url = 'https://res.cloudinary.com/dhrlrjvax/image/upload/v1777590539/sponsors/black-diamond/cover/ollyblackdiamond.jpg'
WHERE name = 'Black Diamond';
