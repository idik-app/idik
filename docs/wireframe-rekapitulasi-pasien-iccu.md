# Wireframe: REKAPITULASI JUMLAH PASIEN RUANG ICCU

**Judul laporan:** REKAPITULASI JUMLAH PASIEN RUANG ICCU  
**Periode (contoh):** TAHUN 2026  
**Referensi:** struktur spreadsheet / laporan tahunan ruangan ICCU — satu lembar berisi variabel per baris dan angka per bulan.

> **Migrasi SQL vs angka di dokumen ini**  
> Migrasi (`iccu_rekap_year_payload` dan turunannya) hanya menyalurkan **aturan agregasi** dari tabel `iccu_register_entry` — **tidak** meng-insert angka contoh dari kotak ASCII §2 ke basis data.  
> Angka **Jan–Apr** di §2 adalah **demo statis / fiktif** untuk layout UI (lihat kalimat pembuka §2). Laporan di aplikasi menampilkan **nilai nyata** dari registrasi yang ada; bila tidak ada baris yang lolos filter **tahun + ruangan + tanggal acuan RPC**, tampilan akan **0**, walau migrasi sudah di-push.

---

## Kunci visual (mapping ke UI)

| Elemen spreadsheet | Saran di aplikasi |
|--------------------|-------------------|
| Header judul + tahun | Judul terpusat; pemilih **tahun** di toolbar modal |
| Baris header kolom (tan/gold) | Header tabel sticky; warna aksen netral atau mengikuti tema Intensive |
| Bar subjudul seksi (biru muda) | Row pemisah / grup Section **A–D** — **dapat dilipat** (accordion) |
| Header kolom bulan (pink/salmon di spreadsheet sumber) | Di UI: aksen lembut pada header **JAN–DES**; tetap kontras di dark mode |
| Kolom TOTAL kanan (orange di spreadsheet sumber) | Kolom ringkasan tahun / jumlah horizontal — bedakan dari sel per bulan |
| Baris **NON CARDIO** (hijau di spreadsheet sumber) | Opsional: satu baris dengan highlight ringan untuk diagnosis non-kardio |
| **Ikon collapse per SECTION** | Header grup berisi kontrol **buka/tutup**: terbuka **▼**, tertutup **▶** (atau padanan aksesibel: `aria-expanded`, focus ring) |
| Baris total Section A (kuning) | Row sum atau highlight ringan pada **JUMLAH TOTAL** — ikut tersembunyi jika Section A dilipat *(opsional: tetap tampil sebagai satu ringkas)* |

---

## 1. Wireframe blok judul

```text
+----------------------------------------------------------------------------------+
|                                                                                  |
|           REKAPITULASI JUMLAH PASIEN RUANG ICCU                                  |
|                      TAHUN 2026                                                  |
|                                                                                  |
+----------------------------------------------------------------------------------+
```

*(Di modal web: bar opsional `[ ◀ 2025 ]   2026   [ 2027 ▶ ]` di kanan judul jika multi-tahun.)*

### Konvensi ikon SECTION (collapse / expand)

| Ikon | Makna |
|------|--------|
| **▼** | SECTION **terbuka** — baris variabel di bawahnya ditampilkan |
| **▶** | SECTION **tertutup** — baris variabel disembunyikan; header SECTION tetap terlihat untuk dibuka lagi |

*(Implementasi UI bisa memakai ChevronDown/ChevronRight atau tombbol dengan label yang sama untuk pembaca layar.)*

---

## 2. Wireframe grid utama (tampilan tahun penuh — seperti gambar)

Kolom: **NO** · **VARIABEL** · **JAN … DES** · **TOTAL**.

Angka **Jan–Apr** di wireframe berikut adalah **demo statis** (Section A ringkas vertikal konsisten; lainnya realistis namun **fiktif** — **bukan** baris yang di-seed oleh migrasi SQL); sel **Mei–Des** sengaja kosong pada gambar ASCII di bawah.

