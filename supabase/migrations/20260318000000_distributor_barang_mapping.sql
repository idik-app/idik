-- Distributor CRUD products mapping (multi-distributor supply)

create table if not exists public.distributor_barang (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  distributor_id uuid not null references public.master_distributor (id) on delete cascade,
  master_barang_id uuid not null references public.master_barang (id) on delete cascade,

  kode_distributor text,
  harga_jual numeric,
  min_stok numeric default 0,
  is_active boolean default true,

  unique (distributor_id, master_barang_id)
);

create index if not exists idx_distributor_barang_distributor_id
  on public.distributor_barang (distributor_id);

create index if not exists idx_distributor_barang_master_barang_id
  on public.distributor_barang (master_barang_id);

