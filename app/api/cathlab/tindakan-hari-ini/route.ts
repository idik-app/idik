import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth/guards";

/** Tanggal lokal Asia/Jakarta sebagai YYYY-MM-DD */
function todayJakartaDateString(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function normalizeToken(v: unknown): string {
  return String(v ?? "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "")
    .replace(/^rm/, "");
}

function includesNormalizedToken(haystack: string, needle: string): boolean {
  if (!needle) return false;
  return haystack.includes(needle) || needle.includes(haystack);
}

const UUID_LIKE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Raw = {
  id: string;
  tanggal: string | null;
  nama_pasien: string | null;
  nama?: string | null;
  no_rm: string | null;
  rm?: string | null;
  /** Beberapa DB pakai `alkes_utama` menggantikan label tindakan */
  alkes_utama?: string | null;
  dokter?: string | null;
  tindakan: string | null;
  kategori: string | null;
  status: string | null;
  ruangan: string | null;
  pasien_id: string | null;
};

function toText(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

function mapLegacyTindakanMedikRow(row: Record<string, unknown>): Raw {
  return {
    id: String(row.id ?? ""),
    tanggal: toText(row.tanggal),
    nama_pasien: toText(row.nama_pasien) ?? toText(row.nama),
    nama: toText(row.nama),
    no_rm:
      toText(row.no_rm) ??
      toText(row.rm) ??
      toText(row.no_rekam_medis) ??
      toText(row.nomor_rm),
    rm: toText(row.rm),
    alkes_utama: toText(row.alkes_utama),
    dokter: toText(row.dokter) ?? toText(row.operator),
    tindakan: toText(row.tindakan) ?? toText(row.jenis) ?? toText(row.alkes_utama),
    kategori: toText(row.kategori),
    status: toText(row.status),
    ruangan: toText(row.ruangan),
    pasien_id: toText(row.pasien_id),
  };
}

/** Hanya coba projection berikutnya bila error terlihat seperti kolom/schema mismatch, bukan auth/relation hilang. */
function shouldTryNextProjection(message: string): boolean {
  const m = message.toLowerCase();
  if (!m.trim()) return false;
  if (m.includes("permission denied")) return false;
  if (m.includes("jwt")) return false;
  if (m.includes("invalid api key")) return false;
  if (m.includes("relation") && m.includes("does not exist")) return false;
  return (
    m.includes("schema cache") ||
    m.includes("pgrst204") ||
    (m.includes("column") && m.includes("does not exist")) ||
    m.includes("could not find the")
  );
}

/** Error kolom/proyeksi dianggap recoverable untuk lanjut fallback query umum. */
function isRecoverableSchemaError(message: string): boolean {
  return shouldTryNextProjection(message);
}

function isNetworkFetchFailure(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("typeerror: fetch failed") || m.includes("fetch failed");
}

async function selectTindakanRows(
  supabase: ReturnType<typeof createAdminClient>,
): Promise<{ data: Raw[] | null; error: { message?: string } | null }> {
  // Skema produksi minimal (mis. hanya: id, tanggal, dokter, nama_pasien, alkes_utama, kategori, created_at)
  const projections = [
    // Prioritas: ambil seluruh kolom dulu agar token pasien/RM bisa difilter
    // bahkan jika skema/proyeksi "minimal" tidak memuat kolom yang dibutuhkan.
    "*",
    "id, tanggal, dokter, nama_pasien, alkes_utama, kategori, created_at",
    "id, tanggal, tindakan, kategori, status, ruangan, pasien_id",
    "id, tanggal, nama_pasien, tindakan, kategori, status, ruangan, pasien_id",
    "id, tanggal, nama_pasien, no_rm, tindakan, kategori, status, ruangan, pasien_id",
    "id, tanggal, nama_pasien, nama, no_rm, rm, tindakan, kategori, status, ruangan, pasien_id",
    "id, tanggal, no_rm, tindakan, kategori, status, ruangan, pasien_id",
    "id, tanggal, no_rm, nama_pasien, pasien_id",
  ];

  let lastError: { message?: string } | null = null;
  for (const projection of projections) {
    const res = await supabase
      .from("tindakan")
      .select(projection)
      .order("id", { ascending: false })
      .limit(8000);
    if (!res.error) {
      return {
        data: (res.data as unknown as Raw[] | null) ?? null,
        error: null,
      };
    }
    lastError = (res.error as { message?: string } | null) ?? null;
    const msg = String(lastError?.message ?? "");
    if (!shouldTryNextProjection(msg)) {
      break;
    }
  }
  return { data: null, error: lastError };
}

async function selectLegacyTindakanMedikRows(
  supabase: ReturnType<typeof createAdminClient>,
): Promise<{ data: Raw[]; error: { message?: string } | null }> {
  const res = await supabase
    .from("tindakan_medik")
    .select("*")
    .order("id", { ascending: false })
    .limit(8000);
  if (res.error) {
    return {
      data: [],
      error: (res.error as { message?: string } | null) ?? null,
    };
  }
  const rows = Array.isArray(res.data)
    ? (res.data as Record<string, unknown>[])
    : [];
  return { data: rows.map(mapLegacyTindakanMedikRow), error: null };
}

/** Fallback pencarian token pasien lintas variasi schema kolom. */
async function selectTindakanByTokenCandidates(
  supabase: ReturnType<typeof createAdminClient>,
  tokens: string[],
): Promise<{ data: Raw[]; error: { message?: string } | null }> {
  const out: Raw[] = [];
  const cols = [
    "pasien_id",
    "no_rm",
    "rm",
    "no_rekam_medis",
    "nomor_rm",
    "no_rm_pasien",
    "medrec",
    "nama_pasien",
    "nama",
  ] as const;
  let hardError: { message?: string } | null = null;

  const cleaned = [...new Set(tokens.map((t) => t.trim()).filter(Boolean))];
  for (const token of cleaned) {
    const escaped = token
      .replace(/\\/g, "\\\\")
      .replace(/%/g, "\\%")
      .replace(/_/g, "\\_");
    for (const col of cols) {
      const res = await supabase
        .from("tindakan")
        .select("*")
        .ilike(col, `%${escaped}%`)
        .order("id", { ascending: false })
        .limit(8000);
      if (!res.error) {
        const rows = Array.isArray(res.data) ? (res.data as Raw[]) : [];
        if (rows.length) out.push(...rows);
        continue;
      }
      const msg = String(
        (res.error as { message?: string } | null)?.message ?? "",
      );
      if (isRecoverableSchemaError(msg)) {
        continue;
      }
      hardError = (res.error as { message?: string } | null) ?? null;
      return { data: [], error: hardError };
    }
  }
  return { data: mergeRowsById(out), error: hardError };
}

const PROJECTIONS_PASIEN = [
  "id, tanggal, dokter, nama_pasien, alkes_utama, kategori, created_at",
  "id, tanggal, tindakan, kategori, status, ruangan, pasien_id",
  "id, tanggal, nama_pasien, tindakan, kategori, status, ruangan, pasien_id",
  "id, tanggal, nama_pasien, no_rm, tindakan, kategori, status, ruangan, pasien_id",
  "id, tanggal, nama_pasien, nama, no_rm, rm, tindakan, kategori, status, ruangan, pasien_id",
  "id, tanggal, no_rm, tindakan, kategori, status, ruangan, pasien_id",
  "id, tanggal, no_rm, nama_pasien, pasien_id",
  "*",
] as const;

/** Kolom RM di berbagai migrasi / DB lama (bukan semua ada di satu tabel). */
const RM_ILIKE_COLUMNS = [
  "no_rm",
  "rm",
  "no_rekam_medis",
  "nomor_rm",
  "no_rm_pasien",
  "medrec",
  /** Skema tanpa RM: filter teks kadang cocok ke nama pasien */
  "nama_pasien",
] as const;

async function selectTindakanByPasienIdEq(
  supabase: ReturnType<typeof createAdminClient>,
  pasienId: string,
): Promise<{ data: Raw[] | null; error: { message?: string } | null }> {
  const pid = pasienId.trim();
  if (!pid) return { data: [], error: null };

  let lastError: { message?: string } | null = null;
  for (const projection of PROJECTIONS_PASIEN) {
    if (!projection.includes("pasien_id")) continue;
    const res = await supabase
      .from("tindakan")
      .select(projection)
      .eq("pasien_id", pid)
      .order("id", { ascending: false })
      .limit(8000);
    if (!res.error) {
      return {
        data: (res.data as unknown as Raw[] | null) ?? null,
        error: null,
      };
    }
    lastError = (res.error as { message?: string } | null) ?? null;
    const msg = String(lastError?.message ?? "");
    if (!shouldTryNextProjection(msg)) break;
  }
  return { data: null, error: lastError };
}

async function selectTindakanByNoRmIlike(
  supabase: ReturnType<typeof createAdminClient>,
  rm: string,
): Promise<{ data: Raw[] | null; error: { message?: string } | null }> {
  const rmTrim = rm.trim();
  if (!rmTrim) return { data: [], error: null };
  const escaped = rmTrim
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");

  let lastError: { message?: string } | null = null;
  for (const col of RM_ILIKE_COLUMNS) {
    const res = await supabase
      .from("tindakan")
      .select("*")
      .ilike(col, `%${escaped}%`)
      .order("id", { ascending: false })
      .limit(8000);
    if (!res.error) {
      return {
        data: (res.data as unknown as Raw[] | null) ?? null,
        error: null,
      };
    }
    lastError = (res.error as { message?: string } | null) ?? null;
    const msg = String(lastError?.message ?? "").toLowerCase();
    // Coba kolom RM berikutnya bila kolom ini tidak ada / typo schema.
    const tryNextColumn =
      msg.includes("does not exist") ||
      msg.includes("schema cache") ||
      msg.includes("pgrst204") ||
      msg.includes("could not find");
    if (tryNextColumn) continue;
    return { data: null, error: lastError };
  }
  // Semua nama kolom RM dicoba; biarkan caller fallback ke scan + filter token.
  return { data: [], error: null };
}

function mergeRowsById(rows: Raw[]): Raw[] {
  const m = new Map<string, Raw>();
  for (const r of rows) {
    const id = String(r.id ?? "").trim();
    if (id) m.set(id, r);
  }
  return [...m.values()].sort((a, b) =>
    String(b.id).localeCompare(String(a.id)),
  );
}

function filterRowsByPasienTokens(
  data: Raw[],
  pasienId: string,
  rm: string,
  extraFromPasienTable: string[] = [],
): Raw[] {
  const nId = normalizeToken(pasienId);
  const nRm = normalizeToken(rm);
  const extras = extraFromPasienTable.map(normalizeToken).filter(Boolean);
  return data.filter((r) => {
    const row = r as unknown as Record<string, unknown>;
    const tokens = [
      r.pasien_id,
      r.no_rm,
      row.rm,
      row.no_rekam_medis,
      row.nomor_rm,
      row.no_rm_pasien,
      row.medrec,
      r.nama_pasien,
      row.nama,
      row.alkes_utama,
      row.dokter,
    ].map(normalizeToken);
    const deepHaystack = normalizeToken(JSON.stringify(row));
    if (nId && tokens.some((t) => t === nId || t.includes(nId))) return true;
    if (nRm && tokens.some((t) => t === nRm || t.includes(nRm))) return true;
    if (nId && includesNormalizedToken(deepHaystack, nId)) return true;
    if (nRm && includesNormalizedToken(deepHaystack, nRm)) return true;
    for (const e of extras) {
      if (e && tokens.some((t) => t === e || t.includes(e) || e.includes(t)))
        return true;
      if (e && includesNormalizedToken(deepHaystack, e)) return true;
    }
    return false;
  });
}

async function loadPasienHintsForFilter(
  supabase: ReturnType<typeof createAdminClient>,
  pasienId: string,
): Promise<string[]> {
  const pid = pasienId.trim();
  if (!pid || !UUID_LIKE.test(pid)) return [];
  try {
    const pr = await supabase
      .from("pasien")
      .select("nama, no_rm")
      .eq("id", pid)
      .maybeSingle();
    if (pr.error) return [];
    const p = pr.data as { nama?: string | null; no_rm?: string | null } | null;
    if (!p) return [];
    const out: string[] = [];
    if (p.nama) out.push(String(p.nama));
    if (p.no_rm) out.push(String(p.no_rm));
    return out;
  } catch {
    return [];
  }
}

/**
 * Default: daftar tindakan hari ini (WIB).
 * Jika diberi query `pasienId` dan/atau `rm`, kembalikan data pasien lintas tanggal.
 */
export async function GET(request: Request) {
  try {
    const auth = await requireUser();
    if (!auth.ok) {
      // Dev fallback: endpoint ini dipakai sebagai sumber data UI.
      // Di production tetap ketat mengikuti guard.
      if (process.env.NODE_ENV === "production") {
        return auth.response;
      }
    }

    let supabase: ReturnType<typeof createAdminClient>;
    try {
      supabase = createAdminClient();
    } catch {
      return NextResponse.json(
        {
          ok: true,
          mode: "no-service-role",
          tanggal: null,
          rows: [],
          message: "Supabase service role tidak dikonfigurasi",
        },
        { status: 200 },
      );
    }

    const tanggal = todayJakartaDateString();
    const { searchParams } = new URL(request.url);
    const pasienId = (searchParams.get("pasienId") ?? "").trim();
    const rm = (searchParams.get("rm") ?? "").trim();

    /**
     * Skema `tindakan` di produksi bisa tanpa `waktu`, `created_at`, dll.
     * Hanya kolom yang umum dipakai filter + label; urutan `id` DESC (stabil tanpa timestamp).
     */
    let data: Raw[] | null = null;
    let error: { message?: string } | null = null;

    if (pasienId || rm) {
      // Mode pasien: query terarah (pasien_id / no_rm) supaya tidak terpotong limit 1000 global.
      // Jika kosong, fallback scan + filter token (legacy / format token).
      const pid = pasienId.trim();
      const rmT = rm.trim();
      const acc: Raw[] = [];

      if (pid) {
        const res = await selectTindakanByPasienIdEq(supabase, pid);
        if (res.error) {
          const msg = String(res.error.message ?? "");
          if (!isRecoverableSchemaError(msg)) {
            error = res.error;
          }
        } else if (res.data?.length) acc.push(...res.data);
      }
      if (!error && rmT) {
        const res2 = await selectTindakanByNoRmIlike(supabase, rmT);
        if (res2.error) {
          const msg = String(res2.error.message ?? "");
          if (!isRecoverableSchemaError(msg)) {
            error = res2.error;
          }
        } else if (res2.data?.length) acc.push(...res2.data);
      }

      if (!error) {
        if (acc.length > 0) {
          data = mergeRowsById(acc);
        } else {
          const hints = await loadPasienHintsForFilter(supabase, pid);
          const tokenCandidates = [rmT, ...hints].filter(Boolean);
          if (tokenCandidates.length > 0) {
            const byToken = await selectTindakanByTokenCandidates(
              supabase,
              tokenCandidates,
            );
            if (byToken.error) {
              error = byToken.error;
            } else if (byToken.data.length > 0) {
              data = byToken.data;
            }
          }
        }
      }

      if (!error && !data) {
        const res = await selectTindakanRows(supabase);
        data = res.data;
        error = res.error;
        if (!error && data) {
          const hints = await loadPasienHintsForFilter(supabase, pid);
          data = filterRowsByPasienTokens(data, pid, rmT, hints);
        }
        if (!error && (!data || data.length === 0)) {
          const legacy = await selectLegacyTindakanMedikRows(supabase);
          if (!legacy.error && legacy.data.length > 0) {
            const hints = await loadPasienHintsForFilter(supabase, pid);
            data = filterRowsByPasienTokens(legacy.data, pid, rmT, hints);
          }
        }
      }
    } else {
      const res = await selectTindakanRows(supabase);
      data = res.data;
      error = res.error;
      if (!error && data) {
        data = data.filter(
          (r) => String(r.tanggal ?? "").slice(0, 10) === tanggal,
        );
      }
      if (!error && (!data || data.length === 0)) {
        const legacy = await selectLegacyTindakanMedikRows(supabase);
        if (!legacy.error && legacy.data.length > 0) {
          data = legacy.data.filter(
            (r) => String(r.tanggal ?? "").slice(0, 10) === tanggal,
          );
        }
      }
    }

    if (error) {
      const errMsg = String(error.message ?? "query error");
      if (isNetworkFetchFailure(errMsg)) {
        // Degradasi halus: jaringan ke Supabase bermasalah sementara.
        // Jangan kirim mode query-error agar UI tidak dianggap rusak.
        return NextResponse.json(
          {
            ok: true,
            mode: pasienId || rm ? "pasien-degraded" : "hari-ini-degraded",
            tanggal,
            rows: [],
            message: "Koneksi ke database sedang bermasalah (sementara).",
          },
          { status: 200 },
        );
      }

      console.error("[tindakan-hari-ini]", error);
      return NextResponse.json(
        {
          ok: true,
          mode: "query-error",
          tanggal,
          rows: [],
          message: errMsg,
        },
        { status: 200 },
      );
    }

    const rows = (data ?? []).map((r: Raw) => {
      const row = r as unknown as Record<string, unknown>;
      const noRm =
        r.no_rm ??
        (typeof row.rm === "string" ? row.rm : null) ??
        (typeof row.no_rekam_medis === "string" ? row.no_rekam_medis : null) ??
        (typeof row.nomor_rm === "string" ? row.nomor_rm : null) ??
        (typeof row.no_rm_pasien === "string" ? row.no_rm_pasien : null) ??
        null;
      const tindakanLabel =
        r.tindakan ??
        (typeof row.alkes_utama === "string" ? row.alkes_utama : null);
      const dokter = typeof row.dokter === "string" ? row.dokter : null;
      return {
        id: r.id,
        tanggal: r.tanggal,
        waktu: null,
        nama_pasien:
          r.nama_pasien ?? (typeof row.nama === "string" ? row.nama : null),
        no_rm: noRm,
        tindakan: tindakanLabel,
        kategori: r.kategori,
        status: r.status,
        ruangan: r.ruangan,
        pasien_id: r.pasien_id,
        dokter,
      };
    });

    return NextResponse.json({
      ok: true,
      tanggal,
      mode: pasienId || rm ? "pasien" : "hari-ini",
      rows,
    });
  } catch (e) {
    console.error("[tindakan-hari-ini] unhandled", e);
    return NextResponse.json(
      {
        ok: true,
        mode: "unhandled-error",
        tanggal: null,
        rows: [],
        message: e instanceof Error ? e.message : "unhandled error",
      },
      { status: 200 },
    );
  }
}
