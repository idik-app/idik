-- Tabel user untuk login IDIK-App (username + password_hash, bukan Supabase Auth).
-- Digunakan oleh POST /api/auth untuk validasi kredensial.

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  role text not null default 'user' check (role in ('admin', 'staff', 'user')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS: hanya service role yang boleh baca (API route pakai service key).
alter table public.app_users enable row level security;

create policy "Service role only"
  on public.app_users
  for all
  using (auth.role() = 'service_role');

-- Indeks untuk lookup login
create index if not exists idx_app_users_username on public.app_users (username);

comment on table public.app_users is 'User login aplikasi IDIK (username + bcrypt). Bukan Supabase Auth.';
