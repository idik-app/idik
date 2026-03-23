-- ED: bulan + tahun saja, teks MM-YYYY (contoh 09-2028).
-- Jika kolom masih `date` dari migrasi lama, konversi isi ke MM-YYYY.

do $$
declare
  dt text;
begin
  select c.data_type into dt
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'distributor_barang'
    and c.column_name = 'ed';

  if dt is null or dt <> 'date' then
    return;
  end if;

  execute
    $conv$
    alter table public.distributor_barang
      alter column ed type text using (
        case when ed is null then null else to_char(ed, 'MM-YYYY') end
      );
    $conv$;
end $$;

comment on column public.distributor_barang.ed is
  'Kedaluwarsa: bulan dan tahun (MM-YYYY), contoh 09-2028.';

alter table public.distributor_barang
  drop constraint if exists distributor_barang_ed_mm_yyyy_ck;

alter table public.distributor_barang
  add constraint distributor_barang_ed_mm_yyyy_ck check (
    ed is null
    or ed ~ '^(0[1-9]|1[0-2])-[0-9]{4}$'
  );
