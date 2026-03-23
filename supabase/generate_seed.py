#!/usr/bin/env python3
"""Convert Webflow CSV exports to Supabase SQL seed data."""

import csv
import re
from datetime import datetime
from pathlib import Path

WEBFLOW_DIR = Path(__file__).parent.parent / "webflowExport"
OUTPUT = Path(__file__).parent / "seed.sql"

def parse_webflow_date(raw: str) -> str:
    """Parse 'Fri Feb 02 2024 00:00:00 GMT+0000 (Coordinated Universal Time)' -> '2024-02-02'"""
    match = re.match(r'\w+ (\w+ \d+ \d+)', raw)
    if not match:
        return '2024-01-01'
    return datetime.strptime(match.group(1), '%b %d %Y').strftime('%Y-%m-%d')

def parse_press_date(raw: str) -> str:
    """Parse press date to a display string like 'Mar 2024'."""
    match = re.match(r'\w+ (\w+) (\d+) (\d+)', raw)
    if not match:
        return raw
    dt = datetime.strptime(f"{match.group(1)} {match.group(3)}", '%b %Y')
    return dt.strftime('%b %Y')

def sql_escape(s: str) -> str:
    if not s:
        return ''
    return s.replace("'", "''")

def read_csv(filename: str) -> list[dict]:
    for f in WEBFLOW_DIR.iterdir():
        if filename.lower() in f.name.lower():
            with open(f) as fh:
                return list(csv.DictReader(fh))
    raise FileNotFoundError(f"No CSV matching '{filename}'")

lines = []
lines.append("-- ============================================================")
lines.append("-- Webflow CMS Import — Seed Data for Supabase")
lines.append(f"-- Generated {datetime.now().strftime('%Y-%m-%d')}")
lines.append("-- ============================================================")
lines.append("-- Run this AFTER migration.sql (schema must exist)")
lines.append("-- This REPLACES the seed data section of migration.sql")
lines.append("-- ============================================================")
lines.append("")

# ── BLOG POSTS ──────────────────────────────────────────────────
lines.append("-- Clear existing blog posts and re-seed")
lines.append("DELETE FROM blog_posts;")
lines.append("")

blog_configs = [
    ("North America", "north-america", "North America"),
    ("Africa", "africa", "Africa"),
    ("Asia", "asia", "Asia"),
]

sort_order = 0
all_blog_inserts = []

for csv_label, category, tag in blog_configs:
    rows = read_csv(csv_label)
    # Sort by date descending (newest first)
    rows.sort(key=lambda r: parse_webflow_date(r['Date']), reverse=True)
    for row in rows:
        if row.get('Draft', 'false').lower() == 'true':
            continue
        sort_order += 1
        title = sql_escape(row['Name'])
        url = sql_escape(row['URL'])
        subtitle = sql_escape(row.get('Subtitle', ''))
        date = parse_webflow_date(row['Date'])
        excerpt = f"'{subtitle}'" if subtitle else "null"
        all_blog_inserts.append(
            f"  ('{title}', '{url}', '{category}', '{tag}', {excerpt}, '{date}', false, {sort_order})"
        )

# Add the tech/personal posts that aren't in Webflow collections
tech_personal = [
    ("What''s a Human For", "https://irunearth.substack.com/p/whats-a-human-for", "tech", "Tech",
     "'The most important skill for software engineers is setting up feedback loops for AI to build and test integrated components of a system.'",
     "2026-02-01", "true"),
    ("You''re Fired", "https://irunearth.substack.com/p/youre-fired", "tech", "Tech",
     "'Today, I''m planning to fire two highly talented Principal Engineers with 10+ years of experience because I think I can do their job with Claude.'",
     "2026-01-01", "true"),
    ("Millbrook Alumni Summit", "https://irunearth.substack.com/p/millbrook-alumni-summit", "personal", "Personal",
     "'Our culture raises men to believe their value is tied to money. I crested a hill in the rain, feeling the weight of my soaking backpack, and broke into tears.'",
     "2025-04-15", "true"),
    ("2025 Rainier Ski Descent", "https://irunearth.substack.com/p/2025-rainier-ski-descent", "personal", "Personal",
     "null", "2025-04-01", "false"),
]