**Kebijakan produk (otomatis):** untuk bulan **Mei sampai Desember**, nilai per kolom pada implementasi diisi **otomatis** dengan **agregasi dari History pasien** ICCU — daftar pasien yang sudah berstatus **arsip** (mode *History pasien* di UI; API `GET /api/iccu-register` dengan `listStatus=archived`, data `iccu_register_entry`). Tiap baris variabel (pembayaran, mutu, diagnosis, dll.) dihitung dari rekaman tersebut sesuai definisi metrik. **Tanggal acuan** untuk menempatkan pasien ke bulan tertentu (mis. tanggal masuk History / tanggal keluar ICCU) ditetapkan satu kali saat implementasi backend agar konsisten dengan laporan RS.

Kolom **TOTAL** pada demo Jan–Apr: Section **A, B, D** dan bilangan bulat bermakna = **jumlah Jan–Apr** (YTD April). Section **C**: **BOR (%)** di TOTAL = **rata-rata bulat** Jan–Apr (bukan jumlah); **ALOS**, **NDR**, **GDR** TOTAL dikosongkan di demo ini.

```text
+----+----------------------------------------+---+---+---+---+---+---+---+---+---+---+---+---+---+-------+
| NO | VARIABEL                               |JAN|FEB|MAR|APR|MEI|JUN|JUL|AGU|SEP|OKT|NOV|DES| TOTAL |
+----+----------------------------------------+---+---+---+---+---+---+---+---+---+---+---+---+---+-------+
| ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■ |
| ■  [▼] SECTION A — JUMLAH PASIEN BERDASARKAN CARA PEMBAYARAN       (klik header untuk tutup → ▶)       ■ |
| ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■ |
+----+----------------------------------------+---+---+---+---+---+---+---+---+---+---+---+---+---+-------+
| 1  | UMUM / BAYAR                           | 18| 22| 19| 21|   |   |   |   |   |   |   |   |     80|
| 2  | BPJS PBI                               | 45| 48| 52| 46|   |   |   |   |   |   |   |   |    191|
|    | NPBI 1                                 | 12| 11| 13| 12|   |   |   |   |   |   |   |   |     48|
|    | NPBI 2                                 |  8|  9|  7|  8|   |   |   |   |   |   |   |   |     32|
|    | NPBI 3                                 |  5|  6|  5|  6|   |   |   |   |   |   |   |   |     22|
| 3  | R / JKS                                | 14| 15| 13| 14|   |   |   |   |   |   |   |   |     56|
| 4  | LAIN-LAIN / ASURANSI                   |  3|  4|  2|  3|   |   |   |   |   |   |   |   |     12|
+----+----------------------------------------+---+---+---+---+---+---+---+---+---+---+---+---+---+-------+
| ■  JUMLAH TOTAL (summary Section A)                                                                  ■ |
+----+----------------------------------------+---+---+---+---+---+---+---+---+---+---+---+---+---+-------+
|    |                                        |105|115|111|110|   |   |   |   |   |   |   |   |    441|
+----+----------------------------------------+---+---+---+---+---+---+---+---+---+---+---+---+---+-------+
| ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■ |
| ■  [▼] SECTION B — SURVEY MUTU PELAYANAN                           (klik header untuk tutup → ▶)       ■ |
| ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■ |
+----+----------------------------------------+---+---+---+---+---+---+---+---+---+---+---+---+---+-------+
| 1  | JUMLAH PASIEN MENINGGAL                |  2|  3|  2|  4|   |   |   |   |   |   |   |   |     11|
|    |     < 48 JAM                           |  1|  2|  1|  2|   |   |   |   |   |   |   |   |      6|
|    |     > 48 JAM                           |  1|  1|  1|  2|   |   |   |   |   |   |   |   |      5|
| 2  | JUMLAH PASIEN DIRUJUK                  |  5|  6|  5|  7|   |   |   |   |   |   |   |   |     23|
| 3  | JUMLAH PASIEN PULANG PAKSA             |  1|  0|  1|  1|   |   |   |   |   |   |   |   |      3|
| 4  | JUMLAH PASIEN DENGAN VENTILATOR        | 12| 14| 11| 13|   |   |   |   |   |   |   |   |     50|
| 5  | JUMLAH PASIEN CVC                      | 18| 19| 17| 20|   |   |   |   |   |   |   |   |     74|
| 6  | JUMLAH PASIEN PDT                      |  4|  5|  4|  5|   |   |   |   |   |   |   |   |     18|
| 7  | JUMLAH PASIEN KRS                      |  9| 10|  8| 11|   |   |   |   |   |   |   |   |     38|
| 8  | JUMLAH PASIEN PINDAH RUANGAN           |  3|  2|  4|  3|   |   |   |   |   |   |   |   |     12|
| 9  | JUMLAH PASIEN KRS (SEMUA KONDISI)      | 11| 12| 10| 13|   |   |   |   |   |   |   |   |     46|
| 10 | JUMLAH PASIEN MASIH DALAM PERAWATAN    |  8|  9|  8| 10|   |   |   |   |   |   |   |   |     35|
| 11 | JUMLAH HARI PERAWATAN                  |142|156|148|162|   |   |   |   |   |   |   |   |    608|
| 12 | JUMLAH PASIEN KEMBALI < 72 JAM         |  2|  1|  2|  2|   |   |   |   |   |   |   |   |      7|
| 13 | JUMLAH PASIEN PERAWATAN > 7 HARI       | 15| 16| 14| 17|   |   |   |   |   |   |   |   |     62|
| 14 | JUMLAH PASIEN DCA / PTCA               |  6|  7|  6|  8|   |   |   |   |   |   |   |   |     27|
| 15 | JUMLAH PASIEN TROMBOLITIK              |  4|  3|  5|  4|   |   |   |   |   |   |   |   |     16|
| 16 | JUMLAH PASIEN TPM                      |  2|  2|  3|  2|   |   |   |   |   |   |   |   |      9|
| 17 | JUMLAH PASIEN PPM                      |  1|  1|  2|  1|   |   |   |   |   |   |   |   |      5|
| 18 | JUMLAH PASIEN PERIKARDIOSENTESIS       |  0|  1|  0|  1|   |   |   |   |   |   |   |   |      2|
| 19 | JUMLAH PASIEN ABLASI                   |  5|  6|  5|  7|   |   |   |   |   |   |   |   |     23|
+----+----------------------------------------+---+---+---+---+---+---+---+---+---+---+---+---+---+-------+
|    |                                        |   |   |   |   |   |   |   |   |   |   |   |   |       |
+----+----------------------------------------+---+---+---+---+---+---+---+---+---+---+---+---+---+-------+
| ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■ |
| ■  [▼] SECTION C — INDIKATOR MUTU PELAYANAN                        (klik header untuk tutup → ▶)       ■ |
| ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■ |
+----+----------------------------------------+---+---+---+---+---+---+---+---+---+---+---+---+---+-------+
| 1  | BOR (%)                                | 85| 82| 79| 88|   |   |   |   |   |   |   |   |     83|
| 2  | ALOS                                   |4.2|4.5|4.1|4.4|   |   |   |   |   |   |   |   |       |
| 3  | TOI                                    | 15| 14| 16| 13|   |   |   |   |   |   |   |   |     58|
| 4  | BTO                                    | 42| 38| 41| 40|   |   |   |   |   |   |   |   |    161|
| 5  | NDR                                    |2.1|1.8|2.4|2.0|   |   |   |   |   |   |   |   |       |
| 6  | GDR                                    |4.5|4.2|4.8|4.4|   |   |   |   |   |   |   |   |       |
+----+----------------------------------------+---+---+---+---+---+---+---+---+---+---+---+---+---+-------+
|    |                                        |   |   |   |   |   |   |   |   |   |   |   |   |       |
+----+----------------------------------------+---+---+---+---+---+---+---+---+---+---+---+---+---+-------+
| ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■ |
| ■  [▼] SECTION D — DIAGNOSA TERBANYAK                              (klik header untuk tutup → ▶)       ■ |
| ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■ |
+----+----------------------------------------+---+---+---+---+---+---+---+---+---+---+---+---+---+-------+
| 1  | STEMI                                  | 14| 16| 13| 15|   |   |   |   |   |   |   |   |     58|
| 2  | NSTEMI                                 |  9| 11| 10| 12|   |   |   |   |   |   |   |   |     42|
| 3  | UAP                                    |  7|  8|  6|  9|   |   |   |   |   |   |   |   |     30|
| 4  | SVT                                    |  4|  5|  4|  6|   |   |   |   |   |   |   |   |     19|
| 5  | DC                                     |  6|  7|  6|  8|   |   |   |   |   |   |   |   |     27|
| 6  | HT                                     | 18| 19| 17| 20|   |   |   |   |   |   |   |   |     74|
| 7  | AV BLOCK                               |  3|  4|  3|  5|   |   |   |   |   |   |   |   |     15|
| 8  | AF                                     | 11| 12| 10| 13|   |   |   |   |   |   |   |   |     46|
| 9  | NON CARDIO                             | 22| 21| 23| 24|   |   |   |   |   |   |   |   |     90|
+----+----------------------------------------+---+---+---+---+---+---+---+---+---+---+---+---+---+-------+
```

