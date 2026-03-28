-- Waktu: rentang teks (mis. 07.00 - 12.00); migrasi dari type time.
-- Remote DB tanpa kolom `waktu` → tambah sebagai text; sudah text → biarkan.

do $$
declare
  col_type text;
begin
  select c.data_type into col_type
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'tindakan'
    and c.column_name = 'waktu';

  if col_type is null then
    alter table public.tindakan add column if not exists waktu text;
  elsif col_type in ('time without time zone', 'time with time zone') then
    alter table public.tindakan
      alter column waktu type text using (
        case
          when waktu is null then null
          else replace(to_char(waktu, 'HH24:MI'), ':', '.')
        end
      );
  end if;
end $$;

comment on column public.tindakan.waktu is
  'Jam atau rentang (teks), format tampilan HH.MM atau HH.MM - HH.MM.';
