-- Error masih "invalid input syntax for type uuid: \"33\"" — angka = kemungkinan qty
-- tertukar dengan master id. Hapus fallback p_master_barang_id di JSON (mudah
-- terisi salah); wajib master_barang_uuid. Rename RPC unik agar tidak bentrok overload.

do $$
declare
  r record;
begin
  for r in
    select pg_catalog.pg_get_function_identity_arguments(p.oid) as args
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'allocate_pemakaian_fifo_json'
  loop
    execute format(
      'drop function if exists public.allocate_pemakaian_fifo_json(%s) cascade',
      r.args
    );
  end loop;
end $$;

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
  p_tid text;
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

  -- Hanya kunci ini (tanpa fallback p_master_barang_id) agar qty tidak masuk slot UUID.
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
  p_tid := nullif(trim(coalesce(j->>'p_tindakan_id_text', '')), '');
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
    p_tid,
    p_ket,
    p_date,
    p_ord
  );
end;
$$;

comment on function public.fifo_pemakaian_allocate_json(text) is
  'FIFO pemakaian; satu argumen text JSON; wajib master_barang_uuid + qty_dipakai; nama fungsi unik.';
