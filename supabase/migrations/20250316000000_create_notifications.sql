-- Tabel notifikasi untuk bell di Topbar (global, semua aktivitas)

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  message text not null,
  type text default 'info' check (type in ('info', 'success', 'warning', 'error', 'system'))
);

create index if not exists idx_notifications_created_at on public.notifications (created_at desc);

comment on table public.notifications is 'Notifikasi sistem untuk bell di Topbar IDIK-App.';
