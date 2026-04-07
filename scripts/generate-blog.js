// scripts/generate-blog.js
// Fetches blog_posts from Supabase and bakes them into blog/index.html as a static JS array.
//
// Usage: node scripts/generate-blog.js
//
// Reads SUPABASE_URL and SUPABASE_ANON_KEY from js/config.js, then calls the
// Supabase REST API to get all posts ordered newest-first, and replaces the
// content between <!-- BLOG_DATA_START --> and <!-- BLOG_DATA_END --> in
// blog/index.html with a fresh <script> block containing the data.

'use strict';

const https = require('https');
const fs = require('fs');
const path = require('path');

// ── Resolve paths relative to repo root (one level up from scripts/) ──────────
const repoRoot = path.resolve(__dirname, '..');
const configPath = path.join(repoRoot, 'js', 'config.js');
const blogPath = path.join(repoRoot, 'blog', 'index.html');

// ── Read and parse js/config.js ───────────────────────────────────────────────
const configSource = fs.readFileSync(configPath, 'utf8');

const urlMatch = configSource.match(/SUPABASE_URL\s*[:=]\s*['"`]([^'"`]+)['"`]/);
const keyMatch = configSource.match(/SUPABASE_ANON_KEY\s*[:=]\s*['"`]([^'"`]+)['"`]/);

if (!urlMatch || !keyMatch) {
  console.error('ERROR: Could not parse SUPABASE_URL or SUPABASE_ANON_KEY from js/config.js');
  process.exit(1);
}

const SUPABASE_URL = urlMatch[1].replace(/\/$/, '');
const SUPABASE_ANON_KEY = keyMatch[1];

// ── Fetch posts from Supabase REST API ────────────────────────────────────────
const apiUrl = `${SUPABASE_URL}/rest/v1/blog_posts?select=title,url,category,tag,date&order=date.desc`;
const parsedUrl = new URL(apiUrl);

const options = {
  hostname: parsedUrl.hostname,
  path: parsedUrl.pathname + parsedUrl.search,
  method: 'GET',
  headers: {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Accept': 'application/json',
  },
};

console.log(`Fetching posts from ${SUPABASE_URL}/rest/v1/blog_posts …`);

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    if (res.statusCode !== 200) {
      console.error(`ERROR: Supabase returned HTTP ${res.statusCode}`);
      console.error(body);
      process.exit(1);
    }

    let posts;
    try {
      posts = JSON.parse(body);
    } catch (e) {
      console.error('ERROR: Could not parse response as JSON');
      console.error(body);
      process.exit(1);
    }

    if (!Array.isArray(posts)) {
      console.error('ERROR: Expected an array of posts but got:', typeof posts);
      process.exit(1);
    }

    // ── Build the replacement block ───────────────────────────────────────────
    const json = JSON.stringify(posts, null, 2);
    const replacement =
      `<!-- BLOG_DATA_START -->\n<script>\nlet BLOG_POSTS = ${json};\n</script>\n<!-- BLOG_DATA_END -->`;

    // ── Patch blog.html ───────────────────────────────────────────────────────
    const html = fs.readFileSync(blogPath, 'utf8');
    const startMarker = '<!-- BLOG_DATA_START -->';
    const endMarker = '<!-- BLOG_DATA_END -->';

    const startIdx = html.indexOf(startMarker);
    const endIdx = html.indexOf(endMarker);

    if (startIdx === -1 || endIdx === -1) {
      console.error('ERROR: Could not find <!-- BLOG_DATA_START --> / <!-- BLOG_DATA_END --> markers in blog/index.html');
      process.exit(1);
    }

    const updated = html.slice(0, startIdx) + replacement + html.slice(endIdx + endMarker.length);
    fs.writeFileSync(blogPath, updated, 'utf8');

    console.log(`Done. Baked ${posts.length} post${posts.length !== 1 ? 's' : ''} into blog/index.html`);
  });
});

req.on('error', (e) => {
  console.error('ERROR: Request failed:', e.message);
  process.exit(1);
});

req.end();
