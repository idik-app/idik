# Diskusi: Alur Register Pasien → History Pasien di Ruang Intensive

Dokumen ini merangkai narasi operasional dan implikasi produk untuk pasien yang dirawat di ruang intensive, tercatat di register untuk observasi pada flowsheet, lalu dipindahkan ke riwayat setelah observasi selesai sesuai status keluar.

## Dokumen & aset terkait di repo

| Sumber | Peran |
|--------|--------|
| [Wireframe REGISTER ICCU (modal + drawer)](./wireframe-register-iccu-modal-drawer.md) | Interaksi UI: System Menu **REGISTER ICCU**, tabel daftar terdaftar, tambah pasien, hapus baris (pembatalan registrasi ICCU vs master). |
| [Wireframe register → history (intensive)](./wireframe-register-ke-history-pasien-intensive.md) | Alur **REGISTER ICCU** → flowsheet → **arsip** → **HISTORY PASIEN**; dialog konfirmasi; beda **Hapus** vs **Selesai/Arsip**. |
| `app/api/iccu-register/route.ts` | API registrasi ICCU; di kode, flowsheet intensive dirangkai dengan `tindakanId` yang selaras pendaftaran. |
| `components/intensive/iccu/IccuRegisterModal.tsx` | Implementasi modal daftar/registrasi ICCU (bisa dipakai bersama atau dibedakan tampilan untuk jalur **HISTORY PASIEN** sesuai keputusan produk). |

## Glosarium istilah (narasi vs label UI)

| Narasi / konsep | Label / istilah di produk (saat ini) |
|-----------------|--------------------------------------|
| Register / daftar pasien aktif intensive | **REGISTER ICCU** (System Menu) — daftar pasien terdaftar untuk observasi di konteks ruangan. |
| Riwayat setelah keluar dari daftar aktif | **HISTORY PASIEN** (System Menu) — akses ke arsip kasus/observasi yang tidak lagi aktif di register. |
| Lembar observasi | **Flowsheet** (modul intensive; terikat alur registrasi / `tindakanId` di implementasi). |

---

## Konteks perawatan

Pasien yang menjalani perawatan di ruang intensive membutuhkan pencatatan observasi berkelanjutan. Di lingkungan kerja yang sudah kita bahas sebelumnya, **register pasien** (di UI: alur **REGISTER ICCU**) berfungsi sebagai daftar aktif: siapa saja yang sedang dalam pengawasan dan menjadi subjek entri **flowsheet** (parameter klinis, intervensi, dan jejak waktu).

Register ini bukan sekadar daftar nama; ia mengikat **identitas pasien** dengan **sesi observasi** yang sedang berjalan, sehingga petugas tahu dengan jelas pasien mana yang masih “hidup” dalam konteks dokumentasi harian.

---

## Fase observasi aktif

Selama pasien berstatus dalam perawatan intensive dan observasi di flowsheet masih relevan:

- Pasien tetap muncul di **REGISTER ICCU** / daftar registrasi aktif (bukan di **HISTORY PASIEN**).
- Flowsheet terisi menurut protokol ruangan dan kebutuhan klinis.
- Status administratif/klinis (misalnya masih dirawat, masih observasi) selaras dengan keberadaan pasien di daftar aktif.

Pada titik ini, fokus produk adalah **kelancaran input**, **kejelasan siapa yang aktif**, dan **minimnya risiko salah pasien** saat dokumentasi.

---

## Penutupan observasi dan status keluar

Ketika perawatan/observasi dianggap selesai menurut aturan yang disepakati (misalnya **status keluar** tertentu: pulang, rujuk, meninggal, atau transfer ke ruang lain dengan perubahan model dokumentasi), pasien **tidak lagi** menjadi subjek observasi intensif dalam pengertian yang sama.

Secara operasional, petugas perlu:

1. Menegaskan bahwa siklus observasi di ruangan intensive untuk pasien tersebut **tertutup**.
2. Memastikan data yang sudah terlanjur tercatat **tidak hilang** karena alasan administratif “dihapus dari daftar aktif”.

Inilah titik di mana konsep **memindahkan ke HISTORY PASIEN** menjadi penting: bukan menghapus riwayat, melainkan **mengubah lokasi semantik** data dari “aktif” ke “arsip/riwayat”. Perhatikan beda dengan **Hapus** pada baris tabel REGISTER ICCU di wireframe: di sana defaultnya adalah **pembatalan registrasi ICCU** / unlink dari daftar, bukan penghapusan master pasien — alur “selesai observasi → history” sebaiknya eksplisit (status keluar / aksi arsip) agar tidak tertukar dengan hapus administratif.

---

## Pasien dinyatakan meninggal: apa yang dilakukan sistem?

Kasus **cara keluar = meninggal** mengikuti alur yang sama dengan penutupan kasus lain ke **HISTORY PASIEN**, dengan pencatatan tambahan untuk klasifikasi waktu kematian.

### Di detail pasien (drawer), tab **Keluar**

