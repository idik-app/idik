-- Tarif untuk nama tindakan yang sudah ada di master_tindakan tetapi belum punya baris di master_tarif_tindakan
-- (mis. CHEMOPORT). Nilai perkiraan — sesuaikan di DB bila perlu.

insert into public.master_tarif_tindakan (nama, nama_cari, tarif_rupiah, aktif) values
  ('CHEMOPORT', 'CHEMOPORT', 5000000, true),
  ('DOUBLE LUMEN', 'DOUBLE LUMEN', 5000000, true),
  ('PERICARDIOSINTESIS', 'PERICARDIOSINTESIS', 5000000, true),
  ('PPCI', 'PPCI', 8625000, true),
  ('PTE', 'PTE', 5000000, true),
  ('ROTA', 'ROTA', 5000000, true),
  ('VENOGRAPHY', 'VENOGRAPHY', 5000000, true),
  ('ABLASI', 'ABLASI', 5000000, true)
on conflict (nama_cari) do update set
  nama = excluded.nama,
  tarif_rupiah = excluded.tarif_rupiah,
  aktif = excluded.aktif,
  updated_at = now();

-- Isi ulang tarif_kosong untuk baris yang sudah ada di DB
update public.tindakan t
set tarif_tindakan = m.tarif_rupiah
from public.master_tarif_tindakan m
where m.aktif
  and (t.tarif_tindakan is null)
  and public.normalize_nama_tindakan_tarif(t.tindakan) = m.nama_cari;
