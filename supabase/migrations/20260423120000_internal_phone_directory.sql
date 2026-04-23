-- Direktori telepon internal (RS) — tindakan / shortcut panggilan

create table if not exists public.internal_phone_directory (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unit text not null,
  ext text not null,
  location text not null default '',
  floor text,
  is_pinned boolean not null default false,
  pin_order integer
);

create index if not exists idx_internal_phone_directory_sort
  on public.internal_phone_directory (is_pinned desc, pin_order nulls last, unit);

comment on table public.internal_phone_directory is
  'Direktori ekstensi telepon internal — modul tindakan, CRUD lewat /api/phone-directory.';

-- Trigger updated_at
create or replace function public.set_internal_phone_directory_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_internal_phone_directory_updated_at on public.internal_phone_directory;
create trigger trg_internal_phone_directory_updated_at
  before update on public.internal_phone_directory
  for each row execute procedure public.set_internal_phone_directory_updated_at();

-- Seed awal (sekali, jika tabel masih kosong)
do $$
begin
  if not exists (select 1 from public.internal_phone_directory limit 1) then
    insert into public.internal_phone_directory (unit, ext, location, floor, is_pinned, pin_order) values
      ('OPERATOR', '0/100', 'LT. 1 & Basement', 'LT 1', false, null),
      ('Cathlab', '640', 'LT. 6', 'LT 6', false, null),
      ('ICCU', '452', 'LT. 4', 'LT 4', false, null),
      ('IGD 24 JAM', '114', 'LT. 1', 'LT 1', false, null),
      ('Poli Jantung', '210', 'LT. 2', 'LT 2', false, null),
      ('Radiologi', '305', 'LT. 3', 'LT 3', false, null),
      ('Laboratorium', '312', 'LT. 3', 'LT 3', false, null),
      ('VK (Bersalin)', '401', 'LT. 4', 'LT 4', false, null),
      ('OK (Kamar Operasi)', '505', 'LT. 5', 'LT 5', false, null),
      ('RPI (Rawat Peninggian Intensif)', '444', 'LT. 4', 'LT 4', false, null),
      ('Admission/Pendaftaran', '101', 'LT. 1', 'LT 1', false, null),
      ('Farmasi Rawat Inap', '120', 'LT. 1', 'LT 1', false, null),
      ('Manajemen', '701', 'LT. 7', 'LT 7', false, null),
      ('IT Helpdesk', '777', 'LT. 7', 'LT 7', false, null),
      ('Keamanan (Satpam)', '110', 'Gerbang Depan', 'LT 1', false, null),
      ('Gizi', '205', 'LT. 2', 'LT 2', false, null);
  end if;
end $$;
