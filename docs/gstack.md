# gstack (QA agent only)

Opsional untuk **pengembangan/QA** di mesin developer — bukan bagian runtime bot SIMRS di PC RS.

## Install (lokal, di luar repo)

Sudah diinstal agent ke:

`%USERPROFILE%\.claude\skills\gstack`

Browse CLI:

`%USERPROFILE%\.claude\skills\gstack\browse\dist\browse.exe`

Contoh:

```powershell
$B = "$env:USERPROFILE\.claude\skills\gstack\browse\dist\browse.exe"
& $B goto "https://idik-lemon.vercel.app"
& $B url
```

Butuh Bun di PATH (`%USERPROFILE%\.bun\bin`). Setelah `git pull` di folder gstack, jalankan ulang `./setup` lewat Git Bash.

## Bukan pengganti

Bot produksi tetap di [`tools/simrs-playwright-bot`](../tools/simrs-playwright-bot/README.md) (`python -m python.cli …`).

Jangan commit token MCP / `.env` / clone gstack ke repo ini.
