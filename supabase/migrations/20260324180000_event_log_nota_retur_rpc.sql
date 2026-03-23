-- Nota retur + petugas penerima; RPC daftar dengan filter & pagination.

alter table public.distributor_event_log
  add column if not exists nota_nomor text,
  add column if not exists penerima_petugas text;

create index if not exists idx_distributor_event_log_nota
  on public.distributor_event_log (distributor_id, nota_nomor)
  where nota_nomor is not null;

comment on column public.distributor_event_log.nota_nomor is
  'Nomor dokumen retur katalog, mis. RT-YYYYMMDD-001.';
comment on column public.distributor_event_log.penerima_petugas is
  'Petugas RS penerima/verifikasi (opsional).';

-- Daftar event dengan pencarian teks + pagination (total_count di setiap baris).
create or replace function public.distributor_events_list (
  p_distributor_id uuid,
  p_q text,
  p_event_type text,
  p_from timestamptz,
  p_to timestamptz,
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
      l.penerima_petugas
    from public.distributor_event_log l
    where l.distributor_id = p_distributor_id
      and (p_event_type is null or btrim(p_event_type) = '' or l.event_type = btrim(p_event_type))
      and (p_from is null or l.created_at >= p_from)
      and (p_to is null or l.created_at <= p_to)
      and (
        p_q is null
        or btrim(p_q) = ''
        or l.nota_nomor ilike '%' || btrim(p_q) || '%'
        or coalesce(l.actor, '') ilike '%' || btrim(p_q) || '%'
        or coalesce(l.penerima_petugas, '') ilike '%' || btrim(p_q) || '%'
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
    (select c from cnt) as total_count
  from base b
  order by b.created_at desc
  limit greatest(1, least(coalesce(p_limit, 20), 200))
  offset greatest(0, coalesce(p_offset, 0));
$$;
