-- View view_pasien_full — dipakai PasienProvider (dashboard/pasien)
-- Untuk perluasan nanti bisa digabung dengan dokter/tindakan; saat ini sama dengan pasien.

create or replace view public.view_pasien_full as
select * from public.pasien;

comment on view public.view_pasien_full is 'View pasien lengkap. Modul: Pasien.';
