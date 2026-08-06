import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import {
  formatSimrsUpstreamError,
  isSimrsTunnelOriginStatus,
} from "@/lib/simrs/upstreamErrors";

export const dynamic = "force-dynamic";

function getSimrsBaseUrl(): string {
  const baseUrl =
    process.env.SIMRS_API_URL ||
    process.env.NEXT_PUBLIC_SIMRS_API_URL ||
    "https://simrs.inkai-jatim.org/apibdrs/apibdrs/getPasien";
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    if (!user.ok) return user.response;

    const { searchParams } = new URL(request.url);
    const noRm = searchParams.get("noRm")?.trim();

    if (!noRm) {
      return NextResponse.json(
        { ok: false, error: "No. RM wajib diisi" },
        { status: 400 },
      );
    }

    const cleanBaseUrl = getSimrsBaseUrl();
    const simrsUrl = `${cleanBaseUrl}/${encodeURIComponent(noRm)}`;
    // Log base saja (path getPasien) — No. RM cukup untuk debug ops, tanpa body pasien
    console.log(`[SIMRS Proxy] base=${cleanBaseUrl} noRmLen=${noRm.length}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(simrsUrl, {
        cache: "no-store",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error(
          `[SIMRS Proxy] upstream HTTP ${res.status} base=${cleanBaseUrl} bodyLen=${text.length}`,
        );
        const error = formatSimrsUpstreamError(res.status, cleanBaseUrl);
        const statusOut = isSimrsTunnelOriginStatus(res.status)
          ? 502
          : res.status;
        return NextResponse.json(
          {
            ok: false,
            error,
            upstreamStatus: res.status,
            code: "SIMRS_UPSTREAM",
          },
          { status: statusOut },
        );
      }

      const json = await res.json();
      console.log(`[SIMRS Proxy] SIMRS Data Found:`, !!json.data);
      return NextResponse.json({ ok: true, ...json });
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const name =
        err && typeof err === "object" && "name" in err
          ? String((err as { name?: string }).name)
          : "";
      if (name === "AbortError") {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Koneksi ke SIMRS timeout (5 detik).\n\n" +
              "Server cloud (Vercel) mungkin tidak menjangkau origin. " +
              "Perbaiki Cloudflare Tunnel (docs/simrs-tunnel.md) atau pakai idik lokal / bot LAN.",
            code: "SIMRS_TIMEOUT",
          },
          { status: 504 },
        );
      }
      throw err;
    }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Gagal terhubung ke SIMRS";
    console.error("❌ SIMRS Proxy Error:", err);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
