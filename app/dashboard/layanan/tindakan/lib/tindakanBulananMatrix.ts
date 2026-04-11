import type { PasienOption } from "@/components/ui/pasien-combobox";
import { formatKelasPerawatanDisplay } from "@/app/dashboard/pasien/utils/formatKelasPerawatan";
import type { TindakanJoinResult } from "../bridge/mapping.types";
import {
  categorizeTindakanLab,
  LAB_TINDAKAN_ROW_LABELS,
} from "./tindakanTerbanyakLab";

/** Baris laporan cara bayar (tetap). Baris BELUM TERISI ditambahkan di agregasi hanya jika ada kasus tanpa data biaya. */
export const CARA_BAYAR_ROW_LABELS_CORE = [
  "BPJS NON PBI KLS 1",
  "BPJS NON PBI KLS 2",
  "BPJS NON PBI KLS 3",
  "PBI",
  "UMUM",
  "ASURANSI",
] as const;

/** Kasus tanpa jenis/kelas pembiayaan di tindakan & tidak terisi dari master — bukan UMUM. */
export const CARA_BAYAR_LABEL_BELUM_TERISI = "BELUM TERISI" as const;

export type CaraBayarLaporanLabel =
  | (typeof CARA_BAYAR_ROW_LABELS_CORE)[number]
  | typeof CARA_BAYAR_LABEL_BELUM_TERISI;

/** Daftar lengkap (dokumentasi / cetak); matriks bulanan memakai CORE + baris dinamis. */
export const CARA_BAYAR_ROW_LABELS = [
  ...CARA_BAYAR_ROW_LABELS_CORE,
  CARA_BAYAR_LABEL_BELUM_TERISI,
] as const satisfies readonly CaraBayarLaporanLabel[];

export type MonthlyMatrixAgg = {
  year: number;
  month1to12: number;
  daysInMonth: number;
  /** Hanya baris data (tanpa JUMLAH). */
  rowLabels: string[];
  /** [baris][hariIndex 0..daysInMonth-1] */
  data: number[][];
  rowTotals: number[];
  colTotals: number[];
  grandTotal: number;
  /** Detail pasien per sel: [baris][hariIndex][] (Point 4) */
  details?: {
    nama: string;
    no_rm: string;
    dokter: string;
    tindakan?: string;
  }[][][];
};

function isInYearMonth(
  tanggal: unknown,
  year: number,
  month1to12: number,
): boolean {
  const s = String(tanggal ?? "").trim();
  if (s.length < 7) return false;
  const y = Number.parseInt(s.slice(0, 4), 10);
  const m = Number.parseInt(s.slice(5, 7), 10);
  return y === year && m === month1to12;
}

function dayOfMonthFromTanggal(raw: unknown): number | null {
  const s = String(raw ?? "").trim();
  if (s.length < 10) return null;
  const d = Number.parseInt(s.slice(8, 10), 10);
  if (!Number.isFinite(d) || d < 1 || d > 31) return null;
  return d;
}

function daysInMonth(year: number, month1to12: number): number {
  return new Date(year, month1to12, 0).getDate();
}

function parseKelas123(...parts: string[]): 1 | 2 | 3 | null {
  for (const part of parts) {
    const hay = part.toLowerCase();
    const m = hay.match(/(?:kelas|kls|cls)\s*[:.\-]?\s*([123])\b/);
    if (m) return Number(m[1]) as 1 | 2 | 3;
    const m2 = hay.match(/-\s*([123])(?:\s|$)/);
    if (m2) return Number(m2[1]) as 1 | 2 | 3;
  }
  return null;
}

/**
 * Selaras `public.pasien` / TambahPasienQuickModal:
 * BPJS = BPJS-PBI (laporan: baris PBI), NPBI + Kelas 1|2|3 = baris BPJS NON PBI KLS *.
 */
type MasterJenisPembiayaan = "BPJS" | "NPBI" | "Umum" | "Asuransi";

function normalizeMasterJenisPembiayaan(raw: string): MasterJenisPembiayaan | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const upper = s.toUpperCase().replace(/\s+/g, " ");
  if (upper === "BPJS" || upper === "BPJS-PBI" || upper === "BPJS PBI") return "BPJS";
  if (upper === "PBI") return "BPJS";
  if (upper === "NPBI" || upper === "NON PBI" || upper === "NON-PBI") return "NPBI";
  if (upper === "UMUM") return "Umum";
  if (upper === "ASURANSI") return "Asuransi";
  if (s === "Umum" || s === "Asuransi") return s;
  return null;
}

