-- Registrasi kasus ICCU (modal + drawer) — kolom selaras wireframe docs/wireframe-register-iccu-modal-drawer.md
-- Tipe pasien_id mengikuti public.pasien(id): uuid (dev) atau integer/bigint (beberapa DB produksi).

do $$
declare
  pasien_id_type text;
begin
  select format_type(a.atttypid, a.atttypmod)
    into pasien_id_type
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'pasien'
    and a.attname = 'id'
    and a.attnum > 0
    and not a.attisdropped
  limit 1;

  if pasien_id_type is null then
    raise exception 'public.pasien.id tidak ditemukan';
  end if;

  execute format($icc$
    create table if not exists public.iccu_register_entry (
      id uuid primary key default gen_random_uuid(),
      ruangan_id uuid not null references public.ruangan (id) on delete cascade,
      pasien_id %s references public.pasien (id) on delete set null,

      -- Snapshot daftar (sinkron dari pasien / input)
      nama text,
      no_rm text,
      no_telp text,
      jenis_kelamin text check (jenis_kelamin is null or jenis_kelamin in ('L', 'P')),
      tanggal_lahir date,
      alamat text,
      umur_tampilan text,
      asal_pasien text,
      diagnosa text,
      dokter_dpjp_id uuid references public.doctor (id) on delete set null,

      jenis_pembiayaan text,
      keterangan text,

      periode_masuk date,
      periode_keluar date,
      los_hari integer,

      cara_keluar text check (
        cara_keluar is null
        or cara_keluar in (
          'pindah_ruangan',
          'krs',
          'pulang_paksa',
          'rujuk',
          'meninggal'
        )
      ),
      pindah_ruangan_id uuid references public.ruangan (id) on delete set null,
      meninggal_within_48h boolean,

      invasive_procedures jsonb not null default '[]'::jsonb,

      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  $icc$, pasien_id_type);
end;
$$;

create index if not exists iccu_register_entry_ruangan_created_idx
  on public.iccu_register_entry (ruangan_id, created_at desc);

create index if not exists iccu_register_entry_pasien_idx
  on public.iccu_register_entry (pasien_id)
  where pasien_id is not null;

comment on table public.iccu_register_entry is
  'Baris registrasi ICCU per unit; invasive_procedures = json array string, mis. ["ventilator","niv"].';

create or replace function public.iccu_register_entry_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists iccu_register_entry_set_updated_at on public.iccu_register_entry;
create trigger iccu_register_entry_set_updated_at
  before update on public.iccu_register_entry
  for each row execute function public.iccu_register_entry_touch_updated_at();

alter table public.iccu_register_entry enable row level security;

drop policy if exists "iccu_register_entry_by_unit" on public.iccu_register_entry;
create policy "iccu_register_entry_by_unit"
  on public.iccu_register_entry
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.user_unit_access u
      where u.user_id = auth.uid()
        and u.ruangan_id = iccu_register_entry.ruangan_id
    )
  )
  with check (
    exists (
      select 1
      from public.user_unit_access u
      where u.user_id = auth.uid()
        and u.ruangan_id = iccu_register_entry.ruangan_id
    )
  );

-- Menu Jarvis: REGISTER ICCU (hanya unit ICCU, jika belum ada)
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
  'REGISTER ICCU',
  'Hospital',
  'function',
  'register_iccu',
  coalesce(
    (select max(m.order_index) + 1 from public.intensive_jarvis_menu m where m.ruangan_id = r.id),
    10
  ),
  true,
  r.id
from public.ruangan r
where r.slug = 'iccu'
  and not exists (
    select 1
    from public.intensive_jarvis_menu x
    where x.ruangan_id = r.id
      and x.action_value = 'register_iccu'
  );
