-- Opsional: draft Menunggu yang masih kategori Cathlab generik (dibuat toolbar lama).
-- Jalankan manual di Supabase SQL Editor jika ingin menyembunyikan dari Jadwal Cath Lab.
-- Tinjau hasil SELECT dulu sebelum UPDATE.

-- SELECT id, tanggal, no_rm, nama_pasien, kategori, ruangan, status
-- FROM public.tindakan
-- WHERE status = 'Menunggu'
--   AND lower(coalesce(kategori, '')) LIKE '%cath%'
--   AND lower(coalesce(ruangan, '')) LIKE '%cath%'
--   AND dokter IN ('Belum diisi', 'Belum ditentukan');

UPDATE public.tindakan
SET
  kategori = 'Belum diisi',
  ruangan = 'Belum diisi'
WHERE status = 'Menunggu'
  AND lower(coalesce(kategori, '')) LIKE '%cath%'
  AND lower(coalesce(ruangan, '')) LIKE '%cath%'
  AND coalesce(dokter, '') IN ('Belum diisi', 'Belum ditentukan');