/** Contoh drawer: `NPBI - 1`, `BPJS - 3` (formatKelasPerawatanDisplay + jenis). */
function parseKelasPembiayaanCombo(
  kelasPembiayaan: string,
): { jenis: MasterJenisPembiayaan; kelas: 1 | 2 | 3 } | null {
  const m = kelasPembiayaan.trim().match(/^(.+?)\s*-\s*([123])\s*$/);
  if (!m) return null;
  const jenis = normalizeMasterJenisPembiayaan(m[1]!.trim());
  if (!jenis) return null;
  const d = Number(m[2]) as 1 | 2 | 3;
  return { jenis, kelas: d };
}

function mapFromStructuredPembiayaanFields(
  pem: string,
  kp: string,
  kelasField: string,
): CaraBayarLaporanLabel | null {
  const combo = kp ? parseKelasPembiayaanCombo(kp) : null;
  const jenis =
    combo?.jenis ??
    normalizeMasterJenisPembiayaan(pem) ??
    normalizeMasterJenisPembiayaan(kp);

  if (!jenis) return null;

  const kelasNpbi =
    combo?.kelas ?? parseKelas123(kp, kelasField, pem) ?? null;

  if (jenis === "Asuransi") return "ASURANSI";
  if (jenis === "Umum") return "UMUM";
  if (jenis === "BPJS") return "PBI";

  const cls = kelasNpbi ?? 3;
  if (cls === 1) return "BPJS NON PBI KLS 1";
  if (cls === 2) return "BPJS NON PBI KLS 2";
  return "BPJS NON PBI KLS 3";
}

/**
 * Memetakan baris tindakan ke kategori laporan cara bayar.
 * Utama: `pembiayaan` + `kelas_pembiayaan` (enum + pola `Jenis - 1|2|3` seperti master pasien).
 * UMUM hanya jika jenis Umum eksplisit / teks mengandung umum.
 * Tanpa data biaya yang bisa diklasifikasi → BELUM TERISI (bukan UMUM).
 */
export function mapTindakanRowToCaraBayarLaporan(
  row: TindakanJoinResult,
): CaraBayarLaporanLabel {
  const pem = String(row.pembiayaan ?? "").trim();
  const kp = String(row.kelas_pembiayaan ?? "").trim();
  const kelas = String(row.kelas ?? "").trim();

  const structured = mapFromStructuredPembiayaanFields(pem, kp, kelas);
  if (structured) return structured;

  if (!pem && !kp && !kelas) return CARA_BAYAR_LABEL_BELUM_TERISI;

  const u = `${pem} ${kp} ${kelas}`.toLowerCase();

  if (/\basuransi\b/i.test(u)) return "ASURANSI";
  if (pem.toLowerCase() === "umum" || /\bumum\b/i.test(u)) return "UMUM";

  const nonPbi =
    /\bnpbi\b|\bnon[-\s]?\s*pbi\b/i.test(u) ||
    pem.toLowerCase() === "npbi" ||
    (pem.toLowerCase() === "bpjs" && /\bnpbi\b|\bnon/i.test(u));

  const pbiRecipient =
    /\bpenerima\b|\bbpjs\s*pbi\b|jamkesmas|bpjs\s*-\s*pbi/i.test(u) ||
    (/\bpbi\b/i.test(u) && !nonPbi && !/\bnpbi\b/i.test(pem.toLowerCase()));

  if (pbiRecipient && !nonPbi) return "PBI";

  /** BPJS saja = PBI (bukan NPBI kelas); NPBI harus eksplisit. */
  const pemLower = pem.toLowerCase();
  if (
    !nonPbi &&
    (pemLower === "bpjs" ||
      pemLower === "pbi" ||
      pemLower === "bpjs-pbi" ||
      (/\bbpjs\b/i.test(u) && !/\bnpbi\b/i.test(u) && !/\bnon[-\s]?pbi\b/i.test(u)))
  ) {
    return "PBI";
  }

  if (nonPbi || /\bnpbi\b/i.test(pemLower) || /\bnpbi\b/i.test(u)) {
    const cls =
      parseKelas123(kp, kelas, pem) ??
      (/\bkls\s*1\b|kelas\s*1\b/i.test(u)
        ? 1
        : /\bkls\s*2\b|kelas\s*2\b/i.test(u)
          ? 2
          : /\bkls\s*3\b|kelas\s*3\b/i.test(u)
            ? 3
            : null);
    if (cls === 1) return "BPJS NON PBI KLS 1";
    if (cls === 2) return "BPJS NON PBI KLS 2";
    if (cls === 3) return "BPJS NON PBI KLS 3";
    return "BPJS NON PBI KLS 3";
  }

  return CARA_BAYAR_LABEL_BELUM_TERISI;
}

