import { NextResponse } from "next/server";

/**
 * Impor modul berat (auth, Supabase, mapping tarif) dilakukan via `import()` per handler
 * agar chunk kompilasi dev & cold start tidak menarik seluruh graf sekaligus.
 */
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Kolom skalar yang boleh di-patch dari UI daftar kasus (bukan FK mentah). */
const PATCHABLE_TINDAKAN_KEYS = new Set([
  "ruangan",
  "tindakan",
  "dokter",
  "dokter_anestesi",
  "ppds",
  "tanggal",
  "waktu",
  "fluoro_time",
  "dose",
  "kv",
  "ma",
  "dap_gy_cm2",
  "nama_pasien",
  "nama",
  "no_rm",
  "rm",
  "status",
  "kategori",
  "diagnosa",
  "faktor_risiko",
  "severity_level",
  "pci_report_link",
  "hasil_lab_ppm",
  "temuan_pembuluh",
  "kesimpulan_laporan",
  "plan_medis",
  "total_kontras",
  "is_fast_track",
  "tanggal_tindakan",
  "air_kerma",
  "dap_dose",
  "pasien_datang_igd",
  "door_to_balloon",
  "total_waktu_fast_track",
  "fast_track_sign_in",
  "fast_track_time_out",
  "fast_track_sign_out",
  "fast_track_fotos",
  "pasien_id",
  "cath",
  "asisten",
  "sirkuler",
  "logger",
  "total",
  "krs",
  "consumable",
  "pemakaian",
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
  "kelas_pembiayaan",
  "accession_no",
]);

function sanitizeTindakanPatch(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {};
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    if (!PATCHABLE_TINDAKAN_KEYS.has(k)) continue;
    if (v === undefined) continue;
    out[k] = v === "" ? null : v;
  }
  return out;
}

/** PostgREST: kolom belum ada di tabel / cache skema (instalasi lama / migrasi belum jalan). */
function extractMissingColumnFromSchemaCacheError(
  message: string,
): string | null {
  const m = String(message ?? "").match(/could not find the '([^']+)' column/i);
  return m?.[1]?.trim() || null;
}

/**
 * Satu baris `tindakan` — untuk deep link Pemakaian (`?tindakanId=`).
 */
export async function GET(_req: Request, ctx: Params) {
  const { requireRole } = await import("@/lib/auth/guards");
  const auth = await requireRole([
    "perawat",
    "admin",
    "administrator",
    "superadmin",
    "casemix",
  ]);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const tindakanId = typeof id === "string" ? id.trim() : "";
  if (!tindakanId) {
    return NextResponse.json(
      { ok: false, message: "ID tindakan tidak valid." },
      { status: 400 },
    );
  }

  const [{ createAdminClient }, masterTarif, tindakanDbMap] = await Promise.all(
    [
      import("@/lib/supabase/admin"),
      import("@/lib/tindakan/masterTarifTindakan"),
      import("@/lib/tindakan/tindakanDbMap"),
    ],
  );

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Supabase service role tidak dikonfigurasi" },
      { status: 503 },
    );
  }

  const { data, error } = await supabase
    .from("tindakan")
    .select(
      "id, tanggal, dokter, operator, dokter_anestesi, ppds, ruangan, cath, tindakan, status, status_keterangan, pasien_id, no_rm, nama, nama_pasien, asisten, sirkuler, logger, diagnosa, faktor_risiko, severity_level, pci_report_link, hasil_lab_ppm, temuan_pembuluh, kesimpulan_laporan, plan_medis, total_kontras, fluoro_time, dose, kv, ma, waktu, air_kerma, dap_dose, is_fast_track, pasien_datang_igd, door_to_balloon, total_waktu_fast_track, fast_track_sign_in, fast_track_time_out, fast_track_sign_out, fast_track_fotos, tarif_tindakan, total, krs, selisih, consumable, pemakaian, kelas_pembiayaan, asmed, resume_erm, sjp, berkas_laporan, consumable_kelengkapan, billing_simrs, pj_laporan, operan_ranap, rs_perujuk, keterangan",
    )
    .eq("id", tindakanId)
    .maybeSingle();

  if (error) {
    console.error("[api/tindakan/[id]]", error);
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 },
    );
  }
  if (!data) {
    return NextResponse.json(
      { ok: false, message: "Kasus tindakan tidak ditemukan." },
      { status: 404 },
    );
  }

  const tarifMap = await masterTarif.fetchMasterTarifLookupMap(supabase);
  const row = masterTarif.enrichTindakanRowTarifFromMasterMap(
    data as Record<string, unknown>,
    tarifMap,
  );

  return NextResponse.json({
    ok: true,
    data: tindakanDbMap.mapTindakanRowToApiDetail(row),
  });
}

