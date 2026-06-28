alter table public.stores
  add column if not exists client_id uuid references public.clients (id);

create index if not exists stores_client_id_idx
  on public.stores (client_id);
