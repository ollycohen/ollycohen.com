# spec.md — Database Backend for ollycohen.com

## Goal

Replace hardcoded HTML content with a real database so that:
1. **Claude can read/write directly** via REST API to add, edit, and remove site content
2. **A human can edit** through a spreadsheet-like table editor UI
3. **The site stays static** — the DB is a content source at build time, not a runtime dependency

---

## Approach: Supabase + GitHub Actions Static Build

**Supabase** (hosted Postgres) as the database. A Node build script queries all tables, renders HTML from templates, and commits to `main` for GitHub Pages deploy.

### Why Supabase
- **Real Postgres** — proper schemas, constraints, foreign keys, indexes
- **Built-in Table Editor** — spreadsheet-style UI for human editing at `app.supabase.com`
- **Auto-generated REST API** (PostgREST) — every table is instantly queryable via HTTP
- **Row Level Security** — fine-grained access control, not just "public or private"
- **Free tier** — 500 MB database, 50K monthly API requests, 2 projects — more than enough for a personal site with ~100 rows total
- **Claude integration** — simple REST calls with an API key, or the `@supabase/supabase-js` client
- **Realtime subscriptions** — could enable live preview of edits in the future
- **SQL migrations** — schema changes are versioned and repeatable

### Comparison

| | Supabase | Google Sheets | Airtable | Notion |
|---|---|---|---|---|
| Real database | Postgres | No | No | No |
| Proper schema/types | Yes | No | Partial | No |
| Foreign keys | Yes | No | Link fields | Relations |
| Free tier | Generous | Generous | Limited | Limited API |
| Human-editable UI | Table Editor | Spreadsheet | Spreadsheet | Pages |
| REST API | Auto-generated | Requires setup | Yes | Slow |
| Auth/RLS | Built-in | Service account | API key | API key |
| Migrations | SQL files | N/A | N/A | N/A |

---

## Architecture

```
Supabase (Postgres — source of truth)
       │
       ▼
  Build Script (Node.js)
   ├── Queries all tables via Supabase REST API
   ├── Renders HTML from EJS templates
   └── Writes final .html files to repo root
       │
       ▼
  git commit + push → GitHub Pages deploy
```

### Build Triggers
- **GitHub Action: `workflow_dispatch`** — Claude triggers after DB edits
- **GitHub Action: `schedule`** — optional cron (e.g. daily) as a safety net
- **Local:** `npm run build` for development

### Data Flow for a Typical Edit

```
Claude (or human via Table Editor)
  → INSERT/UPDATE/DELETE row in Supabase
  → Trigger GitHub Actions workflow_dispatch
  → Build script queries Supabase, renders HTML
  → git commit + push
  → GitHub Pages serves updated static site
```

---

## Database Schema

All tables use `id` as primary key (UUID, auto-generated). All tables include `created_at` and `updated_at` timestamps. Ordering uses `sort_order` (integer) where display sequence matters.

### `blog_posts`

| Column | Type | Constraints | Example |
|--------|------|-------------|---------|
| `id` | uuid | PK, default `gen_random_uuid()` | |
| `slug` | text | UNIQUE, NOT NULL | `whats-a-human-for` |
| `title` | text | NOT NULL | `What's a Human For` |
| `url` | text | NOT NULL | `https://irunearth.substack.com/p/...` |
| `category` | text | NOT NULL, CHECK | `tech` |
| `display_tag` | text | NOT NULL | `Tech` |
| `display_date` | text | NOT NULL | `Feb 2026` |
| `published_at` | date | NOT NULL | `2026-02-15` |
| `featured_on_homepage` | boolean | DEFAULT false | `true` |
| `homepage_excerpt` | text | | `AI is changing what it means to be an engineer...` |
| `sort_order` | int | | `1` |
| `created_at` | timestamptz | DEFAULT now() | |
| `updated_at` | timestamptz | DEFAULT now() | |

**CHECK constraint on `category`:** `category IN ('tech', 'north-america', 'africa', 'asia', 'personal')`

### `adventures`

| Column | Type | Constraints | Example |
|--------|------|-------------|---------|
| `id` | uuid | PK | |
| `slug` | text | UNIQUE, NOT NULL | `andes` |
| `title` | text | NOT NULL | `Andes FKT` |
| `continent` | text | NOT NULL | `South America` |
| `start_date` | text | NOT NULL | `May 2026` |
| `end_date` | text | | |
| `distance_miles` | int | NOT NULL | `8000` |
| `duration_text` | text | | `12 months` |
| `description` | text | NOT NULL | Full paragraph |
| `route_details` | text | | `Colombia → Argentina` |
| `status` | text | NOT NULL, CHECK | `upcoming` |
| `featured` | boolean | DEFAULT false | `true` |
| `homepage_excerpt` | text | | Card blurb |
| `badge` | text | | `Next` |
| `bg_gradient` | text | | `135deg, #2d5016, #1a3a0a` |
| `image_url` | text | | |
| `sort_order` | int | NOT NULL | `1` |
| `created_at` | timestamptz | DEFAULT now() | |
| `updated_at` | timestamptz | DEFAULT now() | |

