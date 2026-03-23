-- Status alur retur fisik + nomor surat jalan / nota pengiriman (opsional).

alter table public.distributor_event_log
  add column if not exists retur_fisik_status text,
  add column if not exists nota_pengiriman text;

comment on column public.distributor_event_log.retur_fisik_status is
  'Untuk KATALOG_RETUR: MENUNGGU_AMBIL | DIAMBIL_PETUGAS | DITERIMA_DISTRIBUTOR.';
comment on column public.distributor_event_log.nota_pengiriman is
  'Nomor surat jalan / referensi pengiriman barang retur (opsional).';

create index if not exists idx_distributor_event_log_retur_status
  on public.distributor_event_log (distributor_id, retur_fisik_status)
  where event_type = 'KATALOG_RETUR';

-- Ganti signature RPC (tambah filter status retur).
drop function if exists public.distributor_events_list(uuid, text, text, timestamptz, timestamptz, int, int);

-- Daftar event: kolom baru + filter status retur fisik (opsional).
create or replace function public.distributor_events_list (
  p_distributor_id uuid,
  p_q text,
  p_event_type text,
  p_from timestamptz,
  p_to timestamptz,
  p_retur_fisik_status text,
  p_limit int,
  p_offset int
)
returns table (
  id uuid,
  created_at timestamptz,
  distributor_id uuid,
  event_type text,
  payload jsonb,
  actor text,
  nota_nomor text,
  penerima_petugas text,
  nota_pengiriman text,
  retur_fisik_status text,
  total_count bigint
)
language sql
stable
as $$
  with base as (
    select
      l.id,
      l.created_at,
      l.distributor_id,
      l.event_type,
      l.payload,
      l.actor,
      l.nota_nomor,
      l.penerima_petugas,
      l.nota_pengiriman,
      l.retur_fisik_status
    from public.distributor_event_log l
    where l.distributor_id = p_distributor_id
      and (p_event_type is null or btrim(p_event_type) = '' or l.event_type = btrim(p_event_type))
      and (p_from is null or l.created_at >= p_from)
      and (p_to is null or l.created_at <= p_to)
      and (
        p_retur_fisik_status is null
        or btrim(p_retur_fisik_status) = ''
        or (
          l.event_type = 'KATALOG_RETUR'
          and (
            l.retur_fisik_status = btrim(p_retur_fisik_status)
            or (
              btrim(p_retur_fisik_status) = 'MENUNGGU_AMBIL'
              and l.retur_fisik_status is null
            )
          )
        )
      )
      and (
        p_q is null
        or btrim(p_q) = ''
        or l.nota_nomor ilike '%' || btrim(p_q) || '%'
        or coalesce(l.actor, '') ilike '%' || btrim(p_q) || '%'
        or coalesce(l.penerima_petugas, '') ilike '%' || btrim(p_q) || '%'
        or coalesce(l.nota_pengiriman, '') ilike '%' || btrim(p_q) || '%'
        or coalesce(l.retur_fisik_status, '') ilike '%' || btrim(p_q) || '%'
        or l.payload::text ilike '%' || btrim(p_q) || '%'
      )
  ),
  cnt as (
    select count(*)::bigint as c from base
  )
  select
    b.id,
    b.created_at,
    b.distributor_id,
    b.event_type,
    b.payload,
    b.actor,
    b.nota_nomor,
    b.penerima_petugas,
    b.nota_pengiriman,
    b.retur_fisik_status,
    (select c from cnt) as total_count
  from base b
  order by b.created_at desc
  limit greatest(1, least(coalesce(p_limit, 20), 200))
  offset greatest(0, coalesce(p_offset, 0));
$$;
