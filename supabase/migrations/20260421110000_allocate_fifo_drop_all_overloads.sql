-- Masih error uuid "17" walau migrasi tercatat: sering karena >1 overload
-- `allocate_pemakaian_fifo` atau INSERT eksplisit ke kolom tindakan_id.
-- Hapus SEMUA signature, lalu satu fungsi saja; INSERT tanpa kolom tindakan_id.

do $$
declare
  r record;
begin
  for r in
    select pg_catalog.pg_get_function_identity_arguments(p.oid) as args
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'allocate_pemakaian_fifo'
  loop
    execute format(
      'drop function if exists public.allocate_pemakaian_fifo(%s) cascade',
      r.args
    );
  end loop;
end $$;

create or replace function public.allocate_pemakaian_fifo(
  p_master_barang_id uuid,
  p_jumlah numeric,
  p_lokasi text default 'Cathlab',
  p_tindakan_id_text text default null,
  p_keterangan text default null,
  p_tanggal date default current_date,
  p_order_id text default null
) returns table (
  pemakaian_id uuid,
  inventaris_id uuid,
  jumlah numeric,
  tanggal date,
  keterangan text,
  tindakan_id text
)
language plpgsql
as $$
declare
  v_remaining numeric := p_jumlah;
  r record;
  v_take numeric;
  v_pemakaian_id uuid;
  v_nama_barang text;
  v_tid text;
begin
  if p_jumlah is null or p_jumlah <= 0 then
    raise exception 'jumlah harus > 0';
  end if;

  v_tid := nullif(trim(coalesce(p_tindakan_id_text, '')), '');

  select coalesce(nullif(trim(mb.nama), ''), 'Barang')
  into v_nama_barang
  from public.master_barang mb
  where mb.id = p_master_barang_id;

  if v_nama_barang is null then
    v_nama_barang := 'Barang';
  end if;

  for r in
    select id, stok
    from public.inventaris
    where lokasi = p_lokasi
      and master_barang_id = p_master_barang_id
      and stok > 0
    order by created_at asc
    for update
  loop
    exit when v_remaining <= 0;

    v_take := least(v_remaining, coalesce(r.stok, 0));
    if v_take <= 0 then
      continue;
    end if;

    -- Tanpa kolom tindakan_id: hindari trigger/default yang mengisi dari konteks lain.
    insert into public.pemakaian (
      inventaris_id,
      jumlah,
      tanggal,
      keterangan,
      cathlab_pemakaian_order_id,
      nama_barang
    )
    values (
      r.id,
      v_take,
      p_tanggal,
      p_keterangan,
      p_order_id,
      v_nama_barang
    )
    returning id into v_pemakaian_id;

    update public.inventaris
    set stok = stok - v_take,
        updated_at = now()
    where id = r.id;

    v_remaining := v_remaining - v_take;

    pemakaian_id := v_pemakaian_id;
    inventaris_id := r.id;
    jumlah := v_take;
    tanggal := p_tanggal;
    keterangan := p_keterangan;
    tindakan_id := v_tid;
    return next;
  end loop;

  if v_remaining > 0 then
    raise exception 'Stok tidak cukup untuk master_barang_id=%. Remaining=%', p_master_barang_id, v_remaining;
  end if;

  return;
end;
$$;

comment on function public.allocate_pemakaian_fifo(uuid, numeric, text, text, text, date, text) is
  'FIFO tunggal (tanpa overload); INSERT pemakaian tanpa kolom tindakan_id.';
