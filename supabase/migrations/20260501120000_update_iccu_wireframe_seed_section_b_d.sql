-- Melengkapi baris seed `__wireframe_seed_rekap_demo__` dengan field yang dibaca RPC untuk
-- Section B (survey mutu / prosedur invasif) dan Section D (bucket diagnosis).
--
-- Prasyarat: migrasi `20260501100000_seed_iccu_wireframe_rekap_demo.sql` sudah pernah dijalankan.
-- Idempotent aman: reset lalu set ulang kolom terkait untuk baris seed tahun 2026 saja.
--
-- Catatan Section C (BOR/TOI/BTO/NDR/GDR): tidak disimpan per baris di `iccu_register_entry`;
-- RPC `iccu_rekap_year_payload` hanya mengisi `avg_los_hari` dari LOS — indikator lain tetap placeholder RS.

do $$
declare
  v_ru uuid;
  v_k text := '__wireframe_seed_rekap_demo__';
  v_y int := 2026;
  mo int;

  mg int[] := array[2, 3, 2, 4];
  lt48 int[] := array[1, 2, 1, 2];
  dr int[] := array[5, 6, 5, 7];
  pp int[] := array[1, 0, 1, 1];
  pi int[] := array[3, 2, 4, 3];
  kr int[] := array[9, 10, 8, 11];

  vent int[] := array[12, 14, 11, 13];
  cvc int[] := array[18, 19, 17, 20];
  pdt int[] := array[4, 5, 4, 5];
  dca int[] := array[6, 7, 6, 8];
  trom int[] := array[4, 3, 5, 4];
  tpm int[] := array[2, 2, 3, 2];
  ppm int[] := array[1, 1, 2, 1];
  perik int[] := array[0, 1, 0, 1];
  abl int[] := array[5, 6, 5, 7];

  d_stemi int[] := array[14, 16, 13, 15];
  d_nstem int[] := array[9, 11, 10, 12];
  d_uap int[] := array[7, 8, 6, 9];
  d_svt int[] := array[4, 5, 4, 6];
  d_dc int[] := array[6, 7, 6, 8];
  d_ht int[] := array[18, 19, 17, 20];
  d_avb int[] := array[3, 4, 3, 5];
  d_af int[] := array[11, 12, 10, 13];

  lo int;
  hi int;
  n_mo int;
  c int;
  t1 int;
  t2 int;
  t3 int;
  t4 int;
  t5 int;
  t6 int;
  t7 int;
  t8 int;
