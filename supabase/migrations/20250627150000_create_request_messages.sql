create table if not exists request_messages (
  id bigserial primary key,
  task_id bigint not null references tasks(id) on delete cascade,
  sender_name text not null,
  sender_type text not null check (sender_type in ('client', 'erp')),
  body text not null default '',
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists request_messages_task_id_created_at_idx
  on request_messages (task_id, created_at asc);

alter table tasks
  add column if not exists client_chat_read_at timestamptz,
  add column if not exists erp_chat_read_at timestamptz;

alter table request_messages replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'request_messages'
  ) then
    alter publication supabase_realtime add table request_messages;
  end if;
end $$;
