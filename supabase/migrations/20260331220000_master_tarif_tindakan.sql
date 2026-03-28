-- Master tarif tindakan (rupiah) — isi otomatis kolom tindakan.tarif_tindakan saat nama tindakan cocok

create or replace function public.normalize_nama_tindakan_tarif(p text)
returns text
language sql
immutable
as $$
  select upper(regexp_replace(trim(coalesce(p, '')), '\s+', ' ', 'g'));
$$;

create table if not exists public.master_tarif_tindakan (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  nama text not null,
  nama_cari text not null,
  tarif_rupiah numeric(14, 2) not null,
  aktif boolean not null default true,
  constraint master_tarif_tindakan_tarif_nonneg check (tarif_rupiah >= 0)
);

create unique index if not exists idx_master_tarif_tindakan_nama_cari_unique
  on public.master_tarif_tindakan (nama_cari);

create index if not exists idx_master_tarif_tindakan_aktif
  on public.master_tarif_tindakan (aktif, nama_cari);

comment on table public.master_tarif_tindakan is 'Referensi tarif per nama tindakan Cathlab; dipakai trigger & API untuk mengisi tarif_tindakan.';

create or replace function public.set_master_tarif_tindakan_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_master_tarif_tindakan_updated_at on public.master_tarif_tindakan;
create trigger trg_master_tarif_tindakan_updated_at
  before update on public.master_tarif_tindakan
  for each row execute procedure public.set_master_tarif_tindakan_updated_at();

-- Satu baris per kunci pencarian (nama_cari); sinonim = baris terpisah dengan tarif sama
insert into public.master_tarif_tindakan (nama, nama_cari, tarif_rupiah, aktif) values
  ('PTCA', 'PTCA', 8625000, true),
  ('DCA', 'DCA', 3737500, true),
  ('TPM', 'TPM', 4600000, true),
  ('DXRL', 'DXRL', 5000000, true),
  ('PPM', 'PPM', 10350000, true),
  ('ARTERIOGRAFI', 'ARTERIOGRAFI', 5000000, true),
  ('ARTERIOGRAPHY', 'ARTERIOGRAPHY', 5000000, true),
  ('EVLA', 'EVLA', 5000000, true),
  ('PE', 'PE', 5000000, true),
  ('FFR', 'FFR', 4600000, true),
  ('ANGIOPLASTI', 'ANGIOPLASTI', 8625000, true),
  ('ANGIOPLASTY', 'ANGIOPLASTY', 8625000, true),
  ('EP STUDY', 'EP STUDY', 9200000, true),
  ('ABLASI EP', 'ABLASI EP', 24334000, true),
  ('DSA', 'DSA', 11960000, true)
on conflict (nama_cari) do update set
  nama = excluded.nama,
  tarif_rupiah = excluded.tarif_rupiah,
  aktif = excluded.aktif,
  updated_at = now();

-- Instalasi lama mungkin belum punya kolom ini (skema awal repo sudah ada)
alter table public.tindakan add column if not exists tarif_tindakan numeric(14, 2);

-- Trigger: isi / refresh tarif_tindakan dari master saat tindakan berubah
create or replace function public.tindakan_apply_tarif_master()
returns trigger as $$
declare
  v_tarif numeric;
  key text;
begin
  key := public.normalize_nama_tindakan_tarif(new.tindakan);
  if key = '' then
    return new;
  end if;
  select m.tarif_rupiah into v_tarif
  from public.master_tarif_tindakan m
  where m.aktif and m.nama_cari = key
  limit 1;
  if found then
    new.tarif_tindakan := v_tarif;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_tindakan_apply_tarif_master on public.tindakan;
create trigger trg_tindakan_apply_tarif_master
  before insert or update of tindakan on public.tindakan
  for each row execute procedure public.tindakan_apply_tarif_master();

-- Backfill baris yang tarifnya masih kosong
update public.tindakan t
set tarif_tindakan = m.tarif_rupiah
from public.master_tarif_tindakan m
where m.aktif
  and (t.tarif_tindakan is null)
  and public.normalize_nama_tindakan_tarif(t.tindakan) = m.nama_cari;
