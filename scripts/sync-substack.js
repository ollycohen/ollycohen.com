// scripts/sync-substack.js
// Fetches posts from Substack RSS feeds and upserts them into Supabase blog_posts.
//
// Usage: SUPABASE_SERVICE_KEY=<key> node scripts/sync-substack.js
//
// Uses RSS feeds (not the JSON API) because Cloudflare blocks the API from
// datacenter IPs. Each TAG_MAP entry fetches its own tag-specific RSS feed.
// Adventure posts (north-america, africa, asia) are managed manually.

'use strict';

const https = require('https');
const fs = require('fs');
const path = require('path');

// ── Config ───────────────────────────────────────────────────────────────────
const SUBSTACK_HOST = 'irunearth.substack.com';

// Map Substack tag slugs to blog_posts category + display tag.
// Each entry fetches https://irunearth.substack.com/feed?tag=<slug>
// Add new entries here to auto-sync additional sections.
const TAG_MAP = {
  'ai': { category: 'tech', tag: 'Tech' },
  // 'diary': { category: 'personal', tag: 'Personal' },  // uncomment to auto-sync diary posts
};

// ── Read Supabase config ─────────────────────────────────────────────────────
const repoRoot = path.resolve(__dirname, '..');
const configSource = fs.readFileSync(path.join(repoRoot, 'js', 'config.js'), 'utf8');

const urlMatch = configSource.match(/SUPABASE_URL\s*[:=]\s*['"`]([^'"`]+)['"`]/);
if (!urlMatch) { console.error('ERROR: Could not parse SUPABASE_URL from js/config.js'); process.exit(1); }
const SUPABASE_URL = urlMatch[1].replace(/\/$/, '');

const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!SUPABASE_SERVICE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_KEY env var is required');
  process.exit(1);
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const opts = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ollycohen-blog-sync/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
    };
    https.get(opts, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 200)}`));
        resolve(body);
      });
    }).on('error', reject);
  });
}

function httpsRequest(method, url, headers, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const opts = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method,
      headers,
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// ── Parse RSS XML (minimal, no dependencies) ─────────────────────────────────
function parseRssItems(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const content = match[1];
    const get = (tag) => {
      // Handle both plain text and CDATA
      const m = content.match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`));
      return m ? m[1].trim() : null;
    };
    const title = get('title');
    const link = get('link');
    const pubDate = get('pubDate');
    const description = get('description');
    if (title && link && pubDate) {
      items.push({ title, link, pubDate, description });
    }
  }
  return items;
}

// ── Fetch posts from RSS feeds ───────────────────────────────────────────────
async function fetchPostsFromRss() {
  const allPosts = [];
  for (const [tagSlug, mapping] of Object.entries(TAG_MAP)) {
    const feedUrl = `https://${SUBSTACK_HOST}/feed?tag=${tagSlug}`;
    console.log(`Fetching RSS feed: ${feedUrl}`);
    const xml = await httpsGet(feedUrl);
    const items = parseRssItems(xml);
    console.log(`  Found ${items.length} posts for tag "${tagSlug}"`);

    for (const item of items) {
      const date = new Date(item.pubDate).toISOString().split('T')[0];
      allPosts.push({
        title: item.title,
        url: item.link,
        category: mapping.category,
        tag: mapping.tag,
        excerpt: item.description || null,
        date: date,
        sort_order: 0,
      });
    }
  }
  console.log(`Total: ${allPosts.length} posts to sync`);
  return allPosts;
}

// ── Upsert into Supabase ─────────────────────────────────────────────────────
async function upsertPosts(posts) {
  if (posts.length === 0) { console.log('No posts to upsert'); return; }

  const url = `${SUPABASE_URL}/rest/v1/blog_posts?on_conflict=url`;
  const headers = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates',
  };

  // Upsert in batches of 20
  const BATCH_SIZE = 20;
  let total = 0;
  for (let i = 0; i < posts.length; i += BATCH_SIZE) {
    const batch = posts.slice(i, i + BATCH_SIZE);
    const res = await httpsRequest('POST', url, headers, JSON.stringify(batch));
    if (res.status >= 400) {
      console.error(`ERROR: Supabase upsert failed (HTTP ${res.status}): ${res.body}`);
      process.exit(1);
    }
    total += batch.length;
    console.log(`Upserted batch ${Math.floor(i / BATCH_SIZE) + 1} (${total}/${posts.length} posts)`);
  }
  console.log(`Done. Upserted ${total} posts into blog_posts`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const posts = await fetchPostsFromRss();
  await upsertPosts(posts);
}

main().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
