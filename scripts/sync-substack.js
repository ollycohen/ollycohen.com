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

// The main feed (https://irunearth.substack.com/feed) is the source of truth
// for which posts exist. We additionally fetch one tag-filtered feed per
// TAG_MAP entry only to discover which posts belong to that category.
//
// Priority: TAG_MAP iteration order. If a post is tagged with both 'ai' and
// 'washington', the first key in TAG_MAP wins. Order entries from most-
// specific to most-general.
//
// Anything in the main feed that doesn't appear in any tag feed is inserted
// with DEFAULT_MAPPING below.
//
// The sync is INSERT-ONLY (see insertNewPosts), so any category fix you make
// later in Supabase is permanent — re-running the sync will never overwrite
// an existing row. Add new tag mappings here as you start using new tags on
// Substack and they'll auto-categorize on first publish.
const TAG_MAP = {
  // Tech / engineering posts
  'ai':         { category: 'tech',          tag: 'Tech' },

  // Adventure regions — keyed by Substack tags Olly actually uses.
  // Add more state/country tags as they appear on new posts.
  'washington': { category: 'north-america', tag: 'North America' },
};
const DEFAULT_MAPPING = { category: 'personal', tag: 'Personal' };

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
// Use a realistic desktop Chrome User-Agent + full set of browser headers.
// Substack is behind Cloudflare, and Cloudflare's bot challenge is partly
// driven by User-Agent heuristics — a bare "compatible; myscript/1.0" UA is
// flagged as a bot and served a 403 "Just a moment..." page, especially from
// datacenter IP ranges (which is every GitHub Actions runner).
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'identity', // avoid gzip so we can read the body directly
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Sec-Ch-Ua': '"Chromium";v="131", "Not_A Brand";v="24"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"macOS"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
};

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const opts = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      headers: BROWSER_HEADERS,
    };
    https.get(opts, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          const cfRay = res.headers['cf-ray'] || '(none)';
          const server = res.headers['server'] || '(none)';
          const mitigated = res.headers['cf-mitigated'] || '(none)';
          return reject(new Error(
            `HTTP ${res.statusCode} for ${url}\n` +
            `  server: ${server}  cf-ray: ${cfRay}  cf-mitigated: ${mitigated}\n` +
            `  body (first 300 chars): ${body.slice(0, 300).replace(/\s+/g, ' ')}`
          ));
        }
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

// ── Fetch one feed (direct first, rss2json fallback on CF block) ─────────────
// When run locally from Olly's Mac, the direct path works (home IP isn't
// blocked). When run on GitHub Actions, Cloudflare issues a "managed challenge"
// to every datacenter IP and we get HTTP 403. In that case we transparently
// fall back to the free rss2json.com API, which fetches on our behalf from a
// non-blocked IP and returns already-parsed JSON (so we skip our XML parser).
async function fetchFeedItems(feedUrl) {
  try {
    const xml = await httpsGet(feedUrl);
    return { items: parseRssItems(xml), via: 'direct' };
  } catch (err) {
    if (!/HTTP 403/.test(err.message)) throw err;
    console.log(`  Direct fetch 403'd (Cloudflare); falling back to rss2json.com`);
    const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
    const body = await httpsGet(proxyUrl);
    let parsed;
    try { parsed = JSON.parse(body); }
    catch (e) { throw new Error(`rss2json returned non-JSON: ${body.slice(0, 300)}`); }
    if (parsed.status !== 'ok') {
      throw new Error(`rss2json status=${parsed.status}: ${parsed.message || '(no message)'}`);
    }
    // rss2json items are already parsed; normalize to the same shape
    // parseRssItems produces (title/link/pubDate/description).
    const items = (parsed.items || []).map((it) => ({
      title: it.title,
      link: it.link,
      pubDate: it.pubDate, // "YYYY-MM-DD HH:MM:SS" — new Date() handles it
      description: it.description || null,
    }));
    return { items, via: 'rss2json' };
  }
}

// ── Fetch posts from RSS feeds ───────────────────────────────────────────────
async function fetchPostsFromRss() {
  // 1. Main feed = source of truth for which posts exist on Substack.
  //    Fetched first so a failure here aborts before we waste tag requests.
  const mainFeedUrl = `https://${SUBSTACK_HOST}/feed`;
  console.log(`Fetching main feed: ${mainFeedUrl}`);
  const main = await fetchFeedItems(mainFeedUrl);
  console.log(`  Found ${main.items.length} posts in main feed (via ${main.via})`);

  // 2. For each tag in TAG_MAP, fetch the tag-filtered feed and remember
  //    which post URLs belong to that category. First key in TAG_MAP wins
  //    when a post matches multiple tags.
  const urlToMapping = new Map();
  for (const [tagSlug, mapping] of Object.entries(TAG_MAP)) {
    const tagFeedUrl = `https://${SUBSTACK_HOST}/feed?tag=${tagSlug}`;
    console.log(`Fetching tag feed: ${tagFeedUrl}`);
    const tag = await fetchFeedItems(tagFeedUrl);
    console.log(`  Found ${tag.items.length} posts for tag "${tagSlug}" → ${mapping.category} (via ${tag.via})`);
    for (const item of tag.items) {
      if (!urlToMapping.has(item.link)) urlToMapping.set(item.link, mapping);
    }
  }

  // 3. Build the post objects from the main feed, applying tag → category
  //    mapping where we found one and DEFAULT_MAPPING otherwise.
  const allPosts = main.items.map((item) => {
    const mapping = urlToMapping.get(item.link) || DEFAULT_MAPPING;
    return {
      title: item.title,
      url: item.link,
      category: mapping.category,
      tag: mapping.tag,
      excerpt: item.description || null,
      date: new Date(item.pubDate).toISOString().split('T')[0],
      sort_order: 0,
    };
  });
  console.log(`Total: ${allPosts.length} posts to sync (new ones will be inserted; existing rows are left alone)`);
  return allPosts;
}

// ── Insert new posts into Supabase (insert-only, preserves existing rows) ───
async function insertNewPosts(posts) {
  if (posts.length === 0) { console.log('No posts to insert'); return; }

  // resolution=ignore-duplicates makes PostgREST skip rows whose URL already
  // exists, so any manual category/tag fix you've made in Supabase is never
  // overwritten. With return=representation, the response body contains only
  // the rows that were actually inserted (duplicates are silently dropped).
  const url = `${SUPABASE_URL}/rest/v1/blog_posts?on_conflict=url`;
  const headers = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'resolution=ignore-duplicates,return=representation',
  };

  const BATCH_SIZE = 20;
  let totalInserted = 0;
  for (let i = 0; i < posts.length; i += BATCH_SIZE) {
    const batch = posts.slice(i, i + BATCH_SIZE);
    const res = await httpsRequest('POST', url, headers, JSON.stringify(batch));
    if (res.status >= 400) {
      console.error(`ERROR: Supabase insert failed (HTTP ${res.status}): ${res.body}`);
      process.exit(1);
    }
    let inserted = [];
    try { inserted = res.body ? JSON.parse(res.body) : []; }
    catch (e) { /* empty 201 is fine */ }
    totalInserted += inserted.length;
    const skipped = batch.length - inserted.length;
    console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${inserted.length} new, ${skipped} already in DB`);
    for (const p of inserted) {
      console.log(`  + ${p.date}  [${p.category}]  ${p.title}`);
    }
  }
  console.log(`Done. ${totalInserted} new posts inserted into blog_posts`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const posts = await fetchPostsFromRss();
  await insertNewPosts(posts);
}

main().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
