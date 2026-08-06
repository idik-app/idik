/**
 * Pesan error SIMRS upstream untuk proxy & UI.
 * 530/521/etc. = Cloudflare/tunnel origin putus — bukan “RM tidak ada”.
 */
export function isSimrsTunnelOriginStatus(status: number): boolean {
  return (
    status === 530 ||
    status === 502 ||
    status === 521 ||
    status === 522 ||
    status === 523 ||
    status === 524
  );
}

export function formatSimrsUpstreamError(
  status: number,
  publicBaseHint?: string,
): string {
  const base =
    publicBaseHint?.replace(/\/$/, "") ||
    "hostname HTTPS SIMRS (Cloudflare Tunnel)";

  if (isSimrsTunnelOriginStatus(status)) {
    return (
      `SIMRS origin/tunnel putus (HTTP ${status}).\n\n` +
      `Penyebab umum: cloudflared di RS tidak berjalan, DNS/ingress salah, ` +
      `atau Vercel memanggil hostname yang tidak sampai ke http://10.250.10.107.\n\n` +
      `Data getPasien di LAN bisa tetap sehat sementara tunnel publik gagal.\n\n` +
      `Solusi:\n` +
      `1. Perbaiki Cloudflare Tunnel → http://10.250.10.107 (lihat docs/simrs-tunnel.md).\n` +
      `2. Set SIMRS_API_URL & NEXT_PUBLIC_SIMRS_API_URL ke https hostname tunnel, lalu redeploy.\n` +
      `3. Uji dari luar LAN: ${base}/<NoRM> harus status Ok.\n` +
      `4. Sementara: isi lewat bot LAN (tools/simrs-playwright-bot) atau idik localhost di jaringan RS.`
    );
  }

  if (status === 404) {
    return `SIMRS: data pasien tidak ditemukan (404).`;
  }

  return `SIMRS merespon dengan status ${status}`;
}
