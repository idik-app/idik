-- Waktu tambahan Fast-Track (format ISO/teks datetime seperti kolom IGD / D2B).
alter table public.tindakan add column if not exists fast_track_sign_in text;
alter table public.tindakan add column if not exists fast_track_time_out text;
alter table public.tindakan add column if not exists fast_track_sign_out text;

comment on column public.tindakan.fast_track_sign_in is 'Fast-Track: waktu Sign in (teks/datetime).';
comment on column public.tindakan.fast_track_time_out is 'Fast-Track: waktu Time out (teks/datetime).';
comment on column public.tindakan.fast_track_sign_out is 'Fast-Track: waktu Sign out (teks/datetime).';
