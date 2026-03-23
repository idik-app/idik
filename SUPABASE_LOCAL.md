# Supabase Lokal dengan Docker Desktop

Supabase bisa dijalankan **di komputer Anda** pakai Docker. Semua service (Postgres, Auth, API, Studio) berjalan di container.

## Cara cek: Supabase lokal vs online

| Cara | Lokal | Online (cloud) |
|------|--------|-----------------|
| **Lihat `.env.local`** | `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` | `NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co` |
| **API diagnostics** | `GET /api/system/diagnostics` → `supabase.mode: "local"` | `supabase.mode: "remote"` |
| **Halaman Auth Debug** | Buka `/auth-debug` → tampil **"Supabase: Lokal (Docker)"** | Tampil **"Supabase: Online (Cloud)"** |

Rule singkat: jika host URL adalah **127.0.0.1** atau **localhost** → lokal; selain itu → online.

### Jika muncul "127.0.0.1 sent an invalid response" atau "HTTP ERROR 404"

- **Pakai URL lengkap + port.** Jangan buka hanya `http://127.0.0.1` (tanpa port).
  - **Aplikasi IDIK:** `http://localhost:3000` atau `http://127.0.0.1:3000`
  - **Supabase Studio:** `http://localhost:54323` atau `http://127.0.0.1:54323`
- **Supabase lokal harus jalan.** Kalau `.env.local` pakai `http://127.0.0.1:54321`, jalankan dulu:
  ```bash
  npm run db:local:start
  ```
  Lalu buka app di `http://localhost:3000`.
- **404 di halaman app:** Pastikan path benar (mis. `/dashboard`, `/auth-debug`). Root `/` bisa redirect ke dashboard atau login.

## Prasyarat

1. **Docker Desktop** — sudah terinstall dan **Engine running** (cek pojok kiri bawah).
2. **Supabase CLI** — sudah ada (Anda pakai `db:push`, `db:dump`).

## 1. Jalankan Supabase lokal

Di root project (`d:\idik-app`):

```bash
npx supabase start
```

Atau pakai script:

```bash
npm run db:local:start
```

Pertama kali akan pull image Docker (beberapa menit). Setelah selesai, CLI menampilkan **API URL**, **anon key**, dan **service_role key**.

## 2. Ambil URL dan key lokal

Jalankan:

```bash
npx supabase status
```

Atau:

```bash
npm run db:local:status
```

Contoh output:

```
API URL: http://127.0.0.1:54321
GraphQL URL: http://127.0.0.1:54321/graphql/v1
DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
Studio URL: http://127.0.0.1:54323
Inbucket URL: http://127.0.0.1:54324
anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....
```

**Salin** `anon key` dan `service_role key` (panjang, dimulai `eyJ...`).

## 3. Pakai Supabase lokal di idik-app

**Opsi A — Ganti .env.local sementara (untuk development lokal)**

1. Backup dulu: salin `.env.local` jadi `.env.local.remote` (untuk simpan nilai cloud).
2. Edit `.env.local`:

```env
# Supabase LOKAL (Docker)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<paste anon key dari supabase status>
SUPABASE_SERVICE_ROLE_KEY=<paste service_role key dari supabase status>
```

3. Restart dev server: `npm run dev`.

**Opsi B — Dua file env (pilih saat jalan)**

- `.env.local` → tetap untuk **remote** (Supabase cloud).
- Buat `.env.local.supabase` berisi tiga baris di atas (URL + anon + service_role).
- Saat mau pakai lokal: copy isi `.env.local.supabase` ke `.env.local`, lalu restart dev.

## 4. Supabase Studio (UI) lokal

Buka di browser:

**http://127.0.0.1:54323**

Di sini bisa lihat tabel, SQL Editor, Auth users, Storage, dll. — sama seperti dashboard Supabase cloud, tapi untuk DB lokal.

## 5. Schema & data lokal

- **Hanya migration (tanpa dump):**  
  Setelah `supabase start`, jalankan sekali:
  ```bash
  npx supabase db reset
  ```
  Ini menjalankan semua file di `supabase/migrations/` (tabel `public.*` dari project).

- **Sama persis dengan remote (termasuk schema `idik` + data):**  
  Setelah `db reset`, restore dump:
  ```bash
  # Di PowerShell (Windows)
  $env:PGPASSWORD = "postgres"
  psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f dump.sql
  ```
  Atau pakai tool seperti pgAdmin / DBeaver: koneksi `127.0.0.1:54322`, user `postgres`, password `postgres`, lalu jalankan isi `dump.sql`.

  **Jika sudah restore dump dan ingin API bisa akses schema `idik`:**  
  Di `supabase/config.toml`, tambah `"idik"` ke `[api] schemas` dan `extra_search_path`, lalu jalankan `npx supabase stop` dan `npx supabase start` lagi.

## 6. Berhenti dan hapus container

```bash
npx supabase stop
```

Atau:

```bash
npm run db:local:stop
```

Untuk hapus container **dan** volume (data lokal ikut hilang):

```bash
npx supabase stop --no-backup
```

## Ringkasan perintah

| Tujuan              | Perintah                    |
|---------------------|-----------------------------|
| Start Supabase lokal| `npm run db:local:start`    |
| Lihat URL & key     | `npm run db:local:status`   |
| Stop                | `npm run db:local:stop`     |
| Reset DB (migration)| `npm run db:reset` (dengan .env lokal) |

Docker Desktop dipakai Supabase CLI untuk menjalankan container; pastikan Docker Desktop **running** sebelum `supabase start`.
