// scripts/sync-substack.js
// Fetches posts from Substack API and upserts them into Supabase blog_posts.
//
// Usage: SUPABASE_SERVICE_KEY=<key> node scripts/sync-substack.js
//
// Only syncs posts matching mapped Substack tags (see TAG_MAP below).
// Adventure posts (north-america, africa, asia) are managed manually.

'use strict';

const https = require('https');
const fs = require('fs');
const path = require('path');

// ── Config ───────────────────────────────────────────────────────────────────
const SUBSTACK_HOST = 'irunearth.substack.com';
const PAGE_SIZE = 50;

// Map Substack tag slugs to blog_posts category + display tag.
// Add new entries here to auto-sync additional sections.
const TAG_MAP = {
  'ai': { category: 'tech', tag: 'Tech' },
  // 'diary': { category: 'personal', tag: 'Personal' },  // uncomment to auto-sync diary posts
};

// Categories managed manually — posts with these categories in Supabase
// will NOT be touched by this script, even if they also appear on Substack.
const MANUAL_CATEGORIES = new Set(['north-america', 'africa', 'asia', 'personal']);

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
    https.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 200)}`));
        resolve(JSON.parse(body));
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

// ── Fetch all posts from Substack ────────────────────────────────────────────
async function fetchSubstackPosts() {
  const allPosts = [];
  let offset = 0;
  while (true) {
    const url = `https://${SUBSTACK_HOST}/api/v1/posts?limit=${PAGE_SIZE}&offset=${offset}`;
    console.log(`Fetching Substack posts (offset=${offset})…`);
    const posts = await httpsGet(url);
    if (!Array.isArray(posts) || posts.length === 0) break;
    allPosts.push(...posts);
    if (posts.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  console.log(`Fetched ${allPosts.length} total posts from Substack`);
  return allPosts;
}

// ── Map Substack posts to blog_posts rows ────────────────────────────────────
function mapPosts(substackPosts) {
  const mapped = [];
  for (const post of substackPosts) {
    const tags = (post.postTags || []).map(t => t.slug);
    // Find the first matching tag in our TAG_MAP
    let matchedTag = null;
    for (const slug of tags) {
      if (TAG_MAP[slug]) { matchedTag = slug; break; }
    }
    if (!matchedTag) continue;

    const mapping = TAG_MAP[matchedTag];
    const date = post.post_date ? post.post_date.split('T')[0] : null;
    if (!date) continue;

    mapped.push({
      title: post.title,
      url: post.canonical_url,
      category: mapping.category,
      tag: mapping.tag,
      excerpt: post.subtitle || post.description || null,
      date: date,
      sort_order: 0,
    });
  }
  console.log(`Mapped ${mapped.length} posts for upsert (tags: ${Object.keys(TAG_MAP).join(', ')})`);
  return mapped;
}

// ── Upsert into Supabase ─────────────────────────────────────────────────────
async function upsertPosts(posts) {
  if (posts.length === 0) { console.log('No posts to upsert'); return; }

  const url = `${SUPABASE_URL}/rest/v1/blog_posts`;
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
  const substackPosts = await fetchSubstackPosts();
  const mapped = mapPosts(substackPosts);
  await upsertPosts(mapped);
}

main().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