**CHECK:** `status IN ('upcoming', 'in-progress', 'completed')`

### `charities`

| Column | Type | Constraints | Example |
|--------|------|-------------|---------|
| `id` | uuid | PK | |
| `slug` | text | UNIQUE, NOT NULL | `kilimanjaro-aid` |
| `title` | text | NOT NULL | `Kilimanjaro Aid Project` |
| `adventure_id` | uuid | FK → adventures.id | |
| `year` | int | NOT NULL | `2026` |
| `description` | text | NOT NULL | |
| `website_url` | text | | |
| `amount_raised` | text | | `$20K+` |
| `sort_order` | int | NOT NULL | `1` |
| `created_at` | timestamptz | DEFAULT now() | |
| `updated_at` | timestamptz | DEFAULT now() | |

### `sponsors`

| Column | Type | Constraints | Example |
|--------|------|-------------|---------|
| `id` | uuid | PK | |
| `slug` | text | UNIQUE, NOT NULL | `norda` |
| `name` | text | NOT NULL | `Norda` |
| `website_url` | text | NOT NULL | `https://nordarun.com/` |
| `description` | text | NOT NULL | |
| `logo_url` | text | | |
| `sort_order` | int | NOT NULL | `1` |
| `created_at` | timestamptz | DEFAULT now() | |
| `updated_at` | timestamptz | DEFAULT now() | |

### `press`

| Column | Type | Constraints | Example |
|--------|------|-------------|---------|
| `id` | uuid | PK | |
| `slug` | text | UNIQUE, NOT NULL | `clearwater-times-rockies` |
| `title` | text | NOT NULL | `A Human-Powered Adventure into the Rockies` |
| `publication` | text | NOT NULL | `Clearwater Times` |
| `url` | text | NOT NULL | |
| `display_date` | text | NOT NULL | `Mar 2024` |
| `published_at` | date | | `2024-03-15` |
| `type` | text | NOT NULL, CHECK | `press` |
| `sort_order` | int | NOT NULL | `1` |
| `created_at` | timestamptz | DEFAULT now() | |
| `updated_at` | timestamptz | DEFAULT now() | |

**CHECK:** `type IN ('press', 'speaking', 'feature')`

### `andes_faq`

| Column | Type | Constraints | Example |
|--------|------|-------------|---------|
| `id` | uuid | PK | |
| `question` | text | NOT NULL | `Why would you do this?` |
| `answer` | text | NOT NULL | |
| `sort_order` | int | NOT NULL | `1` |
| `created_at` | timestamptz | DEFAULT now() | |
| `updated_at` | timestamptz | DEFAULT now() | |

### `andes_waypoints`

| Column | Type | Constraints | Example |
|--------|------|-------------|---------|
| `id` | uuid | PK | |
| `name` | text | NOT NULL | `Aconcagua` |
| `elevation_ft` | int | | `22838` |
| `description` | text | | |
| `sort_order` | int | NOT NULL | `1` |
| `created_at` | timestamptz | DEFAULT now() | |
| `updated_at` | timestamptz | DEFAULT now() | |

### `stats`

| Column | Type | Constraints | Example |
|--------|------|-------------|---------|
| `id` | uuid | PK | |
| `key` | text | UNIQUE, NOT NULL | `miles-run` |
| `label` | text | NOT NULL | `Miles Run` |
| `value` | int | NOT NULL | `4500` |
| `suffix` | text | DEFAULT '' | `+` |
| `page` | text | NOT NULL, CHECK | `homepage` |
| `sort_order` | int | NOT NULL | `1` |
| `created_at` | timestamptz | DEFAULT now() | |
| `updated_at` | timestamptz | DEFAULT now() | |

**CHECK:** `page IN ('homepage', 'andes')`

### `social_links`

| Column | Type | Constraints | Example |
|--------|------|-------------|---------|
| `id` | uuid | PK | |
| `platform` | text | UNIQUE, NOT NULL | `instagram` |
| `label` | text | NOT NULL | `Instagram` |
| `url` | text | NOT NULL | `https://instagram.com/ollycohen` |
| `icon` | text | NOT NULL | `instagram` |
| `show_in_footer` | boolean | DEFAULT true | `true` |
| `sort_order` | int | NOT NULL | `1` |
| `created_at` | timestamptz | DEFAULT now() | |
| `updated_at` | timestamptz | DEFAULT now() | |

