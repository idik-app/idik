-- Error: invalid input syntax for type uuid: "6"
-- Terjadi saat INSERT ke pemakaian.tindakan_id bertipe uuid/bigint padahal UI/API
-- mengirim id kasus numerik (bigint) — cast ke uuid gagal.
-- Samakan dengan cathlab_pemakaian_order.tindakan_id: simpan sebagai TEXT (angka atau uuid string).

alter table public.pemakaian
  drop constraint if exists pemakaian_tindakan_id_fkey;

alter table public.pemakaian
  alter column tindakan_id drop default;

alter table public.pemakaian
  alter column tindakan_id type text using (
    case
      when tindakan_id is null then null
      else tindakan_id::text
    end
  );

comment on column public.pemakaian.tindakan_id is
  'Opsional: id kasus tindakan (teks numerik atau uuid), selaras dengan cathlab_pemakaian_order.tindakan_id.';

-- Fungsi FIFO: isi tindakan_id sebagai text (tanpa ::bigint / uuid).
-- CREATE OR REPLACE tidak boleh mengubah tipe kolom di RETURNS TABLE → drop dulu.
drop function if exists public.allocate_pemakaian_fifo(
  uuid,
  numeric,
  text,
  text,
  text,
  date,
  text
);
drop function if exists public.allocate_pemakaian_fifo(
  uuid,
  numeric,
  text,
  uuid,
  text,
  date,
  text
);
drop function if exists public.allocate_pemakaian_fifo(
  uuid,
  numeric,
  text,
  uuid,
  text,
  date
);
drop function if exists public.allocate_pemakaian_fifo(
  uuid,
  numeric,
  text,
  bigint,
  text,
  date,
  text
);

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

    insert into public.pemakaian (
      inventaris_id,
      jumlah,
      tanggal,
      keterangan,
      tindakan_id,
      cathlab_pemakaian_order_id,
      nama_barang
    )
    values (
      r.id,
      v_take,
      p_tanggal,
      p_keterangan,
      v_tid,
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
