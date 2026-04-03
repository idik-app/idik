-- Beberapa instalasi / tabel `tindakan` lama belum punya FK ke master pasien.
-- Tipe `pasien.id` bisa uuid (migrasi lokal) atau bigint/integer (data produksi) — samakan otomatis.

do $$
declare
  id_type text;
begin
  select format_type(a.atttypid, a.atttypmod)
    into id_type
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'pasien'
    and a.attname = 'id'
    and a.attnum > 0
    and not a.attisdropped
  limit 1;

  if id_type is null then
    raise exception 'public.pasien.id tidak ditemukan';
  end if;

  execute format(
    'alter table public.tindakan add column if not exists pasien_id %s references public.pasien (id) on delete set null',
    id_type
  );
end;
$$;

create index if not exists idx_tindakan_pasien_id on public.tindakan (pasien_id);

comment on column public.tindakan.pasien_id is 'Tautan ke public.pasien; sinkron dengan no_rm/nama di baris kasus.';
