-- Antrian job bot SIMRS (Playwright di PC LAN RS; Vercel hanya enqueue/claim)
create table if not exists public.simrs_bot_jobs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  status text not null default 'pending'
    check (status in ('pending', 'claimed', 'running', 'done', 'error', 'cancelled')),
  requested_by text,
  error text,
  result jsonb,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz
);

create index if not exists simrs_bot_jobs_status_created_at_idx
  on public.simrs_bot_jobs (status, created_at asc);

comment on table public.simrs_bot_jobs is
  'Antrian perintah bot SIMRS (lihat_rekam_medis, dll). Akses lewat API service role.';

alter table public.simrs_bot_jobs enable row level security;

-- Tidak ada policy untuk anon/authenticated — hanya service role (bypass RLS).
