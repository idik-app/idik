-- v3: lebih robust (fallback match lewat no_rm)

create or replace function public.tindakan_sync_pasien_master()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_nama text := coalesce(trim(new.nama), '');
  v_new_no_rm text := coalesce(trim(new.no_rm), '');
  v_old_nama text := coalesce(trim(old.nama), '');
  v_old_no_rm text := coalesce(trim(old.no_rm), '');
begin
  if v_new_nama = v_old_nama and v_new_no_rm = v_old_no_rm then
    return new;
  end if;

  -- Update baris tindakan:
  -- - utama: yang terhubung via `pasien_id`
  -- - fallback: jika `pasien_id` legacy null, tapi `no_rm` cocok
  update public.tindakan t
  set
    nama_pasien = v_new_nama,
    no_rm = v_new_no_rm,
    updated_at = now()
  where
    (
      t.pasien_id = new.id
      or coalesce(trim(t.no_rm), '') = v_old_no_rm
      or coalesce(trim(t.no_rm), '') = v_new_no_rm
    )
    and (
      lower(coalesce(trim(t.nama_pasien), '')) = lower(v_old_nama)
      or coalesce(trim(t.nama_pasien), '') = ''
      or coalesce(trim(t.no_rm), '') = v_old_no_rm
      or coalesce(trim(t.no_rm), '') = ''
    );

  return new;
end;
$$;

