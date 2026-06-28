-- Link client portals to ERP clients for scoped store access.

alter table public.client_portals
  add column if not exists client_id uuid references public.clients (id) on delete set null;

create index if not exists client_portals_client_id_idx
  on public.client_portals (client_id)
  where client_id is not null;

create unique index if not exists client_portals_client_id_unique
  on public.client_portals (client_id)
  where client_id is not null;

alter table public.client_users
  add column if not exists client_id uuid references public.clients (id) on delete set null;

create index if not exists client_users_client_id_idx
  on public.client_users (client_id)
  where client_id is not null;

-- ERP admins manage portal configuration from the dashboard.
drop policy if exists "Authenticated users can read client portals" on public.client_portals;
create policy "Authenticated users can read client portals"
  on public.client_portals
  for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can insert client portals" on public.client_portals;
create policy "Authenticated users can insert client portals"
  on public.client_portals
  for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can update client portals" on public.client_portals;
create policy "Authenticated users can update client portals"
  on public.client_portals
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated users can read client users" on public.client_users;
create policy "Authenticated users can read client users"
  on public.client_users
  for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can insert client users" on public.client_users;
create policy "Authenticated users can insert client users"
  on public.client_users
  for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can update client users" on public.client_users;
create policy "Authenticated users can update client users"
  on public.client_users
  for update
  to authenticated
  using (true)
  with check (true);
