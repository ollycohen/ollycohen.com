# ollycohen.com

Personal website for Olly Cohen — adventurer, AI engineer, and writer.

**Built entirely with Claude.**

## About

This is a static website — no frameworks, no build tools, no dependencies. HTML, CSS, JavaScript. It loads fast, it's accessible, and it's deployable anywhere.

## Structure

```
ollycohen.com/
├── index.html          # Homepage
├── css/
│   └── style.css       # All styles
├── js/
│   └── main.js         # Interactions & animations
├── pages/
│   ├── adventures.html # Adventure timeline
│   ├── andes.html      # Andes FKT page
│   ├── engineering.html# Software engineering
│   ├── blog.html       # Blog archive (links to Substack)
│   ├── impact.html     # Press & philanthropy
│   └── sponsors.html   # Sponsors page
├── 404.html            # Custom 404
├── CNAME               # GitHub Pages custom domain
├── netlify.toml        # Netlify deploy config (backup)
├── .gitignore
└── README.md
```

## Workflow (mobile-first, no laptop needed)

This site is managed entirely through **Claude** and **GitHub Pages**.

1. **Tell Claude what to change** — Claude edits files and pushes to GitHub
2. **GitHub Pages auto-deploys** — live at ollycohen.com within seconds
3. **Preview on your phone** — just open the URL

No local dev environment. No terminal. No laptop.

## Deploy (GitHub Pages)

1. Create repo `ollycohen/ollycohen.com` on GitHub
2. Push this code
3. Settings → Pages → Source: `main` branch, `/ (root)`
4. Custom domain: `ollycohen.com`
5. DNS: A records → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`

## Adding Content

Blog posts live on [Substack](https://irunearth.substack.com). To update the blog archive, tell Claude to add the new post — or edit `pages/blog.html` directly on GitHub mobile.

## License

© 2026 Olly Cohen. All rights reserved.
