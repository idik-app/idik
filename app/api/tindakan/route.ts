import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { getServiceSupabaseAdmin } from "@/lib/auth/serviceSupabase";
import {
  coalesceNoRm,
  enrichTindakanRowForApi,
  toText,
} from "@/lib/tindakan/tindakanDbMap";
import {
  enrichTindakanRowTarifFromMasterMap,
  fetchMasterTarifLookupMap,
} from "@/lib/tindakan/masterTarifTindakan";

export const dynamic = "force-dynamic";

/**
 * Banyak proyek Supabase (default PostgREST) memakai max_rows = 1000 per respons.
 * `.limit(20000)` tidak melewati cap itu; ambil berurutan dengan `.range` hingga cukup.
 */
const POSTGREST_SAFE_CHUNK = 1000;

const PROJECTIONS_LIST = [
  "id, tanggal, dokter, operator, nama_pasien, nama, no_rm, no_rekam_medis, tindakan, jenis, alkes_utama, kategori, status, ruangan, pasien_id, created_at, inserted_at, updated_at, is_fast_track, pasien_datang_igd, door_to_balloon, total_waktu_fast_track, pci_report_link, pemakaian",
  "id, tanggal, dokter, nama_pasien, no_rm, tindakan, kategori, status, ruangan, pasien_id, created_at, is_fast_track, pasien_datang_igd, door_to_balloon, total_waktu_fast_track, pci_report_link, pemakaian",
  "*",
];

