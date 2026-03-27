import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { getServiceSupabaseAdmin } from "@/lib/auth/serviceSupabase";

export const dynamic = "force-dynamic";

function toText(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

function mapLegacyTindakanMedikRow(
  row: Record<string, unknown>,
): Record<string, unknown> {
  return {
    id: toText(row.id) ?? "",
    tanggal: toText(row.tanggal),
    dokter: toText(row.dokter) ?? toText(row.operator),
    nama_pasien: toText(row.nama_pasien) ?? toText(row.nama),
    no_rm:
      toText(row.no_rm) ??
      toText(row.rm) ??
      toText(row.no_rekam_medis) ??
      toText(row.nomor_rm),
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
    const limitRaw = Number(searchParams.get("limit") ?? 8000);
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(Math.trunc(limitRaw), 1), 20000)
      : 8000;

    const projections = [
      "id, tanggal, dokter, nama_pasien, no_rm, tindakan, kategori, status, ruangan, pasien_id, created_at",
      "id, tanggal, dokter, nama_pasien, tindakan, kategori, status, ruangan, pasien_id, created_at",
      "*",
    ];

    let data: Record<string, unknown>[] | null = null;
    let lastError: { message?: string } | null = null;

    for (const projection of projections) {
      const res = await supabase
        .from("tindakan")
        .select(projection)
        .order("id", { ascending: false })
        .limit(limit);

      if (!res.error) {
        data = (res.data as Record<string, unknown>[] | null) ?? [];
        lastError = null;
        break;
      }
      lastError = (res.error as { message?: string } | null) ?? null;
    }

    if (lastError) {
      return NextResponse.json(
        { ok: false, error: String(lastError.message ?? "query error"), data: [] },
        { status: 500 },
      );
    }

    // Fallback legacy: sebagian instalasi menyimpan data di tabel tindakan_medik.
    if (!data || data.length === 0) {
      const legacy = await supabase
        .from("tindakan_medik")
        .select("*")
        .order("id", { ascending: false })
        .limit(limit);
      if (!legacy.error && Array.isArray(legacy.data) && legacy.data.length > 0) {
        data = (legacy.data as Record<string, unknown>[]).map(mapLegacyTindakanMedikRow);
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
