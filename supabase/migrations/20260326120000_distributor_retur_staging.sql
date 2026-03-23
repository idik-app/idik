-- Baris retur staging: stok sudah dikurangi (FIFO); panel untuk siap/batal/selesai.

create table if not exists public.distributor_retur_staging (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  distributor_id uuid not null references public.master_distributor (id) on delete cascade,
  distributor_barang_id uuid not null references public.distributor_barang (id) on delete cascade,
  master_barang_id uuid not null references public.master_barang (id) on delete restrict,
  qty numeric not null,
  status text not null default 'DRAFT',
  allocations jsonb not null default '[]'::jsonb,
  actor text,
  nota_nomor text,
  constraint distributor_retur_staging_qty_check check (qty > 0),
  constraint distributor_retur_staging_status_check check (
    status in ('DRAFT', 'SIAP_RETUR', 'DIBATALKAN', 'SELESAI')
  )
);

create index if not exists idx_distributor_retur_staging_dist_status
  on public.distributor_retur_staging (distributor_id, status, created_at desc);

comment on table public.distributor_retur_staging is
  'Draft retur: qty sudah keluar dari inventaris (KELUAR_RETUR FIFO); siap/batal/selesai dari panel.';
