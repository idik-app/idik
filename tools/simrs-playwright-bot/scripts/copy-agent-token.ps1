# Salin SIMRS_BOT_AGENT_TOKEN dari .env ke clipboard + tampilkan panduan Vercel.
# Jalankan dari folder tools/simrs-playwright-bot:
#   powershell -ExecutionPolicy Bypass -File .\scripts\copy-agent-token.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root ".env"
if (-not (Test-Path $envFile)) {
  Write-Error "Tidak ada .env di $root"
}

$line = Get-Content $envFile | Where-Object { $_ -match '^\s*SIMRS_BOT_AGENT_TOKEN\s*=' } | Select-Object -First 1
if (-not $line) {
  Write-Error "SIMRS_BOT_AGENT_TOKEN belum ada di .env"
}

$token = ($line -split '=', 2)[1].Trim().Trim('"').Trim("'")
if (-not $token) {
  Write-Error "SIMRS_BOT_AGENT_TOKEN kosong di .env"
}

Set-Clipboard -Value $token
Write-Host 'Token disalin ke clipboard.'
Write-Host ''
Write-Host 'Langkah Vercel (project idik-lemon - akun CLI inkaisby TIDAK punya akses):'
Write-Host '1. Buka https://vercel.com -> project yang domain-nya idik-lemon.vercel.app'
Write-Host '2. Settings -> Environment Variables'
Write-Host '3. Add: SIMRS_BOT_AGENT_TOKEN = (Ctrl+V paste)'
Write-Host '4. Environment: Production (+ Preview jika perlu)'
Write-Host '5. Deployments -> ... -> Redeploy (production)'
Write-Host '6. Setelah deploy selesai: npm run bot:simrs:agent'
Write-Host ''
Write-Host 'Tip: login Vercel dengan akun pemilik idik-lemon, bukan hanya team inkais-projects.'
