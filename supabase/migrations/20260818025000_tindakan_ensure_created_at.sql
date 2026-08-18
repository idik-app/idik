-- Ensure created_at and updated_at columns exist on public.tindakan table
alter table public.tindakan add column if not exists created_at timestamptz default now();
alter table public.tindakan add column if not exists updated_at timestamptz default now();

comment on column public.tindakan.created_at is 'Waktu pembuatan rekam tindakan.';
