# SIMRS Playwright Bot → idik-app

Bot di PC **jaringan RS** untuk:

1. **MVP cepat:** `getPasien` (HTTP) → isi master pasien idik via API (`--write`), fallback UI Playwright (`--ui`)
2. **Explore SIMRS web:** login → jelajahi menu sampai submenu terkecil (read-only) → `artifacts/simrs-menu-map.json`
3. **Lihat Rekam Medis:** buka Chromium (headed) → login → buka dropdown Rekam Medis → log submenu + screenshot
4. **Fill-empty (lanjutan):** PATCH field kosong tindakan yang aman dari getPasien

## Prasyarat

- Windows/PowerShell OK
- Node 20+
- Akses LAN ke:
  - `http://10.250.10.107/apibdrs/apibdrs/getPasien/{norm}`
  - `http://10.255.200.252/SIMRS/` (untuk explore web)
  - idik (`localhost:3000` atau Vercel)
- **Jangan** andalkan lookup SIMRS dari browser Vercel jika tunnel putus (error **530**).
  Perbaiki Cloudflare Tunnel: [docs/simrs-tunnel.md](../../docs/simrs-tunnel.md).

## Cadangan saat Vercel error 530

Jika form Tambah Pasien di Vercel gagal (`SIMRS … 530`) tetapi LAN OK:

```powershell
# di PC jaringan RS
cd tools/simrs-playwright-bot
npm run add-pasien -- --norm 762863 --write
```

Checklist tunnel HTTPS + env Vercel: lihat dokumen di atas.

## Setup

```powershell
cd tools/simrs-playwright-bot
copy .env.example .env
# isi IDIK_USER, IDIK_PASS, SIMRS_WEB_USER, SIMRS_WEB_PASS
npm install
npm run playwright:install
```

Di luar LAN, uji mapping dengan mock:

```env
SIMRS_GET_PASIEN_MOCK=fixtures/getPasien-929331.json
```

## Perintah

```powershell
npm run preflight

# Dry-run (default) — tidak menulis
npm run add-pasien -- --norm 929331

# Tulis ke idik
npm run add-pasien -- --norm 929331 --write

# Paksa isi lewat UI Tambah Pasien
npm run add-pasien -- --norm 929331 --write --ui

npm run login-idik
npm run login-simrs

# Buka browser → login → lihat menu Rekam Medis (headed; hold ~30s)
npm run lihat-rekam-medis
npm run lihat-rekam-medis -- --hold 60000

# Explore semua menu (bisa lama); skip daun berbahaya; checkpoint/resume
npm run explore
npm run explore -- --count-only
npm run explore -- --only "Rekam Medis" --headed

# Field kosong tindakan (dry-run default)
npm run fill-empty
npm run fill-empty -- --write --limit 10
```

Dari root repo:

```powershell
npm run bot:simrs:preflight
npm run bot:simrs:add -- --norm 929331
npm run bot:simrs:login-simrs
npm run bot:simrs:lihat-rm
npm run bot:simrs:explore
```

## Keamanan

- `.env`, `artifacts/`, `storageState*`, checkpoint **gitignore**
- Jangan commit NIK/alamat/screenshot pasien
- Dry-run default; tulis butuh `--write`
- Explore: deny-list Hapus/Reset/Posting/dll. (dicatat, tidak dibuka)
- Default pembiayaan/kelas dari env — **bukan** ditebak dari getPasien

## Indikator UI idik

CLI = sinyal utama. Badge toolbar opsional (poll 15–30s, pause tab hidden). Matikan:

```env
NEXT_PUBLIC_SIMRS_BOT_STATUS=0
```

## Exit codes

- `0` sukses / dry-run OK
- `1` error operasional
- `2` data SIMRS tidak ditemukan (404)

## Python (WiFi RS + Playwright isi form)

Jalur alternatif (gaya otomasi browser): **HTTP getPasien** lalu isi modal Tambah Pasien di idik dengan **Playwright Python**. Default dry-run; tulis UI butuh `--write`.

### Setup Python

```powershell
cd tools/simrs-playwright-bot
# .env sudah dari setup di atas (SIMRS_GET_PASIEN_URL, IDIK_*)
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
playwright install chromium
```

Di luar WiFi RS, uji mapping dengan mock (sama seperti Node):

```env
SIMRS_GET_PASIEN_MOCK=fixtures/getPasien-929331.json
```

### Perintah Python

Jalankan dari folder `tools/simrs-playwright-bot` (paket lokal `python/`):

```powershell
python -m python.cli preflight

# Ambil getPasien + map (tidak menulis)
python -m python.cli get --norm 929331

# Dry-run add (get + log akan isi UI)
python -m python.cli add --norm 929331

# Login idik + isi form Tambah Pasien + Simpan
python -m python.cli add --norm 929331 --write
```

Prasyarat `--write`: WiFi/LAN RS (getPasien), `IDIK_BASE_URL` + `IDIK_USER` + `IDIK_PASS`, Chromium terpasang.

Exit codes sama: `0` OK, `1` error, `2` pasien 404.
