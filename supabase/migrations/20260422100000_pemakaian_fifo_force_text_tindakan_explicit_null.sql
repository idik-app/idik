-- Error masih "invalid input syntax for type uuid: \"22\"" setelah out_*:
-- 1) Beberapa DB belum mengubah pemakaian.tindakan_id ke text (deploy/urutan migrasi).
-- 2) INSERT tanpa menyebut tindakan_id masih bisa berinteraksi aneh dengan trigger/default lama.
-- Paksa tipe text (idempoten) + sebut tindakan_id eksplisit NULL di FIFO.

do $$
declare
  col_type text;
begin
  select pg_catalog.format_type(a.atttypid, a.atttypmod)
  into col_type
  from pg_catalog.pg_attribute a
  join pg_catalog.pg_class c on c.oid = a.attrelid
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'pemakaian'
    and a.attname = 'tindakan_id'
    and a.attnum > 0
    and not a.attisdropped;

  if col_type is null then
    raise notice 'pemakaian.tindakan_id: kolom tidak ada, lewati.';
    return;
  end if;

  if col_type = 'text' then
    raise notice 'pemakaian.tindakan_id: sudah text, lewati.';
  else
    raise notice 'pemakaian.tindakan_id: mengubah % → text', col_type;

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
      'Opsional: id kasus tindakan (teks numerik atau uuid).';
  end if;
end $$;

alter table public.pemakaian
  alter column tindakan_id drop default;

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

    insert into public.pemakaian (
      inventaris_id,
      jumlah,
      tanggal,
      keterangan,
      cathlab_pemakaian_order_id,
      nama_barang,
      tindakan_id
    )
    values (
      r.id,
      v_take,
      p_tanggal,
      p_keterangan,
      p_order_id,
      v_nama_barang,
      null
    )
    returning id into v_pemakaian_id;

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
  'FIFO; pemakaian.tindakan_id = NULL; ID kasus di cathlab_pemakaian_order; keluaran out_*; kolom tindakan_id teks.';
