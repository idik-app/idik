-- Isi `intensive_jarvis_menu` per ruangan bila belum ada baris sama sekali
-- (selaras dengan `defaultJarvisMenuSeed.ts` + item REGISTER untuk slug `iccu`).
-- Menyamai perilaku `ensureDefaultMenuRows` di `app/api/intensive/jarvis-menu` route.

insert into public.intensive_jarvis_menu (
  label,
  icon_name,
  action_type,
  action_value,
  order_index,
  is_active,
  ruangan_id,
  created_at,
  updated_at
)
select
  v.label,
  v.icon_name,
  v.action_type,
  v.action_value,
  v.ord,
  true,
  r.id,
  now(),
  now()
from public.ruangan r
inner join (values
  (0, 'Toggle Sidebar', 'Menu', 'sidebar_toggle', null::text),
  (1, 'Tabel Tindakan', 'ClipboardList', 'function', 'actions_table'),
  (2, 'Tambah Pasien', 'UserPlus', 'function', 'add_patient'),
  (3, 'Laporan Harian', 'FileText', 'function', 'report_daily'),
  (4, 'Laporan Mingguan', 'CalendarDays', 'function', 'report_weekly'),
  (5, 'Laporan Bulanan', 'CalendarRange', 'function', 'report_monthly')
) as v(ord, label, icon_name, action_type, action_value)
  on true
where coalesce(r.aktif, true) = true
  and not exists (
    select 1
    from public.intensive_jarvis_menu m
    where m.ruangan_id = r.id
  );

-- Baris REGISTER untuk unit ICCU (bila belum ada), termasuk pasca seed 6 baris di atas
insert into public.intensive_jarvis_menu (
  label,
  icon_name,
  action_type,
  action_value,
  order_index,
  is_active,
  ruangan_id,
  created_at,
  updated_at
)
select
  'REGISTER ICCU',
  'Hospital',
  'function',
  'register_iccu',
  coalesce(
    (select max(m.order_index) + 1
     from public.intensive_jarvis_menu m
     where m.ruangan_id = r.id),
    0
  ),
  true,
  r.id,
  now(),
  now()
from public.ruangan r
where lower(trim(r.slug)) = 'iccu'
  and coalesce(r.aktif, true) = true
  and not exists (
    select 1
    from public.intensive_jarvis_menu m
    where m.ruangan_id = r.id
      and m.action_value = 'register_iccu'
  );
