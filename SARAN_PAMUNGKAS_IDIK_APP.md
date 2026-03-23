# Saran Pamungkas — IDIK-App

Rekomendasi prioritas untuk IDIK-App (Next.js 15, Supabase, JWT, dashboard medis).

---

## ✅ Yang Sudah Diperbaiki

| Area | Perbaikan |
|------|-----------|
| **Middleware** | `middleware.ts` aktif; RBAC untuk `/dashboard/audit` dan `/dashboard/database` jalan. Secret JWT dibaca per-request agar sama dengan API. |
| **Auth** | Login `POST /api/auth` **hanya** dari **`app_users`** (bcrypt) via Supabase **service role**. Tidak ada fallback user di env/source. `JWT_SECRET` wajib di production. |
| **Env** | `.env.example` ada; panduan `JWT_SECRET`, URL Supabase, service role. |
| **Login API** | Response 200 + JSON `{ ok, target }` + cookie; client bisa redirect sesuai role (bukan 307 yang bikin `res.json()` gagal). |
| **Login UX** | Password hide/show (ikon mata), submit pakai Enter di form, Enter di root buka form login, fokus awal ke username (hanya sekali, tidak cabut fokus saat ketik password). |
| **Supabase client** | Satu client browser (`lib/supabase/supabaseClient`); yang lain re-export. Peringatan "Multiple GoTrueClient instances" diatasi. |
| **Unauthorized** | Halaman `/unauthorized` ada + link "Kembali ke Beranda". |
| **Auth dari DB** | Login **hanya** **`app_users`** (Supabase + service role). Tanpa itu, **503**. Lihat `docs/AUTH-DB.md`. |

---

## 🎯 Saran Pamungkas (Prioritas)

### P1 — Auth & Sumber User ✅ (Sudah: murni DB)

**Login terhubung ke DB saja:** `LoginModal` → **`POST /api/auth`** memvalidasi **`app_users`** (`username` + `password_hash` bcrypt) memakai **`NEXT_PUBLIC_SUPABASE_URL`** + **`SUPABASE_SERVICE_ROLE_KEY`** (atau `SUPABASE_SERVICE_KEY`). Tanpa keduanya: **503**. Salah kredensial / tidak ada baris: **401**.

- Dokumentasi: **`docs/AUTH-DB.md`**. Seed: **`npx tsx scripts/seed-app-user.ts`** (setelah migration `app_users`).

**Catatan arsitektur:** ada juga route **`/api/auth/login`** (Supabase Auth + redirect 307) — untuk jangka panjang pilih **satu** jalur utama (JWT + `app_users` *atau* Supabase Auth) agar operasi tidak bingung.

---

### P2 — Kode & Type-Safety

- **Database types:** `lib/database.types.ts` baru lengkap untuk `doctor`. Lengkapi untuk tabel yang sering dipakai (pasien, tindakan, users, logs) agar type-safe dan refactor aman.
- **Nama file server:** `server-.ts` (strip) membingungkan; pertimbangkan rename ke `server-ssr.ts` atau gabung ke `server.ts` dengan export async createClient, agar konsisten.

---

### P3 — Fitur & Ops

- **Signup:** Kalau ingin user daftar sendiri, tambah flow (Supabase Auth signUp atau API + hash password + insert ke `users`) dan atur approval/verifikasi email jika perlu.
- **Production checklist:** Sebelum deploy: `NODE_ENV=production`, `JWT_SECRET` set (bukan dev-secret), Supabase URL + service role + baris `app_users` siap, cookie `secure: true` di HTTPS.

---

## Ringkasan Satu Halaman

| Prioritas | Apa yang dilakukan |
|-----------|--------------------|
| **P1** | LoginModal sudah → **`POST /api/auth`** + **`app_users`**. Lanjut: satukan dengan jalur Supabase Auth **atau** deprecate salah satu; dokumentasikan keputusan. |
| **P2** | Lengkapi `database.types.ts`; rapikan nama/struktur Supabase server client. |
| **P3** | Tambah signup jika perlu; cek production checklist. |

