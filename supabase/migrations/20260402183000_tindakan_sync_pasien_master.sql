-- Sinkron otomatis: perubahan master `pasien` (nama/no_rm) -> baris terkait di `tindakan`
-- Tujuan: tabel tindakan menampilkan nama pasien terbaru tanpa sync manual.

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
  -- Jika tidak ada perubahan nama/no_rm, skip supaya tidak memicu update event yang tidak perlu.
  if v_new_nama = v_old_nama and v_new_no_rm = v_old_no_rm then
    return new;
  end if;

  -- Update hanya baris tindakan yang terhubung dengan pasien ini.
  -- Guard condition: agar tidak menimpa nama/no_rm yang sudah berbeda karena edit manual,
  -- kecuali baris masih sama dengan nilai lama atau kosong.
  update public.tindakan t
  set
    nama_pasien = v_new_nama,
    no_rm = v_new_no_rm,
    updated_at = now()
  where t.pasien_id = new.id
    and (
      coalesce(trim(t.nama_pasien), '') = v_old_nama
      or coalesce(trim(t.nama_pasien), '') = ''
      or coalesce(trim(t.no_rm), '') = v_old_no_rm
      or coalesce(trim(t.no_rm), '') = ''
    );

  return new;
end;
$$;

drop trigger if exists trg_tindakan_sync_pasien_master on public.pasien;

create trigger trg_tindakan_sync_pasien_master
  after update of nama, no_rm on public.pasien
  for each row
  execute procedure public.tindakan_sync_pasien_master();