### `site_config`

| Column | Type | Constraints | Example |
|--------|------|-------------|---------|
| `key` | text | PK | `owner_name` |
| `value` | text | NOT NULL | `Olly Cohen` |
| `updated_at` | timestamptz | DEFAULT now() | |

**Known keys:** `owner_name`, `owner_email`, `tagline`, `brand_name`, `meta_description`, `copyright_year`, `departure_date`.

---

## SQL Migration

A single migration file at `supabase/migrations/001_initial_schema.sql` defines all tables, constraints, RLS policies, and the `updated_at` trigger.

### Row Level Security

Two roles:
- **`anon`** — read-only access to all tables (for the build script using the public anon key)
- **`service_role`** — full CRUD (for Claude, using the service role key stored as a secret)

```sql
-- Example RLS policy for blog_posts (same pattern for all tables)
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Anyone can read (build script uses anon key)
CREATE POLICY "Public read access" ON blog_posts
  FOR SELECT USING (true);

-- Only service_role can write (Claude uses service role key)
CREATE POLICY "Service role write access" ON blog_posts
  FOR ALL USING (auth.role() = 'service_role');
```

### `updated_at` Trigger

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Applied to every table (except site_config which uses key as PK)
CREATE TRIGGER set_updated_at BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
-- ... repeated for all tables
```

---

## Build Script

`build/build.js` — single file, ~150-250 lines.

### Dependencies (minimal)

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2",
    "ejs": "^3"
  }
}
```

Two dependencies total. `@supabase/supabase-js` for DB queries, `ejs` for templating (embedded JS — no new syntax to learn, just `<%= variable %>` and `<% forEach %>` in HTML).

### Pseudocode

```js
import { createClient } from '@supabase/supabase-js'
import ejs from 'ejs'
import fs from 'fs/promises'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// 1. Fetch all content in parallel
const [blogPosts, adventures, sponsors, press, charities,
       andesFaq, andesWaypoints, stats, socialLinks, siteConfig]
  = await Promise.all([
    supabase.from('blog_posts').select('*').order('published_at', { ascending: false }),
    supabase.from('adventures').select('*').order('sort_order'),
    supabase.from('sponsors').select('*').order('sort_order'),
    supabase.from('press').select('*').order('sort_order'),
    supabase.from('charities').select('*, adventures(title, slug)').order('sort_order'),
    supabase.from('andes_faq').select('*').order('sort_order'),
    supabase.from('andes_waypoints').select('*').order('sort_order'),
    supabase.from('stats').select('*').order('sort_order'),
    supabase.from('social_links').select('*').order('sort_order'),
    supabase.from('site_config').select('*'),
  ])

// 2. Build shared context
const config = Object.fromEntries(siteConfig.data.map(r => [r.key, r.value]))
const ctx = { blogPosts, adventures, sponsors, press, charities,
              andesFaq, andesWaypoints, stats, socialLinks, config }

// 3. Render each page
const pages = [
  { template: 'templates/index.ejs', output: 'index.html' },
  { template: 'templates/pages/blog.ejs', output: 'pages/blog.html' },
  { template: 'templates/pages/adventures.ejs', output: 'pages/adventures.html' },
  { template: 'templates/pages/andes.ejs', output: 'pages/andes.html' },
  { template: 'templates/pages/engineering.ejs', output: 'pages/engineering.html' },
  { template: 'templates/pages/impact.ejs', output: 'pages/impact.html' },
  { template: 'templates/pages/sponsors.ejs', output: 'pages/sponsors.html' },
  { template: 'templates/404.ejs', output: '404.html' },
]

for (const page of pages) {
  const html = await ejs.renderFile(page.template, ctx)
  await fs.writeFile(page.output, html)
}
```

### Templates

```
templates/
├── index.ejs
├── 404.ejs
├── pages/
│   ├── adventures.ejs
│   ├── andes.ejs
│   ├── blog.ejs
│   ├── engineering.ejs
│   ├── impact.ejs
│   └── sponsors.ejs
└── partials/
    ├── head.ejs            # <head> with meta, fonts, CSS
    ├── nav.ejs             # Shared navigation
    └── footer.ejs          # Shared footer + social links
```

Partials are included with `<%- include('partials/nav') %>` — solves the current 8-file nav sync problem.

---

## Claude Integration

### Environment

Claude needs two environment variables:
- `SUPABASE_URL` — project URL (e.g. `https://abc123.supabase.co`)
- `SUPABASE_SERVICE_ROLE_KEY` — service role key for write access