**Catatan Section C:** Indikator seperti **BOR**, **ALOS**, **TOI**, **BTO**, **NDR**, **GDR** biasanya persentase atau desimal — format angka disesuaikan definisi RS (bukan selalu bilangan bulat).

**Catatan Section D:** Baris **NON CARDIO** pada spreadsheet sumber sering diberi **latar hijau muda** untuk membedakan kategori diagnosis.

**Catatan baris Section A:** Penomoran di spreadsheet asli bisa sedikit berbeda (misalnya NPBI sebagai baris turunan tanpa nomor utama terpisah). Yang penting urutan **variabel** mengikuti dokumen sumber RS.

### Contoh SECTION tertutup (hanya header — ikon ▶)

```text
… (header kolom sama seperti di atas) …
+----+----------------------------------------+---+---+---+---+---+---+---+---+---+---+---+---+---+-------+
| ■  [▶] SECTION A — JUMLAH PASIEN BERDASARKAN CARA PEMBAYARAN       (klik untuk buka → ▼)                |
+----+----------------------------------------+---+---+---+---+---+---+---+---+---+---+---+---+---+-------+
|    |  … isi Section A disembunyikan …                                                                    |
+----+----------------------------------------+---+---+---+---+---+---+---+---+---+---+---+---+---+-------+
| ■  [▼] SECTION B — SURVEY MUTU PELAYANAN …                                                             |
+----+----------------------------------------+---+---+---+---+---+---+---+---+---+---+---+---+---+-------+
| 1  | JUMLAH PASIEN MENINGGAL                | …                                                               |
```

