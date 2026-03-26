# Content Architecture — ollycohen.com

## The Principle

Every editable string on the site lives in Supabase exactly once. HTML files contain layout and structure — no copy. When the homepage previews a deeper page, it reads from the same table as that page, filtered or limited. There is no separate "homepage version" of anything.

---

## How the Site Works

Runtime client-side architecture. Each HTML page loads `@supabase/supabase-js` from a CDN, queries the relevant tables on page load, and renders content into placeholder DOM nodes. Static HTML is committed to GitHub Pages; Supabase is the content layer. If Supabase is unavailable the page layout still loads — content areas show a loading state.

---

## Content Inventory

### Already fully CMS-driven ✓

| Table | Pages that use it | How |
|---|---|---|
| `about` | `index.html` | Single row → heading + paragraphs |
| `stats` | `index.html` | All rows → animated counter grid |
| `adventures` | `index.html`, `adventures.html` | Homepage: 4 cards, limited by `sort_order`. Adventures page: all rows as timeline. Same table, two views. |
| `blog_posts` | `index.html`, `blog.html`, `engineering.html` | Homepage: `WHERE featured = true LIMIT 4`. Blog page: all, client-side category filter. Engineering page: `WHERE category = 'tech'`. Same table, three views. |
| `sponsors` | `sponsors.html` | All active rows |
| `press_items` | `impact.html` | All rows → press list |
| `fundraisers` | `impact.html` | All rows → charity grid, total calculated client-side |

### Still hardcoded in HTML ✗

**`andes.html`** — the entire page body is hardcoded:
- Stats bar: "8,000 Total Miles", "~667 Miles / Month", "~167 Miles / Week", "12 Months"
- The Concept: 3 paragraphs about the route
- Waypoints: 1 paragraph about notable waypoints
- The Cause: 1 paragraph with charity link
- FAQ: 5 question/answer pairs

**`engineering.html`** — four prose sections are hardcoded:
- Philosophy: 3 paragraphs
- Background: 2 paragraphs
- What I Believe: 2 paragraphs
- This Website: 1 paragraph

**`index.html` — Andes Teaser section** is hardcoded:
- Title: "The Andes Line"
- Subtitle: "8,000 miles. 7 countries. 1 year."
- Description paragraph
- 4 stats: 8,000 / 667 / 22,838 / 7

**`index.html` — Engineering Preview section** is hardcoded:
- Heading: "Building at the speed of ideas."
- 2 paragraphs of philosophy copy

### The duplication

| Content | Location 1 | Location 2 |
|---|---|---|
| Andes stats (miles, pace) | `andes.html` stats bar | `index.html` Andes Teaser |
| Andes description | `adventures` table (short) | `andes.html` Concept section (long, separate) |
| Engineering philosophy | `engineering.html` | `index.html` Engineering Preview (different wording) |

The homepage Andes Teaser and Engineering Preview are the main offenders — they duplicate content that belongs to their respective dedicated pages. Every edit to that content has to be made twice.

---

## Tables to Add

### `andes_stats`

The key metrics for the Andes run. Used by both the andes.html stats bar and the index.html Andes Teaser.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | auto-generated |
| `value` | text NOT NULL | e.g. `"8,000"`, `"~667"` |
| `label` | text NOT NULL | e.g. `"Total Miles"` |
| `show_on_homepage` | boolean DEFAULT false | `true` for the 4 stats in the homepage teaser |
| `sort_order` | int NOT NULL | |

**Seed data:**

| value | label | show_on_homepage | sort_order |
|---|---|---|---|
| 8,000 | Total Miles | true | 1 |
| ~667 | Miles / Month | true | 2 |
| ~167 | Miles / Week | false | 3 |
| 12 | Months | false | 4 |
| 22,838 | Ft Peak Elevation | true | 5 |
| 7 | Countries | true | 6 |

`andes.html` reads all rows ordered by `sort_order`.
`index.html` reads `WHERE show_on_homepage = true`.

---

### `andes_sections`

The prose content blocks on `andes.html`. Three named sections.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `slug` | text UNIQUE NOT NULL | `concept`, `waypoints`, `cause` |
| `heading` | text NOT NULL | Section `<h3>` |
| `body` | text NOT NULL | Full prose, multiple sentences. Single block of text per section. |
| `sort_order` | int NOT NULL | |

**Seed data:**

| slug | heading | body |
|---|---|---|
| `concept` | The Concept | *(3 paragraphs from current andes.html, joined with newlines or stored as separate rows — see note below)* |
| `waypoints` | Waypoints | *(current Waypoints paragraph)* |
| `cause` | The Cause | *(current The Cause paragraph)* |

> **Note on multi-paragraph sections:** The Concept currently has 3 paragraphs. Options: (a) store them as a single `body` text field with newlines and split on render — simple but loses paragraph-level editability; (b) use `jsonb` array like `about.paragraphs` — consistent with existing pattern. Recommendation: use `jsonb` array to stay consistent.

`andes.html` reads all rows ordered by `sort_order` and renders each as a heading + paragraphs block.

