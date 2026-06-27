-- Seed / update Cenomi client portal store managers.
-- Safe to re-run: upserts by (client_portal_id, email).
-- Run after apply_client_auth.sql (client_users table must exist).

-- Inditex brand managers (stores access, one brand group each)
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
  'manager',
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
    ('Zara Manager', 'zara_manager@local', 'zara_manager', 'prefix', 'Zara'),
    ('Bershka Manager', 'bershka_manager@local', 'bershka_manager', 'exact', 'Bershka'),
    ('Oysho Manager', 'oysho_manager@local', 'oysho_manager', 'exact', 'OYSHO'),
    ('Stradivarius Manager', 'stradivarius_manager@local', 'stradivarius_manager', 'exact', 'Stradivarius'),
    ('Pull&Bear Manager', 'pullbear_manager@local', 'pullbear_manager', 'exact', 'Pull and Bear'),
    ('Massimo Dutti Manager', 'massimo_manager@local', 'massimo_manager', 'exact', 'Massimo Dutti')
) as v(full_name, email, username, match_mode, store_pattern)
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

-- Non-Inditex fashion stores (single manager for all assigned fashion brands)
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

-- Ensure company admin remains unchanged
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

-- Optional: deactivate legacy demo users no longer in the roster
update public.client_users cu
set active = false
from public.client_portals cp
where cu.client_portal_id = cp.id
  and lower(cp.slug) = 'cenomi'
  and cu.username in ('bershka_assistant');
