/**
 * Pemetaan baris `public.tindakan` — skema Cathlab penuh vs skema sederhana
 * (bigint id, nama, dokter teks, tanpa ruangan di DB lama).
 */

export function toText(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

export function coalesceNoRm(row: Record<string, unknown>): string | null {
  return (
    toText(row.no_rm) ??
    toText(row.rm) ??
    toText(row.no_rekam_medis) ??
    toText(row.nomor_rm) ??
    toText(row.no_rm_pasien)
  );
}

/** Satu baris dari Supabase → bentuk yang diharapkan UI (nama_pasien, no_rm, created_at). */
export function enrichTindakanRowForApi(
  row: Record<string, unknown>,
): Record<string, unknown> {
  const noRm = coalesceNoRm(row) ?? toText(row.no_rm);
  return {
    ...row,
    nama_pasien: toText(row.nama_pasien) ?? toText(row.nama),
    no_rm: noRm ?? row.no_rm ?? null,
    ruangan: row.ruangan ?? null,
    created_at: row.created_at ?? row.inserted_at ?? null,
  };
}

/**
 * Patch dari UI (nama_pasien, dll.) → kolom tabel yang benar.
 * nama_pasien → nama; rm → no_rm; kolom skalar lain 1:1 bila ada di `sanitized`.
 */
export function finalizeTindakanPatchForSupabase(
  sanitized: Record<string, unknown>,
): Record<string, unknown> {
  const db: Record<string, unknown> = {};

  if (sanitized.nama_pasien !== undefined) {
    db.nama =
      sanitized.nama_pasien === "" || sanitized.nama_pasien === null
        ? null
        : sanitized.nama_pasien;
  }
  if (sanitized.nama !== undefined) {
    db.nama =
      sanitized.nama === "" || sanitized.nama === null ? null : sanitized.nama;
  }

  for (const key of [
    "fluoro_time",
    "dose",
    "dap_gy_cm2",
    "kv",
    "ma",
    "total",
    "krs",
    "consumable",
    "air_kerma",
    "dap_dose",
  ] as const) {
    if (sanitized[key] === undefined) continue;
    const v = sanitized[key];
    if (v === null || v === "") {
      db[key] = null;
      continue;
    }
    if (typeof v === "number" && Number.isFinite(v)) {
      db[key] = v;
      continue;
    }
    const t = String(v).trim().replace(/\s/g, "").replace(",", ".");
    if (!t) {
      db[key] = null;
      continue;
    }
    const n = Number(t);
    db[key] = Number.isFinite(n) ? n : null;
  }

  for (const key of [
    "dokter",
    "tindakan",
    "status",
    "tanggal",
    "ruangan",
    "no_rm",
    "kategori",
    "waktu",
    "pasien_id",
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
    "pasien_datang_igd",
    "door_to_balloon",
    "total_waktu_fast_track",
    "fast_track_sign_in",
    "fast_track_time_out",
    "fast_track_sign_out",
    "fast_track_fotos",
    "cath",
    "asisten",
    "sirkuler",
    "logger",
    "pemakaian",
  ] as const) {
    if (sanitized[key] === undefined) continue;
    const v = sanitized[key];
    db[key] = v === "" ? null : v;
  }

  /** Alias UI `rm` → kolom `no_rm` (skema Cathlab). */
  if (sanitized.rm !== undefined) {
    const v = sanitized.rm;
    db.no_rm = v === "" ? null : v;
  }

  /** Alias UI `tanggal_tindakan` -> kolom `tanggal` (skema Cathlab). */
  if (sanitized.tanggal_tindakan !== undefined) {
    const v = sanitized.tanggal_tindakan;
    db.tanggal = v === "" ? null : v;
  }

  // Kolom NOT NULL di skema sederhana: jangan kirim null (biarkan nilai DB tetap).
  for (const k of ["nama", "dokter", "tindakan", "status"]) {
    if (db[k] === null) delete db[k];
  }

  return db;
}

function toFiniteNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n =
    typeof v === "number"
      ? v
      : Number(String(v).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function mapTindakanRowToApiDetail(data: Record<string, unknown>) {
  return {
    id: String(data.id),
    tanggal: (data.tanggal as string | null) ?? null,
    dokter: (data.dokter as string | null) ?? null,
    ruangan: (data.ruangan as string | null) ?? null,
    cath: toText(data.cath),
    tindakan: (data.tindakan as string | null) ?? null,
    status: (data.status as string | null) ?? null,
    pasien_id: data.pasien_id != null ? String(data.pasien_id) : null,
    no_rm: coalesceNoRm(data) ?? toText(data.no_rm),
    nama_pasien: toText(data.nama_pasien) ?? toText(data.nama) ?? null,
    asisten: toText(data.asisten),
    sirkuler: toText(data.sirkuler),
    logger: toText(data.logger),
    diagnosa: toText(data.diagnosa),
    faktor_risiko: toText(data.faktor_risiko),
    severity_level: toText(data.severity_level),
    pci_report_link: toText(data.pci_report_link),
    hasil_lab_ppm: toText(data.hasil_lab_ppm),
    temuan_pembuluh: toText(data.temuan_pembuluh),
    kesimpulan_laporan: toText(data.kesimpulan_laporan),
    plan_medis: toText(data.plan_medis),
    total_kontras: toText(data.total_kontras),
    is_fast_track: data.is_fast_track === true || data.is_fast_track === 1 || String(data.is_fast_track) === "true" || String(data.is_fast_track) === "1",
    pasien_datang_igd: toText(data.pasien_datang_igd),
    door_to_balloon: toText(data.door_to_balloon),
    total_waktu_fast_track: toText(data.total_waktu_fast_track),
    fast_track_sign_in: toText(data.fast_track_sign_in),
    fast_track_time_out: toText(data.fast_track_time_out),
    fast_track_sign_out: toText(data.fast_track_sign_out),
    fast_track_fotos: toText(data.fast_track_fotos),
    tarif_tindakan: toFiniteNumberOrNull(data.tarif_tindakan),
    total: toFiniteNumberOrNull(data.total),
    krs: toText(data.krs),
    selisih: toFiniteNumberOrNull(data.selisih),
    consumable: toFiniteNumberOrNull(data.consumable),
    air_kerma: toFiniteNumberOrNull(data.air_kerma),
    dap_dose: toFiniteNumberOrNull(data.dap_dose),
    pemakaian: toText(data.pemakaian),
  };
}