**Langkah berikut yang paling berdampak:** rapikan **satu** strategi auth (JWT/`app_users` vs Supabase Auth), lalu lengkapi **`database.types.ts`** untuk modul utama (pasien, tindakan, users).

---

## 🔐 Audit Level (11 Role) — Saran Pamungkas

IDIK-App mendefinisikan **11 level role** (dari terendah ke tertinggi):

| # | Role | Keterangan singkat |
|---|------|--------------------|
| 1 | pasien | Tidak akses dashboard staff (portal pasien saja jika ada) |
| 2 | dokter | Modul dokter, baca pasien & tindakan |
| 3 | perawat | Pasien, inventaris, pemakaian, tindakan |
| 4 | IT | System, api-keys, console (teknis) |
| 5 | radiografer | Modul radiologi / hasil pemeriksaan |
| 6 | casemix | Laporan, coding, data casemix |
| 7 | admin | Admin operasional |
| 8 | administrator | User management, view audit |
| 9 | superadmin | Penuh: audit log, database console, semua system |
| 10 | distributor | Modul vendor/distributor |
| 11 | depo_farmasi | Operasional depo farmasi |

**Dokumen lengkap:** **`docs/AUDIT_LEVEL_IDIK.md`** (matriks akses per modul, redirect login, implementasi DB/middleware/API/menu).

**Saran pamungkas implementasi:**

1. **P1 — DB + Auth + Middleware:** Perluas kolom `role` di `app_users` (constraint 11 nilai); update `routeMap` di `app/api/auth/route.ts` untuk 11 role; di middleware bedakan **superadmin-only** (database, audit API) vs **administrator+** (view audit, admin dashboard) vs **admin** (hanya dashboard admin).
2. **P2 — Access Matrix + API Guard:** Definisikan 11 role di `app/governance/accessMatrix.ts`; gunakan `requireRole()` / `requireSuperadmin()` di route sensitif (audit, database, users).
3. **P3 — Menu by role:** Filter menu/sidebar berdasarkan role (mis. tambah `roles` di `menuConfig`) agar setiap user hanya lihat modul yang diizinkan.

Dengan ini, audit level konsisten di DB, middleware, API, dan UI.

---

## 📦 Stok distributor & riwayat mutasi (ledger)

**Prinsip pamungkas:** stok **Cathlab** pada `inventaris.stok` adalah **hasil akumulasi** peristiwa; setiap perubahan layak dicatat di **buku besar** (`inventaris_stok_mutasi`) agar bisa diaudit (kirim, retur, rusak, pemakaian, koreksi).

| Komponen | Status |
|----------|--------|
| Tabel `inventaris_stok_mutasi` + RPC `apply_inventaris_stok_mutasi` | Migration `20260320120000_inventaris_stok_mutasi.sql` |
| Pemakaian FIFO (`allocate_pemakaian_fifo`) menulis **KELUAR_PEMAKAIAN** | Disertakan di migration yang sama |
| API portal | `GET/POST /api/distributor/mutasi` — lihat `app/api/distributor/mutasi/route.ts` |
| UI distributor | Menu **Riwayat** (`/distributor/riwayat`) = feed `distributor_event_log` (katalog, retur, mutasi, FIFO). Di **Barang** → **Retur** = keluarkan mapping (sama `DELETE` + `?via=retur` → `KATALOG_RETUR`). Input mutasi stok per baris **dihapus** dari portal distributor — stok fisik di RS |
| Referensi teknik | **`docs/DISTRIBUTOR-STOK-LEDGER.md`** (API, migrasi, modul) |
| Respons produk | `inventaris_lines` per `master_barang_id` di `GET /api/distributor/produk` |

