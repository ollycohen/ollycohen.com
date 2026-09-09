-- ============================================================
-- ollycohen.com CMS — Sponsor CTA (the "Partner with…" box on /sponsors/)
-- Single-row table; the page reads the first row by sort_order.
-- ============================================================

create table sponsor_cta (
  id            uuid primary key default gen_random_uuid(),
  heading       text not null,
  body          text not null,
  button_label  text not null default 'Get in Touch →',
  email         text not null default 'olly.k.cohen@gmail.com',
  email_subject text not null,
  sort_order    integer not null default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create trigger sponsor_cta_updated_at
  before update on sponsor_cta
  for each row execute function update_updated_at();

alter table sponsor_cta enable row level security;
create policy "Public read sponsor_cta" on sponsor_cta for select using (true);
create policy "Auth write sponsor_cta"  on sponsor_cta for all   using (auth.role() = 'authenticated');

insert into sponsor_cta (heading, body, email_subject) values (
  'Partner with 1000 Miles Every Continent',
  'A documented journey of 1,000 continuous miles on foot on every continent. Align your brand with one of the finest endurance projects on the planet.',
  '1000 Miles Every Continent Sponsorship'
);
