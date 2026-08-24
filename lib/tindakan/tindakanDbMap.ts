/**
 * Pemetaan baris `public.tindakan` — skema Cathlab penuh vs skema sederhana
 * (bigint id, nama, dokter teks, tanpa ruangan di DB lama).
 */

import {
  normalizeCekJam,
  sanitizeLogBarangKlinis,
  toBoolCek,
} from "@/lib/tindakan/cekObatPemakaianBridge";

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
  /** UI/detail lama membaca `dap_gy_cm2`; banyak DB hanya punya `dap_dose`. */
  const dapGy = row.dap_gy_cm2;
  const dapLegacy = row.dap_dose;
  const dapMerged =
    dapGy !== null &&
    dapGy !== undefined &&
    String(dapGy).trim() !== ""
      ? dapGy
      : dapLegacy ?? null;
  return {
    ...row,
    nama_pasien: toText(row.nama_pasien) ?? toText(row.nama),
    no_rm: noRm ?? row.no_rm ?? null,
    ruangan: row.ruangan ?? null,
    created_at: row.created_at ?? row.inserted_at ?? null,
    dap_gy_cm2: dapMerged,
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
    db.nama = sanitized.nama_pasien ?? "";
    db.nama_pasien = sanitized.nama_pasien ?? "";
  }
  if (sanitized.nama !== undefined) {
    db.nama = sanitized.nama ?? "";
    db.nama_pasien = sanitized.nama ?? "";
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
    "dokter_anestesi",
    "ppds",
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
  ] as const) {
    if (sanitized[key] === undefined) continue;
    const v = sanitized[key];
    if (
      key === "cek_ntg_cedocard" ||
      key === "cek_heparin" ||
      key === "cek_lain"
    ) {
      db[key] = toBoolCek(v);
      continue;
    }
    if (
      key === "cek_ntg_cedocard_jam" ||
      key === "cek_heparin_jam" ||
      key === "cek_lain_jam"
    ) {
      db[key] = normalizeCekJam(v);
      continue;
    }
    if (key === "log_barang_klinis") {
      db[key] = sanitizeLogBarangKlinis(v);
      continue;
    }
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
    dokter: toText(data.dokter) ?? toText(data.operator),
    dokter_anestesi: toText(data.dokter_anestesi),
    ppds: toText(data.ppds),
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
    /** Gabungan: instalasi dengan `dap_gy_cm2` saja vs `dap_dose` saja. */
    dap_dose: toFiniteNumberOrNull(data.dap_dose ?? data.dap_gy_cm2),
    fluoro_time: toFiniteNumberOrNull(data.fluoro_time),
    dose: toFiniteNumberOrNull(data.dose),
    kv: toFiniteNumberOrNull(data.kv),
    ma: toFiniteNumberOrNull(data.ma),
    waktu: toText(data.waktu),
    dap_gy_cm2: toFiniteNumberOrNull(data.dap_gy_cm2 ?? data.dap_dose),
    pemakaian: toText(data.pemakaian),
    asmed: toText(data.asmed),
    resume_erm: toText(data.resume_erm),
    sjp: toText(data.sjp),
    berkas_laporan: toText(data.berkas_laporan),
    consumable_kelengkapan: toText(data.consumable_kelengkapan),
    billing_simrs: toText(data.billing_simrs),
    pj_laporan: toText(data.pj_laporan),
    operan_ranap: toText(data.operan_ranap),
    rs_perujuk: toText(data.rs_perujuk),
    keterangan: toText(data.keterangan),
    status_keterangan: toText(data.status_keterangan),
    kelas_pembiayaan: toText(data.kelas_pembiayaan),
    accession_no: toText(data.accession_no),
    cek_ntg_cedocard: toBoolCek(data.cek_ntg_cedocard),
    cek_ntg_cedocard_ket: toText(data.cek_ntg_cedocard_ket),
    cek_ntg_cedocard_jam: normalizeCekJam(data.cek_ntg_cedocard_jam),
    cek_ntg_cedocard_oleh: toText(data.cek_ntg_cedocard_oleh),
    cek_heparin: toBoolCek(data.cek_heparin),
    cek_heparin_ket: toText(data.cek_heparin_ket),
    cek_heparin_jam: normalizeCekJam(data.cek_heparin_jam),
    cek_heparin_oleh: toText(data.cek_heparin_oleh),
    cek_lain: toBoolCek(data.cek_lain),
    cek_lain_ket: toText(data.cek_lain_ket),
    cek_lain_jam: normalizeCekJam(data.cek_lain_jam),
    cek_lain_oleh: toText(data.cek_lain_oleh),
    log_barang_klinis: sanitizeLogBarangKlinis(data.log_barang_klinis),
  };
}