**Langkah operasional:** setelah pull kode, jalankan migrasi (`supabase db push` / pipeline migration). Data pemakaian **sebelum** migrasi **tidak** punya baris ledger otomatis; pertimbangkan skrip backfill satu kali bila audit historis wajib.

**Saran pamungkas — Retur di portal vs stok RS**

1. **Retur di Barang** hanya menghapus **mapping** `distributor_barang` dan menulis **`KATALOG_RETUR`** ke `distributor_event_log`. Ini **bukan** retur fisik / pengurangan otomatis di `inventaris` — jelaskan di UI (sudah di dialog).
2. **Retur kuantitas nyata** (barang keluar gudang, pengembalian ke supplier) tetap lewat **modul inventaris RS** (`apply_inventaris_stok_mutasi`, tipe **RETUR** atau setara) agar ledger stok selaras dengan rak.
3. **Notifikasi / SLA:** jika distributor mengharapkan email “barang diretur”, picu dari **event log** atau dari **ledger** — jangan duplikasi; pilih satu sumber kebenaran per jenis peristiwa.
4. **Audit:** bandingkan jumlah `KATALOG_RETUR` vs mutasi **RETUR** di inventaris; selisih besar = mapping dicabut tanpa pengurangan stok fisik (sengaja atau butuh tindak lanjut RS).

**P2 berikutnya yang berdampak besar**

1. **RS dashboard:** form mutasi untuk farmasi (sama-sama RPC) + laporan mutasi per tanggal.  
2. **Backfill:** `INSERT` ledger dari `pemakaian` existing dengan `qty_delta = -jumlah` (hati-hati stok sudah turun).  
3. **Referensi:** no. DO / batch di `keterangan` atau kolom `ref_type`/`ref_id` diperluas (mis. `surat_jalan_id`).  
4. **Hak akses:** koreksi stok bisa dibatasi hanya role farmasi/admin RS; distributor hanya **MASUK** / **RETUR** / **RUSAK** sesuai kebijakan.

---

## 🔔 Alur distributor ideal (1–5) ↔ notifikasi — saran pamungkas

Berikut pemetaan **alur bisnis yang Anda inginkan** ke **komponen teknis** sekarang + **celah** + **rekomendasi** agar poin 1–5 benar-benar **tersambung notifikasi** (`distributor_notification_settings`, digest email, dsb.).

### Pemetaan alur

| # | Alur bisnis | Sumber kebenaran di IDIK-App | Riwayat / histori |
|---|-------------|------------------------------|-------------------|
| **1** | Distributor menambah barang | `POST /api/distributor/produk` → `distributor_barang` (+ `master_barang` jika baru) | Bukan ledger stok; **produk/katalog** tercatat. Stok Cathlab tetap **0** sampai ada inventaris + mutasi **MASUK**. |
| **2** | Retur atau petugas input **pemakaian** → stok berkurang | Pemakaian: alur FIFO / `allocate_pemakaian_fifo` → baris ledger **KELUAR_PEMAKAIAN**. Retur: mutasi tipe sesuai kebijakan (mis. **RETUR**) via `apply_inventaris_stok_mutasi` | **`inventaris_stok_mutasi`** + tampilan **Riwayat stok** / mutasi per produk |
| **3** | Distributor kirim barang → stok bertambah | Mutasi **MASUK** (atau tipe yang disetujui) pada `inventaris` Cathlab yang terhubung `master_barang_id` | Sama: **ledger** + riwayat |
| **4** | Distributor **hapus** barang (mapping) | `DELETE /api/distributor/produk/[id]` → hapus **mapping** `distributor_barang`, **bukan** menghapus `master_barang` global | **Histori stok tidak wajib** punya baris “hapus produk” hari ini: penghapusan adalah **metadata mapping**, bukan peristiwa kuantitas. Jika butuh audit: **log peristiwa terpisah** (lihat bawah). |
| **5** | Semua relevan → **notifikasi** | Halaman **`/distributor/notifikasi`** + API **`/api/distributor/notifikasi/settings`** (email digest, low stock, dsb.) | Saat ini **pengaturan** ada; **pemicu otomatis** dari tiap peristiwa (1–4) perlu **dihubungkan** (belum satu pipeline end-to-end). |