---

### `andes_faqs`

The 5 FAQ items on `andes.html`.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `question` | text NOT NULL | |
| `answer` | text NOT NULL | May contain inline links — render as HTML or store raw text with links separately |
| `sort_order` | int NOT NULL | |

**Seed data (5 rows from current HTML):**

1. Why would you do this?
2. Why set an FKT?
3. How will you be supported?
4. How can I follow along?
5. I'm a business. Why should I sponsor this?

`andes.html` reads all rows ordered by `sort_order`.

---

### `engineering_sections`

The four named prose sections on `engineering.html`.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `slug` | text UNIQUE NOT NULL | `philosophy`, `background`, `beliefs`, `website` |
| `heading` | text NOT NULL | Section `<h3>` |
| `paragraphs` | jsonb NOT NULL | Ordered array of paragraph strings — same pattern as `about.paragraphs` |
| `sort_order` | int NOT NULL | |

**Seed data:**

| slug | heading | paragraphs |
|---|---|---|
| `philosophy` | Philosophy | 3 paragraphs from current engineering.html |
| `background` | Background | 2 paragraphs |
| `beliefs` | What I Believe | 2 paragraphs |
| `website` | This Website | 1 paragraph |

`engineering.html` reads all 4 rows and renders each section.
`index.html` Engineering Preview reads `WHERE slug = 'philosophy'` and renders only the first paragraph as the teaser.

---

## Homepage Preview Pattern

No homepage section owns its own copy of content. Every homepage preview section is a filtered or limited view of a table that a full page also reads.

| Homepage Section | Source Table | Filter / Limit |
|---|---|---|
| About | `about` | single row |
| Stats | `stats` | all rows |
| Adventure Cards | `adventures` | `ORDER BY sort_order LIMIT 4` |
| Blog Preview | `blog_posts` | `WHERE featured = true ORDER BY sort_order LIMIT 4` |
| Andes Teaser — text | `adventures` | `WHERE slug = 'andes-fkt'` → `title`, `subtitle`, `description` |
| Andes Teaser — stats | `andes_stats` | `WHERE show_on_homepage = true` |
| Engineering Preview — text | `engineering_sections` | `WHERE slug = 'philosophy'` → first paragraph of `paragraphs` array |
| Engineering Preview — terminal | *(hardcoded)* | The terminal mockup is a design element, not CMS content |

The terminal mockup in the Engineering Preview is the only intentionally hardcoded piece of copy — it's illustrative UI, not a content string that needs editing.

---

## What Stays in the `adventures` Table

The `adventures` table currently stores a short `description` for each adventure. For the Andes, this short description is what appears on the homepage card and adventures.html timeline. The long-form content (Concept, Waypoints, Cause sections) lives in `andes_sections` — a separate table for the dedicated page.

The `adventures` table row for `slug = 'andes-fkt'` should also carry:
- `teaser_title` text — "The Andes Line" (the homepage Andes Teaser heading). If null, falls back to `title`.
- `teaser_subtitle` text — "8,000 miles. 7 countries. 1 year." If null, falls back to `subtitle`.

This avoids a schema change to the homepage section title while keeping the data in one place.

---

## Migration Steps

1. **Run SQL** — add `andes_stats`, `andes_sections`, `andes_faqs`, `engineering_sections` tables in Supabase SQL Editor. Add `teaser_title` / `teaser_subtitle` columns to `adventures`.

2. **Seed data** — insert current hardcoded content from `andes.html` and `engineering.html` into the new tables. Update the `andes-fkt` adventure row with `teaser_title` and `teaser_subtitle`.

3. **Update `andes.html`** — remove hardcoded stats bar, sections, and FAQ. Add Supabase fetches for `andes_stats`, `andes_sections`, `andes_faqs`. Render dynamically.

4. **Update `engineering.html`** — remove hardcoded Philosophy/Background/Beliefs/Website sections. Add Supabase fetch for `engineering_sections`. Render dynamically. Writing on Tech section already works — leave it.

5. **Update `index.html` Andes Teaser** — remove hardcoded copy and stats. Read `adventures WHERE slug = 'andes-fkt'` for `teaser_title`, `teaser_subtitle`, `description`. Read `andes_stats WHERE show_on_homepage = true` for the stats row. Both queries can join the existing `Promise.all`.

6. **Update `index.html` Engineering Preview** — remove hardcoded heading and paragraphs. Read `engineering_sections WHERE slug = 'philosophy'`, use `heading` and `paragraphs[0]`.

---

## Constraints

- **No new tables for one-off content.** The terminal mockup on the homepage is hardcoded by design. Avoid creating Supabase tables for content that will never change or has no real edit workflow.
- **Same table, multiple views** is preferred over separate tables or duplicate rows. The `blog_posts` → three-page pattern is the model.
- **`jsonb` arrays for ordered paragraphs** — consistent with `about.paragraphs`. Do not use separate paragraph rows or newline-delimited text.
- **`show_on_homepage`** boolean pattern (used in `andes_stats`) is preferred over duplicating rows with different `page` values.
