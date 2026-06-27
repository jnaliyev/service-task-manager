-- Client portal users with company-wide or store-scoped access.
-- Not wired to /client routes yet; structure only.

create table if not exists public.client_users (
  id uuid primary key default gen_random_uuid(),
  client_portal_id uuid not null references public.client_portals(id) on delete cascade,
  full_name text not null,
  email text not null,
  role text not null default 'user',
  access_level text not null default 'company'
    check (access_level in ('company', 'stores')),
  store_ids jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint client_users_portal_email_unique unique (client_portal_id, email),
  constraint client_users_store_ids_is_array check (jsonb_typeof(store_ids) = 'array')
);

create index if not exists client_users_portal_active_idx
  on public.client_users (client_portal_id)
  where active = true;

create index if not exists client_users_email_idx
  on public.client_users (email);

alter table public.client_users enable row level security;

-- No policies yet; login and client auth are not implemented.

-- Example rows (run after portal exists):
-- insert into public.client_users (
--   client_portal_id, full_name, email, role, access_level, store_ids
-- )
-- select
--   cp.id,
--   'Cenomi Head Office',
--   'headoffice@cenomi.example',
--   'manager',
--   'company',
--   '[]'::jsonb
-- from public.client_portals cp
-- where cp.slug = 'cenomi';
--
-- insert into public.client_users (
--   client_portal_id, full_name, email, role, access_level, store_ids
-- )
-- select
--   cp.id,
--   'Bershka Store Manager',
--   'manager@bershka.example',
--   'manager',
--   'stores',
--   '[12]'::jsonb
-- from public.client_portals cp
-- where cp.slug = 'cenomi';
