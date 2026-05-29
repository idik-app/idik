-- ========================================================================
-- 🔔 20260529130000_distributor_outbox_notifications.sql
-- Outbox Pattern + Real-time Trigger System for Distributor Notifications
-- ========================================================================

-- 1. Create distributor_notification_outbox table
create table if not exists public.distributor_notification_outbox (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  distributor_id uuid not null references public.master_distributor (id) on delete cascade,
  event_type text not null, -- 'MUTASI_STOK', 'LOW_STOCK', 'PRODUCT_DELETED'
  payload jsonb not null default '{}'::jsonb,
  error_log text,
  attempts int not null default 0
);

create index if not exists idx_distributor_notification_outbox_unprocessed
  on public.distributor_notification_outbox (created_at)
  where processed_at is null;

comment on table public.distributor_notification_outbox is
  'Antrean outbox notifikasi terdistribusi (stok mutasi, low stock, dll.) yang diproses secara terpisah.';

-- 2. Trigger function on inventaris_stok_mutasi after insert
create or replace function public.trg_fn_distributor_stok_mutasi_notifier()
returns trigger
language plpgsql
security definer
as $$
declare
  v_master_barang_id uuid;
  v_distributor_id uuid;
  v_min_stok numeric;
  v_nama_barang text;
  v_is_low_stock boolean := false;
begin
  -- 1. Fetch info from inventaris
  select master_barang_id, distributor_id, min_stok
  into v_master_barang_id, v_distributor_id, v_min_stok
  from public.inventaris
  where id = NEW.inventaris_id;

  -- If no distributor linked, nothing to notify
  if v_distributor_id is null then
    return NEW;
  end if;

  -- 2. Get master_barang name
  select nama into v_nama_barang
  from public.master_barang
  where id = v_master_barang_id;

  -- 3. Check low stock condition
  if NEW.stok_setelah <= coalesce(v_min_stok, 0) and NEW.qty_delta < 0 then
    v_is_low_stock := true;
  end if;

  -- 4. Insert MUTASI_STOK event into outbox
  insert into public.distributor_notification_outbox (
    distributor_id,
    event_type,
    payload
  ) values (
    v_distributor_id,
    'MUTASI_STOK',
    jsonb_build_object(
      'mutasi_id', NEW.id,
      'tipe', NEW.tipe,
      'qty_delta', NEW.qty_delta,
      'stok_setelah', NEW.stok_setelah,
      'keterangan', NEW.keterangan,
      'nama_barang', coalesce(v_nama_barang, 'Barang Alkes'),
      'actor', NEW.actor
    )
  );

  -- 5. If low stock, also insert a separate LOW_STOCK event
  if v_is_low_stock then
    insert into public.distributor_notification_outbox (
      distributor_id,
      event_type,
      payload
    ) values (
      v_distributor_id,
      'LOW_STOCK',
      jsonb_build_object(
        'mutasi_id', NEW.id,
        'stok_setelah', NEW.stok_setelah,
        'min_stok', v_min_stok,
        'nama_barang', coalesce(v_nama_barang, 'Barang Alkes')
      )
    );
  end if;

  return NEW;
end;
$$;

-- 3. Create the trigger
create or replace trigger trg_distributor_stok_mutasi_notifier
after insert on public.inventaris_stok_mutasi
for each row
execute function public.trg_fn_distributor_stok_mutasi_notifier();

-- 4. Trigger on distributor_barang for deletions (Product Mapping Deleted)
create or replace function public.trg_fn_distributor_barang_deleted_notifier()
returns trigger
language plpgsql
security definer
as $$
declare
  v_nama_barang text;
begin
  select nama into v_nama_barang
  from public.master_barang
  where id = OLD.master_barang_id;

  insert into public.distributor_notification_outbox (
    distributor_id,
    event_type,
    payload
  ) values (
    OLD.distributor_id,
    'PRODUCT_DELETED',
    jsonb_build_object(
      'master_barang_id', OLD.master_barang_id,
      'nama_barang', coalesce(v_nama_barang, 'Barang Alkes'),
      'keterangan', 'Mapping katalog produk dicabut oleh RS atau distributor'
    )
  );

  return OLD;
end;
$$;

create or replace trigger trg_distributor_barang_deleted_notifier
after delete on public.distributor_barang
for each row
execute function public.trg_fn_distributor_barang_deleted_notifier();
