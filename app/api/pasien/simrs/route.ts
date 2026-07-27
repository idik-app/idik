import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    if (!user.ok) return user.response;

    const { searchParams } = new URL(request.url);
    const noRm = searchParams.get("noRm")?.trim();

    if (!noRm) {
      return NextResponse.json(
        { ok: false, error: "No. RM wajib diisi" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.SIMRS_API_URL || process.env.NEXT_PUBLIC_SIMRS_API_URL || "https://simrs.inkai-jatim.org/apibdrs/apibdrs/getPasien";
    const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    const simrsUrl = `${cleanBaseUrl}/${encodeURIComponent(noRm)}`;
    console.log(`[SIMRS Proxy] Requesting: ${simrsUrl}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(simrsUrl, {
        cache: "no-store",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const text = await res.text();
        console.error(`[SIMRS Proxy] SIMRS Error ${res.status}: ${text}`);
        return NextResponse.json(
          { ok: false, error: `SIMRS merespon dengan status ${res.status}` },
          { status: res.status }
        );
      }

      const json = await res.json();
      console.log(`[SIMRS Proxy] SIMRS Data Found:`, !!json.data);
      return NextResponse.json({ ok: true, ...json });
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        return NextResponse.json(
          { ok: false, error: "Koneksi ke SIMRS timeout (5 detik)" },
          { status: 504 }
        );
      }
      throw err;
    }
  } catch (err: any) {
    console.error("❌ SIMRS Proxy Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Gagal terhubung ke SIMRS" },
      { status: 500 }
    );
  }
}