*(Produk bisa memilih: saat Section A dilipat, baris **JUMLAH TOTAL** ikut hilang atau tetap satu baris ringkas — dokumentasikan dalam keputusan UX.)*

---

## 3. Wireframe varian: modal LAPORAN + tab bulan (kolom tunggal aktif)

Jika dipilih pola dari diskusi modal — **satu bulan aktif** pada satu waktu — grid bisa menyempit menjadi **satu set angka per bulan** tanpa scroll horizontal penuh:

```text
+----------------------------------------------------------------------------------+
|  [LAPORAN ICCU]                                              [ Tutup ]           |
+----------------------------------------------------------------------------------+
|  REKAPITULASI JUMLAH PASIEN RUANG ICCU · TAHUN 2026                               |
+----------------------------------------------------------------------------------+
|  [ JAN ] [ FEB ] [ MAR ] [ APR ] [ MEI ] [ JUN ] [ JUL ] [ AGU ] [ SEP ] ...      |
|  ─────                                                                             |
|       ▲ aktif: MAR                                                               |
+----------------------------------------------------------------------------------+
| NO | VARIABEL                              |  MAR 2026  | (opsional YTD / TOTAL) |
+----+----------------------------------------+------------+------------------------+
| [▼] SECTION A — PEMBAYARAN           (klik ▼/▶ untuk lipat / bentang)               |
+----+----------------------------------------+------------+------------------------+
| 1  | UMUM / BAYAR                           |            |                        |
| …  | …                                      |            |                        |
+----+----------------------------------------+------------+------------------------+
| ■  JUMLAH TOTAL                                                                    |
+----+----------------------------------------+------------+------------------------+
| [▼] SECTION B — SURVEY MUTU PELAYANAN   (klik ▼/▶ untuk lipat / bentang)           |
+----+----------------------------------------+------------+------------------------+
| …  | (baris sama seperti §2, satu kolom angka) |            |                        |
+----+----------------------------------------+------------+------------------------+
| [▼] SECTION C — INDIKATOR MUTU …        (klik ▼/▶ untuk lipat / bentang)           |
+----+----------------------------------------+------------+------------------------+
| 1  | BOR (%)                                |            |                        |
| …  | … GDR                                  |            |                        |
+----+----------------------------------------+------------+------------------------+
| [▼] SECTION D — DIAGNOSA TERBANYAK …   (klik ▼/▶ untuk lipat / bentang)           |
+----+----------------------------------------+------------+------------------------+
| …  | STEMI … NON CARDIO                   |            |                        |
+----+----------------------------------------+------------+------------------------+
```

