-- Log peristiwa bisnis distributor (katalog, mutasi stok, pemakaian FIFO) untuk feed & notifikasi mendatang.

create table if not exists public.distributor_event_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  distributor_id uuid not null references public.master_distributor (id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  actor text
);

create index if not exists idx_distributor_event_log_dist_created
  on public.distributor_event_log (distributor_id, created_at desc);

comment on table public.distributor_event_log is
  'Peristiwa portal distributor: PRODUCT_UPSERT, PRODUCT_DELETED, PRODUCT_UPDATED, KATALOG_RETUR (DELETE ?via=retur), MUTASI_STOK, PEMAKAIAN_FIFO.';
