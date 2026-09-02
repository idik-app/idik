import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { getServiceSupabaseAdmin } from "@/lib/auth/serviceSupabase";
import {
  coalesceNoRm,
  coerceUmurForDb,
  enrichTindakanRowForApi,
  toText,
} from "@/lib/tindakan/tindakanDbMap";
import {
  enrichTindakanRowTarifFromMasterMap,
  fetchMasterTarifLookupMap,
} from "@/lib/tindakan/masterTarifTindakan";

export const dynamic = "force-dynamic";
/** Background 10k chunks; first paint tetap 2k (di bawah ini). */
export const maxDuration = 60;

/**
 * Banyak proyek Supabase (default PostgREST) memakai max_rows = 1000 per respons.
 * `.limit(20000)` tidak melewati cap itu; ambil berurutan dengan `.range` hingga cukup.
 */
const POSTGREST_SAFE_CHUNK = 1000;

const CEK_OBAT_PROJECTION =
  "cek_ntg_cedocard, cek_ntg_cedocard_ket, cek_ntg_cedocard_jam, cek_ntg_cedocard_oleh, cek_heparin, cek_heparin_ket, cek_heparin_jam, cek_heparin_oleh, cek_lain, cek_lain_ket, cek_lain_jam, cek_lain_oleh, log_barang_klinis, skema_koroner_url, skema_koroner_data";

const JADWAL_TEAM_PROJECTION =
  "asisten, sirkuler, logger, hasil_lab_ppm, umur";

const PROJECTIONS_LIST = [
  // Prioritas 1: Proyeksi tanpa created_at/inserted_at/updated_at agar kompatibel jika tabel tindakan tidak memiliki kolom timestamp tersebut
  `id, tanggal, dokter, dokter_anestesi, ppds, operator, nama_pasien, nama, no_rm, no_rekam_medis, tindakan, jenis, alkes_utama, kategori, status, status_keterangan, ruangan, pasien_id, is_fast_track, pasien_datang_igd, door_to_balloon, total_waktu_fast_track, fast_track_sign_in, fast_track_time_out, fast_track_sign_out, pci_report_link, pemakaian, kelas_pembiayaan, asmed, resume_erm, sjp, berkas_laporan, consumable_kelengkapan, billing_simrs, pj_laporan, operan_ranap, rs_perujuk, keterangan, diagnosa, faktor_risiko, jenis_kelamin, fluoro_time, dose, kv, ma, waktu, total_kontras, air_kerma, dap_dose, accession_no, total, krs, consumable, selisih, temuan_pembuluh, kesimpulan_laporan, plan_medis, ${JADWAL_TEAM_PROJECTION}, ${CEK_OBAT_PROJECTION}`,
  `id, tanggal, dokter, dokter_anestesi, ppds, nama_pasien, no_rm, tindakan, kategori, status, status_keterangan, ruangan, pasien_id, is_fast_track, pasien_datang_igd, door_to_balloon, total_waktu_fast_track, fast_track_sign_in, fast_track_time_out, fast_track_sign_out, pci_report_link, pemakaian, kelas_pembiayaan, asmed, resume_erm, sjp, berkas_laporan, consumable_kelengkapan, billing_simrs, pj_laporan, operan_ranap, rs_perujuk, keterangan, diagnosa, faktor_risiko, jenis_kelamin, fluoro_time, dose, kv, ma, waktu, total_kontras, air_kerma, dap_dose, accession_no, total, krs, consumable, selisih, temuan_pembuluh, kesimpulan_laporan, plan_medis, ${JADWAL_TEAM_PROJECTION}, ${CEK_OBAT_PROJECTION}`,
  // Proyeksi dengan created_at (apabila tabel memilikinya)
  `id, tanggal, dokter, dokter_anestesi, ppds, operator, nama_pasien, nama, no_rm, no_rekam_medis, tindakan, jenis, alkes_utama, kategori, status, status_keterangan, ruangan, pasien_id, created_at, inserted_at, updated_at, is_fast_track, pasien_datang_igd, door_to_balloon, total_waktu_fast_track, fast_track_sign_in, fast_track_time_out, fast_track_sign_out, pci_report_link, pemakaian, kelas_pembiayaan, asmed, resume_erm, sjp, berkas_laporan, consumable_kelengkapan, billing_simrs, pj_laporan, operan_ranap, rs_perujuk, keterangan, diagnosa, faktor_risiko, jenis_kelamin, fluoro_time, dose, kv, ma, waktu, total_kontras, air_kerma, dap_dose, accession_no, total, krs, consumable, selisih, temuan_pembuluh, kesimpulan_laporan, plan_medis, ${JADWAL_TEAM_PROJECTION}, ${CEK_OBAT_PROJECTION}`,
  // Fallback tanpa kolom cek
  `id, tanggal, dokter, dokter_anestesi, ppds, nama_pasien, no_rm, tindakan, kategori, status, status_keterangan, ruangan, pasien_id, is_fast_track, pasien_datang_igd, door_to_balloon, total_waktu_fast_track, fast_track_sign_in, fast_track_time_out, fast_track_sign_out, pci_report_link, pemakaian, kelas_pembiayaan, asmed, resume_erm, sjp, berkas_laporan, consumable_kelengkapan, billing_simrs, pj_laporan, operan_ranap, rs_perujuk, keterangan, diagnosa, faktor_risiko, jenis_kelamin, fluoro_time, dose, kv, ma, waktu, total_kontras, air_kerma, dap_dose, accession_no, total, krs, consumable, selisih, ${JADWAL_TEAM_PROJECTION}`,
];

