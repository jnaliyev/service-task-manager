-- Enable Supabase Realtime for client/ERP task_comments messages
alter table public.task_comments replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'task_comments'
  ) then
    alter publication supabase_realtime add table task_comments;
  end if;
end $$;
