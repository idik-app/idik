# Diskusi: Modal LAPORAN dengan Tab Navigasi Bulan

**Tanggal:** 29 April 2026  
**Konteks:** Intensive / SYSTEM MENU — item menu **LAPORAN** membuka modal baru dengan pemilihan **bulan** lewat **tab navigasi**.  
**Catatan:** Dokumen ini hanya membahas alur, UX, dan konsistensi visual — tanpa implementasi kode.

---

## 1. Tujuan

Memberi akses cepat ke **laporan** yang bersifat **periodik per bulan** (misalnya ringkasan kejadian, indikator mutu, atau ekspor data ruangan) tanpa meninggalkan konteks dashboard intensif. Tab bulan dipilih agar pola kerja perawat/admin mengikuti kalender kerja nyata (Jan–Des per tahun).

---

## 2. Pemicu dan Alur Dasar

1. Pengguna membuka **SYSTEM MENU** (overlay futuristik gelap dengan aksen cyan).
2. Pengguna mengetuk atau mengklik **LAPORAN**.
3. Menu utama bisa **tutup** atau **tetap di belakang** (lihat §6); yang pasti sebuah **modal LAPORAN** muncul di atas konten kerja.
4. Di dalam modal, pengguna melihat **tab navigasi bulan** dan memilih satu bulan.
5. Konten area di bawah tab menampilkan **data atau ringkasan untuk bulan yang aktif** — untuk rekapitulasi ICCU, bulan **Mei–Des** dapat dipenuhi **otomatis** dari **agregasi History pasien** (registrasi ICCU berstatus arsip; lihat `docs/wireframe-rekapitulasi-pasien-iccu.md` §2 & §4).

Alur ini harus dapat dipecahkan dengan **Escape** atau tombol tutup yang konsisten dengan bahasa visual HUD yang sudah ada.

---

## 3. Struktur Modal (Konsep)

### 3.1 Kerangka umum

| Zona | Fungsi |
|------|--------|
| **Header** | Judul singkat (mis. “LAPORAN”), subtitel opsional (mis. ruangan atau konteks intensif), tombol tutup. |
| **Bar tab bulan** | 12 tab atau subset yang relevan (mis. hanya bulan dalam tahun berjalan — lihat §4). |
| **Area konten** | Ringkasan, tabel, grafik, atau daftar unduhan — selalu terikat pada **bulan tab yang aktif**. |

### 3.2 Tab navigasi bulan — perilaku yang disepakati di diskusi

- **Satu bulan aktif** pada satu waktu; mengganti tab mengganti konten tanpa menutup modal.
- **Label tab** disarankan ringkas: `Jan`, `Feb`, … atau angka `01`–`12`, dengan tooltip nama lengkap jika perlu aksesibilitas.
- **Indikasi visual** untuk tab aktif: border atau glow cyan selaras tema SYSTEM MENU; teks utama tetap kontras di dark mode.

### 3.3 Tahun (komplemen tab bulan)

Tab bulan saja tidak cukup jika laporan bersifat **kalender penuh**. Diskusi umumnya menyepakati salah satu dari:

- **Kontrol tahun** di header modal (dropdown atau panah ← →) dengan tab tetap menyajikan Jan–Des untuk tahun itu; atau  
- **Scroll horizontal** tab yang mencakup banyak bulan berurutan (mis. 24 bulan terakhir), dengan risiko UX lebih padat di layar kecil.

Keputusan tahun mempengaruhi apakah modal ini “laporan tahun berjalan saja” atau “arsip multi-tahun”.

---

## 4. Pertimbangan UX

- **Default bulan:** Bulan kalender saat ini mengurangi satu langkah untuk pengguna yang membuka laporan “bulan ini”.
- **Mobile:** Tab horizontal bisa di-scroll; hindari 12 tab yang semuanya menyempit tidak terbaca — pertimbangkan **carousel bulan** atau **picker bulan** sebagai alternatif jika ruang tidak cukup (topik lanjutan, bukan harus versi pertama).
- **Loading dan kosong:** Saat data async, area konten menampilkan status loading dan empty state yang ramah, tetap dalam tema gelap/cyan.
- **Fokus dan aksesibilitas:** Urutan tab logis (Jan→Des), fokus keyboard terlihat, nama bulan tidak hanya mengandalkan warna.

---

## 5. Konsistensi Visual dengan SYSTEM MENU

Agar modal terasa satu keluarga dengan menu yang sudah ada:

- **Latar:** gelap, teks utama terang (`dark`-readable).
- **Aksen:** cyan untuk garis tipis, glow seleksi, dan perhaps satu “corner accent” seperti pada frame menu — tanpa menumpuk blur backdrop berlebihan di atas blur lain (hindari efek kabut ganda).
- **Tipografi:** huruf kapital untuk judul/navigasi jika itu pola yang sudah dipakai di menu; tetap jaga hierarki (judul vs meta vs konten isi laporan).
- **Layering:** gunakan token z-index terpusat di proyek agar modal LAPORAN berada di atas konten dashboard tetapi konsisten dengan modal lain (settings, register ICCU, dll.).

---

## 6. Hubungan dengan SYSTEM MENU

Dua opsi yang sering dibahas:

- **MENU tertutup** saat modal LAPORAN dibuka — pengguna fokus satu tugas; satu overlay hilang.  
- **MENU tetap** — lebih kompleks secara layering; biasanya kurang disukai kecuali ada kebutuhan membandingkan dua hal sekaligus.

Rekomendasi UX umum: **tutup SYSTEM MENU** ketika modal LAPORAN dibuka, dan menyediakan **jalur kembali** yang jelas (tutup modal → kembali ke dashboard seperti sebelum membuka menu).

---

## 7. Pertanyaan Terbuka (untuk iterasi berikutnya)

1. **Laporan apa saja** yang masuk versi pertama (satu jenis vs beberapa sub-tab di dalam konten)?  
2. **Perlu ekspor** (PDF/Excel) per bulan dari modal yang sama?  
3. **Scope data:** per ruangan intensif, per pasien, atau gabungan — mempengaruhi subtitle header dan query backend nanti.  
4. **Hak akses:** role mana yang melihat LAPORAN penuh vs ringkas?

---

## 8. Ringkasan

Fitur yang diusulkan: **LAPORAN** membuka **modal** dengan **tab bulan** untuk memilih periode, konten mengikuti bulan aktif, dengan **tema futuristik gelap + cyan** selaras SYSTEM MENU dan kebiasaan **dark mode readability** di IDIK. Keputusan produk berikutnya yang penting adalah **cara menangani tahun** dan **isi konkret laporan** pada rilis pertama.