/**
 * Cocokkan baris tindakan ke entri master pasien (GET /api/pasien?compact=1).
 * Prioritas: pasien_id, lalu no_rm unik (angka).
 */
export function resolvePasienOptionForLaporanCaraBayar(
  options: readonly PasienOption[],
  row: TindakanJoinResult,
): PasienOption | null {
  if (!options.length) return null;
  const raw = row as unknown as Record<string, unknown>;
  const pid = String(raw.pasien_id ?? "").trim();
  if (pid) {
    const hit = options.find((p) => String(p.id) === pid);
    if (hit) return hit;
  }
  const rm = String(
    raw.no_rm ?? raw.rm ?? raw.no_rm_pasien ?? raw.nomor_rm ?? "",
  ).trim();
  const digits = rm.replace(/\D/g, "");
  if (digits.length >= 3) {
    const matches = options.filter(
      (p) => String(p.no_rm ?? "").replace(/\D/g, "") === digits,
    );
    if (matches.length === 1) return matches[0]!;
  }
  return null;
}

/**
 * Gabungkan jenis + kelas dari master pasien ke baris tindakan untuk klasifikasi laporan,
 * selaras tab Biaya / `buildKelasPembiayaanFromPasienMaster` di drawer.
 * Jika master tidak punya jenis maupun kelas, kembalikan `row` tanpa ubah.
 */
export function applyPasienMasterForCaraBayarRow(
  row: TindakanJoinResult,
  pasien: PasienOption | null,
): TindakanJoinResult {
  if (!pasien) return row;
  const jp = String(pasien.jenis_pembiayaan ?? pasien.pembiayaan ?? "").trim();
  const kelasRaw = String(pasien.kelas_perawatan ?? pasien.kelas ?? "").trim();
  if (!jp && !kelasRaw) return row;

  const pem = jp || String(row.pembiayaan ?? "").trim();
  const kelasForDisplay = kelasRaw || String(row.kelas ?? "").trim();
  const kelasShort = formatKelasPerawatanDisplay(kelasForDisplay);
  const hasKelas = kelasShort !== "—" && kelasShort !== "";
  let kelas_pembiayaan = "";
  if (pem && hasKelas) kelas_pembiayaan = `${pem} - ${kelasShort}`;
  else if (pem) kelas_pembiayaan = pem;
  else kelas_pembiayaan = String(row.kelas_pembiayaan ?? "").trim();

  const kelasOut = kelasRaw || String(row.kelas ?? "").trim();

  return {
    ...row,
    pembiayaan: pem || row.pembiayaan,
    kelas_pembiayaan: kelas_pembiayaan || row.kelas_pembiayaan,
    kelas: kelasOut || row.kelas,
  };
}

function finalizeMatrix(
  year: number,
  month1to12: number,
  rowLabels: string[],
  data: number[][],
  details?: MonthlyMatrixAgg["details"],
): MonthlyMatrixAgg {
  const dim = daysInMonth(year, month1to12);
  const rowTotals = data.map((row) => row.reduce((a, b) => a + b, 0));
  const colTotals = Array.from({ length: dim }, (_, c) =>
    data.reduce((sum, row) => sum + (row[c] ?? 0), 0),
  );
  const grandTotal = rowTotals.reduce((a, b) => a + b, 0);
  return {
    year,
    month1to12,
    daysInMonth: dim,
    rowLabels,
    data,
    rowTotals,
    colTotals,
    grandTotal,
    details,
  };
}

