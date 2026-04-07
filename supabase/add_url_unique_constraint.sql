-- Add unique constraint on blog_posts.url to enable upsert-by-URL
-- This prevents duplicate posts when syncing from Substack
ALTER TABLE blog_posts ADD CONSTRAINT blog_posts_url_unique UNIQUE (url);
