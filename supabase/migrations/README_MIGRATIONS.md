# Migrations IDIK-App

Semua modul punya representasi di DB lewat migration ini.

## Urutan migration (sudah berjalan otomatis oleh Supabase)

| File | Isi |
|------|-----|
| `20250312000000_create_app_users.sql` | Tabel login app (username, password_hash, role) |
| `20250312100000_alter_app_users_roles.sql` | Perluasan role (9 level) |
| `20250313000000_create_pasien.sql` | Tabel **pasien** (modul Pasien) |
| `20250313000001_create_doctor.sql` | Tabel **doctor** (modul Dokter) |
| `20250313000002_create_tindakan.sql` | Tabel **tindakan** + view **tindakan_medik** (modul Tindakan) |
| `20250313000003_create_inventaris.sql` | Tabel **inventaris** (modul Inventaris) |
| `20250313000004_create_pemakaian.sql` | Tabel **pemakaian** (modul Pemakaian) |
| `20250313000005_create_view_pasien_full.sql` | View **view_pasien_full** (untuk PasienProvider) |

## Menjalankan migration

**Lokal (Supabase CLI):**
```bash
supabase db reset
# atau apply saja:
supabase migration up
```

**Remote (link dulu):**
```bash
supabase link --project-ref <project-ref>
supabase db push
```

## Nama tabel yang dipakai kode

- **Pasien:** `pasien`, `view_pasien_full`
- **Dokter:** `doctor` (DokterContext & ModalTambahDokter sudah pakai ini)
- **Tindakan:** `tindakan` (utama), `tindakan_medik` (view, untuk kompatibilitas)
- **Inventaris:** `inventaris`
- **Pemakaian:** `pemakaian`

Setelah migration jalan, modul Inventaris dan Pemakaian bisa dihubungkan ke UI dengan fetch dari tabel ini.

## Troubleshooting

### `Could not find the 'barcode' column of 'distributor_barang' in the schema cache`

Artinya database yang dipakai **Supabase URL / service role** di `.env.local` belum punya kolom `barcode` pada `distributor_barang`, atau **PostgREST** belum memuat ulang skema.

1. **Pastikan project benar** — `npm run db:push` memakai `DATABASE_URL` / link ke project yang sama dengan URL di env app.
2. **Push migrasi terbaru** — dari root repo: `npm run db:push`.
3. **Supabase lokal** (`supabase start`) — setelah pull migrasi baru: `supabase db reset` (memakai Docker).
4. **Manual** — di **SQL Editor** dashboard project yang dipakai app, jalankan:

```sql
alter table public.distributor_barang
  add column if not exists barcode text;
```

Lalu tunggu beberapa detik atau buka **Project Settings → API** dan pakai opsi reload schema bila tersedia (atau **Restart project** pada project kecil).

Kolom ini juga ditambahkan oleh `20260321100000_distributor_barang_barcode.sql` dan migrasi `ensure` berikutnya; `if not exists` aman dijalankan berulang.

### `invalid input syntax for type date: "09-2028"`

Kolom `distributor_barang.ed` harus bertipe **text** (format **MM-YYYY**). Jika masih **date**, Postgres menolak string `09-2028`.

Jalankan `npm run db:push` agar migrasi `20260322200000_distributor_barang_ed_force_text.sql` (dan sebelumnya `20260320150000`) mengonversi kolom ke text. Atau di SQL Editor:

```sql
alter table public.distributor_barang drop constraint if exists distributor_barang_ed_mm_yyyy_ck;
alter table public.distributor_barang
  alter column ed type text using (
    case when ed is null then null else to_char(ed, 'MM-YYYY') end
  );
-- lalu tambahkan kembali constraint MM-YYYY seperti di file migrasi tersebut
```