### CRUD Operations

**Add a blog post:**
```js
await supabase.from('blog_posts').insert({
  slug: 'new-post-title',
  title: 'New Post Title',
  url: 'https://irunearth.substack.com/p/new-post',
  category: 'tech',
  display_tag: 'Tech',
  display_date: 'Mar 2026',
  published_at: '2026-03-20',
  featured_on_homepage: false,
  sort_order: 1
})
```

**Update a stat:**
```js
await supabase.from('stats')
  .update({ value: 5000 })
  .eq('key', 'miles-run')
```

**Remove a press item:**
```js
await supabase.from('press')
  .delete()
  .eq('slug', 'old-article')
```

**Read all adventures:**
```js
const { data } = await supabase.from('adventures')
  .select('*')
  .order('sort_order')
```

### Triggering a Build After Edits

Claude calls the GitHub Actions API after making DB changes:

```bash
gh workflow run build.yml
```

Or via REST:
```
POST /repos/ollycohen/ollycohen.com/actions/workflows/build.yml/dispatches
{ "ref": "main" }
```

---

## GitHub Actions Workflow

```yaml
# .github/workflows/build.yml
name: Build Site

on:
  workflow_dispatch:
  schedule:
    - cron: '0 6 * * *'  # Daily at 6am UTC as safety net

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm ci
        working-directory: build

      - run: node build.js
        working-directory: build
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}

      - name: Commit and push if changed
        run: |
          git diff --quiet && exit 0
          git config user.name "Site Builder"
          git config user.email "noreply@ollycohen.com"
          git add index.html 404.html pages/
          git commit -m "Rebuild site from database"
          git push
```

Note: the build uses the **anon key** (read-only). The service role key is only needed by Claude for writes and is never stored in the build workflow.

---

## Project Structure (After Migration)

```
ollycohen.com/
├── index.html                  # Generated — do not hand-edit
├── 404.html                    # Generated
├── pages/                      # Generated
│   ├── adventures.html
│   ├── andes.html
│   ├── blog.html
│   ├── engineering.html
│   ├── impact.html
│   └── sponsors.html
├── css/
│   └── style.css               # Not generated — still hand-edited
├── js/
│   └── main.js                 # Not generated — still hand-edited
├── build/
│   ├── build.js                # Build script
│   └── package.json            # 2 dependencies
├── templates/
│   ├── index.ejs
│   ├── 404.ejs
│   ├── pages/
│   │   ├── adventures.ejs
│   │   ├── andes.ejs
│   │   ├── blog.ejs
│   │   ├── engineering.ejs
│   │   ├── impact.ejs
│   │   └── sponsors.ejs
│   └── partials/
│       ├── head.ejs
│       ├── nav.ejs
│       └── footer.ejs
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── .github/
│   └── workflows/
│       └── build.yml
├── CNAME
├── CLAUDE.md
└── spec.md
```

---

## Migration Plan

### Phase 1: Set Up Supabase (30 min)
- Create Supabase project
- Run `001_initial_schema.sql` to create all tables with constraints and RLS
- Store project URL and keys

### Phase 2: Seed Data (1 hr)
- Claude scrapes current HTML and inserts all existing content into Supabase tables
- Human verifies data in the Table Editor UI — row counts match, no content lost

### Phase 3: Build Templates + Script (2-3 hrs)
- Convert each HTML page into an EJS template
- Extract shared nav/footer into partials
- Write `build/build.js`
- Run build and diff output against current HTML — should be identical or cosmetic-only differences

### Phase 4: Wire Up CI (30 min)
- Add GitHub Actions workflow
- Store `SUPABASE_URL` and `SUPABASE_ANON_KEY` as repo secrets
- Test: trigger workflow → verify build succeeds → verify deployed site unchanged

### Phase 5: Go Live
- Merge to `main`
- Claude switches to Supabase API for all content operations
- HTML files are now generated artifacts (still committed for GitHub Pages)

---

## Constraints

- **No runtime dependency.** The site is static HTML. If Supabase goes down, the site stays up — it was already built.
- **No cost.** Supabase free tier: 500 MB DB, 50K API requests/month, 2 projects. This site will use <1% of that.
- **Fast builds.** Target: < 5 seconds. 10 parallel API calls + template rendering is near-instant.
- **Minimal dependencies.** Two npm packages: `@supabase/supabase-js` and `ejs`. No frameworks.
- **CSS and JS are NOT generated.** `style.css` and `main.js` remain hand-edited files. Only HTML is built from templates.
- **Backwards compatible.** The output HTML is structurally identical to what exists today. No visual changes from migration.
- **Schema is the source of truth.** The SQL migration file defines the exact structure. No ambiguity.
