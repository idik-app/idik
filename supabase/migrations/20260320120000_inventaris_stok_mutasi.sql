-- Buku besar mutasi stok inventaris (ledger) + integrasi FIFO pemakaian.
-- Stok = nilai pada public.inventaris.stok; setiap perubahan dicatat di inventaris_stok_mutasi.

create table if not exists public.inventaris_stok_mutasi (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  inventaris_id uuid not null references public.inventaris (id) on delete restrict,
  tipe text not null,
  qty_delta numeric not null,
  stok_setelah numeric,
  ref_type text,
  ref_id uuid,
  keterangan text,
  actor text,
  constraint inventaris_stok_mutasi_tipe_check check (
    tipe in ('MASUK', 'KELUAR_RETUR', 'KELUAR_RUSAK', 'KELUAR_PEMAKAIAN', 'KOREKSI')
  ),
  constraint inventaris_stok_mutasi_sign_check check (
    (tipe = 'MASUK' and qty_delta > 0)
    or (tipe in ('KELUAR_RETUR', 'KELUAR_RUSAK', 'KELUAR_PEMAKAIAN') and qty_delta < 0)
    or (tipe = 'KOREKSI' and qty_delta <> 0)
  )
);

create index if not exists idx_inventaris_stok_mutasi_inv_created
  on public.inventaris_stok_mutasi (inventaris_id, created_at desc);

comment on table public.inventaris_stok_mutasi is
  'Ledger mutasi stok Cathlab: masuk, retur, rusak, pemakaian, koreksi.';

create or replace function public.apply_inventaris_stok_mutasi(
  p_inventaris_id uuid,
  p_tipe text,
  p_qty_delta numeric,
  p_ref_type text default null,
  p_ref_id uuid default null,
  p_keterangan text default null,
  p_actor text default null
) returns uuid
language plpgsql
as $$
declare
  v_stok numeric;
  v_new numeric;
  v_mutasi_id uuid;
begin
      if p_tipe not in ('MASUK', 'KELUAR_RETUR', 'KELUAR_RUSAK', 'KELUAR_PEMAKAIAN', 'KOREKSI') then
        raise exception 'tipe mutasi tidak valid';
      end if;

      select stok into v_stok from public.inventaris where id = p_inventaris_id for update;
      if v_stok is null then
        raise exception 'inventaris tidak ditemukan';
      end if;

      v_new := coalesce(v_stok, 0) + p_qty_delta;
      if v_new < 0 then
        raise exception 'stok tidak boleh negatif (hasil: %)', v_new;
      end if;

      insert into public.inventaris_stok_mutasi (
        inventaris_id, tipe, qty_delta, stok_setelah, ref_type, ref_id, keterangan, actor
      ) values (
        p_inventaris_id,
        p_tipe,
        p_qty_delta,
        v_new,
        p_ref_type,
        p_ref_id,
        p_keterangan,
        p_actor
      )
      returning id into v_mutasi_id;

      update public.inventaris
      set stok = v_new, updated_at = now()
      where id = p_inventaris_id;

      return v_mutasi_id;
end;
$$;

-- FIFO pemakaian: juga tulis ke ledger (KELUAR_PEMAKAIAN).
create or replace function public.allocate_pemakaian_fifo(
  p_master_barang_id uuid,
  p_jumlah numeric,
  p_lokasi text default 'Cathlab',
  p_tindakan_id uuid default null,
  p_keterangan text default null,
  p_tanggal date default current_date
) returns table (
  pemakaian_id uuid,
  inventaris_id uuid,
  jumlah numeric,
  tanggal date,
  keterangan text,
  tindakan_id uuid
)
language plpgsql
as $$
declare
  v_remaining numeric := p_jumlah;
  r record;
  v_take numeric;
  v_pemakaian_id uuid;
  v_new_stok numeric;
begin
  if p_jumlah is null or p_jumlah <= 0 then
    raise exception 'jumlah harus > 0';
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

    v_new_stok := coalesce(r.stok, 0) - v_take;

    insert into public.pemakaian (inventaris_id, jumlah, tanggal, keterangan, tindakan_id)
    values (r.id, v_take, p_tanggal, p_keterangan, p_tindakan_id)
    returning id into v_pemakaian_id;

    insert into public.inventaris_stok_mutasi (
      inventaris_id, tipe, qty_delta, stok_setelah, ref_type, ref_id, keterangan, actor
    ) values (
      r.id,
      'KELUAR_PEMAKAIAN',
      -v_take,
      v_new_stok,
      'pemakaian',
      v_pemakaian_id,
      p_keterangan,
      null
    );

    update public.inventaris
    set stok = v_new_stok,
        updated_at = now()
    where id = r.id;

    v_remaining := v_remaining - v_take;

    pemakaian_id := v_pemakaian_id;
    inventaris_id := r.id;
    jumlah := v_take;
    tanggal := p_tanggal;
    keterangan := p_keterangan;
    tindakan_id := p_tindakan_id;
    return next;
  end loop;

  if v_remaining > 0 then
    raise exception 'Stok tidak cukup untuk master_barang_id=%. Remaining=%', p_master_barang_id, v_remaining;
  end if;

  return;
end;
$$;
