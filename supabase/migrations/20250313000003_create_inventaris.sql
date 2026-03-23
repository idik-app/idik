-- Tabel inventaris — modul Inventaris IDIK-App (alkes/stok Cathlab)

create table if not exists public.inventaris (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  nama text not null,
  kategori text,
  satuan text default 'pcs',
  stok numeric default 0,
  min_stok numeric default 0,
  lokasi text
);

create index if not exists idx_inventaris_kategori on public.inventaris (kategori);
create index if not exists idx_inventaris_nama on public.inventaris (nama);

comment on table public.inventaris is 'Inventaris alat/stok Cathlab IDIK-App. Modul: Inventaris.';
