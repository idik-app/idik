-- Tambah status SELESAI pada order pemakaian (alur: Draft → … → Selesai).
alter table public.cathlab_pemakaian_order
  drop constraint if exists cathlab_pemakaian_order_status_check;

do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.cathlab_pemakaian_order'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) like '%status%'
      and pg_get_constraintdef(c.oid) like '%DRAFT%'
  loop
    execute format(
      'alter table public.cathlab_pemakaian_order drop constraint %I',
      r.conname
    );
  end loop;
end $$;

alter table public.cathlab_pemakaian_order
  add constraint cathlab_pemakaian_order_status_check check (
    status in (
      'DRAFT',
      'DIAJUKAN',
      'MENUNGGU_VALIDASI',
      'TERVERIFIKASI',
      'SELESAI'
    )
  );

comment on column public.cathlab_pemakaian_order.status is
  'DRAFT | DIAJUKAN | MENUNGGU_VALIDASI | TERVERIFIKASI | SELESAI';
