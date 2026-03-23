-- Master data Farmasi: distributor & barang (obat + alkes)

create table if not exists public.master_distributor (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  nama_pt text not null,
  nama_sales text,
  kontak_wa text,
  email text,
  alamat text,
  catatan text,
  is_active boolean default true
);

create index if not exists idx_master_distributor_nama_pt
  on public.master_distributor (nama_pt);

comment on table public.master_distributor is
  'Master PT distributor farmasi/alkes, termasuk sales & kontak WA.';

create table if not exists public.master_barang (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  kode text not null unique,
  nama text not null,
  jenis text not null check (jenis in ('OBAT', 'ALKES')),
  kategori text,
  satuan text default 'pcs',
  barcode text,
  distributor_id uuid references public.master_distributor (id) on delete set null,
  harga_pokok numeric,
  harga_jual numeric,
  is_active boolean default true
);

create index if not exists idx_master_barang_nama
  on public.master_barang (nama);

create index if not exists idx_master_barang_jenis
  on public.master_barang (jenis);

create index if not exists idx_master_barang_distributor_id
  on public.master_barang (distributor_id);

comment on table public.master_barang is
  'Master barang farmasi (obat + alkes) terhubung ke distributor.';

