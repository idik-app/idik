-- Set is_fast_track = true for existing records that have Fast-Track data filled.
update public.tindakan
set is_fast_track = true
where (pasien_datang_igd is not null and pasien_datang_igd <> '')
   or (door_to_balloon is not null and door_to_balloon <> '');