**Versi ringkas jika SECTION B dilipat:**

```text
| … tabs MAR …                                                                     |
+----+----------------------------------------+------------+------------------------+
| [▼] SECTION A — PEMBAYARAN …               |            |                        |
+----+----------------------------------------+------------+------------------------+
| … baris Section A …                                                                |
+----+----------------------------------------+------------+------------------------+
| [▶] SECTION B — SURVEY MUTU PELAYANAN      (tertutup — konten disembunyikan)       |
+----+----------------------------------------+------------+------------------------+
```

Di varian ini, judul tetap **REKAPITULASI JUMLAH PASIEN RUANG ICCU**; yang berubah hanya **kerapatan kolom** (12 bulan vs 1 bulan terpilih).

---

## 4. Perilaku data & edge cases

- **Mei–Des (otomatis dari History pasien):** angka per bulan untuk kolom Mei hingga Desember tidak diisi manual di aplikasi; sumbernya adalah **agregasi** entri ICCU pada **History pasien** (data arsip). Endpoint yang dipakai UI sekarang untuk arsip: **`GET /api/iccu-register?listStatus=archived`** (basis data **`iccu_register_entry`**). Filter **tahun laporan** + pengelompokan **per bulan** memakai satu field tanggal yang disepakati (lihat §2 di atas).
- **Jan–Apr:** pada wireframe ini tetap **demo**; ke depan bisa dihubungkan ke sumber yang sama (History + registrasi aktif per periode) atau impor — diputus terpisah tanpa mengunci perilaku Mei–Des.
- Sel tanpa data: tampilkan `-` atau `0` konsisten dengan kebijakan RS; hindari menampilkan galat rumus seperti `#REF!` di UI.
- Baris **JUMLAH TOTAL** Section A: nilai numerik = jumlah vertikal baris pembayaran di atasnya untuk bulan yang sama (dan kolom TOTAL jika tahun penuh).
- **JUMLAH HARI PERAWATAN** dan metrik yang bersifat akumulatif perlu definisi jelas (sum vs rata-rata) saat integrasi backend.
- **Section C:** rumus **BOR / ALOS / TOI / BTO / NDR / GDR** mengikuti standar mutu RS; kolom TOTAL bisa berarti rata-rata tertimbang tahun atau nilai akhir — tetapkan satu definisi agar tidak membingungkan.
- **Section D:** kolom TOTAL baris diagnosis = jumlah kasus per diagnosis sepanjang tahun (atau sesuai kontrak data).

---

## 5. Ringkasan

Wireframe ini mendeskripsikan laporan **REKAPITULASI JUMLAH PASIEN RUANG ICCU** dengan Section **A–D**, header lipat, bulan **JAN–DES**, demo **Jan–Apr**, serta kebijakan **Mei–Des otomatis dari History pasien** (arsip `iccu_register_entry`). Opsi tampilan **full year** atau **modal + tab bulan** tetap mengikuti diskusi menu LAPORAN.

---

## 6. Grafik per SECTION & animasi (UI)

Implementasi referensi: [`components/intensive/iccu/IccuRekapReportModal.tsx`](components/intensive/iccu/IccuRekapReportModal.tsx) — modal dibuka dari menu Jarvis (laporan **monthly** / `action_value`: `laporan_iccu_rekap`, `iccu_rekap`, atau `rekap_iccu`).