/**
 * Patch sebagian baris `tindakan` — service role (tahan RLS), dipakai UI inline edit.
 */
export async function PATCH(req: Request, ctx: Params) {
  const { requireRole } = await import("@/lib/auth/guards");
  const auth = await requireRole([
    "perawat",
    "admin",
    "administrator",
    "superadmin",
    "casemix",
  ]);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const tindakanId = typeof id === "string" ? id.trim() : "";
  if (!tindakanId) {
    return NextResponse.json(
      { ok: false, message: "ID tindakan tidak valid." },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Body JSON tidak valid." },
      { status: 400 },
    );
  }

  const [{ createAdminClient }, masterTarif, tindakanDbMap] = await Promise.all(
    [
      import("@/lib/supabase/admin"),
      import("@/lib/tindakan/masterTarifTindakan"),
      import("@/lib/tindakan/tindakanDbMap"),
    ],
  );

  const sanitized = sanitizeTindakanPatch(body);
  const patch = tindakanDbMap.finalizeTindakanPatchForSupabase(sanitized);

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Supabase service role tidak dikonfigurasi" },
      { status: 503 },
    );
  }

  const tarifMap = await masterTarif.fetchMasterTarifLookupMap(supabase);
  if (Object.prototype.hasOwnProperty.call(patch, "tindakan")) {
    const hit = masterTarif.lookupMasterTarifRupiah(tarifMap, patch.tindakan);
    if (hit != null) patch.tarif_tindakan = hit;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { ok: false, message: "Tidak ada field yang diizinkan untuk diubah." },
      { status: 400 },
    );
  }

  const { buildAutoSelesaiStatusUpdates } =
    await import("@/lib/tindakan/autoStatusSelesai");

  const { data: existingRow } = await supabase
    .from("tindakan")
    .select("dokter, operator, tindakan, ruangan, status")
    .eq("id", tindakanId)
    .maybeSingle();

  /** Beberapa DB tidak punya kolom opsional (mis. `pasien_id`); buang dari payload lalu ulang — selaras `useTindakanCrud` insert. */
  let attemptPatch: Record<string, unknown> = { ...patch };
  const autoStatus = buildAutoSelesaiStatusUpdates({
    ...(existingRow ?? {}),
    ...attemptPatch,
  } as Record<string, unknown>);
  if (autoStatus) {
    attemptPatch = { ...attemptPatch, ...autoStatus };
  }

  let lastError: { message?: string } | null = null;

  for (let i = 0; i < 16; i += 1) {
    if (Object.keys(attemptPatch).length === 0) {
      const lastMsg = String(lastError?.message ?? "");
      const missing = extractMissingColumnFromSchemaCacheError(lastMsg);
      const hint =
        missing && isMissingRelationOrTableError(lastError)
          ? ` Kolom "${missing}" belum ada di database atau cache skema belum segar — jalankan migrasi (mis. \`npx supabase db push\`) atau tunggu ±1 menit lalu coba lagi.`
          : "";
      return NextResponse.json(
        {
          ok: false,
          message:
            (lastMsg ||
              "Tidak ada kolom yang bisa diperbarui untuk skema tindakan ini.") +
            hint,
        },
        { status: 500 },
      );
    }

    const { data: updated, error } = await supabase
      .from("tindakan")
      .update(attemptPatch)
      .eq("id", tindakanId)
      .select("id")
      .maybeSingle();

    if (!error) {
      if (!updated) {
        return NextResponse.json(
          { ok: false, message: "Kasus tindakan tidak ditemukan." },
          { status: 404 },
        );
      }

      const warnings: string[] = [];
      const statusTouched =
        Object.prototype.hasOwnProperty.call(patch, "status") ||
        Object.prototype.hasOwnProperty.call(patch, "status_keterangan");

      if (statusTouched) {
        const { buildStatusKeteranganWarnings, insertTindakanStatusLog } =
          await import("@/lib/tindakan/logTindakanStatusChange");

        const { data: current } = await supabase
          .from("tindakan")
          .select("status, status_keterangan")
          .eq("id", tindakanId)
          .maybeSingle();

        const nextStatus =
          current?.status != null ? String(current.status) : null;
        const nextKet =
          current?.status_keterangan != null
            ? String(current.status_keterangan)
            : null;

        warnings.push(...buildStatusKeteranganWarnings(nextStatus, nextKet));

        await insertTindakanStatusLog(supabase, {
          tindakanId,
          status: nextStatus,
          statusKeterangan: nextKet,
          changedBy: auth.userId,
        });
      }

      return NextResponse.json(
        { ok: true, data: updated, warnings },
        { status: 200 },
      );
    }

    lastError = error;
    const msg = String(error.message ?? "");
    const missingCol = extractMissingColumnFromSchemaCacheError(msg);
    if (
      !missingCol ||
      !Object.prototype.hasOwnProperty.call(attemptPatch, missingCol)
    ) {
      console.error("[PATCH api/tindakan/[id]]", error);
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 500 },
      );
    }
    const next = { ...attemptPatch };
    delete next[missingCol];
    attemptPatch = next;
  }

  console.error("[PATCH api/tindakan/[id]] exhausted retries", lastError);
  return NextResponse.json(
    { ok: false, message: lastError?.message || "Gagal memperbarui tindakan." },
    { status: 500 },
  );
}

