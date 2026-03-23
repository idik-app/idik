-- Portal Distributor (Cathlab) — multi-tenant via distributor_id
-- Adds:
-- - app_users.distributor_id (bind login user -> distributor)
-- - inventaris.master_barang_id & inventaris.distributor_id (attribution supplier for pemakaian)
-- - distributor_notification_settings (email settings per distributor)

-- 1) app_users: bind distributor user to a distributor
alter table public.app_users
  add column if not exists distributor_id uuid references public.master_distributor (id) on delete set null;

create index if not exists idx_app_users_distributor_id
  on public.app_users (distributor_id);

comment on column public.app_users.distributor_id is
  'Jika role=distributor, user terikat ke master_distributor.id (tenant boundary).';

-- 2) inventaris: link to master_barang and distributor supplier
alter table public.inventaris
  add column if not exists master_barang_id uuid references public.master_barang (id) on delete set null;

alter table public.inventaris
  add column if not exists distributor_id uuid references public.master_distributor (id) on delete set null;

create index if not exists idx_inventaris_master_barang_id on public.inventaris (master_barang_id);
create index if not exists idx_inventaris_distributor_id on public.inventaris (distributor_id);

comment on column public.inventaris.master_barang_id is
  'Mapping inventaris Cathlab -> master_barang (global catalog).';

comment on column public.inventaris.distributor_id is
  'Supplier (master_distributor) untuk stok inventaris ini. Dipakai untuk atribusi pemakaian.';

-- 3) Notification settings (email first; WhatsApp optional later)
create table if not exists public.distributor_notification_settings (
  distributor_id uuid primary key references public.master_distributor (id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  email_recipients text[] default '{}'::text[],
  realtime_enabled boolean default true,
  realtime_aggregate_minutes int default 10,
  low_stock_enabled boolean default true,
  daily_digest_enabled boolean default true,
  daily_digest_time text default '18:00',
  weekly_digest_enabled boolean default true,
  weekly_digest_day int default 1, -- 1=Monday
  weekly_digest_time text default '08:00'
);

create index if not exists idx_distributor_notification_settings_updated_at
  on public.distributor_notification_settings (updated_at desc);

comment on table public.distributor_notification_settings is
  'Preferensi notifikasi per distributor (email dulu). WhatsApp menyusul.';

