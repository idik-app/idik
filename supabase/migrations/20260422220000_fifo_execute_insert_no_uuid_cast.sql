-- Error 22P02 uuid "55"/"54" setelah 22210000: $1::uuid di EXECUTE memaksa cast nilai
-- ke uuid. Jika inventaris.id bertipe uuid, parameter PL/pgSQL ke EXECUTE bisa
-- diinterpretasi sehingga cast eksplisit ::uuid memicu teks angka → uuid.
-- Biarkan assignment ke kolom inventaris_id tanpa cast eksplisit pada placeholder.

do $$
declare
  r record;
begin
  for r in
    select pg_catalog.pg_get_function_identity_arguments(p.oid) as args
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'fifo_pemakaian_allocate_json'
  loop
    execute format(
      'drop function if exists public.fifo_pemakaian_allocate_json(%s) cascade',
      r.args
    );
  end loop;
end $$;

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
  out_pemakaian_id uuid,
  out_inventaris_id uuid,
  out_jumlah numeric,
  out_tanggal date,
  out_keterangan text,
  out_tindakan_kasus text
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

    execute
      $ins$
      insert into public.pemakaian (
        inventaris_id,
        jumlah,
        tanggal,
        keterangan,
        cathlab_pemakaian_order_id,
        nama_barang
      )
      values ($1, $2, $3, $4, $5, $6)
      returning id
      $ins$
    using r.id, v_take, p_tanggal, p_keterangan, p_order_id, v_nama_barang
    into v_pemakaian_id;

    update public.inventaris
    set stok = stok - v_take,
        updated_at = now()
    where id = r.id;

    v_remaining := v_remaining - v_take;

    out_pemakaian_id := v_pemakaian_id;
    out_inventaris_id := r.id;
    out_jumlah := v_take;
    out_tanggal := p_tanggal;
    out_keterangan := p_keterangan;
    out_tindakan_kasus := v_tid;
    return next;
  end loop;

  if v_remaining > 0 then
    raise exception 'Stok tidak cukup untuk master_barang_id=%. Remaining=%', p_master_barang_id, v_remaining;
  end if;

  return;
end;
$$;

comment on function public.allocate_pemakaian_fifo(uuid, numeric, text, text, text, date, text) is
  'FIFO; INSERT via EXECUTE tanpa ::uuid pada inventaris_id (hindari 22P02 angka→uuid).';

create or replace function public.fifo_pemakaian_allocate_json(p_payload text)
returns table (
  out_pemakaian_id uuid,
  out_inventaris_id uuid,
  out_jumlah numeric,
  out_tanggal date,
  out_keterangan text,
  out_tindakan_kasus text
)
language plpgsql
as $$
declare
  j jsonb;
  p_master uuid;
  p_qty numeric;
  p_loc text;
  p_ket text;
  p_date date;
  p_ord text;
  master_raw text;
  qty_raw text;
begin
  if p_payload is null or btrim(p_payload) = '' then
    raise exception 'fifo_pemakaian_allocate_json: p_payload kosong';
  end if;

  j := p_payload::jsonb;
  if jsonb_typeof(j) <> 'object' then
    raise exception 'fifo_pemakaian_allocate_json: p_payload harus JSON object';
  end if;

  master_raw := nullif(trim(j->>'master_barang_uuid'), '');
  if master_raw is null then
    raise exception 'fifo_pemakaian_allocate_json: wajib master_barang_uuid (UUID)';
  end if;
  if master_raw ~ '^[0-9]+$' then
    raise exception
      using message = format(
        'fifo_pemakaian_allocate_json: master_barang_uuid tidak boleh angka semata (%s). Kemungkinan qty tertukar dengan UUID (binding PostgREST).',
        master_raw
      );
  end if;
  p_master := master_raw::uuid;

  qty_raw := nullif(trim(j->>'qty_dipakai'), '');
  if qty_raw is null then
    raise exception 'fifo_pemakaian_allocate_json: wajib qty_dipakai';
  end if;
  p_qty := qty_raw::numeric;

  p_loc := coalesce(nullif(trim(j->>'p_lokasi'), ''), 'Cathlab');
  p_ket := j->>'p_keterangan';
  if j ? 'p_tanggal' and nullif(trim(coalesce(j->>'p_tanggal', '')), '') is not null then
    p_date := (nullif(trim(j->>'p_tanggal'), ''))::date;
  else
    p_date := current_date;
  end if;
  p_ord := nullif(trim(j->>'p_order_id'), '');

  return query
  select *
  from public.allocate_pemakaian_fifo(
    p_master,
    p_qty,
    p_loc,
    null::text,
    p_ket,
    p_date,
    p_ord
  );
end;
$$;

comment on function public.fifo_pemakaian_allocate_json(text) is
  'FIFO pemakaian; JSON wajib master_barang_uuid + qty_dipakai; allocate tanpa p_tindakan_id.';
