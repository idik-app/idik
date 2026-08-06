# Cloudflare Tunnel untuk getPasien SIMRS

Error **530** di form Tambah Pasien (Vercel) berarti hostname HTTPS publik (Cloudflare) **tidak sampai** ke origin LAN, sementara getPasien di RS tetap sehat:

```text
# OK di browser PC LAN RS
http://10.250.10.107/apibdrs/apibdrs/getPasien/762863
→ { "status": "Ok", ... }

# Gagal dari Vercel /api/pasien/simrs
→ SIMRS merespon dengan status 530
```

Perbaikan: jalankan **cloudflared** di mesin dalam jaringan RS yang bisa mengakses `10.250.10.107`, lalu arahkan env Vercel ke hostname tunnel.

## Setup / perbaikan tunnel

1. Install [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/) di PC/server RS (biarkan selalu nyala).
2. `cloudflared tunnel login`
3. Buat atau perbaiki tunnel; contoh `config.yml` ingress:

```yaml
tunnel: <TUNNEL_UUID>
credentials-file: C:\Users\<user>\.cloudflared\<TUNNEL_UUID>.json

ingress:
  - hostname: simrs.inkai-jatim.org
    service: http://10.250.10.107
  - service: http_status:404
```

4. DNS (Cloudflare): CNAME `simrs.inkai-jatim.org` → `<TUNNEL_UUID>.cfargotunnel.com` (**Proxied**).
5. Install sebagai Windows Service agar tidak mati saat logout:

```powershell
cloudflared service install
```

Ganti hostname jika memakai domain baru; samakan dengan env Vercel.

## Env Vercel (Production + Preview)

```text
SIMRS_API_URL=https://simrs.inkai-jatim.org/apibdrs/apibdrs/getPasien
NEXT_PUBLIC_SIMRS_API_URL=https://simrs.inkai-jatim.org/apibdrs/apibdrs/getPasien
NEXT_PUBLIC_SIMRS_API_URL_LAN=http://10.250.10.107/apibdrs/apibdrs/getPasien
```

- Jangan set `SIMRS_API_URL` ke `http://10.x.x.x` di Vercel (server cloud tidak merutekan IP privat).
- Setelah ubah `NEXT_PUBLIC_*`, **Redeploy**.

Lokal (`.env.local`) bisa memakai LAN langsung untuk `npm run dev` di PC RS.

## Checklist verifikasi

- [ ] Dari **luar LAN** (HP data): buka  
  `https://<hostname>/apibdrs/apibdrs/getPasien/762863`  
  → JSON `status: "Ok"` (bukan halaman Cloudflare 530).
- [ ] Dari PC LAN:  
  `http://10.250.10.107/apibdrs/apibdrs/getPasien/762863` → tetap `Ok`.
- [ ] Env Vercel sudah diisi + redeploy selesai.
- [ ] Di `idik-lemon.vercel.app` → Tambah Pasien → No. RM `762863` → nama/alamat/tgl lahir terisi tanpa error 530.

## Jika tunnel lagi down

- Cadangan operasional: bot LAN [`tools/simrs-playwright-bot`](../tools/simrs-playwright-bot/README.md)  
  `npm run add-pasien -- --norm 762863 --write`
- Di browser HTTPS + PC LAN: izinkan **Insecure Content** agar fallback `NEXT_PUBLIC_SIMRS_API_URL_LAN` bisa jalan (mixed content).

## Troubleshooting singkat

| Gejala | Cek |
|--------|-----|
| HTTPS 530 | `cloudflared` mati / ingress salah / DNS tidak ke tunnel |
| Vercel timeout | Firewall RS memblokir outbound tunnel; cek service cloudflared |
| LAN OK, Vercel gagal | Env masih mengarah ke hostname rusak atau belum redeploy |
| Mixed content di console | HTTPS page memblokir `http://10.x` — perbaiki tunnel atau Allow insecure content |
