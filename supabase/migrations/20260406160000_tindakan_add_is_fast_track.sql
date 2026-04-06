-- Add is_fast_track column to tindakan table for KPI indicator.
alter table public.tindakan add column if not exists is_fast_track boolean default false;

comment on column public.tindakan.is_fast_track is 'Status aktif pasien Fast-Track (STEMI/PPCI).';
