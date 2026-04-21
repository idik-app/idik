-- PostgREST dapat salah mengikat argumen numerik (mis. p_jumlah=30) ke param uuid
-- bila ada sisa overload / resolusi ambigu — error: invalid input syntax for type uuid: "30".
-- Wrapper satu argumen jsonb menghindari ambiguitas nama/tipe di lapisan HTTP.

create or replace function public.allocate_pemakaian_fifo_json(p_payload jsonb)
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
  p_master uuid;
  p_qty numeric;
  p_loc text;
  p_tid text;
  p_ket text;
  p_date date;
  p_ord text;
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'allocate_pemakaian_fifo_json: p_payload harus object jsonb';
  end if;

  p_master := (p_payload->>'p_master_barang_id')::uuid;
  p_qty := (p_payload->>'p_jumlah')::numeric;
  p_loc := coalesce(nullif(trim(p_payload->>'p_lokasi'), ''), 'Cathlab');
  p_tid := nullif(trim(coalesce(p_payload->>'p_tindakan_id_text', '')), '');
  p_ket := p_payload->>'p_keterangan';
  if p_payload ? 'p_tanggal' and nullif(trim(coalesce(p_payload->>'p_tanggal', '')), '') is not null then
    p_date := (nullif(trim(p_payload->>'p_tanggal'), ''))::date;
  else
    p_date := current_date;
  end if;
  p_ord := nullif(trim(p_payload->>'p_order_id'), '');

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

comment on function public.allocate_pemakaian_fifo_json(jsonb) is
  'Pembungkus FIFO untuk PostgREST: satu argumen jsonb agar tidak tertukar uuid vs jumlah.';
