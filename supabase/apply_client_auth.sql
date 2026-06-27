-- Run in Supabase SQL Editor (or via scripts/bootstrap-client-auth.mjs)
-- Creates client_users, login RPCs, and Cenomi demo users.

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
  access_code text,
  username text,
  password text,
  constraint client_users_portal_email_unique unique (client_portal_id, email),
  constraint client_users_store_ids_is_array check (jsonb_typeof(store_ids) = 'array')
);

create index if not exists client_users_portal_active_idx
  on public.client_users (client_portal_id)
  where active = true;

create index if not exists client_users_email_idx
  on public.client_users (email);

create unique index if not exists client_users_portal_username_unique
  on public.client_users (client_portal_id, lower(username));

alter table public.client_users enable row level security;

drop function if exists public.validate_client_portal_login(text, text, text);

create or replace function public.validate_client_portal_login(
  p_portal_slug text,
  p_username text,
  p_password text
)
returns table (
  id uuid,
  client_portal_id uuid,
  full_name text,
  username text,
  email text,
  role text,
  access_level text,
  store_ids jsonb
)
language sql
security definer
set search_path = public
stable
as $$
  select
    cu.id,
    cu.client_portal_id,
    cu.full_name,
    cu.username,
    cu.email,
    cu.role,
    cu.access_level,
    cu.store_ids
  from public.client_users cu
  inner join public.client_portals cp on cp.id = cu.client_portal_id
  where lower(trim(cp.slug)) = lower(trim(p_portal_slug))
    and cp.active = true
    and cu.active = true
    and lower(trim(cu.username)) = lower(trim(p_username))
    and cu.password is not null
    and cu.password = p_password;
$$;

create or replace function public.get_client_portal_user(
  p_portal_slug text,
  p_user_id uuid
)
returns table (
  id uuid,
  client_portal_id uuid,
  full_name text,
  username text,
  email text,
  role text,
  access_level text,
  store_ids jsonb,
  active boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select
    cu.id,
    cu.client_portal_id,
    cu.full_name,
    cu.username,
    cu.email,
    cu.role,
    cu.access_level,
    cu.store_ids,
    cu.active
  from public.client_users cu
  inner join public.client_portals cp on cp.id = cu.client_portal_id
  where cu.id = p_user_id
    and lower(trim(cp.slug)) = lower(trim(p_portal_slug))
    and cp.active = true
    and cu.active = true;
$$;

revoke all on function public.validate_client_portal_login(text, text, text) from public;
revoke all on function public.get_client_portal_user(text, uuid) from public;

grant execute on function public.validate_client_portal_login(text, text, text) to anon, authenticated;
grant execute on function public.get_client_portal_user(text, uuid) to anon, authenticated;

insert into public.client_users (
  client_portal_id,
  full_name,
  email,
  username,
  password,
  role,
  access_level,
  store_ids,
  active
)
select
  cp.id,
  'Cenomi Head Office',
  'cenomi_admin@local',
  'cenomi_admin',
  '123456',
  'manager',
  'company',
  '[]'::jsonb,
  true
from public.client_portals cp
where lower(cp.slug) = 'cenomi'
on conflict (client_portal_id, email)
do update set
  full_name = excluded.full_name,
  username = excluded.username,
  password = excluded.password,
  role = excluded.role,
  access_level = excluded.access_level,
  store_ids = excluded.store_ids,
  active = excluded.active;

insert into public.client_users (
  client_portal_id,
  full_name,
  email,
  username,
  password,
  role,
  access_level,
  store_ids,
  active
)
select
  cp.id,
  v.full_name,
  v.email,
  v.username,
  '123456',
  v.role,
  'stores',
  coalesce(
    (
      select jsonb_agg(s.id order by s.id)
      from public.stores s
      where s.company_name = cp.company_name
        and (
          (v.match_mode = 'prefix' and lower(trim(s.store_name)) like lower(trim(v.store_pattern)) || '%')
          or (v.match_mode = 'exact' and lower(trim(s.store_name)) = lower(trim(v.store_pattern)))
        )
    ),
    '[]'::jsonb
  ),
  true
from public.client_portals cp
cross join (
  values
    ('Zara Manager', 'zara_manager@local', 'zara_manager', 'manager', 'prefix', 'Zara'),
    ('Bershka Manager', 'bershka_manager@local', 'bershka_manager', 'manager', 'exact', 'Bershka'),
    ('Oysho Manager', 'oysho_manager@local', 'oysho_manager', 'manager', 'exact', 'OYSHO'),
    ('Stradivarius Manager', 'stradivarius_manager@local', 'stradivarius_manager', 'manager', 'exact', 'Stradivarius'),
    ('Pull&Bear Manager', 'pullbear_manager@local', 'pullbear_manager', 'manager', 'exact', 'Pull and Bear'),
    ('Massimo Dutti Manager', 'massimo_manager@local', 'massimo_manager', 'manager', 'exact', 'Massimo Dutti')
) as v(full_name, email, username, role, match_mode, store_pattern)
where lower(cp.slug) = 'cenomi'
on conflict (client_portal_id, email)
do update set
  full_name = excluded.full_name,
  username = excluded.username,
  password = excluded.password,
  role = excluded.role,
  access_level = excluded.access_level,
  store_ids = excluded.store_ids,
  active = excluded.active;

insert into public.client_users (
  client_portal_id,
  full_name,
  email,
  username,
  password,
  role,
  access_level,
  store_ids,
  active
)
select
  cp.id,
  'Fashion Stores Manager',
  'fashion_manager@local',
  'fashion_manager',
  '123456',
  'manager',
  'stores',
  coalesce(
    (
      select jsonb_agg(s.id order by s.id)
      from public.stores s
      where s.company_name = cp.company_name
        and lower(trim(s.store_name)) not in (
          'zara',
          'zara home',
          'zara online',
          'bershka',
          'oysho',
          'stradivarius',
          'pull and bear',
          'massimo dutti'
        )
    ),
    '[]'::jsonb
  ),
  true
from public.client_portals cp
where lower(cp.slug) = 'cenomi'
on conflict (client_portal_id, email)
do update set
  full_name = excluded.full_name,
  username = excluded.username,
  password = excluded.password,
  role = excluded.role,
  access_level = excluded.access_level,
  store_ids = excluded.store_ids,
  active = excluded.active;
