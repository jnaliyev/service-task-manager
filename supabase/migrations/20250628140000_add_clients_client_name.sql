alter table public.clients
  add column if not exists client_name text;

update public.clients
set client_name = company_name
where client_name is null
  and company_name is not null;

update public.clients
set company_name = client_name
where (company_name is null or trim(company_name) = '')
  and client_name is not null;

create index if not exists clients_client_name_idx
  on public.clients (client_name);
