# CLAUDE.md — ollycohen.com

## Project Overview

Personal website for **Olly Cohen** — adventurer running 1,000 miles on every continent under the **I Run Earth** brand, and AI-focused software engineer. This site is his professional home: adventure portfolio, engineering showcase, blog archive, and sponsor/press hub.

**Live URL:** https://ollycohen.com
**Hosting:** GitHub Pages (deploys from `main` branch, root directory)
**Custom domain:** Configured via `CNAME` file

## Architecture

Static site. Zero frameworks, zero build tools, zero dependencies. Pure HTML, CSS, JavaScript. This is intentional — it's fast, portable, and demonstrates that AI-assisted engineering doesn't need complexity.

```
ollycohen.com/
├── index.html              # Homepage (hero, about, adventure cards, engineering preview, Andes teaser, blog preview)
├── css/
│   └── style.css           # All styles (single file, CSS custom properties, responsive)
├── js/
│   └── main.js             # Nav scroll, mobile menu, scroll reveal, counter animation
├── pages/
│   ├── adventures.html     # Timeline of all continent runs
│   ├── andes.html          # Andes dedicated page (stats, route, FAQ)
│   ├── engineering.html    # Software engineering philosophy + background
│   ├── blog.html           # Blog archive with category filter (links to Substack)
│   ├── impact.html         # Press coverage + philanthropy
│   └── sponsors.html       # Norda, Black Diamond, sponsor CTA
├── 404.html                # Custom 404 page
├── CNAME                   # GitHub Pages custom domain (ollycohen.com)
├── netlify.toml            # Netlify config (backup deploy option)
├── .gitignore
└── README.md
```

## Design System

### Fonts (Google Fonts, loaded in every HTML `<head>`)
- **DM Serif Display** — headings, display text
- **Instrument Sans** — body text, UI elements
- **JetBrains Mono** — labels, tags, monospace accents

### Colors (CSS custom properties in `:root` of `style.css`)
- `--c-bg: #0e0e0d` — deep neutral black
- `--c-bg-alt: #151514` — slightly lighter for alternating sections
- `--c-bg-card: #1c1c1a` — card backgrounds
- `--c-text: #e8e6e1` — warm off-white
- `--c-text-muted: #908e88` — secondary text
- `--c-accent: #80a5d9` — steel blue accent (links, labels, highlights)
- `--c-accent-bright: #a3c0e8` — brighter blue for emphasis
- `--c-warm: #d6a678` — warm amber (stats, terminal prompt)
- `--c-warm-bright: #e4be9a` — brighter amber

### Visual Identity
- Dark neutral palette with steel blue and warm amber accents
- CSS noise grain texture on hero
- Gradient backgrounds (no images currently — placeholders for real photos)
- Subtle scroll-reveal animations
- Terminal mockup on homepage engineering section

## Conventions

### HTML
- Every page includes the same `<nav>` and `<footer>` (no templating — just duplicated, keep in sync)
- All pages link CSS as `/css/style.css` and JS as `/js/main.js` (absolute paths, works with GitHub Pages)
- Blog entries in `pages/blog.html` use `data-cat` attributes for JS filtering: `tech`, `north-america`, `africa`, `asia`, `personal`
- External links (Substack, Instagram, sponsors) use `target="_blank"`

### CSS
- Single file: `css/style.css`
- Mobile breakpoint: `768px`
- BEM-ish class naming: `.block__element--modifier`
- CSS custom properties for all colors, fonts, spacing
- Component sections are commented with `/* SECTION NAME */`

### JavaScript
- Single file: `js/main.js`
- Vanilla JS, no libraries
- IntersectionObserver for scroll reveals and counter animations
- Mobile nav toggle

## Content lives in Supabase

**All website content changes go through Supabase.** Do not hard-code new content into HTML files.

- If a content change is requested and the target already reads from Supabase: update the relevant table directly.
- If a content change is requested and the target is still hard-coded in HTML: (1) insert/update the content in Supabase, (2) refactor that section of the site to fetch from Supabase via the anon client in `js/config.js`, (3) remove the hard-coded copy.
- Schema and seed SQL live in `supabase/`. When you change the schema or add a table, add a new `.sql` file there so the change is tracked in the repo.
- The frontend uses the anon key (read-only via RLS). Writes require `SUPABASE_SERVICE_KEY` — see the Supabase project `upocwcjkyyhufaaalblz`.

### How Claude writes to Supabase

The service key lives in `.env.local` (gitignored, chmod 600). Source it once per Bash call, then hit the REST API directly:

```bash
set -a && . ./.env.local && set +a
BASE="https://upocwcjkyyhufaaalblz.supabase.co/rest/v1"
HDR=(-H "apikey:$SUPABASE_SERVICE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_KEY")

# Read
curl -s "$BASE/blog_posts?select=id,title&order=date.desc&limit=5" "${HDR[@]}"

# Insert
curl -s -X POST "$BASE/blog_posts" "${HDR[@]}" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d '{"title":"...","url":"...","category":"tech","tag":"Tech","date":"2026-04-09"}'

# Update
curl -s -X PATCH "$BASE/blog_posts?id=eq.<uuid>" "${HDR[@]}" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d '{"featured":true}'
```

Tables: `about`, `adventures`, `adventure_sections`, `adventure_media`, `andes_sections`, `andes_stats`, `andes_faqs`, `blog_posts`, `engineering_sections`, `fundraisers`, `press_items`, `sponsors`, `stats`.

For schema/DDL changes (CREATE TABLE, ALTER, etc.), write a migration to `supabase/<name>.sql` and ask the user to run it in the Supabase SQL editor — the REST API can't run arbitrary SQL.

## Common Tasks

### Add a new blog post
Insert a row into `blog_posts` via the REST API:
```bash
curl -s -X POST "$BASE/blog_posts" "${HDR[@]}" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d '{"title":"...","url":"https://irunearth.substack.com/p/...","category":"tech","tag":"Tech","date":"2026-04-10"}'
```
Valid categories: `tech`, `north-america`, `africa`, `asia`, `personal`. Set `featured: true` if it should appear in the homepage blog preview.

### Add a new press/media item
Insert a row into `press_items`.

### Add a new sponsor
Insert a row into `sponsors`.

### Update adventure content
Update rows in `adventures`, `adventure_sections`, or `adventure_media`.

### Add real photos
Place images in `/images/`. For adventure cards, update the relevant `adventure_media` row or replace the CSS gradient in the HTML with `background-image: url('/images/FILENAME.jpg')`.

### Update nav across all pages
The nav is duplicated in every HTML file. When changing nav links, update all 8 files: `index.html`, `404.html`, and all files in `pages/`.

### Refactor hard-coded content to Supabase
When a content change targets something still hard-coded in HTML: (1) ensure the data exists in the appropriate Supabase table, (2) add JS to fetch from Supabase and render it, (3) remove the hard-coded HTML.

## Deployment

After completing changes, always deploy by default: commit and push to `main`. GitHub Pages auto-deploys from `main`.

## Git Practices

- Commit messages: imperative mood, concise (`Add blog post: Title`, `Update sponsor section`, `Fix mobile nav`)
- Push to `main` — GitHub Pages auto-deploys
- No branches needed for this project unless testing a major redesign

## Key Context

- **Owner:** Olly Cohen (@ollycohen on Instagram, olly.k.cohen@gmail.com)
- **Brand:** I Run Earth (irunearth.substack.com)
- **Audience:** potential sponsors, potential employers, press, adventure/running community, tech community
- **This site was built with Claude** — that's part of the story and noted in the footer