begin
  select id
    into v_ru
  from public.ruangan
  where lower(trim(slug)) = 'iccu'
  limit 1;

  if v_ru is null then
    raise notice 'update_wireframe_b_d: lewati — tidak ada ruangan slug iccu';
    return;
  end if;

  if not exists (
    select 1
    from public.iccu_register_entry
    where ruangan_id = v_ru
      and keterangan = v_k
    limit 1
  ) then
    raise notice 'update_wireframe_b_d: lewati — tidak ada baris seed (jalankan migrasi seed terlebih dahulu)';
    return;
  end if;

  update public.iccu_register_entry e
  set
    cara_keluar = null,
    meninggal_within_48h = null,
    invasive_procedures = '[]'::jsonb,
    diagnosa = null
  where e.ruangan_id = v_ru
    and e.keterangan = v_k
    and extract(year from e.periode_masuk)::int = v_y;

  for mo in 1..4 loop
    select count(*)::int
      into n_mo
    from public.iccu_register_entry e
    where e.ruangan_id = v_ru
      and e.keterangan = v_k
      and extract(month from e.periode_masuk)::int = mo
      and extract(year from e.periode_masuk)::int = v_y;

    if n_mo = 0 then
      continue;
    end if;

    -- --- Section B: cara keluar (slice rn berurutan) ---
    lo := 1;
    hi := lo + mg[mo] - 1;
    with
      ranked as (
        select
          id,
          row_number() over (order by id) as rn
        from public.iccu_register_entry
        where ruangan_id = v_ru
          and keterangan = v_k
          and extract(month from periode_masuk)::int = mo
          and extract(year from periode_masuk)::int = v_y
      ),
      hits as (
        select
          r.id,
          row_number() over (order by r.rn) as mk
        from ranked r
        where r.rn between lo and hi
      )
    update public.iccu_register_entry e
    set
      cara_keluar = 'meninggal',
      meninggal_within_48h = (hits.mk <= lt48[mo])
    from hits
    where e.id = hits.id;

    lo := hi + 1;
    hi := lo + dr[mo] - 1;
    with
      ranked as (
        select
          id,
          row_number() over (order by id) as rn
        from public.iccu_register_entry
        where ruangan_id = v_ru
          and keterangan = v_k
          and extract(month from periode_masuk)::int = mo
          and extract(year from periode_masuk)::int = v_y
      )
    update public.iccu_register_entry e
    set cara_keluar = 'rujuk'
    from ranked r
    where e.id = r.id
      and r.rn between lo and hi;

    if pp[mo] > 0 then
      lo := hi + 1;
      hi := lo + pp[mo] - 1;
      with
        ranked as (
          select
            id,
            row_number() over (order by id) as rn
          from public.iccu_register_entry
          where ruangan_id = v_ru
            and keterangan = v_k
            and extract(month from periode_masuk)::int = mo
            and extract(year from periode_masuk)::int = v_y
        )
      update public.iccu_register_entry e
      set cara_keluar = 'pulang_paksa'
      from ranked r
      where e.id = r.id
        and r.rn between lo and hi;
      lo := hi + 1;
    else
      lo := hi + 1;
    end if;

    hi := lo + pi[mo] - 1;
    with
      ranked as (
        select
          id,
          row_number() over (order by id) as rn
        from public.iccu_register_entry
        where ruangan_id = v_ru
          and keterangan = v_k
          and extract(month from periode_masuk)::int = mo
          and extract(year from periode_masuk)::int = v_y
      )
    update public.iccu_register_entry e
    set cara_keluar = 'pindah_ruangan'
    from ranked r
    where e.id = r.id
      and r.rn between lo and hi;

    lo := hi + 1;
    hi := lo + kr[mo] - 1;
    with
      ranked as (
        select
          id,
          row_number() over (order by id) as rn
        from public.iccu_register_entry
        where ruangan_id = v_ru
          and keterangan = v_k
          and extract(month from periode_masuk)::int = mo
          and extract(year from periode_masuk)::int = v_y
      )
    update public.iccu_register_entry e
    set cara_keluar = 'krs'
    from ranked r
    where e.id = r.id
      and r.rn between lo and hi;

    c := hi;

    -- --- Prosedur invasif (slice terpisah per jenis; tidak menimpa slice lain) ---
    lo := c + 1;
    hi := lo + vent[mo] - 1;
    with
      ranked as (
        select
          id,
          row_number() over (order by id) as rn
        from public.iccu_register_entry
        where ruangan_id = v_ru
          and keterangan = v_k
          and extract(month from periode_masuk)::int = mo
          and extract(year from periode_masuk)::int = v_y
      )
    update public.iccu_register_entry e
    set invasive_procedures = '["ventilator"]'::jsonb
    from ranked r
    where e.id = r.id
      and r.rn between lo and hi;

    lo := hi + 1;
    hi := lo + cvc[mo] - 1;
    with
      ranked as (
        select
          id,
          row_number() over (order by id) as rn
        from public.iccu_register_entry
        where ruangan_id = v_ru
          and keterangan = v_k
          and extract(month from periode_masuk)::int = mo
          and extract(year from periode_masuk)::int = v_y
      )
    update public.iccu_register_entry e
    set invasive_procedures = '["cvc"]'::jsonb
    from ranked r
    where e.id = r.id
      and r.rn between lo and hi;

    lo := hi + 1;
    hi := lo + pdt[mo] - 1;
    with
      ranked as (
        select
          id,
          row_number() over (order by id) as rn
        from public.iccu_register_entry
        where ruangan_id = v_ru
          and keterangan = v_k
          and extract(month from periode_masuk)::int = mo
          and extract(year from periode_masuk)::int = v_y
      )
    update public.iccu_register_entry e
    set invasive_procedures = '["pdt"]'::jsonb
    from ranked r
    where e.id = r.id
      and r.rn between lo and hi;

    lo := hi + 1;
    hi := lo + dca[mo] - 1;
    with
      ranked as (
        select
          id,
          row_number() over (order by id) as rn
        from public.iccu_register_entry
        where ruangan_id = v_ru
          and keterangan = v_k
          and extract(month from periode_masuk)::int = mo
          and extract(year from periode_masuk)::int = v_y
      )
    update public.iccu_register_entry e
    set invasive_procedures = '["dca"]'::jsonb
    from ranked r
    where e.id = r.id
      and r.rn between lo and hi;

    lo := hi + 1;
    hi := lo + trom[mo] - 1;
    with
      ranked as (
        select
          id,
          row_number() over (order by id) as rn
        from public.iccu_register_entry
        where ruangan_id = v_ru
          and keterangan = v_k
          and extract(month from periode_masuk)::int = mo
          and extract(year from periode_masuk)::int = v_y
      )
    update public.iccu_register_entry e
    set invasive_procedures = '["streptase"]'::jsonb
    from ranked r
    where e.id = r.id
      and r.rn between lo and hi;

    lo := hi + 1;
    hi := lo + tpm[mo] - 1;
    with
      ranked as (
        select
          id,
          row_number() over (order by id) as rn
        from public.iccu_register_entry
        where ruangan_id = v_ru
          and keterangan = v_k
          and extract(month from periode_masuk)::int = mo
          and extract(year from periode_masuk)::int = v_y
      )
    update public.iccu_register_entry e
    set invasive_procedures = '["tpm"]'::jsonb
    from ranked r
    where e.id = r.id
      and r.rn between lo and hi;

    lo := hi + 1;
    hi := lo + ppm[mo] - 1;
    with
      ranked as (
        select
          id,
          row_number() over (order by id) as rn
        from public.iccu_register_entry
        where ruangan_id = v_ru
          and keterangan = v_k
          and extract(month from periode_masuk)::int = mo
          and extract(year from periode_masuk)::int = v_y
      )
    update public.iccu_register_entry e
    set invasive_procedures = '["ppm"]'::jsonb
    from ranked r
    where e.id = r.id
      and r.rn between lo and hi;

    if perik[mo] > 0 then
      lo := hi + 1;
      hi := lo + perik[mo] - 1;
      with
        ranked as (
          select
            id,
            row_number() over (order by id) as rn
          from public.iccu_register_entry
          where ruangan_id = v_ru
            and keterangan = v_k
            and extract(month from periode_masuk)::int = mo
            and extract(year from periode_masuk)::int = v_y
        )
      update public.iccu_register_entry e
      set invasive_procedures = '["pericardiosintesis"]'::jsonb
      from ranked r
      where e.id = r.id
        and r.rn between lo and hi;
    end if;

    lo := hi + 1;
    hi := lo + abl[mo] - 1;
    with
      ranked as (
        select
          id,
          row_number() over (order by id) as rn
        from public.iccu_register_entry
        where ruangan_id = v_ru
          and keterangan = v_k
          and extract(month from periode_masuk)::int = mo
          and extract(year from periode_masuk)::int = v_y
      )
    update public.iccu_register_entry e
    set invasive_procedures = '["ablasi"]'::jsonb
    from ranked r
    where e.id = r.id
      and r.rn between lo and hi;

    -- --- Section D: diagnosis (delapan bucket pertama = wireframe; sisanya NULL → NON CARDIO di RPC) ---
    t1 := d_stemi[mo];
    t2 := t1 + d_nstem[mo];
    t3 := t2 + d_uap[mo];
    t4 := t3 + d_svt[mo];
    t5 := t4 + d_dc[mo];
    t6 := t5 + d_ht[mo];
    t7 := t6 + d_avb[mo];
    t8 := t7 + d_af[mo];

    with
      ranked as (
        select
          id,
          row_number() over (order by id) as rn
        from public.iccu_register_entry
        where ruangan_id = v_ru
          and keterangan = v_k
          and extract(month from periode_masuk)::int = mo
          and extract(year from periode_masuk)::int = v_y
      )
    update public.iccu_register_entry e
    set diagnosa = case
      when r.rn <= t1 then 'STEMI'
      when r.rn <= t2 then 'NSTEMI'
      when r.rn <= t3 then 'UAP'
      when r.rn <= t4 then 'SVT'
      when r.rn <= t5 then 'COR DC PT'
      when r.rn <= t6 then 'HT II'
      when r.rn <= t7 then 'AV BLOCK'
      when r.rn <= t8 then 'AF PAROX'
      else null
    end
    from ranked r
    where e.id = r.id;
  end loop;

  raise notice 'update_wireframe_b_d: selesai — Section B/D pada baris seed tahun %', v_y;
end;
$$;
