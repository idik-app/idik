-- Tautkan app_users ke master unit (ruangan) untuk redirect login dan isolasi per slug.

alter table public.app_users
  add column if not exists ruangan_id uuid references public.ruangan (id) on delete set null;

create index if not exists idx_app_users_ruangan_id on public.app_users (ruangan_id);

comment on column public.app_users.ruangan_id is
  'Unit home (opsional): JWT menyertakan slug ruangan untuk redirect /{slug}/dashboard dan pengecekan requireUnitAccess.';