export function aggregateMonthlyJenisOperasi(
  rows: readonly TindakanJoinResult[],
  year: number,
  month1to12: number,
): MonthlyMatrixAgg {
  const dim = daysInMonth(year, month1to12);

  // Ambil semua tindakan unik dari data yang difilter bulan ini ( Point: menampilkan Jenis Tindakan berdasarkan semua kolom tindakan )
  const uniqueTindakans = Array.from(
    new Set(
      rows
        .filter((r) => isInYearMonth(r.tanggal, year, month1to12))
        .map((r) => String(r.tindakan || "BELUM DIISI").trim().toUpperCase())
        .filter(Boolean),
    ),
  ).sort();

  const byLabel = new Map<string, number[]>();
  const detailsByLabel = new Map<string, MonthlyMatrixAgg["details"][number]>();

  for (const label of uniqueTindakans) {
    byLabel.set(label, new Array(dim).fill(0));
    detailsByLabel.set(
      label,
      Array.from({ length: dim }, () => []),
    );
  }

  for (const row of rows) {
    if (!isInYearMonth(row.tanggal, year, month1to12)) continue;
    const day = dayOfMonthFromTanggal(row.tanggal);
    if (day == null || day < 1 || day > dim) continue;
    const di = day - 1;
    const label = String(row.tindakan || "BELUM DIISI").trim().toUpperCase();

    const detail = {
      nama: row.nama_pasien || "Tanpa Nama",
      no_rm: row.no_rm || "-",
      dokter: row.dokter || "-",
      tindakan: String(row.tindakan || "").trim(),
    };

    if (byLabel.has(label)) {
      byLabel.get(label)![di] += 1;
      detailsByLabel.get(label)![di].push(detail);
    }
  }

  const rowLabels = [...uniqueTindakans];
  const data: number[][] = rowLabels.map((l) => [...byLabel.get(l)!]);
  const details: MonthlyMatrixAgg["details"] = rowLabels.map(
    (l) => detailsByLabel.get(l)!,
  );

  return finalizeMatrix(year, month1to12, rowLabels, data, details);
}

/** Daftar kategori master tetap untuk laporan matrix (Y-Axis). */
export const MASTER_KATEGORI_LABELS = [
  "ATRIAL FLUTTER",
  "CABG",
  "CALSIFIED",
  "COMPLETE REVASC",
  "CTO",
  "DOT",
  "FAILED ROTA",
  "LM",
  "MILD CAD",
  "MINOCA",
  "NO REFLOW",
  "NORMAL",
  "SLOW FLOW",
  "STAGING D1",
  "STAGING LAD",
  "STAGING LCX",
  "STAGING LM",
  "STAGING RCA",
  "SVT",
  "THROMBUS",
  "WPW",
] as const;

export const KATEGORI_LABEL_TANPA_KATEGORI = "TANPA KATEGORI" as const;

export function aggregateMonthlyKategori(
  rows: readonly TindakanJoinResult[],
  year: number,
  month1to12: number,
): MonthlyMatrixAgg {
  const dim = daysInMonth(year, month1to12);
  const byLabel = new Map<string, number[]>();
  const detailsByLabel = new Map<string, MonthlyMatrixAgg["details"][number]>();

  // Inisialisasi dengan Master Kategori agar urutan tetap dan semua muncul
  for (const label of MASTER_KATEGORI_LABELS) {
    byLabel.set(label, new Array(dim).fill(0));
    detailsByLabel.set(
      label,
      Array.from({ length: dim }, () => []),
    );
  }

  // Tambahkan kategori "TANPA KATEGORI" untuk data yang tidak terpetakan
  byLabel.set(KATEGORI_LABEL_TANPA_KATEGORI, new Array(dim).fill(0));
  detailsByLabel.set(
    KATEGORI_LABEL_TANPA_KATEGORI,
    Array.from({ length: dim }, () => []),
  );

  for (const row of rows) {
    if (!isInYearMonth(row.tanggal, year, month1to12)) continue;
    const day = dayOfMonthFromTanggal(row.tanggal);
    if (day == null || day < 1 || day > dim) continue;
    const di = day - 1;

    let label = String(row.kategori || "").trim().toUpperCase();
    if (!label || !MASTER_KATEGORI_LABELS.includes(label as any)) {
      label = KATEGORI_LABEL_TANPA_KATEGORI;
    }

    const detail = {
      nama: row.nama_pasien || "Tanpa Nama",
      no_rm: row.no_rm || "-",
      dokter: row.dokter || "-",
      tindakan: String(row.tindakan || "").trim(),
    };

    if (byLabel.has(label)) {
      byLabel.get(label)![di] += 1;
      detailsByLabel.get(label)![di].push(detail);
    }
  }

  const rowLabels = [...MASTER_KATEGORI_LABELS];
  // Hanya tampilkan "TANPA KATEGORI" jika ada datanya
  const tanpaKategoriData = byLabel.get(KATEGORI_LABEL_TANPA_KATEGORI)!;
  if (tanpaKategoriData.some((n) => n > 0)) {
    rowLabels.push(KATEGORI_LABEL_TANPA_KATEGORI);
  }

  const data: number[][] = rowLabels.map((l) => [...byLabel.get(l)!]);
  const details: MonthlyMatrixAgg["details"] = rowLabels.map(
    (l) => detailsByLabel.get(l)!,
  );

  return finalizeMatrix(year, month1to12, rowLabels, data, details);
}

