-- Ketik manual / pilih jenis tindakan di kasus → pastikan nama ada di `public.master_tindakan`.
-- Pengecualian: placeholder UI "Belum diisi" tidak dimasukkan ke master.

create or replace function public.tindakan_sync_master_jenis_tindakan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  raw text;
  v_nama text;
  v_exists boolean;
  v_urutan integer;
begin
  raw := trim(coalesce(new.tindakan, ''));
  if length(raw) = 0 then
    return new;
  end if;

  if lower(raw) = 'belum diisi' then
    return new;
  end if;

  v_nama := raw;

  select exists (
    select 1
    from public.master_tindakan m
    where lower(trim(m.nama)) = lower(v_nama)
  )
  into v_exists;

  if v_exists then
    return new;
  end if;

  select coalesce(max(m.urutan), 0) + 10
  from public.master_tindakan m
  into v_urutan;

  begin
    insert into public.master_tindakan (nama, urutan, aktif)
    values (v_nama, v_urutan, true);
  exception
    when unique_violation then
      null;
  end;

  return new;
end;
$$;

comment on function public.tindakan_sync_master_jenis_tindakan() is
  'Menambah baris master_tindakan bila nama jenis tindakan di kasus belum ada (case-insensitive); mengabaikan "Belum diisi".';

drop trigger if exists trg_tindakan_sync_master_jenis_tindakan on public.tindakan;

create trigger trg_tindakan_sync_master_jenis_tindakan
  after insert or update of tindakan on public.tindakan
  for each row
  execute procedure public.tindakan_sync_master_jenis_tindakan();