async function fetchTableOrderedInChunks(
  supabase: NonNullable<ReturnType<typeof getServiceSupabaseAdmin>>,
  table: "tindakan" | "tindakan_medik",
  projection: string,
  maxRows: number,
): Promise<{ data: Record<string, unknown>[]; error: { message?: string } | null }> {
  // 1. Cek validitas proyeksi pada chunk pertama (Fast Fail) agar tidak mubazir paralel jika kolom salah
  const firstRes = await supabase
    .from(table)
    .select(projection)
    .order("tanggal", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .range(0, POSTGREST_SAFE_CHUNK - 1);

  if (firstRes.error) {
    return { data: [], error: firstRes.error as { message?: string } };
  }

  const firstBatch = Array.isArray(firstRes.data)
    ? (firstRes.data as unknown as Record<string, unknown>[])
    : [];

  if (firstBatch.length === 0 || maxRows <= POSTGREST_SAFE_CHUNK) {
    return { data: firstBatch.slice(0, maxRows), error: null };
  }

  // 2. Ambil sisanya secara paralel hanya jika chunk pertama sukses
  const numChunks = Math.ceil(maxRows / POSTGREST_SAFE_CHUNK);
  const ranges = Array.from({ length: numChunks - 1 }, (_, i) => {
    const from = (i + 1) * POSTGREST_SAFE_CHUNK;
    const to = from + POSTGREST_SAFE_CHUNK - 1;
    return { from, to };
  });

  const results = await Promise.all(
    ranges.map(({ from, to }) =>
      supabase
        .from(table)
        .select(projection)
        .order("tanggal", { ascending: false, nullsFirst: false })
        .order("id", { ascending: false })
        .range(from, to),
    ),
  );

  const out: Record<string, unknown>[] = [...firstBatch];
  for (const res of results) {
    if (res.error) break;
    const batch = Array.isArray(res.data)
      ? (res.data as unknown as Record<string, unknown>[])
      : [];
    if (batch.length === 0) break;
    out.push(...batch);
    if (out.length >= maxRows) break;
  }

  return { data: out.slice(0, maxRows), error: null };
}

function mapLegacyTindakanMedikRow(
  row: Record<string, unknown>,
): Record<string, unknown> {
  return {
    id: toText(row.id) ?? "",
    tanggal: toText(row.tanggal),
    dokter: toText(row.dokter) ?? toText(row.operator),
    nama_pasien: toText(row.nama_pasien) ?? toText(row.nama),
    no_rm: coalesceNoRm(row),
    tindakan: toText(row.tindakan) ?? toText(row.jenis) ?? toText(row.alkes_utama),
    kategori: toText(row.kategori),
    status: toText(row.status),
    ruangan: toText(row.ruangan),
    pasien_id: toText(row.pasien_id),
    created_at: toText(row.created_at),
    is_fast_track: (row as any).is_fast_track,
    pasien_datang_igd: toText(row.pasien_datang_igd),
    door_to_balloon: toText(row.door_to_balloon),
    total_waktu_fast_track: toText(row.total_waktu_fast_track),
    _source_table: "tindakan_medik",
  };
}

/** Cache working projection to avoid re-testing on every request */
let workingProjectionCache: string | null = null;

/** Cache result for 15 seconds for default view to prevent server hammer */
let tindakanListCache: { data: any[]; expires: number; key: string } | null = null;

/** Daftar tindakan untuk dashboard (server-side service role, tahan RLS). */
export async function GET(request: Request) {
  try {
    const { requireRole } = await import("@/lib/auth/guards");
    const auth = await requireRole(["perawat", "admin", "administrator", "superadmin"]);
    if (!auth.ok) return auth.response;

    const supabase = getServiceSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { ok: false, error: "Supabase service role tidak dikonfigurasi." },
        { status: 503 },
      );
    }

    const { searchParams } = new URL(request.url);
    const limitRaw = Number(searchParams.get("limit") ?? 1000);
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(Math.trunc(limitRaw), 1), 20000)
      : 1000;

    const dateFrom = searchParams.get("from")?.trim();
    const dateTo = searchParams.get("to")?.trim();
    const search = searchParams.get("search")?.trim();

    // Key untuk cache (hanya cache view default tanpa filter berat)
    const cacheKey = `${limit}|${dateFrom ?? ""}|${dateTo ?? ""}|${search ?? ""}`;
    const now = Date.now();
    if (tindakanListCache && now < tindakanListCache.expires && tindakanListCache.key === cacheKey) {
      return NextResponse.json({ ok: true, data: tindakanListCache.data, cached: true }, { status: 200 });
    }

    const projections = workingProjectionCache 
      ? [workingProjectionCache, ...PROJECTIONS_LIST.filter(p => p !== workingProjectionCache)]
      : PROJECTIONS_LIST;

    let data: Record<string, unknown>[] | null = null;
    let lastError: { message?: string } | null = null;

    const tarifMap = await fetchMasterTarifLookupMap(supabase);

    for (const projection of projections) {
      const getBaseQuery = () => {
        let q = supabase
          .from("tindakan")
          .select(projection)
          .order("tanggal", { ascending: false, nullsFirst: false })
          .order("id", { ascending: false });

        if (dateFrom) q = q.gte("tanggal", dateFrom);
        if (dateTo) q = q.lte("tanggal", dateTo);
        if (search) {
          q = q.or(`nama_pasien.ilike.%${search}%,no_rm.ilike.%${search}%,dokter.ilike.%${search}%`);
        }
        return q;
      };

      // 1. Ambil chunk pertama (limit 1000)
      const firstRes = await getBaseQuery().range(0, POSTGREST_SAFE_CHUNK - 1);

      if (!firstRes.error) {
        workingProjectionCache = projection; // Store the working one
        let allRawRows = Array.isArray(firstRes.data)
          ? (firstRes.data as unknown as Record<string, unknown>[])
          : [];

        // 2. Ambil sisanya jika limit > 1000 dan chunk pertama penuh
        if (allRawRows.length === POSTGREST_SAFE_CHUNK && limit > POSTGREST_SAFE_CHUNK) {
          const numChunks = Math.ceil(limit / POSTGREST_SAFE_CHUNK);
          const ranges = Array.from({ length: numChunks - 1 }, (_, i) => {
            const from = (i + 1) * POSTGREST_SAFE_CHUNK;
            const to = Math.min(from + POSTGREST_SAFE_CHUNK - 1, limit - 1);
            return { from, to };
          });

          // Ambil sisa chunk secara paralel
          const otherResults = await Promise.all(
            ranges.map(({ from, to }) => getBaseQuery().range(from, to)),
          );

          for (const res of otherResults) {
            if (res.error) break;
            const batch = Array.isArray(res.data)
              ? (res.data as unknown as Record<string, unknown>[])
              : [];
            allRawRows.push(...batch);
            if (batch.length < POSTGREST_SAFE_CHUNK) break; // Sudah habis
          }
        }

        data = allRawRows.slice(0, limit).map((row) => {
          const noRm = coalesceNoRm(row) || (row.no_rm as string) || null;
          const withApiFields = {
            ...row,
            nama_pasien: toText(row.nama_pasien) || toText(row.nama) || null,
            no_rm: noRm,
            ruangan: row.ruangan || null,
            created_at: row.created_at || row.inserted_at || row.updated_at || null,
          };
          return enrichTindakanRowTarifFromMasterMap(withApiFields, tarifMap);
        });
        lastError = null;
        break;
      }
      lastError = (firstRes.error as { message?: string } | null) ?? null;
    }

    if (lastError) {
      return NextResponse.json(
        { ok: false, error: String(lastError.message ?? "query error"), data: [] },
        { status: 500 },
      );
    }

    // Fallback legacy: sebagian instalasi menyimpan data di tabel tindakan_medik.
    if (!data || data.length === 0) {
      const { data: legacyRows, error: legacyErr } =
        await fetchTableOrderedInChunks(supabase, "tindakan_medik", "*", limit);
      if (!legacyErr && legacyRows.length > 0) {
        data = legacyRows.map((row) =>
          enrichTindakanRowTarifFromMasterMap(
            mapLegacyTindakanMedikRow(row),
            tarifMap,
          ),
        );
      }
    }

    const finalData = data ?? [];

    // Cache results for 15 seconds
    tindakanListCache = {
      data: finalData,
      expires: Date.now() + 15 * 1000,
      key: cacheKey
    };

    return NextResponse.json({ ok: true, data: finalData }, { status: 200 });
  } catch (err) {
    console.error("[api/tindakan]", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Terjadi kesalahan server",
        data: [],
      },
      { status: 500 },
    );
  }
}