export function aggregateMonthlyCaraBayar(
  rows: readonly TindakanJoinResult[],
  year: number,
  month1to12: number,
  opts?: { pasienOptions?: readonly PasienOption[] },
): MonthlyMatrixAgg {
  const dim = daysInMonth(year, month1to12);
  const byBucket = new Map<
    (typeof CARA_BAYAR_ROW_LABELS_CORE)[number],
    number[]
  >();
  const detailsByBucket = new Map<
    (typeof CARA_BAYAR_ROW_LABELS_CORE)[number],
    MonthlyMatrixAgg["details"][number]
  >();

  for (const label of CARA_BAYAR_ROW_LABELS_CORE) {
    byBucket.set(label, new Array(dim).fill(0));
    detailsByBucket.set(
      label,
      Array.from({ length: dim }, () => []),
    );
  }
  const belumTerisi = new Array(dim).fill(0);
  const belumTerisiDetails: MonthlyMatrixAgg["details"][number] = Array.from(
    { length: dim },
    () => [],
  );

  const pasienOpts = opts?.pasienOptions;

  for (const row of rows) {
    if (!isInYearMonth(row.tanggal, year, month1to12)) continue;
    const day = dayOfMonthFromTanggal(row.tanggal);
    if (day == null || day < 1 || day > dim) continue;
    const di = day - 1;
    const pasien =
      pasienOpts && pasienOpts.length > 0
        ? resolvePasienOptionForLaporanCaraBayar(pasienOpts, row)
        : null;
    const rowFor =
      pasien != null ? applyPasienMasterForCaraBayarRow(row, pasien) : row;
    const bucket = mapTindakanRowToCaraBayarLaporan(rowFor);

    const detail = {
      nama: row.nama_pasien || "Tanpa Nama",
      no_rm: row.no_rm || "-",
      dokter: row.dokter || "-",
      tindakan: String(row.tindakan || "").trim(),
    };

    if (bucket === CARA_BAYAR_LABEL_BELUM_TERISI) {
      belumTerisi[di] += 1;
      belumTerisiDetails[di].push(detail);
    } else {
      byBucket.get(bucket)![di] += 1;
      detailsByBucket.get(bucket)![di].push(detail);
    }
  }

  const rowLabels: string[] = [...CARA_BAYAR_ROW_LABELS_CORE];
  const data: number[][] = CARA_BAYAR_ROW_LABELS_CORE.map((l) => [
    ...byBucket.get(l)!,
  ]);
  const details: MonthlyMatrixAgg["details"] = CARA_BAYAR_ROW_LABELS_CORE.map(
    (l) => detailsByBucket.get(l)!,
  );

  if (belumTerisi.some((n) => n > 0)) {
    rowLabels.push(CARA_BAYAR_LABEL_BELUM_TERISI);
    data.push(belumTerisi);
    details.push(belumTerisiDetails);
  }

  return finalizeMatrix(year, month1to12, rowLabels, data, details);
}

/** Weekday 0–6 (Minggu–Sabtu) untuk tanggal di WIB (tengah hari). */
export function weekdaySun0Wib(
  year: number,
  month1to12: number,
  day: number,
): number {
  const iso = `${year}-${String(month1to12).padStart(2, "0")}-${String(day).padStart(2, "0")}T12:00:00+07:00`;
  return new Date(iso).getUTCDay();
}
