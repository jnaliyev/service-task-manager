-- Client portal access configuration
-- store_id is stored as text to support stores.id references until stores use uuid.

create table if not exists public.client_portals (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  company_name text not null,
  store_id text null,
  token text null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists client_portals_slug_active_idx
  on public.client_portals (slug)
  where active = true;

alter table public.client_portals enable row level security;

drop policy if exists "Public read active client portals" on public.client_portals;

create policy "Public read active client portals"
  on public.client_portals
  for select
  to anon, authenticated
  using (active = true);

-- Example rows (adjust store_id to a real stores.id value when needed):
-- insert into public.client_portals (slug, company_name, active)
-- values
--   ('cenomi', 'Cenomi', true),
--   ('bravo', 'Bravo', true),
--   ('inditex', 'Inditex', true);
