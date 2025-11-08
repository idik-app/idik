import { NextResponse } from "next/server";

/* ⚙️ IDIK-App API: /api/auth/refresh
   🧠 Mode: Simulasi sementara (tanpa verifikasi JWT)
   ──────────────────────────────────────────────
   Tujuan:
   - Memastikan interval auto-refresh client berjalan normal.
   - Tidak melakukan validasi token apa pun.
   - Menjadi stub sebelum versi JWT aktif digunakan.
*/

export async function GET() {
  console.log("🔁 [AUTH] Simulated token refresh executed.");
  return NextResponse.json({
    ok: true,
    message: "Token refresh simulated OK",
    timestamp: new Date().toISOString(),
  });
}
