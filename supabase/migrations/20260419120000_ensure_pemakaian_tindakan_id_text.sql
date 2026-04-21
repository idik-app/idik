-- Beberapa database belum berhasil mengubah tipe kolom (deploy berbeda / rollback parsial).
-- Pastikan pemakaian.tindakan_id = text agar ID kasus numerik ("9") tidak di-cast ke uuid.

do $$
declare
  col_type text;
begin
  select pg_catalog.format_type(a.atttypid, a.atttypmod)
  into col_type
  from pg_catalog.pg_attribute a
  join pg_catalog.pg_class c on c.oid = a.attrelid
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'pemakaian'
    and a.attname = 'tindakan_id'
    and a.attnum > 0
    and not a.attisdropped;

  if col_type is null then
    raise notice 'pemakaian.tindakan_id: kolom tidak ada, lewati.';
    return;
  end if;

  if col_type = 'text' then
    raise notice 'pemakaian.tindakan_id: sudah text, lewati.';
    return;
  end if;

  raise notice 'pemakaian.tindakan_id: mengubah % → text', col_type;

  alter table public.pemakaian
    drop constraint if exists pemakaian_tindakan_id_fkey;

  alter table public.pemakaian
    alter column tindakan_id drop default;

  alter table public.pemakaian
    alter column tindakan_id type text using (
      case
        when tindakan_id is null then null
        else tindakan_id::text
      end
    );

  comment on column public.pemakaian.tindakan_id is
    'Opsional: id kasus tindakan (teks numerik atau uuid).';
end $$;
