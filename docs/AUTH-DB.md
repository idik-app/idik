# Login IDIK-App via Database (app_users)

Login memvalidasi kredensial **hanya** ke **tabel `app_users`** di Supabase (username + `password_hash` bcrypt). Tanpa **`NEXT_PUBLIC_SUPABASE_URL`** dan **service role**, `POST /api/auth` mengembalikan **503**. Tidak ada user di env atau hardcoded di kode untuk login ini.

## 0. Variabel lingkungan (ringkas)

| Variabel | Kapan wajib | Keterangan |
|----------|-------------|------------|
| `JWT_SECRET` | **Wajib di production** (`next build` / `next start` / deploy) | Menandatangani cookie sesi JWT. Tanpa ini, `POST /api/auth` mengembalikan **503** dan login gagal. Di `next dev`, jika kosong dipakai fallback `dev-secret` (hanya untuk lokal). |
| `NEXT_PUBLIC_SUPABASE_URL` | **Wajib** untuk `POST /api/auth` | URL proyek Supabase. |
| `SUPABASE_SERVICE_ROLE_KEY` atau `SUPABASE_SERVICE_KEY` | **Wajib** untuk `POST /api/auth` | Service role (bukan anon); server membaca `app_users` (RLS boleh mengunci ke service_role). |

Template variabel (tanpa nilai rahasia): **`.env.example`** — salin ke **`.env.local`** lalu isi.

**Cek cepat tanpa menampilkan secret:**

```bash
npm run check:auth-env
# Simulasi gate seperti production (JWT + Supabase wajib lengkap):
npm run check:auth-env -- --strict-prod
```

Samakan `JWT_SECRET` di semua environment tempat app berjalan (sama dengan yang dibaca `middleware` untuk verifikasi cookie).

## 1. Buat tabel

**Lokasi file migration (jika pakai Supabase CLI):**  
`supabase/migrations/20250312000000_create_app_users.sql`

Jalankan migration:

```bash
npx supabase db push
```

**Atau** (tanpa file migration) jalankan SQL berikut di **Supabase Dashboard → SQL Editor**:

```sql
create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  role text not null default 'user' check (role in ('admin', 'staff', 'user')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.app_users enable row level security;

create policy "Service role only"
  on public.app_users for all
  using (auth.role() = 'service_role');

create index if not exists idx_app_users_username on public.app_users (username);
```

## 2. Seed user admin pertama

**Opsi A — Script (butuh env Supabase):**

Set di `.env.local`:

- `JWT_SECRET` (disarankan juga di lokal agar sama dengan production)
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` atau `SUPABASE_SERVICE_KEY`

Lalu (kredensial **wajib** lewat env — script tidak punya default di kode):

```bash
SEED_USERNAME=nama_user SEED_PASSWORD=GantiPasswordKuat npx tsx scripts/seed-app-user.ts
```

**User distributor (login `ayu` / portal `/distributor/*`):**

- Kolom **`password_hash`** wajib terisi (bcrypt). Tanpa itu, login selalu ditolak meskipun baris `username` ada.
- Kolom **`distributor_id`** wajib mengarah ke **`public.master_distributor.id`** (`uuid`). JWT menyalin nilai ini; `lib/auth/distributor.ts` menolak token distributor tanpa `distributor_id`.
- Tidak ada akun distributor bawaan di kode — selalu lewat baris **`app_users`**.

Seed contoh:

```bash
SEED_USERNAME=ayu SEED_PASSWORD=PasswordKuat SEED_ROLE=distributor SEED_DISTRIBUTOR_ID=2d1775d4-d760-45a8-896f-06bb879d9853 npx tsx scripts/seed-app-user.ts
```

Atau `UPDATE` baris yang sudah ada: set `password_hash` (hash bcrypt) dan pastikan `distributor_id` tidak null.

**Opsi B — Hash manual lalu SQL:**

```bash
node -e "const b=require('bcryptjs'); b.hash('PasswordAnda',10).then(h=>console.log(h))"
```

Lalu di Supabase SQL Editor:

```sql
insert into public.app_users (username, password_hash, role)
values ('admin', '<hash_dari_perintah_diatas>', 'admin')
on conflict (username) do update set password_hash = excluded.password_hash, updated_at = now();
```

## 3. Alur login

1. User isi username + password di LoginModal.
2. `POST /api/auth`: cari `app_users` by username (pakai service key), bandingkan password dengan `bcrypt.compare`.
3. Jika cocok: terbitkan JWT, set cookie, respons JSON `{ ok, target }` (client redirect sesuai role).
4. Jika username/salah password atau baris tidak ada: **401**. Jika Supabase URL/service role tidak di-set: **503**.

## 4. Role & redirect

Peta resmi ada di `lib/auth/redirect.ts` (`getRedirectTargetForRole`). Contoh: `admin` → `/dashboard/admin`, `pasien` → `/dashboard`, `distributor` → `/distributor/dashboard`, dll.
