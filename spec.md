# spec.md — Database Backend for ollycohen.com

## Goal

Replace hardcoded HTML content with a lightweight database that:
1. **Claude can read/write directly** via API to add, edit, and remove site content
2. **A human can edit** through a spreadsheet-like UI when needed
3. **Stays fast** — the site remains static HTML; the DB is a content source, not a runtime dependency

## Approach: Google Sheets as CMS + GitHub Actions Build

Use **Google Sheets** as the database. One spreadsheet, one tab per content type. A build script pulls sheet data, renders HTML from templates, and commits to `main` for GitHub Pages deploy.

### Why Google Sheets
- Free, zero-ops, already has a great UI for human editing
- Structured tabular data with column headers = schema
- Google Sheets API is simple (read-only public sheets need no auth; write needs a service account)
- Claude can call the Sheets API directly to add/edit/remove rows
- Version history built in
- Familiar to non-technical collaborators (sponsors, press contacts)

### Why NOT Supabase / Airtable / Notion
- Supabase: overkill for ~60 data points across 10 tables; adds a runtime dependency
- Airtable: good fit but paid beyond 1,000 records and API rate-limited
- Notion: API is slow and the data model is document-oriented, not tabular

---

## Architecture

```
Google Sheets (source of truth)
       │
       ▼
  Build Script (Node or Python)
   ├── Pulls all tabs via Sheets API
   ├── Renders HTML from templates (Mustache/Jinja-style, minimal)
   └── Writes final .html files
       │
       ▼
  git commit + push → GitHub Pages deploy
```

### Build Trigger Options
- **GitHub Action on schedule** (e.g. every 15 min, or on-demand via `workflow_dispatch`)
- **Claude triggers build** after making sheet edits (calls GitHub Actions API)
- **Manual:** run `npm run build` / `python build.py` locally

---

## Spreadsheet Schema

One Google Sheet workbook. Each tab is a table.

### Tab: `blog_posts`

| Column | Type | Example | Notes |
|--------|------|---------|-------|
| `id` | string | `blog-001` | Unique identifier |
| `title` | string | `What's a Human For` | |
| `url` | url | `https://irunearth.substack.com/p/...` | Substack link |
| `category` | enum | `tech` | `tech`, `north-america`, `africa`, `asia`, `personal` |
| `display_tag` | string | `Tech` | Shown as badge in UI |
| `date` | string | `Feb 2026` | Display format, not ISO |
| `sort_date` | date | `2026-02-15` | ISO date for ordering |
| `featured_on_homepage` | boolean | `TRUE` | Show in 4-card homepage preview |
| `homepage_excerpt` | string | `AI and ultrarunning...` | Short blurb for homepage card (blank = use title) |

### Tab: `adventures`

| Column | Type | Example | Notes |
|--------|------|---------|-------|
| `id` | string | `andes` | Slug, used for anchors |
| `title` | string | `Andes FKT` | |
| `continent` | string | `South America` | |
| `start_date` | string | `May 2026` | Display format |
| `end_date` | string | ` ` | Blank if single-month |
| `distance_miles` | number | `8000` | |
| `duration_text` | string | `12 months` | |
| `description` | text | `Running the spine...` | Full paragraph for adventures page |
| `route_details` | text | `Colombia → Argentina` | Geographic summary |
| `charity` | string | `Kilimanjaro Aid Project` | |
| `status` | enum | `upcoming` | `upcoming`, `in-progress`, `completed` |
| `featured` | boolean | `TRUE` | Large card on homepage |
| `homepage_excerpt` | string | `8,000 miles...` | Card blurb |
| `badge` | string | `Next` | Optional badge text |
| `bg_gradient` | string | `135deg, #2d5016, #1a3a0a` | CSS gradient (until real photos) |
| `image_url` | url | ` ` | When available, replaces gradient |
| `order` | number | `1` | Display sequence |

### Tab: `sponsors`

| Column | Type | Example | Notes |
|--------|------|---------|-------|
| `id` | string | `norda` | |
| `name` | string | `Norda` | |
| `website_url` | url | `https://nordarun.com/` | |
| `description` | text | `Canadian trail running...` | |
| `logo_url` | url | ` ` | Optional |
| `order` | number | `1` | |

### Tab: `press`

| Column | Type | Example | Notes |
|--------|------|---------|-------|
| `id` | string | `press-001` | |
| `title` | string | `A Human-Powered Adventure...` | |
| `publication` | string | `Clearwater Times` | |
| `url` | url | `https://...` | |
| `date` | string | `Mar 2024` | |
| `type` | enum | `press` | `press`, `speaking`, `feature` |
| `order` | number | `1` | |

### Tab: `charities`

| Column | Type | Example | Notes |
|--------|------|---------|-------|
| `id` | string | `kilimanjaro-aid` | |
| `title` | string | `Kilimanjaro Aid Project` | |
| `adventure_id` | string | `andes` | FK to adventures tab |
| `year` | number | `2026` | |
| `description` | text | `Supporting local...` | |
| `website_url` | url | ` ` | |
| `amount_raised` | string | `$20K+` | Display format |
| `order` | number | `1` | |

### Tab: `andes_faq`

| Column | Type | Example | Notes |
|--------|------|---------|-------|
| `id` | string | `faq-001` | |
| `question` | string | `Why would you do this?` | |
| `answer` | text | `Because the best way...` | |
| `order` | number | `1` | |

