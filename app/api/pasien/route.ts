import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { getServiceSupabaseAdmin } from "@/lib/auth/serviceSupabase";
import { mapFromSupabase } from "@/app/dashboard/pasien/data/pasienSchema";

export const dynamic = "force-dynamic";

/*───────────────────────────────────────────────
 📡 GET /api/pasien
 ───────────────────────────────────────────────*/
const POSTGREST_SAFE_CHUNK = 1000;

/** Cache pasien compact di memori server (2 menit) */
let pasienCompactCache: any[] | null = null;
let pasienCompactCacheExpires = 0;

async function fetchTableOrderedInChunks(
  supabase: any,
  columns: string,
  maxRows: number
): Promise<{ data: any[]; error: any | null }> {
  // 1. Cek validitas proyeksi pada chunk pertama (Fast Fail)
  const firstRes = await supabase
    .from("pasien")
    .select(columns)
    .order("created_at", { ascending: false })
    .range(0, POSTGREST_SAFE_CHUNK - 1);

  if (firstRes.error) {
    return { data: [], error: firstRes.error };
  }

  const firstBatch = Array.isArray(firstRes.data) ? firstRes.data : [];
  if (firstBatch.length === 0 || maxRows <= POSTGREST_SAFE_CHUNK) {
    return { data: firstBatch.slice(0, maxRows), error: null };
  }

  // 2. Jika valid dan data banyak, ambil sisanya secara paralel
  const numChunks = Math.ceil(maxRows / POSTGREST_SAFE_CHUNK);
  const ranges = Array.from({ length: numChunks - 1 }, (_, i) => {
    const from = (i + 1) * POSTGREST_SAFE_CHUNK;
    const to = from + POSTGREST_SAFE_CHUNK - 1;
    return { from, to };
  });

  const results = await Promise.all(
    ranges.map(({ from, to }) =>
      supabase
        .from("pasien")
        .select(columns)
        .order("created_at", { ascending: false })
        .range(from, to)
    )
  );

  const out: any[] = [...firstBatch];
  for (const res of results) {
    if (res.error) break;
    const batch = Array.isArray(res.data) ? res.data : [];
    if (batch.length === 0) break;
    out.push(...batch);
    if (out.length >= maxRows) break;
  }

  return { data: out.slice(0, maxRows), error: null };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const compact =
      searchParams.get("compact") === "1" ||
      searchParams.get("lite") === "1";
    const noRm =
      searchParams.get("noRm")?.trim() ??
      searchParams.get("no_rm")?.trim() ??
      "";
    const namaLookup = searchParams.get("nama")?.trim() ?? "";
    const limitRaw = Number(searchParams.get("limit") ?? "");

    // Jika compact dan tidak ada filter spesifik, gunakan cache (default limit 1000)
    const now = Date.now();
    const effectiveLimit = limitRaw || 1000;
    if (compact && !noRm && !namaLookup && effectiveLimit === 1000 && pasienCompactCache && now < pasienCompactCacheExpires) {
      return NextResponse.json({ ok: true, data: pasienCompactCache, cached: true }, { status: 200 });
    }

    const user = await requireUser();
    if (!user.ok) return user.response;

    const defaultLimit = compact ? 1000 : 0;
    const limit =
      Number.isFinite(limitRaw) && limitRaw > 0
        ? Math.min(Math.trunc(limitRaw), 5000)
        : defaultLimit > 0
          ? defaultLimit
          : 0;

    const columns = compact
      ? "id,nama,no_rm,jenis_kelamin,jk,created_at,jenis_pembiayaan,kelas_perawatan"
      : "*";

    // Gunakan chunked fetching jika limit > 1000 untuk melewati batas default PostgREST
    const { data, error } = await fetchTableOrderedInChunks(supabase, columns, limit || 20000);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message ?? "Gagal mengambil data pasien" },
        { status: 500 }
      );
    }

    // Update cache jika ini adalah request compact default
    if (compact && !noRm && !namaLookup && !limitRaw) {
      pasienCompactCache = data ?? [];
      pasienCompactCacheExpires = Date.now() + 120 * 1000; // 2 menit
    }

    return NextResponse.json({ ok: true, data: data ?? [] }, { status: 200 });
  } catch (err: unknown) {
    console.error("❌ Gagal mengambil pasien:", err);
    return NextResponse.json(
      { ok: false, error: "Terjadi kesalahan server saat mengambil pasien" },
      { status: 500 }
    );
  }
}