### Prinsip pamungkas arsitektur

1. **Bedakan tiga jenis “histori”**
   - **Ledger stok** = `inventaris_stok_mutasi` (kuantitas, audit FIFO).
   - **Katalog distributor** = `distributor_barang` (harga, LOT, ED, kategori alkes) — CRUD tersendiri.
   - **Audit produk / kejadian bisnis** (opsional tapi bagus untuk notifikasi): tabel mis. `distributor_event_log` (`distributor_id`, `event_type`, `payload jsonb`, `created_at`) untuk: `PRODUCT_CREATED`, `PRODUCT_DELETED`, `MUTASI_MASUK`, `LOW_STOCK`, `PEMAKAIAN_KELUAR` (atau cukup baca dari ledger + trigger).

2. **Notifikasi jangan query UI-heavy**  
   Gunakan **satu pintu**: setelah RPC `apply_inventaris_stok_mutasi` sukses **atau** setelah `DELETE` mapping **atau** setelah `INSERT` pemakaian, **enqueue** pekerjaan: insert baris ke `notifications` / email queue / webhook.  
   Pola yang tahan beban: **outbox table** + job (cron / Edge Function) yang mengirim email sesuai `distributor_notification_settings`.

3. **Menyambung 1–5 ke notifikasi (urutan implementasi)**

   | Prioritas | Apa | Mengapa |
   |-----------|-----|--------|
   | **N1** | Trigger DB atau hook API setelah **mutasi berhasil** → insert `distributor_event_log` atau langsung **email/in-app** jika `low_stock_enabled` / ambang tercapai | Menutup alur **2–3** |
   | **N2** | Setelah **pemakaian** mengurangi stok → notifikasi ke distributor (ringkasan harian sudah ada konsep **daily_digest** di settings) | Menutup alur **2** |
   | **N3** | Setelah **POST produk** baru → notifikasi opsional “produk terdaftar” atau masuk digest saja | Menutup alur **1** |
   | **N4** | Setelah **DELETE mapping** → catat `PRODUCT_DELETED` di log + email sekali / digest | Menutup alur **4**; jelaskan di UI bahwa **stok fisik** tidak ikut “dihapus” oleh aksi ini |
   | **N5** | Satu **daftar peristiwa** di portal distributor (“Feed”) yang membaca dari `distributor_event_log` atau agregasi dari `inventaris_stok_mutasi` + log CRUD | Membuat **1–5** terasa “tersambung” tanpa membuka banyak menu |

4. **Hal yang sering salah paham (dokumentasikan di UI)**
   - **Hapus produk distributor** ≠ menghapus stok dari rak: itu **putus mapping**; stok di `inventaris` tetap sampai RS mutasi manual.  
   - **Stok Cathlab** di tabel barang = agregat **inventaris**, bukan kolom di form tambah.

5. **Keamanan notifikasi**
   - Jangan kirim detail pasien ke email distributor kecuali kebijakan RS dan **PII** sudah disaring.  
   - Digest **aggregate** (jumlah pemakaian, SKU di bawah min) lebih aman daripada per pasien.

### Ringkasan satu kalimat

**Saran pamungkas:** jadikan **`inventaris_stok_mutasi`** sumber kebenaran untuk **stok + histori kuantitas**; tambah **log peristiwa bisnis** (atau trigger) untuk **produk dibuat/dihapus**; hubungkan ke **`distributor_notification_settings`** lewat **job terjadwal + outbox** agar retur, pemakaian, kirim barang, dan CRUD produk semua memicu **notifikasi konsisten** tanpa menggandakan logika di setiap halaman React.
