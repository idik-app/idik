-- Riwayat perubahan status tindakan (audit ringan per kasus)
-- tindakan_id = text agar kompatibel skema bigint/uuid di public.tindakan
create table if not exists public.tindakan_status_log (
  id uuid primary key default gen_random_uuid(),
  tindakan_id text not null,
  status text,
  status_keterangan text,
  changed_by text,
  created_at timestamptz not null default now()
);

create index if not exists tindakan_status_log_tindakan_id_created_at_idx
  on public.tindakan_status_log (tindakan_id, created_at desc);

comment on table public.tindakan_status_log is
  'Log perubahan status tindakan beserta keterangan status.';
