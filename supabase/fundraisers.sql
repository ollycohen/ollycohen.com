-- ============================================================
-- Replace causes table with fundraisers
-- Supabase SQL Editor → New query → Paste → Run
-- ============================================================

-- Drop the old causes table (and its trigger)
drop trigger if exists causes_updated_at on causes;
drop table if exists causes;

-- Create fundraisers
create table fundraisers (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text unique not null,
  url          text not null,
  dates        text not null,          -- e.g. "May to August 2025"
  charity      text not null,
  money_raised integer not null,       -- in USD
  sort_order   integer not null default 0,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- Auto-update trigger
create trigger fundraisers_updated_at
  before update on fundraisers
  for each row execute function update_updated_at();

-- RLS
alter table fundraisers enable row level security;
create policy "Public read fundraisers" on fundraisers for select using (true);
create policy "Auth write fundraisers" on fundraisers for all using (auth.role() = 'authenticated');

-- Seed data (from Webflow export)
insert into fundraisers (name, slug, url, dates, charity, money_raised, sort_order) values
  ('Olly''s Run to Give Directly to People In Poverty',
   'ollys-run-to-give-directly-to-people-in-poverty',
   'https://www.every.org/givedirectly/f/give-directly-to-people',
   'January to May 2024',
   'Give Directly',
   5320, 1),
  ('Run to the first Public Children''s Hospital in East Africa',
   'run-to-the-first-public-childrens-hospital-in-east-africa',
   'https://www.every.org/shoe4africa/f/running-to-the-man-who',
   'June to October 2024',
   'Shoe 4 Africa',
   15865, 2),
  ('Olly Runs Asia',
   'olly-runs-asia',
   'https://www.gofundme.com/f/olly-runs-asia',
   'May to August 2025',
   'Rise Against Hunger',
   3702, 3);
