-- Supabase Realtime: broadcast perubahan cathlab_pemakaian_order ke klien (tanpa refresh halaman).
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'cathlab_pemakaian_order'
  ) then
    alter publication supabase_realtime add table public.cathlab_pemakaian_order;
  end if;
end $$;
