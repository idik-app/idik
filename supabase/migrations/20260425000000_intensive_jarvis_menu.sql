-- Tabel untuk menyimpan konfigurasi menu JARVIS secara dinamis
create table if not exists public.intensive_jarvis_menu (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  icon_name text not null, -- Nama icon lucide (e.g. 'LayoutDashboard')
  action_type text not null default 'function', -- 'function', 'link', 'sidebar_toggle'
  action_value text, -- misal: url atau identifier fungsi
  order_index int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index untuk performa sorting
create index if not exists intensive_jarvis_menu_order_idx on public.intensive_jarvis_menu (order_index);

-- RLS
alter table public.intensive_jarvis_menu enable row level security;

-- Policy: Semua user bisa baca (untuk sementara)
create policy "Allow public read on jarvis menu"
  on public.intensive_jarvis_menu for select
  using (true);

-- Policy: Authenticated users bisa CRUD (sesuaikan jika perlu role admin)
create policy "Allow auth users to manage jarvis menu"
  on public.intensive_jarvis_menu for all
  using (auth.role() = 'authenticated');

-- Seed data awal hanya jika belum ada kolom ruangan_id (alur lama).
-- Setelah migrasi per-ruangan, baris wajib punya ruangan_id — seed di sini akan dilewati.
do $seed$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'intensive_jarvis_menu'
      and column_name = 'ruangan_id'
  ) then
    insert into public.intensive_jarvis_menu (label, icon_name, action_type, action_value, order_index)
    values
      ('Toggle Sidebar', 'Menu', 'sidebar_toggle', null, 0),
      ('Tabel Tindakan', 'ClipboardList', 'function', 'actions_table', 1),
      ('Tambah Pasien', 'UserPlus', 'function', 'add_patient', 2),
      ('Laporan Harian', 'FileText', 'function', 'report_daily', 3),
      ('Laporan Mingguan', 'CalendarDays', 'function', 'report_weekly', 4),
      ('Laporan Bulanan', 'CalendarRange', 'function', 'report_monthly', 5)
    on conflict do nothing;
  end if;
end;
$seed$;
