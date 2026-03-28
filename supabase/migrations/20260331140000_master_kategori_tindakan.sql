-- Master label kategori kasus Cathlab (kolom tindakan.kategori — autofill di drawer)

create table if not exists public.master_kategori_tindakan (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  nama text not null,
  urutan integer not null default 0,
  aktif boolean not null default true
);

create unique index if not exists idx_master_kategori_tindakan_nama_unique
  on public.master_kategori_tindakan (nama);

create index if not exists idx_master_kategori_tindakan_urutan
  on public.master_kategori_tindakan (urutan, nama);
create index if not exists idx_master_kategori_tindakan_aktif
  on public.master_kategori_tindakan (aktif);

comment on table public.master_kategori_tindakan is 'Master pilihan kategori kasus tindakan (Cathlab).';

create or replace function public.set_master_kategori_tindakan_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_master_kategori_tindakan_updated_at on public.master_kategori_tindakan;
create trigger trg_master_kategori_tindakan_updated_at
  before update on public.master_kategori_tindakan
  for each row execute procedure public.set_master_kategori_tindakan_updated_at();

insert into public.master_kategori_tindakan (nama, urutan, aktif) values
  ('ATRIAL FLUTTER', 10, true),
  ('CABG', 20, true),
  ('CALSIFIED', 30, true),
  ('COMPLETE REVASC', 40, true),
  ('CTO', 50, true),
  ('DOT', 60, true),
  ('FAILED ROTA', 70, true),
  ('LM', 80, true),
  ('MILD CAD', 90, true),
  ('MINOCA', 100, true),
  ('NO REFLOW', 110, true),
  ('NORMAL', 120, true),
  ('SLOW FLOW', 130, true),
  ('STAGING D1', 140, true),
  ('STAGING LAD', 150, true),
  ('STAGING LCX', 160, true),
  ('STAGING LM', 170, true),
  ('STAGING RCA', 180, true),
  ('SVT', 190, true),
  ('THROMBUS', 200, true),
  ('WPW', 210, true)
on conflict (nama) do nothing;