for title, url, cat, tag, excerpt, date, featured in tech_personal:
    sort_order += 1
    all_blog_inserts.append(
        f"  ('{title}', '{url}', '{cat}', '{tag}', {excerpt}, '{date}', {featured}, {sort_order})"
    )

lines.append(f"INSERT INTO blog_posts (title, url, category, tag, excerpt, date, featured, sort_order) VALUES")
lines.append(",\n".join(all_blog_inserts) + ";")
lines.append("")

# ── PRESS ITEMS ─────────────────────────────────────────────────
lines.append("-- Clear existing press items and re-seed")
lines.append("DELETE FROM press_items;")
lines.append("")

press_rows = read_csv("Press")
press_rows.sort(key=lambda r: parse_webflow_date(r['Date']), reverse=True)

press_inserts = []
for i, row in enumerate(press_rows, 1):
    if row.get('Draft', 'false').lower() == 'true':
        continue
    title = sql_escape(row['Title'])
    url = sql_escape(row['URL'])
    source = sql_escape(row['Source'])
    date = parse_press_date(row['Date'])
    # Determine tag based on source type
    tag = 'Podcast' if 'spotify' in row['URL'].lower() else 'Press'
    press_inserts.append(
        f"  ('{title}', '{url}', '{source}', '{tag}', '{date}', {i})"
    )

# Add the Millbrook speaking entry (not in Webflow)
press_inserts.append(
    f"  ('Millbrook School Alumni Summit Speaker', 'https://www.millbrook.org/school-life/academics/alumni-summit/alumni-summit-speakers-2025/oliver-cohen-16', 'Millbrook School', 'Speaking', '2025', {len(press_inserts) + 1})"
)

lines.append(f"INSERT INTO press_items (title, url, source, tag, date, sort_order) VALUES")
lines.append(",\n".join(press_inserts) + ";")
lines.append("")

# ── CAUSES (from Fundraisers) ──────────────────────────────────
lines.append("-- Clear existing causes and re-seed")
lines.append("DELETE FROM causes;")
lines.append("")

fundraiser_rows = read_csv("Fundraisers")
fundraiser_rows.sort(key=lambda r: int(r.get('Index', 0)))

# Map fundraisers to the causes table format
# adventure_label maps from the Dates field
adventure_label_map = {
    "January to May 2024": "North America 2024",
    "June to October 2024": "Africa 2024",
    "May to August 2025": "Asia 2025",
}

causes_inserts = []
for i, row in enumerate(fundraiser_rows, 1):
    name = sql_escape(row['Name'])
    charity = sql_escape(row['Charity'])
    url = sql_escape(row['URL'])
    dates = row.get('Dates', '')
    money = row.get('Money Raised', '0')
    adventure_label = adventure_label_map.get(dates, dates)
    # Build a description that includes the charity and money raised
    description = f"Fundraiser for {charity}. Raised ${int(money):,}."
    causes_inserts.append(
        f"  ('{sql_escape(charity)}', '{sql_escape(adventure_label)}', '{sql_escape(description)}', '{url}', {i})"
    )

# Add the Kilimanjaro Aid Project for Andes (not in Webflow fundraisers yet)
causes_inserts.append(
    f"  ('Kilimanjaro Aid Project', 'Andes 2026', 'Building chicken coops to provide food and self-sustaining income to underfed families in the foothills of Kilimanjaro.', null, {len(causes_inserts) + 1})"
)

lines.append(f"INSERT INTO causes (name, adventure_label, description, url, sort_order) VALUES")
lines.append(",\n".join(causes_inserts) + ";")
lines.append("")

# ── Keep adventures, sponsors, stats from migration.sql (unchanged) ──
lines.append("-- NOTE: Adventures, sponsors, and stats are NOT included here.")
lines.append("-- Those are already seeded correctly in migration.sql.")
lines.append("-- Only run the DELETE+INSERT blocks above for tables with new Webflow data.")

sql = "\n".join(lines) + "\n"
OUTPUT.write_text(sql)
print(f"Generated {OUTPUT} ({len(all_blog_inserts)} blog posts, {len(press_inserts)} press items, {len(causes_inserts)} causes)")
