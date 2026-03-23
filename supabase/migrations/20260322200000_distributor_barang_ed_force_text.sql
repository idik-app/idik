-- Pastikan distributor_barang.ed bertipe text (MM-YYYY).
-- Jika masih date/timestamp, INSERT '09-2028' gagal: invalid input syntax for type date.

do $$
declare
  rt regtype;
begin
  select a.atttypid::regtype
  into rt
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'distributor_barang'
    and a.attname = 'ed'
    and not a.attisdropped;

  if rt is null then
    return;
  end if;

  if rt in ('text'::regtype, 'character varying'::regtype) then
    return;
  end if;

  alter table public.distributor_barang
    drop constraint if exists distributor_barang_ed_mm_yyyy_ck;

  if rt = 'date'::regtype then
    alter table public.distributor_barang
      alter column ed type text using (
        case when ed is null then null else to_char(ed, 'MM-YYYY') end
      );
  elsif rt = any (
    array[
      'timestamp without time zone'::regtype,
      'timestamp with time zone'::regtype
    ]
  ) then
    alter table public.distributor_barang
      alter column ed type text using (
        case when ed is null then null else to_char((ed)::date, 'MM-YYYY') end
      );
  end if;
end $$;

-- Normalisasi sisa teks ISO (YYYY-MM-DD) ke MM-YYYY agar lolos constraint.
update public.distributor_barang
set ed = to_char(ed::date, 'MM-YYYY')
where ed is not null
  and ed ~ '^\d{4}-\d{2}-\d{2}$';

comment on column public.distributor_barang.ed is
  'Kedaluwarsa: bulan dan tahun (MM-YYYY), contoh 09-2028.';

alter table public.distributor_barang
  drop constraint if exists distributor_barang_ed_mm_yyyy_ck;

alter table public.distributor_barang
  add constraint distributor_barang_ed_mm_yyyy_ck check (
    ed is null
    or ed ~ '^(0[1-9]|1[0-2])-[0-9]{4}$'
  );