### Tab: `andes_waypoints`

| Column | Type | Example | Notes |
|--------|------|---------|-------|
| `id` | string | `aconcagua` | |
| `name` | string | `Aconcagua` | |
| `elevation_ft` | number | `22838` | Optional |
| `description` | string | `Highest peak...` | Optional |
| `order` | number | `1` | |

### Tab: `stats`

| Column | Type | Example | Notes |
|--------|------|---------|-------|
| `id` | string | `miles-run` | |
| `label` | string | `Miles Run` | |
| `value` | number | `4500` | Raw number for counter animation |
| `suffix` | string | `+` | Appended after number |
| `page` | enum | `homepage` | `homepage`, `andes` — which page shows this stat |
| `order` | number | `1` | |

### Tab: `social_links`

| Column | Type | Example | Notes |
|--------|------|---------|-------|
| `id` | string | `instagram` | |
| `platform` | string | `Instagram` | |
| `url` | url | `https://instagram.com/ollycohen` | |
| `icon` | string | `instagram` | For icon lookup |
| `show_in_footer` | boolean | `TRUE` | |
| `order` | number | `1` | |

### Tab: `site_config`

| Column | Type | Example | Notes |
|--------|------|---------|-------|
| `key` | string | `owner_name` | |
| `value` | string | `Olly Cohen` | |

Key-value pairs for: `owner_name`, `owner_email`, `tagline`, `brand_name`, `meta_description`, `copyright_year`, `departure_date`.

---

## Build Script

Minimal script (~100-200 lines). Lives at `build/build.js` (or `build.py`).

### Responsibilities
1. Fetch all tabs from the Google Sheet via Sheets API
2. Parse rows into typed objects
3. For each page, load an HTML template and inject content
4. Write rendered HTML to the output files (`index.html`, `pages/*.html`)
5. Exit with status code (0 = success, 1 = error)

### Templates

Templates live in `templates/` and use simple `{{variable}}` / `{{#each items}}` syntax (Mustache or Handlebars — zero-dep single-file implementations exist).

```
templates/
├── index.html
├── pages/
│   ├── adventures.html
│   ├── andes.html
│   ├── blog.html
│   ├── engineering.html
│   ├── impact.html
│   └── sponsors.html
└── partials/
    ├── nav.html          # Shared nav (solves the duplication problem)
    └── footer.html       # Shared footer
```

Partials solve the current pain point of keeping nav/footer in sync across 8 files.

### Output

Rendered files go to the repo root (same paths as current), overwriting the existing static HTML. The build is idempotent — running it twice with the same sheet data produces identical output.

---

## Claude Integration

### Reading Content
Claude calls the Sheets API (public read if sheet is published, or via service account) to list current content before making edits.

### Adding Content
Example: adding a new blog post.
1. Claude appends a row to the `blog_posts` tab via Sheets API
2. Claude triggers a GitHub Actions build via `workflow_dispatch`
3. Build script pulls updated sheet, re-renders `pages/blog.html` and `index.html`, commits, pushes
4. GitHub Pages deploys

### Editing Content
Claude reads the sheet, finds the row by `id`, updates specific cells.

### Removing Content
Claude deletes the row from the sheet. Next build removes it from HTML.

### Auth
- **Service account** with edit access to the spreadsheet
- Credentials stored as GitHub Actions secret + available to Claude via environment variable
- Scoped to the single spreadsheet — no broader Google access

---

## GitHub Actions Workflow

```yaml
# .github/workflows/build.yml
name: Build Site from Sheets

on:
  schedule:
    - cron: '*/15 * * * *'    # Every 15 min (optional, can disable)
  workflow_dispatch:            # Manual / Claude-triggered

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: node build/build.js
        env:
          GOOGLE_SHEETS_ID: ${{ secrets.GOOGLE_SHEETS_ID }}
          GOOGLE_SERVICE_ACCOUNT_KEY: ${{ secrets.GOOGLE_SERVICE_ACCOUNT_KEY }}
      - name: Commit and push if changed
        run: |
          git diff --quiet && exit 0
          git config user.name "Site Builder"
          git config user.email "noreply@ollycohen.com"
          git add -A
          git commit -m "Rebuild site from sheet data"
          git push
```

---

## Migration Plan

### Phase 1: Extract Data
- Scrape current HTML into the Google Sheet (Claude does this)
- Verify all content is captured, no data loss

### Phase 2: Build Templates
- Convert current HTML files into templates with `{{placeholders}}`
- Extract shared nav/footer into partials
- Write the build script
- Verify: `build output` === `current HTML` (diff should be zero or cosmetic)

### Phase 3: Wire Up
- Set up Google service account + share sheet
- Add GitHub Actions workflow
- Store secrets
- Test end-to-end: edit sheet → trigger build → verify deploy

### Phase 4: Go Live
- Merge build system to `main`
- Claude starts using Sheets API for content updates
- Delete hardcoded HTML (now generated)

---

## Constraints

- **No runtime JS dependency on the database.** The site must work if the sheet is deleted — it's just static HTML.
- **No new hosting costs.** Google Sheets API free tier is 300 requests/min — more than enough.
- **Build must be fast.** Target: < 10 seconds. It's ~10 small HTML files and a few API calls.
- **No framework creep.** The build script is a single file with minimal dependencies (googleapis client + a templating lib, nothing more).
- **Backwards compatible.** At every phase, the live site looks identical to what's there now.
