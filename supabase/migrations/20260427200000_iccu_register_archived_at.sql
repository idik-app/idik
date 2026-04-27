-- Arsip kasus ICCU → HISTORY PASIEN (kolom archived_at). Daftar aktif: archived_at is null.

alter table public.iccu_register_entry
  add column if not exists archived_at timestamptz null;

comment on column public.iccu_register_entry.archived_at is
  'Waktu kasus dipindahkan ke riwayat; null = masih di REGISTER (aktif).';

create index if not exists iccu_register_entry_ruangan_active_created_idx
  on public.iccu_register_entry (ruangan_id, created_at desc)
  where archived_at is null;

create index if not exists iccu_register_entry_ruangan_archived_idx
  on public.iccu_register_entry (ruangan_id, archived_at desc nulls last)
  where archived_at is not null;

-- Jarvis: HISTORY PASIEN (unit ICCU), jika belum ada
insert into public.intensive_jarvis_menu (
  label,
  icon_name,
  action_type,
  action_value,
  order_index,
  is_active,
  ruangan_id
)
select
  'HISTORY PASIEN',
  'History',
  'function',
  'history_pasien',
  coalesce(
    (select max(m.order_index) + 1 from public.intensive_jarvis_menu m where m.ruangan_id = r.id),
    20
  ),
  true,
  r.id
from public.ruangan r
where r.slug = 'iccu'
  and not exists (
    select 1
    from public.intensive_jarvis_menu x
    where x.ruangan_id = r.id
      and lower(trim(coalesce(x.action_value, ''))) = 'history_pasien'
  );
