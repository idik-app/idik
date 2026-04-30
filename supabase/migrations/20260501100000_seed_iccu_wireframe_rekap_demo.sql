-- Seed demo rekapitulasi ICCU agar RPC `iccu_rekap_year_payload` menghasilkan Section A (dan LOS)
-- selaras angka Jan–Apr pada docs/wireframe-rekapitulasi-pasien-iccu.md §2 (tanpa NPBI terpecah).
--
-- Idempotent: hapus baris dengan `keterangan = '__wireframe_seed_rekap_demo__'` lalu insert ulang.
-- Syarat: ada baris `public.ruangan` dengan slug `iccu` (huruf tidak penting).
--
-- Catatan: Section B/C/D tidak dijamin identik tiap sel dengan ASCII wireframe (metrik saling tumpang-tindih
-- per satu baris registrasi). Untuk tampilan penuh §2 gunakan juga checkbox "Contoh wireframe" di modal.

do $$
declare
  v_ru uuid;
  v_k text := '__wireframe_seed_rekap_demo__';
  v_y int := 2026;
  umum int[] := array[18, 22, 19, 21];
  bpjs int[] := array[45, 48, 52, 46];
  npbi int[] := array[25, 26, 25, 26];
  rjks int[] := array[14, 15, 13, 14];
  lain int[] := array[3, 4, 2, 3];
  los_target int[] := array[142, 156, 148, 162];
  mo int;
  g int;
  n_mo int;
  extra int;
begin
  select id
    into v_ru
  from public.ruangan
  where lower(trim(slug)) = 'iccu'
  limit 1;

  if v_ru is null then
    raise notice 'seed_iccu_wireframe_rekap_demo: lewati — tidak ada ruangan slug iccu';
    return;
  end if;

  delete from public.iccu_register_entry
  where ruangan_id = v_ru
    and keterangan = v_k;

  for mo in 1..4 loop
    for g in 1..umum[mo] loop
      insert into public.iccu_register_entry (
        ruangan_id,
        nama,
        jenis_pembiayaan,
        periode_masuk,
        periode_keluar,
        los_hari,
        invasive_procedures,
        keterangan
      )
      values (
        v_ru,
        format('Demo rekapitulasi ICCU %s/%s UMUM #%s', mo, v_y, g),
        'UMUM',
        make_date(v_y, mo, 1 + ((g - 1) % 28)),
        make_date(v_y, mo, 1 + ((g - 1) % 28)),
        1,
        '[]'::jsonb,
        v_k
      );
    end loop;

    for g in 1..bpjs[mo] loop
      insert into public.iccu_register_entry (
        ruangan_id,
        nama,
        jenis_pembiayaan,
        periode_masuk,
        periode_keluar,
        los_hari,
        invasive_procedures,
        keterangan
      )
      values (
        v_ru,
        format('Demo rekapitulasi ICCU %s/%s BPJS #%s', mo, v_y, g),
        'BPJS PBI',
        make_date(v_y, mo, 1 + ((g - 1) % 28)),
        make_date(v_y, mo, 1 + ((g - 1) % 28)),
        1,
        '[]'::jsonb,
        v_k
      );
    end loop;

    for g in 1..npbi[mo] loop
      insert into public.iccu_register_entry (
        ruangan_id,
        nama,
        jenis_pembiayaan,
        periode_masuk,
        periode_keluar,
        los_hari,
        invasive_procedures,
        keterangan
      )
      values (
        v_ru,
        format('Demo rekapitulasi ICCU %s/%s NPBI #%s', mo, v_y, g),
        'NPBI',
        make_date(v_y, mo, 1 + ((g - 1) % 28)),
        make_date(v_y, mo, 1 + ((g - 1) % 28)),
        1,
        '[]'::jsonb,
        v_k
      );
    end loop;

    for g in 1..rjks[mo] loop
      insert into public.iccu_register_entry (
        ruangan_id,
        nama,
        jenis_pembiayaan,
        periode_masuk,
        periode_keluar,
        los_hari,
        invasive_procedures,
        keterangan
      )
      values (
        v_ru,
        format('Demo rekapitulasi ICCU %s/%s JKS #%s', mo, v_y, g),
        'JKS',
        make_date(v_y, mo, 1 + ((g - 1) % 28)),
        make_date(v_y, mo, 1 + ((g - 1) % 28)),
        1,
        '[]'::jsonb,
        v_k
      );
    end loop;

    for g in 1..lain[mo] loop
      insert into public.iccu_register_entry (
        ruangan_id,
        nama,
        jenis_pembiayaan,
        periode_masuk,
        periode_keluar,
        los_hari,
        invasive_procedures,
        keterangan
      )
      values (
        v_ru,
        format('Demo rekapitulasi ICCU %s/%s LAIN #%s', mo, v_y, g),
        'ASURANSI SWASTA',
        make_date(v_y, mo, 1 + ((g - 1) % 28)),
        make_date(v_y, mo, 1 + ((g - 1) % 28)),
        1,
        '[]'::jsonb,
        v_k
      );
    end loop;
  end loop;

  for mo in 1..4 loop
    n_mo := umum[mo] + bpjs[mo] + npbi[mo] + rjks[mo] + lain[mo];
    extra := los_target[mo] - n_mo;
    if extra < 0 then
      raise exception 'seed_iccu_wireframe_rekap_demo: los_target < jumlah baris bulan %', mo;
    end if;

    update public.iccu_register_entry e
    set los_hari = case when r.rn <= extra then 2 else 1 end
    from (
      select
        id,
        row_number() over (order by id) as rn
      from public.iccu_register_entry
      where ruangan_id = v_ru
        and keterangan = v_k
        and extract(month from periode_masuk)::int = mo
        and extract(year from periode_masuk)::int = v_y
    ) r
    where e.id = r.id;
  end loop;

  raise notice 'seed_iccu_wireframe_rekap_demo: % baris untuk ruangan iccu tahun %', (
    select count(*)::int
    from public.iccu_register_entry
    where ruangan_id = v_ru
      and keterangan = v_k
  ), v_y;
end;
$$;
