# Diskusi: Laporan Tindakan (belum diimplementasi)

Ringkasan keputusan desain — referensi untuk implementasi berikutnya.

## Tombol toolbar

- **Toolbar minimal:** **satu** tombol laporan saja (bukan dua tombol terpisah untuk jenis operasi vs cara bayar; bukan pula trio harian/bulanan/tahunan).
- Judul tombol mengikuti gaya UI (mis. "Laporan" atau "Laporan tindakan").
- Tombol utama lain (mis. Tambah Pasien) tetap dipisahkan secara visual.

## Modal

- **Satu** modal dibuka dari tombol itu.
- **Pemilihan jenis laporan di dalam modal** (mis. tab, segmented control, atau dropdown): *Jenis operasi / tindakan* | *Cara bayar* — isi matriks dan judul header laporan mengikuti pilihan ini.
- **Judul (dan bila perlu subtitle) menyesuaikan periode/konteks** (filter tabel atau pemilih periode di dalam modal).
- Isi laporan **selaras dengan data/konteks tabel tindakan** (filter, rentang, pencarian).

## Bentuk laporan bulanan (matriks spreadsheet)

- **Baris:** jenis tindakan/operasi (urutan tetap sesuai template bisnis, mis. DCA, PTCA, …, PE), lalu baris **JUMLAH** (total per hari).
- **Kolom:** tanggal **1 … N** (N = jumlah hari di bulan yang dipilih), lalu kolom **JUMLAH** (total per jenis untuk bulan itu).
- **Isi sel data: hanya angka** (frekuensi). Kosong = 0 (boleh tampil kosong atau `0` — konsisten saja).
- **Total:** kolom JUMLAH = jumlah horizontal per baris; baris JUMLAH = jumlah vertikal per kolom tanggal; pojok kanan bawah = grand total.
- **Judul laporan** (mis. nama unit + "BULAN : …") di **header** modal, bukan di dalam sel angka.

## Opsional UX

- Header kolom tanggal: sorot **akhir pekan/libur** (mis. latar berbeda) tanpa mengubah isi sel angka.
- Periode lain (harian/tahunan): bisa bentuk tabel/ringkasan berbeda di modal yang sama, tanpa tombol terpisah di toolbar.

## Laporan kedua: CARA BAYAR CATHLAB (contoh spreadsheet)

Kebutuhan **selanjutnya**, masih diskusi — struktur **sama** (matriks bulan: baris × tanggal × kolom JUMLAH, **isi sel hanya angka**), yang berbeda **makna baris**.

### Judul & konteks

- Contoh judul: **LAPORAN CARA BAYAR CATHLAB ELEKTIF** (kata **ELEKTIF** kemungkinan segmen kasus: elektif vs darurat — perlu dipetakan ke filter data atau jenis kunjungan di sistem).
- Subtitle: **BULAN : [nama bulan] [tahun]** (sama pola dengan laporan jenis operasi).

### Kolom (sumbu X)

- Sama: tanggal **1 … N** (N = jumlah hari di bulan), lalu **JUMLAH**.
- Opsional: sorot tanggal akhir pekan/libur di baris header (seperti template).

### Baris (sumbu Y) — kategori **cara bayar**

Urutan contoh dari template:

1. BPJS NON PBI KLS 1  
2. BPJS NON PBI KLS 2  
3. BPJS NON PBI KLS 3  
4. PBI  
5. UMUM  
6. ASURANSI  
7. Baris **JUMLAH** (total per hari per kolom).

*(Label kolom pertama bisa tetap “JENIS …” di spreadsheet; di UI bisa eksplisit **CARA BAYAR** agar tidak tertukar dengan laporan jenis operasi.)*

### Agregasi

- Setiap sel = **jumlah kasus/tindakan** pada tanggal itu yang termasuk **bucket cara bayar** tersebut (setelah mapping dari field raw di database ke enam kategori + baris total).
- Total baris, total kolom, grand total — aturan sama seperti matriks jenis operasi.

### Keputusan UI (disepakati)

- **Satu tombol** di toolbar; **dua jenis laporan** (jenis operasi vs cara bayar) hanya lewat **pemilih di dalam modal**, bukan tombol kedua di toolbar.

### Prasyarat data (nanti saat implementasi)

- Field atau turunan **cara bayar** pada tindakan/pasien harus bisa dipetakan ke **enam kategori** di atas (termasuk aturan edge case: tidak dikenal → “UMUM”, atau baris terpisah — diputuskan bisnis).

## Arah pamungkas (disepakati)

Ringkasan arah setelah diskusi — dipakai sebagai pedoman prioritas.

- **Satu modal Laporan** (tab jenis operasi | cara bayar) dengan **Cetak / Unduh / WA** memakai pola yang sama (`tindakanReportTemplates` + `ReportExportActionBar`), supaya tidak bertambah banyak modal terpisah.
- **WA = ringkasan teks** saja; dokumen resmi lewat **unduh HTML** (atau PDF nanti bila ada kebutuhan arsip formal).
- **Mapping cara bayar** dan label **ELEKTIF** harus mengikuti **filter query** yang jelas, bukan hanya teks judul.
- **Preset periode** (mis. bulan ini / hari ini) dan **konfirmasi cetak** bila baris sangat banyak — pertimbangkan saat polish UX.
- **Template & ekspor** dikembangkan terpusat; laporan baru = fungsi `build…Html` + `build…WhatsAppText` + pemasangan bar ekspor.
- **Foto di HTML cetak** — siapkan fallback jika URL eksternal tidak ikut render di printer.
- **Wireframe** ASCII: **`WIREFRAME-TINDAKAN.md`** (toolbar, modal Fast-Track / hari ini / Lab Kateter, bar ekspor, alur) — update bersama perubahan UI.
- **Uji siklus** nyata (filter → cetak → unduh → WA) dan **hak akses** per peran bila laporan sensitif.

## Laporan: tindakan terbanyak Lab Kateter (frekuensi × tahun)

- **Sudah diimplementasi:** modal dari toolbar **Lab Kateter** — matriks baris = jenis tindakan (urutan mengikuti contoh spreadsheet: Primary PCI … DSA), kolom = **tahun** dalam rentang yang dipilih; sel = jumlah baris tindakan (tanggal menentukan tahun). **Filter:** tahun dari/sampai, bulan opsional (hanya hitung baris di bulan itu per tahun), dokter. Teks tindakan di DB dipetakan lewat **kata kunci**; yang tidak cocok → baris **Lainnya** (hanya tampil jika ada isinya). **Cetak / Unduh / WA** memakai template `buildTindakanTerbanyakLabHtml` / `buildTindakanTerbanyakLabWhatsAppText`.
- Penyesuaian nama tindakan di data: edit matcher di `lib/tindakanTerbanyakLab.ts` bila istilah RS berbeda.

## Status

- **Wireframe ASCII (implementasi saat ini):** lihat [`WIREFRAME-TINDAKAN.md`](./WIREFRAME-TINDAKAN.md).
- Matriks laporan bulanan (jenis operasi / cara bayar per **tanggal dalam bulan**) di atas: **belum** diimplementasi; dokumen ini tetap acuan desain.
- **Sudah ada di kode (terpisah):** modal Fast-Track + ekspor, modal Tindakan hari ini + ekspor, modal **Lab Kateter** (frekuensi × tahun) + ekspor, tombol terkait di toolbar — nanti bisa **dirapikan** ke arah “satu modal Laporan” bila diprioritaskan.
