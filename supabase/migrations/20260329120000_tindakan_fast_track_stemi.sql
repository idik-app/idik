-- Fast-Track STEMI / IGD — waktu jalur gawat ke PCI (teks bebas: jam, menit, atau catatan).
alter table public.tindakan add column if not exists pasien_datang_igd text;
alter table public.tindakan add column if not exists door_to_balloon text;
alter table public.tindakan add column if not exists total_waktu_fast_track text;

comment on column public.tindakan.pasien_datang_igd is 'Waktu/catatan pasien tiba di IGD (Fast-Track STEMI).';
comment on column public.tindakan.door_to_balloon is 'Door-to-balloon time atau catatan terkait.';
comment on column public.tindakan.total_waktu_fast_track is 'Total waktu jalur fast-track (teks).';