| SECTION | Jenis grafik (demo Jan–Apr) | Animasi |
|--------|-----------------------------|---------|
| **A — Pembayaran** | **Bar bertumpuk** per bulan (UMUM, BPJS, NPBI, RJKS, LAIN) | Recharts `animationDuration` / `animationBegin` bertahap per stack; lipat section **`AnimatePresence`** + animasi tinggi |
| **B — Survey mutu** | **Line chart** tiga seri (meninggal, dirujuk, ventilator) | Garis & titik dengan delay bergilir |
| **C — Indikator mutu** | **Line chart** BOR (%), TOI, BTO | Serupa Section B |
| **D — Diagnosis** | **Bar horizontal** total kasus Jan–Apr (**NON CARDIO** di aksen hijau) | Bar entrance; warna lain palet cyan–ungu |

**Gerakan layar:** backdrop modal (`motion`), panel (**scale** + **translateY**), stagger konten (**Framer Motion** `staggerChildren`). Tombol header tiap section mengisi/lipat grafik seperti accordion pada wireframe §3–§4.

---

## 7. Cek basis data (query SQL — debug rekapitulasi)

Jalankan di **Supabase SQL Editor** atau `psql` sesuai proyek. Ganti `'iccu'` dan `2026` bila perlu (harus sama dengan slug ruangan di URL dashboard dan tahun di modal).

**Tanggal & tahun acuan** (sama dengan migrasi `iccu_rekap_year_payload`): untuk tiap baris,

`coalesce((archived_at at time zone 'utc')::date, periode_masuk, periode_keluar, (created_at at time zone 'utc')::date)`

Baris masuk rekapitulasi tahun laporan jika **`extract(year from ekspresi di atas) = tahun`** dan **`ruangan_id`** cocok.

### 7.1 Pastikan `ruangan_id` untuk ICCU

```sql
select id, slug, nama
from public.ruangan
where lower(trim(slug)) = lower(trim('iccu'));
```

### 7.2 Total baris `iccu_register_entry` untuk ruangan itu (semua tahun)

```sql
select count(*)::int as total_semua_tahun
from public.iccu_register_entry e
where e.ruangan_id = (
  select id from public.ruangan where lower(trim(slug)) = lower(trim('iccu')) limit 1
);
```

### 7.3 Distribusi tahun menurut tanggal acuan RPC (kenapa bisa “hilang” dari satu tahun)

```sql
with ru as (
  select id from public.ruangan where lower(trim(slug)) = lower(trim('iccu')) limit 1
),
src as (
  select
    e.id,
    coalesce(
      (e.archived_at at time zone 'utc')::date,
      e.periode_masuk,
      e.periode_keluar,
      (e.created_at at time zone 'utc')::date
    ) as tanggal_acuan,
    extract(
      year from coalesce(
        (e.archived_at at time zone 'utc')::date,
        e.periode_masuk,
        e.periode_keluar,
        (e.created_at at time zone 'utc')::date
      )
    )::int as tahun_acuan
  from public.iccu_register_entry e
  where e.ruangan_id = (select id from ru)
)
select tahun_acuan, count(*)::int as jumlah_baris
from src
group by tahun_acuan
order by tahun_acuan;
```

### 7.4 Hitung baris yang ikut rekapitulasi tahun tertentu (replikasi filter RPC)

```sql
with ru as (
  select id from public.ruangan where lower(trim(slug)) = lower(trim('iccu')) limit 1
)
select count(*)::int as masuk_rekap_tahun_2026
from public.iccu_register_entry e
where e.ruangan_id = (select id from ru)
  and extract(
    year from coalesce(
      (e.archived_at at time zone 'utc')::date,
      e.periode_masuk,
      e.periode_keluar,
      (e.created_at at time zone 'utc')::date
    )
  )::int = 2026;
```

### 7.5 Panggil fungsi yang sama dengan modal/API

```sql
select public.iccu_rekap_year_payload(
  (select id from public.ruangan where lower(trim(slug)) = lower(trim('iccu')) limit 1),
  2026
) as payload_json;
```

Cek field **`entry_count_year`** di JSON: itu yang ditampilkan sebagai “baris registrasi (filter RPC)”.

### 7.6 Contoh detail per baris (akhirnya masuk tahun/tanggal berapa)

