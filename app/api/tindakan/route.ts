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

async function fetchTableOrderedInChunks(
  supabase: NonNullable<ReturnType<typeof getServiceSupabaseAdmin>>,
  table: "tindakan" | "tindakan_medik",
  projection: string,
  maxRows: number,
): Promise<{ data: Record<string, unknown>[]; error: { message?: string } | null }> {
  const out: Record<string, unknown>[] = [];
  let from = 0;

  while (out.length < maxRows) {
    const to = from + POSTGREST_SAFE_CHUNK - 1;
    const res = await supabase
      .from(table)
      .select(projection)
      .order("tanggal", { ascending: false, nullsFirst: false })
      .order("id", { ascending: false })
      .range(from, to);

    if (res.error) {
      return { data: out, error: res.error as { message?: string } };
    }

    const batch = Array.isArray(res.data)
      ? (res.data as Record<string, unknown>[])
      : [];

    if (batch.length === 0) break;

    const remaining = maxRows - out.length;
    out.push(...batch.slice(0, remaining));

    if (batch.length < POSTGREST_SAFE_CHUNK || out.length >= maxRows) break;
    from += batch.length;
  }

  return { data: out, error: null };
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
    _source_table: "tindakan_medik",
  };
}

/** Daftar tindakan untuk dashboard (server-side service role, tahan RLS). */
export async function GET(request: Request) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const supabase = getServiceSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { ok: false, error: "Supabase service role tidak dikonfigurasi." },
        { status: 503 },
      );
    }

    const { searchParams } = new URL(request.url);
    const limitRaw = Number(searchParams.get("limit") ?? 20000);
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(Math.trunc(limitRaw), 1), 20000)
      : 20000;

    // Urutan: skema lengkap dulu. Proyeksi minimal di akhir — jika dipilih lebih dulu,
    // baris tidak punya pasien_id / kategori / kolom Cathlab sehingga drawer detail kosong.
    const projections = [
      "*",
      "id, tanggal, dokter, nama_pasien, no_rm, tindakan, kategori, status, ruangan, pasien_id, created_at",
      "id, tanggal, dokter, nama_pasien, tindakan, kategori, status, ruangan, pasien_id, created_at",
      "id, tanggal, nama, dokter, tindakan, status, inserted_at, updated_at, ruangan, no_rm",
    ];

    let data: Record<string, unknown>[] | null = null;
    let lastError: { message?: string } | null = null;

    const tarifMap = await fetchMasterTarifLookupMap(supabase);

    for (const projection of projections) {
      const { data: rawRows, error: chunkError } =
        await fetchTableOrderedInChunks(supabase, "tindakan", projection, limit);

      if (!chunkError) {
        const rows = rawRows;
        data = rows.map((row) => {
          const enriched = enrichTindakanRowForApi(row);
          const withTarif = enrichTindakanRowTarifFromMasterMap(enriched, tarifMap);
          const noRm = coalesceNoRm(row);
          return noRm ? { ...withTarif, no_rm: noRm } : withTarif;
        });
        lastError = null;
        break;
      }
      lastError = (chunkError as { message?: string } | null) ?? null;
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

    return NextResponse.json({ ok: true, data: data ?? [] }, { status: 200 });
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
