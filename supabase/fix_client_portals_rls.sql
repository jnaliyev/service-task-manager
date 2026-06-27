-- Run this in the Supabase SQL Editor if /client/[slug] returns "Portal not found"
-- but the row exists in Table Editor (dashboard uses service role and bypasses RLS).

alter table public.client_portals enable row level security;

drop policy if exists "Public read active client portals" on public.client_portals;

create policy "Public read active client portals"
  on public.client_portals
  for select
  to anon, authenticated
  using (active = true);

-- Verify anon can read (optional):
-- select slug, company_name, active from public.client_portals where slug = 'cenomi';
