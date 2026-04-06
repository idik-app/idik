-- Legacy `public.tindakan` (skema sederhana) menyimpan nama pasien di kolom `nama`.
-- Trigger `tindakan_sync_pasien_master` memakai `nama_pasien`; tanpa kolom ini,
-- UPDATE pasien gagal dengan: column t.nama_pasien does not exist.

alter table public.tindakan add column if not exists nama_pasien text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'tindakan'
      and c.column_name = 'nama'
  ) then
    update public.tindakan t
    set nama_pasien = nullif(trim(t.nama), '')
    where (t.nama_pasien is null or trim(t.nama_pasien) = '')
      and t.nama is not null
      and trim(t.nama) <> '';
  end if;
end $$;

comment on column public.tindakan.nama_pasien is
  'Nama pasien (denormalisasi); selaras trigger sinkron dari master pasien. Legacy: isi dari kolom `nama` bila perlu.';