async function fetchTableOrderedInChunks(
  supabase: NonNullable<ReturnType<typeof getServiceSupabaseAdmin>>,
  table: "tindakan" | "tindakan_medik",
  projection: string,
  maxRows: number,
): Promise<{
  data: Record<string, unknown>[];
  error: { message?: string } | null;
}> {
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
    tindakan:
      toText(row.tindakan) ?? toText(row.jenis) ?? toText(row.alkes_utama),
    kategori: toText(row.kategori),
    status: toText(row.status),
    ruangan: toText(row.ruangan),
    pasien_id: toText(row.pasien_id),
    created_at: toText(row.created_at),
    is_fast_track: (row as any).is_fast_track,
    pasien_datang_igd: toText(row.pasien_datang_igd),
    door_to_balloon: toText(row.door_to_balloon),
    total_waktu_fast_track: toText(row.total_waktu_fast_track),
    asmed: toText(row.asmed),
    resume_erm: toText(row.resume_erm),
    sjp: toText(row.sjp),
    berkas_laporan: toText(row.berkas_laporan),
    consumable_kelengkapan: toText(row.consumable_kelengkapan),
    billing_simrs: toText(row.billing_simrs),
    pj_laporan: toText(row.pj_laporan),
    operan_ranap: toText(row.operan_ranap),
    accession_no: toText(row.accession_no),
    _source_table: "tindakan_medik",
  };
}

/** Cache working projection to avoid re-testing on every request */
let workingProjectionCache: string | null = null;

function projectionHasFastTrackClockFields(projection: string | null): boolean {
  return Boolean(projection && (projection.includes("fast_track_time_out") || projection === "*"));
}

function projectionHasStatusKeteranganField(projection: string | null): boolean {
  return Boolean(projection && (projection.includes("status_keterangan") || projection === "*"));
}

function projectionHasAccessionNoField(projection: string | null): boolean {
  return Boolean(projection && (projection.includes("accession_no") || projection === "*"));
}

function projectionHasFaktorRisikoField(projection: string | null): boolean {
  return Boolean(projection && (projection.includes("faktor_risiko") || projection === "*"));
}

function projectionHasCekObatFields(projection: string | null): boolean {
  return Boolean(projection && (projection.includes("cek_ntg_cedocard") || projection === "*"));
}

