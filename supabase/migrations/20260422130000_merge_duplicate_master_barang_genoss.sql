-- Satukan duplikat master "GENOSS" (case-insensitive) ke satu baris kanonik:
-- baris dengan created_at paling awal (selaras dengan resolveMasterBarangUuidForFifo di app).
--
-- Sebelum produksi: backup DB. Migrasi idempoten: jika hanya satu baris, tidak melakukan apa-apa.
--
-- Yang di-update: inventaris, distributor_barang (hindari bentrok unique per distributor),
-- distributor_retur_staging (jika tabel ada). Lalu hapus baris master duplikat.
--
-- Untuk nama lain: salin migrasi ini, ganti literal 'genoss' di v_norm, dan beri timestamp baru.

do $$
declare
  v_norm constant text := 'genoss';
  keep_id uuid;
  old_id uuid;
  n_dup int;
begin
  select count(*)::int
  into n_dup
  from public.master_barang mb
  where lower(trim(mb.nama)) = v_norm;

  if n_dup <= 1 then
    raise notice 'merge_master_barang_genoss: % baris (<=1), lewati.', n_dup;
    return;
  end if;

  select mb.id
  into keep_id
  from public.master_barang mb
  where lower(trim(mb.nama)) = v_norm
  order by mb.created_at asc nulls last, mb.id asc
  limit 1;

  raise notice 'merge_master_barang_genoss: kanonik id=%, menggabungkan % duplikat.', keep_id, n_dup - 1;

  for old_id in
    select mb.id
    from public.master_barang mb
    where lower(trim(mb.nama)) = v_norm
      and mb.id <> keep_id
    order by mb.created_at asc
  loop
    update public.inventaris inv
    set master_barang_id = keep_id,
        updated_at = coalesce(inv.updated_at, now())
    where inv.master_barang_id = old_id;

    if to_regclass('public.distributor_retur_staging') is not null then
      update public.distributor_retur_staging s
      set master_barang_id = keep_id,
          updated_at = now()
      where s.master_barang_id = old_id;
    end if;

    -- Satu distributor hanya boleh satu baris distributor_barang per master_barang_id.
    delete from public.distributor_barang db
    where db.master_barang_id = old_id
      and exists (
        select 1
        from public.distributor_barang ex
        where ex.distributor_id = db.distributor_id
          and ex.master_barang_id = keep_id
      );

    update public.distributor_barang db
    set master_barang_id = keep_id,
        updated_at = now()
    where db.master_barang_id = old_id;

    delete from public.master_barang mb
    where mb.id = old_id;
  end loop;

  update public.master_barang
  set nama = 'GENOSS',
      updated_at = now()
  where id = keep_id
    and lower(trim(nama)) = v_norm;

  raise notice 'merge_master_barang_genoss: selesai. Satu baris master GENOSS id=%.', keep_id;
end $$;