- Petugas memilih **Meninggal** dan salah satu sub-pilihan: **kurang dari 48 jam** atau **lebih dari 48 jam**.
- Sistem menyimpan ke baris registrasi ICCU: **`cara_keluar`** (nilai semantik *meninggal*) dan **`meninggal_within_48h`** (boolean), bersama perubahan field lain lewat penyimpanan otomatis (senyap), selaras perilaku tab keluar untuk opsi lain (*pindah ruangan*, *KRS/pulang*, dll.).

### Tab **Periode** — syarat sebelum arsip

- Untuk **mengarsipkan** kasus ke riwayat, implementasi saat ini **mewajibkan** **`periode_keluar`** (tanggal keluar) **dan** **`cara_keluar`** yang sudah terisi.
- Saat petugas memilih **Meninggal** di tab **Keluar** dan **tanggal keluar** masih kosong, sistem **mengisi otomatis tanggal keluar ke hari ini** (disimpan senyap) agar alur arsip tidak tertahan; tanggal tetap dapat **dikoreksi** di tab **Periode** jika tanggal meninggal berbeda.
- Jika karena alasan lain **tanggal keluar** masih kosong saat membuka dialog arsip, **Selesai observasi & arsip** menampilkan peringatan; tombol konfirmasi tidak aktif sampai data lengkap.

### Aksi **Selesai & arsip** (setelah data lengkap)

- Setelah **cara keluar** dan **tanggal keluar** valid, petugas dapat menandai konfirmasi dan menjalankan **Konfirmasi & arsip**.
- Sistem men-set **waktu arsip** (`archived_at`): pasien **keluar dari daftar aktif REGISTER ICCU** dan **muncul di HISTORY PASIEN**.
- **Data observasi / flowsheet tidak dihapus** — yang berubah adalah status registrasi (aktif → arsip), agar jejak klinis dan audit tetap ada.

### Yang bukan alur meninggal

- **Hapus** pada baris tabel aktif = **pembatalan registrasi** dari daftar unit (bukan penutupan kasus klinis). Untuk pasien meninggal yang hendak ditutup dengan jejak formal ke riwayat, gunakan **arsip**, bukan hapus baris.

---

## Dari register ke history: apa yang sebenarnya terjadi?

**Menghapus dari register pasien** dalam narasi ini dimaksudkan sebagai:

- **Mengeluarkan pasien dari daftar yang meng-drive flowsheet aktif** dan notifikasi kerja sehari-hari.
- Bukan menghapus rekaman observasi yang sudah ada.

**Memindahkan ke HISTORY PASIEN** berarti:

- Observasi dan metadata sesi intensive **tetap dapat diakses** untuk audit, kontinuitas perawatan, medikolegal, dan pelaporan.
- Pasien tidak lagi “mengambil slot” mental dan UI sebagai kasus aktif di ruangan tersebut.

Secara konseptual ini mirip pola **soft transition**: entitas pasien-sesi berpindah dari koleksi *active* ke *historical*, dengan integritas data terjaga.

---

## Manfaat bagi petugas dan institusi

| Aspek | Manfaat |
|--------|---------|
| **Kejelasan daftar aktif** | **REGISTER ICCU** hanya menampilkan pasien yang benar-benar masih dalam observasi intensive. |
| **Keberlanjutan data** | Flowsheet dan entri terkait tidak lenyap; tetap lewat **HISTORY PASIEN** (atau jalur arsip yang disepakati). |
| **Akuntabilitas** | Jejak observasi tetap ada setelah pasien keluar, sesuai ekspektasi mutu dan regulasi. |
| **Operasional** | Mengurangi kebingungan antara pasien “masih di ICU/ICCU” vs “sudah selesai di sini”. |

---

## Hal yang perlu disepakati bersama (produk & klinis)

1. **Trigger pemindahan** — Apakah sepenuhnya manual oleh petugas setelah status keluar, atau ada bantuan sistem (misalnya wizard konfirmasi)?
2. **Istilah di UI** — Label **HISTORY PASIEN** harus konsisten dengan ekspektasi pengguna: arsip ruangan, arsip per pasien, atau keduanya; jelas bedanya dengan **REGISTER ICCU** (hanya kasus aktif).
3. **Hak akses** — Siapa yang boleh melihat **HISTORY PASIEN** setelah pasien keluar; apakah sama dengan akses flowsheet aktif.
4. **Koreksi pasca-pemindahan** — Jika status keluar salah input, apakah ada jalur “kembalikan ke register” terbatas (dengan audit trail), bukan sekadar edit sembarangan.

---

## Ringkasan narasi

Pasien intensive **diregister** lewat **REGISTER ICCU** untuk observasi pada **flowsheet** selama masih dalam perawatan. Setelah observasi **selesai** sesuai **status keluar**, petugas **mengeluarkan pasien dari daftar aktif** (bukan menghapus jejak klinis) supaya **REGISTER ICCU** tetap relevan, sementara **riwayat observasi dipindahkan / tetap tersedia lewat HISTORY PASIEN** agar dokumentasi tidak hilang dan tetap dapat diaudit serta digunakan untuk kontinuitas layanan.

---

*Dokumen diskusi; dapat diperbarui sejalan dengan keputusan desain teknis dan kebijakan ruangan. Lihat [wireframe REGISTER ICCU](./wireframe-register-iccu-modal-drawer.md) dan [wireframe alur register → history](./wireframe-register-ke-history-pasien-intensive.md).*
