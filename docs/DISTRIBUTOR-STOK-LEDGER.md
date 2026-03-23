# Ledger stok distributor (implementasi)

## Database

- Migration: `supabase/migrations/20260320120000_inventaris_stok_mutasi.sql`
  - Tabel `inventaris_stok_mutasi`
  - Fungsi `apply_inventaris_stok_mutasi` (atomik: cek stok, insert ledger, update `inventaris.stok`)
  - `allocate_pemakaian_fifo` menulis baris `KELUAR_PEMAKAIAN` ke ledger

Terapkan: `npm run db:push` (atau pipeline migration Supabase).

## API

| Method | Path | Keterangan |
|--------|------|------------|
| GET | `/api/distributor/mutasi?recent_all=1&limit=100&distributor_id=` | Buku besar agregat (admin wajib `distributor_id`) |
| GET | `/api/distributor/mutasi?master_barang_id=&distributor_id=` | Riwayat per master barang |
| GET | `/api/distributor/mutasi?inventaris_id=` | Riwayat satu baris inventaris |
| POST | `/api/distributor/mutasi` | Catat mutasi manual (tipe: MASUK, KELUAR_RETUR, KELUAR_RUSAK, KOREKSI) |

## UI

- `/distributor/riwayat` — menu **Riwayat** (jejak peristiwa katalog & stok terkait tabel Barang); `/distributor/riwayat-stok` mengalihkan ke sini
- `/distributor/barang` — tombol **Mutasi** (kolom Aksi), respons produk memuat `inventaris_lines`

## Modul bersama

- `lib/inventarisMutasi.ts` — label & tipe