```sql
with ru as (
  select id from public.ruangan where lower(trim(slug)) = lower(trim('iccu')) limit 1
)
select
  e.id,
  e.nama,
  e.no_rm,
  e.archived_at,
  e.periode_masuk,
  e.periode_keluar,
  e.created_at,
  coalesce(
    (e.archived_at at time zone 'utc')::date,
    e.periode_masuk,
    e.periode_keluar,
    (e.created_at at time zone 'utc')::date
  ) as tanggal_acuan,
  extract(
    year from coalesce(
      (e.archived_at at time zone 'utc')::date,
      e.periode_masuk,
      e.periode_keluar,
      (e.created_at at time zone 'utc')::date
    )
  )::int as tahun_acuan
from public.iccu_register_entry e
where e.ruangan_id = (select id from ru)
order by tanggal_acuan desc nulls last
limit 50;
```

Bila §7.2 > 0 tetapi §7.4 = 0: data ada untuk ruangan lain / slug beda, atau **tahun acuan** pasien tidak 2026 (misalnya hanya `created_at` 2025). Sesuaikan tahun di modal atau isi **`periode_masuk`** / arsip sesuai kebijakan RS.

### 7.7 Kasus nyata: ada baris di DB, tetapi `entry_count_year` = 0 untuk tahun laporan

Urutan **`tanggal_acuan`** mengikuti RPC: `archived_at` → **`periode_masuk`** → **`periode_keluar`** → `created_at`.

Contoh: satu baris dengan `archived_at` null, `periode_masuk = '1987-10-25'`, `created_at` di 2026. Maka **`tahun_acuan = 1987`** (bukan 2026). Agregasi tahun **2026** tidak menghitung baris itu — perilaku konsisten dengan filter SQL.

**Opsi:**

1. **Perbaiki tanggal klinis di UI / DB** — `periode_masuk` / `periode_keluar` harus mencerminkan **kunjungan ICCU** pada tahun yang ingin dilaporkan (bukan tahun lahir pasien, typo, atau tanggal uji yang salah).
2. **Uji laporan** — ubah pemilih tahun di modal ke **1987** untuk memastikan baris itu ikut terhitung (jarang dipakai produksi).
3. Kebijakan lain (misalnya laporan mengikuti **`created_at`** saja) harus **diubah di migrasi RPC** dan disepakati RS — bukan bug pada data di atas.

Query cepat membandingkan “tahun sistem” vs “tahun acuan klinis”:

```sql
select
  e.id,
  extract(year from (e.created_at at time zone 'utc')::date)::int as tahun_created,
  extract(
    year from coalesce(
      (e.archived_at at time zone 'utc')::date,
      e.periode_masuk,
      e.periode_keluar,
      (e.created_at at time zone 'utc')::date
    )
  )::int as tahun_acuan_rpc
from public.iccu_register_entry e
where e.ruangan_id = (select id from public.ruangan where lower(trim(slug)) = lower(trim('iccu')) limit 1);
```

---

### 7.8 Kotak ASCII §63–136 — apa yang **ada** di DB?

Angka di **grid wireframe** (Section A–D, Jan–Apr demo) **bukan** baris yang di-*seed* ke Postgres. Tidak ada tabel seperti `iccu_wireframe_demo` berisi 18 / 45 / … untuk kolom JAN.

**Yang ada di basis data:**

| Konsep wireframe | Sumber DB nyata |
|------------------|-----------------|
| Section A (UMUM, BPJS, NPBI, …) | Agregasi dari **`jenis_pembiayaan`** per baris `iccu_register_entry`, via fungsi `iccu_register_payment_bucket` di RPC |
| Section B (meninggal, ventilator, `sum_los_hari`, …) | Kolom **`section_b`** di JSON hasil RPC — dihitung dari kolom tabel `iccu_register_entry` (`cara_keluar`, `invasive_procedures`, `los_hari`, dll.). Untuk demo §7.9 + **`20260501120000_*`**, nilai-nilai itu diisi sintetis agar Jan–Apr mengikuti ASCII |
| Section C (BOR, ALOS, …) | Sebagian placeholder / **avg_los** dari LOS; NDR/GDR **belum** kolom RPC penuh |
| NPBI 1 / 2 / 3 | Tetap agregat **`npbi`** di RPC; pecahan 1/2/3 **hanya** mode contoh wireframe di UI |
| Section D diagnosis | **`diagnosa`** → bucket `iccu_register_diagnosa_bucket` |

Untuk memastikan **skema** dan **isi mentah** registrasi:

