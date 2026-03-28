-- Saat ruangan diisi di kasus tindakan (ketik manual atau pilih), pastikan ada di master `public.ruangan`.
-- Fungsi SECURITY DEFINER agar berjalan meski pemanggil (mis. anon) tidak punya INSERT ke ruangan.

create or replace function public.tindakan_sync_ruangan_master()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  raw text;
  v_nama text;
  v_kode text;
  v_exists boolean;
begin
  raw := trim(coalesce(new.ruangan, ''));
  if length(raw) = 0 then
    return new;
  end if;

  -- Format seperti UI: "Nama (KODE)" di akhir string
  if raw ~ '\([^)]+\)\s*$' then
    v_kode := nullif(trim((regexp_match(raw, '\(([^)]+)\)\s*$'))[1]), '');
    v_nama := nullif(trim(regexp_replace(raw, '\s*\([^)]+\)\s*$', '')), '');
  else
    v_nama := raw;
    v_kode := null;
  end if;

  if v_nama is null or length(v_nama) = 0 then
    return new;
  end if;

  select exists (
    select 1
    from public.ruangan r
    where lower(trim(r.nama)) = lower(v_nama)
       or (
            v_kode is not null
            and r.kode is not null
            and length(trim(r.kode)) > 0
            and lower(trim(r.kode)) = lower(v_kode)
          )
  )
  into v_exists;

  if v_exists then
    return new;
  end if;

  begin
    insert into public.ruangan (nama, kode, aktif)
    values (v_nama, v_kode, true);
  exception
    when unique_violation then
      null;
  end;

  return new;
end;
$$;

comment on function public.tindakan_sync_ruangan_master() is
  'Menambah baris master ruangan bila label ruangan di tindakan belum dikenal (nama/kode, case-insensitive).';

drop trigger if exists trg_tindakan_sync_ruangan_master on public.tindakan;

create trigger trg_tindakan_sync_ruangan_master
  after insert or update of ruangan on public.tindakan
  for each row
  execute procedure public.tindakan_sync_ruangan_master();
