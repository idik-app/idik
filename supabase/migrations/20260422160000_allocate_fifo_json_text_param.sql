-- Masih error uuid "32" setelah wrapper jsonb: PostgREST kadang salah isi field di dalam jsonb.
-- Satu argumen TEXT berisi JSON string (diserialisasi di app) + kunci eksplisit
-- master_barang_uuid / qty_dipakai menghindari ambiguitas.

drop function if exists public.allocate_pemakaian_fifo_json(jsonb) cascade;

create or replace function public.allocate_pemakaian_fifo_json(p_payload text)
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
    raise exception 'allocate_pemakaian_fifo_json: p_payload kosong';
  end if;

  j := p_payload::jsonb;
  if jsonb_typeof(j) <> 'object' then
    raise exception 'allocate_pemakaian_fifo_json: p_payload harus JSON object';
  end if;

  master_raw := coalesce(
    nullif(trim(j->>'master_barang_uuid'), ''),
    nullif(trim(j->>'p_master_barang_id'), '')
  );
  if master_raw is null then
    raise exception 'allocate_pemakaian_fifo_json: wajib master_barang_uuid (atau p_master_barang_id)';
  end if;
  p_master := master_raw::uuid;

  qty_raw := coalesce(
    nullif(trim(j->>'qty_dipakai'), ''),
    nullif(trim(j->>'p_jumlah'), '')
  );
  if qty_raw is null then
    raise exception 'allocate_pemakaian_fifo_json: wajib qty_dipakai (atau p_jumlah)';
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

comment on function public.allocate_pemakaian_fifo_json(text) is
  'FIFO via PostgREST: satu argumen TEXT (JSON string), kunci master_barang_uuid + qty_dipakai.';