function projectionHasJadwalTeamFields(projection: string | null): boolean {
  return Boolean(
    projection &&
      (projection === "*" ||
        (projection.includes("asisten") &&
          projection.includes("sirkuler") &&
          projection.includes("logger") &&
          projection.includes("hasil_lab_ppm"))),
  );
}

/** Daftar tindakan untuk dashboard (server-side service role, tahan RLS). */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitRaw = Number(searchParams.get("limit") ?? 2000);
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(Math.trunc(limitRaw), 1), 10000)
      : 2000;

    const dateFrom = searchParams.get("from")?.trim();
    const dateTo = searchParams.get("to")?.trim();
    const search = searchParams.get("search")?.trim();
    const unitSlug =
      request.headers.get("x-unit-slug") || searchParams.get("unit")?.trim();
    /** Satu baris tindakan tepat (sinkron URL `?tindakanId=` dengan header). */
    const tindakanIdEq = searchParams.get("tindakanId")?.trim();

    const { requireRole, requireUnitAccess } =
      await import("@/lib/auth/guards");

    // 1. Verifikasi Akses Unit jika unitSlug ada
    if (unitSlug) {
      const unitAuth = await requireUnitAccess(unitSlug);
      if (!unitAuth.ok) return unitAuth.response;
    } else {
      const auth = await requireRole([
        "perawat",
        "dokter",
        "cathlab",
        "admin",
        "administrator",
        "superadmin",
        "casemix",
      ]);
      if (!auth.ok) return auth.response;
    }

    if (
      workingProjectionCache &&
      (!projectionHasFastTrackClockFields(workingProjectionCache) ||
        !projectionHasStatusKeteranganField(workingProjectionCache) ||
        !projectionHasAccessionNoField(workingProjectionCache) ||
        !projectionHasFaktorRisikoField(workingProjectionCache) ||
        !projectionHasCekObatFields(workingProjectionCache) ||
        !projectionHasJadwalTeamFields(workingProjectionCache))
    ) {
      workingProjectionCache = null;
    }

    const projections = workingProjectionCache
      ? [
          workingProjectionCache,
          ...PROJECTIONS_LIST.filter((p) => p !== workingProjectionCache),
          "*",
        ]
      : [...PROJECTIONS_LIST, "*"];

    let data: Record<string, unknown>[] | null = null;
    let lastError: { message?: string } | null = null;

    const supabase = getServiceSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { ok: false, error: "Supabase not configured" },
        { status: 500 },
      );
    }

    const tarifMap = await fetchMasterTarifLookupMap(supabase);

    // List kolom aman untuk mencegah kebocoran data sensitif (PII) dari tabel tindakan
    const SAFE_TINDAKAN_COLUMNS = new Set([
      "id",
      "tanggal",
      "dokter",
      "dokter_anestesi",
      "ppds",
      "operator",
      "nama_pasien",
      "nama",
      "no_rm",
      "no_rekam_medis",
      "tindakan",
      "jenis",
      "alkes_utama",
      "kategori",
      "status",
      "ruangan",
      "pasien_id",
      "created_at",
      "inserted_at",
      "updated_at",
      "is_fast_track",
      "pasien_datang_igd",
      "door_to_balloon",
      "total_waktu_fast_track",
      "fast_track_sign_in",
      "fast_track_time_out",
      "fast_track_sign_out",
      "pci_report_link",
      "pemakaian",
      "kelas_pembiayaan",
      "asisten",
      "sirkuler",
      "logger",
      "hasil_lab_ppm",
      "asmed",
      "resume_erm",
      "sjp",
      "berkas_laporan",
      "consumable_kelengkapan",
      "billing_simrs",
      "pj_laporan",
      "operan_ranap",
      "rs_perujuk",
      "keterangan",
      "status_keterangan",
      "diagnosa",
      "faktor_risiko",
      "tarif_tindakan",
      "total",
      "krs",
      "consumable",
      "selisih",
      "umur",
      "jenis_kelamin",
      "fluoro_time",
      "dose",
      "kv",
      "ma",
      "waktu",
      "total_kontras",
      "air_kerma",
      "dap_dose",
      "dap_gy_cm2",
      "accession_no",
      "temuan_pembuluh",
      "kesimpulan_laporan",
      "plan_medis",
      "cek_ntg_cedocard",
      "cek_ntg_cedocard_ket",
      "cek_ntg_cedocard_jam",
      "cek_ntg_cedocard_oleh",
      "cek_heparin",
      "cek_heparin_ket",
      "cek_heparin_jam",
      "cek_heparin_oleh",
      "cek_lain",
      "cek_lain_ket",
      "cek_lain_jam",
      "cek_lain_oleh",
      "log_barang_klinis",
    ]);

    for (const projection of projections) {
      const getBaseQuery = () => {
        let q = supabase
          .from("tindakan")
          .select(projection)
          .order("tanggal", { ascending: false, nullsFirst: false })
          .order("id", { ascending: false });

        if (tindakanIdEq) q = q.eq("id", tindakanIdEq);
        if (dateFrom) q = q.gte("tanggal", dateFrom);
        if (dateTo) q = q.lte("tanggal", dateTo);
        if (unitSlug) {
          // Filter berdasarkan ruangan (bisa berupa slug atau nama ruangan)
          q = q.or(`ruangan.ilike.%${unitSlug}%`);
        }
        if (search) {
          q = q.or(
            `nama_pasien.ilike.%${search}%,no_rm.ilike.%${search}%,dokter.ilike.%${search}%,dokter_anestesi.ilike.%${search}%,ppds.ilike.%${search}%`,
          );
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
        if (
          allRawRows.length === POSTGREST_SAFE_CHUNK &&
          limit > POSTGREST_SAFE_CHUNK
        ) {
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

        // High-performance mapping for 10k+ rows
        data = allRawRows.slice(0, limit).map((row) => {
          // Filter hanya kolom aman
          const filteredRow: Record<string, any> = {};
          for (const key in row) {
            if (SAFE_TINDAKAN_COLUMNS.has(key)) {
              filteredRow[key] = row[key];
            }
          }

          // Inline some logic to avoid function call overhead in hot loop
          const rawNoRm =
            filteredRow.no_rm ||
            filteredRow.rm ||
            filteredRow.no_rekam_medis ||
            filteredRow.nomor_rm ||
            filteredRow.no_rm_pasien;
          const noRm =
            typeof rawNoRm === "string"
              ? rawNoRm.trim() || null
              : rawNoRm
                ? String(rawNoRm)
                : null;

          const rawNama = filteredRow.nama_pasien || filteredRow.nama;
          const nama_pasien =
            typeof rawNama === "string"
              ? rawNama.trim() || null
              : rawNama
                ? String(rawNama)
                : null;

          const withApiFields = {
            ...filteredRow,
            nama_pasien,
            no_rm: noRm,
            ruangan: filteredRow.ruangan || null,
            created_at:
              filteredRow.created_at ||
              filteredRow.inserted_at ||
              filteredRow.updated_at ||
              null,
            umur: filteredRow.umur || null,
            tgl_lahir: filteredRow.tgl_lahir || null,
          };

          // Inline enrich logic for speed
          const dbTarif = filteredRow.tarif_tindakan;
          if (
            dbTarif !== null &&
            dbTarif !== undefined &&
            dbTarif !== "" &&
            Number.isFinite(Number(dbTarif))
          ) {
            return enrichTindakanRowForApi(
              withApiFields as Record<string, unknown>,
            );
          }

          const tindakan = filteredRow.tindakan ?? filteredRow.jenis;
          if (tindakan && tarifMap.size > 0) {
            const k = String(tindakan)
              .trim()
              .replace(/\s+/g, " ")
              .toUpperCase();
            const hit = tarifMap.get(k);
            if (hit !== undefined) {
              (withApiFields as any).tarif_tindakan = hit;
            }
          }

          return enrichTindakanRowForApi(
            withApiFields as Record<string, unknown>,
          );
        });
        lastError = null;
        break;
      }
      lastError = (firstRes.error as { message?: string } | null) ?? null;
    }

    if (lastError) {
      return NextResponse.json(
        {
          ok: false,
          error: String(lastError.message ?? "query error"),
          data: [],
        },
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

/** Create a new tindakan record via Service Role — RLS resilient, used for Jadwal Cath Lab draft creation */
export async function POST(request: Request) {
  try {
    const { requireRole } = await import("@/lib/auth/guards");
    const auth = await requireRole([
      "perawat",
      "dokter",
      "cathlab",
      "admin",
      "administrator",
      "superadmin",
      "casemix",
    ]);
    if (!auth.ok) return auth.response;

    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const supabase = getServiceSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { ok: false, error: "Supabase service role tidak dikonfigurasi" },
        { status: 503 },
      );
    }

    const payload: Record<string, unknown> = {
      tanggal: body.tanggal ?? new Date().toISOString().split("T")[0],
      status: body.status ?? "Menunggu",
      kategori: body.kategori ?? "Belum diisi",
      ruangan: body.ruangan ?? "Belum diisi",
      nama: body.nama ?? body.nama_pasien ?? "",
      nama_pasien: body.nama_pasien ?? body.nama ?? "",
      tindakan: body.tindakan ?? "",
      dokter: body.dokter ?? "",
    };

    if (body.no_rm != null || body.rm != null) {
      payload.no_rm = body.no_rm ?? body.rm ?? null;
    }
    if (body.diagnosa != null) payload.diagnosa = body.diagnosa;
    if (body.kelas_pembiayaan != null) payload.kelas_pembiayaan = body.kelas_pembiayaan;
    if (body.umur != null) {
      const umur = coerceUmurForDb(body.umur);
      if (umur != null) payload.umur = umur;
    }
    if (body.hasil_lab_ppm != null) payload.hasil_lab_ppm = body.hasil_lab_ppm;
    if (body.asisten != null) payload.asisten = body.asisten;
    if (body.sirkuler != null) payload.sirkuler = body.sirkuler;
    if (body.logger != null) payload.logger = body.logger;
    if (body.keterangan != null) payload.keterangan = body.keterangan;
    if (body.pasien_id != null) payload.pasien_id = body.pasien_id;
    if (body.waktu != null) payload.waktu = body.waktu;

    let attemptBody: Record<string, unknown> = { ...payload };
    let lastError: unknown = null;

    for (let i = 0; i < 8; i += 1) {
      const { data, error } = await supabase
        .from("tindakan")
        .insert(attemptBody)
        .select("id")
        .single();

      if (!error && data?.id) {
        return NextResponse.json(
          { ok: true, data: { id: data.id, ...attemptBody } },
          { status: 201 },
        );
      }

      lastError = error;
      const msg = String((error as { message?: string })?.message ?? "");

      // 1. Tangani error missing column di cache PostgREST (hapus kolom yang tidak ada di skema DB)
      if (msg.includes("column") && msg.includes("schema cache")) {
        const missingColMatch = msg.match(/'([^']+)'/);
        const missingCol = missingColMatch?.[1]?.trim();
        if (missingCol && missingCol in attemptBody) {
          delete attemptBody[missingCol];
          continue;
        }
      }

      // 2. Tangani error NOT NULL constraint di PostgreSQL (otomatis isi string kosong "" jika kolom tidak boleh NULL)
      if (msg.includes("not-null constraint") || msg.includes("violates not-null constraint")) {
        const notNullColMatch = msg.match(/column\s+"([^"]+)"/i) || msg.match(/'([^']+)'/);
        const notNullCol = notNullColMatch?.[1]?.trim();
        if (notNullCol) {
          attemptBody[notNullCol] = "";
          continue;
        }
      }

      break;
    }

    return NextResponse.json(
      {
        ok: false,
        error: String(
          (lastError as { message?: string })?.message ??
            "Gagal membuat jadwal baru.",
        ),
      },
      { status: 500 },
    );
  } catch (err) {
    console.error("[POST api/tindakan]", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Terjadi kesalahan server",
      },
      { status: 500 },
    );
  }
}

