-- Client user access codes and secure login lookup (no direct table reads).

alter table public.client_users
  add column if not exists access_code text;

create or replace function public.validate_client_portal_login(
  p_portal_slug text,
  p_email text,
  p_access_code text
)
returns table (
  id uuid,
  client_portal_id uuid,
  full_name text,
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
    cu.email,
    cu.role,
    cu.access_level,
    cu.store_ids
  from public.client_users cu
  inner join public.client_portals cp on cp.id = cu.client_portal_id
  where lower(trim(cp.slug)) = lower(trim(p_portal_slug))
    and cp.active = true
    and cu.active = true
    and lower(trim(cu.email)) = lower(trim(p_email))
    and cu.access_code is not null
    and cu.access_code = p_access_code;
$$;

create or replace function public.get_client_portal_user(
  p_portal_slug text,
  p_user_id uuid
)
returns table (
  id uuid,
  client_portal_id uuid,
  full_name text,
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
