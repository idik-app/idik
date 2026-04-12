-- Seed elegant notifications for demonstration
-- Generated based on IDIK-App modules (Pasien, Tindakan, Farmasi, Distributor)

insert into public.notifications (message, type, created_at)
values 
  ('⚠️ Stok **Stent Drug Eluting (DES)** di Cathlab menipis (Sisa 2 unit). Segera lakukan pengadaan.', 'warning', now() - interval '2 minutes'),
  ('✅ Tindakan **PCI Primary** untuk Pasien **Tn. Budi Santoso** (RM: 00-12-34) telah selesai oleh tim **dr. Sp.JP (K)**.', 'success', now() - interval '15 minutes'),
  ('🆕 Pasien baru **Ny. Siti Aminah** (RM: 12-34-56) telah didaftarkan untuk jadwal tindakan besok pagi.', 'info', now() - interval '45 minutes'),
  ('👨‍⚕️ Perawat **Ns. Ahmad Subarjo** baru saja ditambahkan ke tim tindakan **Cathlab Ruang 1**.', 'system', now() - interval '2 hours'),
  ('📦 Pesanan Alkes #PO-2026-001 dari **PT. Medika Jaya** telah diverifikasi dan siap dikirim ke unit.', 'success', now() - interval '3 hours'),
  ('⚠️ Alert: Nilai **DAP** pada tindakan Pasien **Tn. Herman** melampaui batas referensi diagnostik.', 'error', now() - interval '5 hours'),
  ('📄 Laporan bulanan tindakan **Maret 2026** telah selesai di-generate dan siap diunduh.', 'info', now() - interval '1 day'),
  ('🆕 Master data **Tarif Tindakan 2026** telah diperbarui sesuai regulasi RSUD dr. M. Soewandhie.', 'system', now() - interval '2 days');
