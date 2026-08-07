-- Cek obat klinis (NTG/Cedocard, Heparin, Lain) + log barang dinamis di tab Tindakan.

alter table public.tindakan add column if not exists cek_ntg_cedocard boolean default false;
alter table public.tindakan add column if not exists cek_ntg_cedocard_ket text;
alter table public.tindakan add column if not exists cek_ntg_cedocard_jam text;
alter table public.tindakan add column if not exists cek_ntg_cedocard_oleh text;

alter table public.tindakan add column if not exists cek_heparin boolean default false;
alter table public.tindakan add column if not exists cek_heparin_ket text;
alter table public.tindakan add column if not exists cek_heparin_jam text;
alter table public.tindakan add column if not exists cek_heparin_oleh text;

alter table public.tindakan add column if not exists cek_lain boolean default false;
alter table public.tindakan add column if not exists cek_lain_ket text;
alter table public.tindakan add column if not exists cek_lain_jam text;
alter table public.tindakan add column if not exists cek_lain_oleh text;

alter table public.tindakan
  add column if not exists log_barang_klinis jsonb default '[]'::jsonb;

comment on column public.tindakan.cek_ntg_cedocard is 'Cek klinis NTG / Cedocard dipakai.';
comment on column public.tindakan.cek_heparin is 'Cek klinis Heparin dipakai.';
comment on column public.tindakan.cek_lain is 'Cek klinis obat/barang lain.';
comment on column public.tindakan.log_barang_klinis is
  'Log barang/obat klinis dinamis: [{id,nama,jam,keterangan,oleh}]. Dokumentasi saja.';

do $$
declare
  v_type char;
begin
  select relkind into v_type
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'tindakan_medik';

  if v_type = 'r' then
    alter table public.tindakan_medik add column if not exists cek_ntg_cedocard boolean default false;
    alter table public.tindakan_medik add column if not exists cek_ntg_cedocard_ket text;
    alter table public.tindakan_medik add column if not exists cek_ntg_cedocard_jam text;
    alter table public.tindakan_medik add column if not exists cek_ntg_cedocard_oleh text;
    alter table public.tindakan_medik add column if not exists cek_heparin boolean default false;
    alter table public.tindakan_medik add column if not exists cek_heparin_ket text;
    alter table public.tindakan_medik add column if not exists cek_heparin_jam text;
    alter table public.tindakan_medik add column if not exists cek_heparin_oleh text;
    alter table public.tindakan_medik add column if not exists cek_lain boolean default false;
    alter table public.tindakan_medik add column if not exists cek_lain_ket text;
    alter table public.tindakan_medik add column if not exists cek_lain_jam text;
    alter table public.tindakan_medik add column if not exists cek_lain_oleh text;
    alter table public.tindakan_medik add column if not exists log_barang_klinis jsonb default '[]'::jsonb;
  elsif v_type = 'v' then
    drop view if exists public.tindakan_medik cascade;
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'tindakan' and column_name = 'dokter_id'
    ) then
      execute 'create view public.tindakan_medik as
               select t.*, d.nama_dokter as dokter
               from public.tindakan t
               left join public.doctor d on d.id = t.dokter_id';
    else
      execute 'create view public.tindakan_medik as select * from public.tindakan';
    end if;
  end if;
end $$;
