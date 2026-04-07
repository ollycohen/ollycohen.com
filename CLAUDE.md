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
│   ├── andes.html          # Andes FKT dedicated page (stats, route, FAQ)
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

## Common Tasks

### Add a new blog post to the archive
Edit `pages/blog.html`. Add an `<a>` inside the `#blogList` div:
```html
<a href="SUBSTACK_URL" target="_blank" class="blog-list__item" data-cat="CATEGORY">
  <span class="blog-list__tag">DISPLAY_TAG</span>
  <span class="blog-list__title">POST_TITLE</span>
  <span class="blog-list__date">Mon YYYY</span>
</a>
```
Insert in reverse chronological order (newest first). Valid categories: `tech`, `north-america`, `africa`, `asia`, `personal`.

Also update the blog preview on `index.html` if the post is noteworthy (the 4-card grid in the `blog-preview` section).

### Add a new press/media item
Edit `pages/impact.html`. Add a `.blog-list__item` link in the press section.

### Add a new sponsor
Edit `pages/sponsors.html`. Add a `.sponsor-card` div. Also update `index.html` footer or Andes teaser if the sponsor should appear on the homepage.

### Add real photos
Replace `background: linear-gradient(...)` on `.adventure-card__img` elements with `background-image: url('/images/FILENAME.jpg'); background-size: cover; background-position: center;`. Place images in `/images/`.

### Update nav across all pages
The nav is duplicated in every HTML file. When changing nav links, update all 8 files: `index.html`, `404.html`, and all 6 files in `pages/`.

## Deployment

After completing changes, always deploy by default: commit and push to `main`. GitHub Pages auto-deploys from `main`.

## Git Practices

- Commit messages: imperative mood, concise (`Add blog post: Title`, `Update sponsor section`, `Fix mobile nav`)
- Push to `main` — GitHub Pages auto-deploys
- No branches needed for this project unless testing a major redesign

## Key Context

- **Owner:** Olly Cohen (@ollycohen on Instagram, olly.k.cohen@gmail.com)
- **Brand:** I Run Earth (irunearth.substack.com)
- **Sponsors:** Norda (trail shoes), Black Diamond (mountain gear)
- **Charity:** Kilimanjaro Aid Project (Andes FKT), Rise Against Hunger (Asia), GiveDirectly (Africa)
- **Departure:** May 17, 2026 — Andes FKT begins with Pico Cristóbal Colón climb in Colombia
- **Audience:** potential sponsors, potential employers, press, adventure/running community, tech community
- **This site was built with Claude** — that's part of the story and noted in the footer