function isMissingRelationOrTableError(
  err: { message?: string } | null,
): boolean {
  const msg = String(err?.message ?? "").toLowerCase();
  return (
    msg.includes("does not exist") ||
    msg.includes("could not find") ||
    msg.includes("schema cache") ||
    msg.includes("pgrst204")
  );
}

/**
 * Hapus satu baris kasus — service role (sama seperti PATCH), supaya konsisten dengan GET daftar
 * dan tidak bergantung pada RLS klien anon.
 */
export async function DELETE(_req: Request, ctx: Params) {
  const { requireRole } = await import("@/lib/auth/guards");
  const auth = await requireRole([
    "perawat",
    "admin",
    "administrator",
    "superadmin",
    "casemix",
  ]);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const tindakanId = typeof id === "string" ? id.trim() : "";
  if (!tindakanId) {
    return NextResponse.json(
      { ok: false, message: "ID tindakan tidak valid." },
      { status: 400 },
    );
  }

  const { createAdminClient } = await import("@/lib/supabase/admin");

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Supabase service role tidak dikonfigurasi" },
      { status: 503 },
    );
  }

  const primary = await supabase
    .from("tindakan")
    .delete()
    .eq("id", tindakanId)
    .select("id");
  if (primary.error && !isMissingRelationOrTableError(primary.error)) {
    console.error("[DELETE api/tindakan/[id]] tindakan", primary.error);
    return NextResponse.json(
      { ok: false, message: primary.error.message },
      { status: 500 },
    );
  }
  const nPrimary = Array.isArray(primary.data) ? primary.data.length : 0;
  if (nPrimary > 0) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const legacy = await supabase
    .from("tindakan_medik")
    .delete()
    .eq("id", tindakanId)
    .select("id");
  if (legacy.error && !isMissingRelationOrTableError(legacy.error)) {
    console.error("[DELETE api/tindakan/[id]] tindakan_medik", legacy.error);
    return NextResponse.json(
      { ok: false, message: legacy.error.message },
      { status: 500 },
    );
  }
  const nLegacy = Array.isArray(legacy.data) ? legacy.data.length : 0;
  if (nLegacy > 0) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  return NextResponse.json(
    { ok: false, message: "Kasus tindakan tidak ditemukan." },
    { status: 404 },
  );
}