```sql
/** Kolom tabel registrasi ICCU (mapping ke RPC). */
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'iccu_register_entry'
order by ordinal_position;
```

```sql
/** Contoh baris mentah: pembayaran & tanggal acuan (bandingkan dengan filter tahun laporan). */
with ru as (
  select id from public.ruangan where lower(trim(slug)) = lower(trim('iccu')) limit 1
)
select
  e.id,
  e.jenis_pembiayaan,
  public.iccu_register_payment_bucket(e.jenis_pembiayaan) as bucket_pembayaran_rpc,
  e.cara_keluar,
  e.diagnosa,
  e.los_hari,
  coalesce(
    (e.archived_at at time zone 'utc')::date,
    e.periode_masuk,
    e.periode_keluar,
    (e.created_at at time zone 'utc')::date
  ) as tanggal_acuan
from public.iccu_register_entry e
where e.ruangan_id = (select id from ru)
order by e.updated_at desc nulls last
limit 25;
```

**Angka persis seperti kotak ASCII** bisa ditampilkan lewat **checkbox contoh wireframe** di modal (tanpa Postgres), atau lewat **seed migrasi §7.9** (Section A + B + D dari kolom entri; LOS Jan–Apr; slug `iccu` tahun 2026). **NON CARDIO** di Postgres mengisi sisa baris per bulan setelah delapan bucket berlabel sehingga jumlahnya bisa lebih besar dari angka NON CARDIO di kotak ASCII (yang tidak menjumlahkan ke total pasien per bulan). Untuk angka lain per tahun/slug, gunakan data registrasi nyata — bandingkan dengan:

```sql
/** Satu-satunya sumber kebenaran angka laporan tahun = keluaran RPC (sama dengan modal). */
select public.iccu_rekap_year_payload(
  (select id from public.ruangan where lower(trim(slug)) = lower(trim('iccu')) limit 1),
  2026
) as sama_seperti_api_modal;
```

Isi **`months`** / **`entry_count_year`** di JSON itulah yang bisa Anda cocokkan secara makro dengan wireframe (bukan mencari tabel berisi angka 105, 115, … secara literal).

### 7.9 Seed Postgres untuk Section A (Jan–Apr) di tahun tertentu

Migrasi opsional **`20260501100000_seed_iccu_wireframe_rekap_demo.sql`** men‑insert **441 baris** sintetis ke **`iccu_register_entry`** (`keterangan = '__wireframe_seed_rekap_demo__'`) untuk ruangan **`slug = iccu`**, tahun **`2026`**, dengan **`jenis_pembiayaan`** yang mengisi bucket pembayaran seperti wireframe (UMUM 18 / BPJS 45 / … per bulan Jan–Apr), dan **`los_hari`** didistribusikan agar **`sum_los_hari`** per bulan mengikuti demo §2 (142, 156, 148, 162).

Migrasi **`20260501120000_update_iccu_wireframe_seed_section_b_d.sql`** (jalan setelah seed di atas) meng‑**UPDATE** baris yang sama dengan **`cara_keluar`**, **`meninggal_within_48h`**, **`invasive_procedures`**, dan **`diagnosa`** agar RPC mengisi Section **B** dan **D** sesuai angka wireframe §63–136 per bulan Jan–Apr (delapan diagnosis berlabel pertama; sisanya **`diagnosa` null** → bucket **NON CARDIO**).

Setelah **`supabase db push`** (atau jalankan SQL tersebut di editor):

- Modal rekapitulasi tahun **2026** tanpa checkbox demo akan menampilkan **Section A**, **Section B**, dan **Section D** selaras agregat demo untuk bulan Jan–Apr (total baris RPC ≈ **441**).
- Untuk menghapus demo: `delete from public.iccu_register_entry where keterangan = '__wireframe_seed_rekap_demo__';`
- Tahun/slug lain: salin migrasi dan ubah variabel `v_y` / syarat `slug` di dalam skrip.

**Section C** (BOR %, TOI, BTO, NDR, GDR per sel ASCII): RPC masih hanya **`avg_los_hari`** + catatan placeholder; angka BOR/TOI/BTO/NDR/GDR seperti §2 **belum** dihitung dari baris registrasi — checkbox **Contoh wireframe** tetap dipakai jika Anda butuh grid identik ASCII untuk indikator itu.

