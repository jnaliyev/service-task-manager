create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  client_code text not null,
  company_name text not null,
  legal_name text,
  contact_person text,
  email text,
  phone text,
  address text,
  vat_number text,
  account_manager text,
  status text not null default 'Active',
  notes text,
  created_at timestamptz not null default now(),
  constraint clients_client_code_unique unique (client_code)
);

create index if not exists clients_company_name_idx
  on public.clients (company_name);

create index if not exists clients_status_idx
  on public.clients (status);

alter table public.clients enable row level security;

drop policy if exists "Authenticated users can read clients" on public.clients;
drop policy if exists "Authenticated users can insert clients" on public.clients;
drop policy if exists "Authenticated users can update clients" on public.clients;
drop policy if exists "Authenticated users can delete clients" on public.clients;

create policy "Authenticated users can read clients"
  on public.clients
  for select
  to authenticated
  using (true);

create policy "Authenticated users can insert clients"
  on public.clients
  for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update clients"
  on public.clients
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete clients"
  on public.clients
  for delete
  to authenticated
  using (true);
