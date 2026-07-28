"use client";

import { useCallback, useMemo, useState } from "react";

import type { PasienOption } from "@/components/ui/pasien-combobox";
import type { TindakanJoinResult } from "../bridge/mapping.types";
import {
  aggregateMonthlyCaraBayar,
  aggregateMonthlyJenisOperasiWithBatal,
  aggregateMonthlyKategori,
  buildClinicalDiagnosisMatrixReport,
  CARA_BAYAR_LABEL_BELUM_TERISI,
  clinicalMatrixAxisMeta,
  type ClinicalDiagnosisMatrixReport,
  type ClinicalMatrixRowAxis,
  filterLaporanRowsInYearMonth,
  rowMatchesMatrixLabel,
  type MatrixLaporanTabKind,
  type MonthlyMatrixAgg,
  type MonthlyMatrixPasienOpts,
} from "../lib/tindakanBulananMatrix";
import {
  buildPasienReportLookup,
  mergePasienMasterIntoRowForReport,
} from "../lib/displayTindakanRow";
import {
  buildAnalisisGabunganHtml,
  buildAnalisisGabunganWhatsAppText,
  buildBulananCaraBayarHtml,
  buildClinicalDiagnosisMatrixHtml,
  buildClinicalDiagnosisMatrixWhatsAppText,
  buildBulananJenisOperasiHtml,
  buildBulananMatrixWhatsAppText,
  downloadAnalisisGabunganExcel,
  downloadClinicalDiagnosisMatrixExcel,
  downloadMonthlyMatrixExcel,
} from "../lib/tindakanReportTemplates";

export type TindakanLaporanTab =
  | "jenis"
  | "kategori"
  | "cara"
  | "analisis"
  | "diagnosaKlinis";

const ANALISIS_PAGE_SIZE = 20;

function currentMonthWibYyyyMm(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .slice(0, 7);
}

function parseYyyyMm(s: string): { y: number; m: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const y = Number.parseInt(m[1]!, 10);
  const mo = Number.parseInt(m[2]!, 10);
  if (mo < 1 || mo > 12) return null;
  return { y, m: mo };
}

function buildBelumTerisiRmList(matrix: MonthlyMatrixAgg): {
  key: string;
  rmLabel: string;
  nama: string;
  kasus: number;
}[] {
  const idx = matrix.rowLabels.indexOf(CARA_BAYAR_LABEL_BELUM_TERISI);
  if (idx < 0) return [];
  const perDay = matrix.details?.[idx];
  if (!perDay) return [];

  const agg = new Map<
    string,
    { rmLabel: string; nama: string; kasus: number }
  >();

  for (const dayDetails of perDay) {
    for (const p of dayDetails) {
      const rawRm = String(p.no_rm ?? "").trim();
      const digits = rawRm.replace(/\D/g, "");
      const nama = String(p.nama ?? "").trim() || "—";
      const key =
        digits.length >= 3 ? `rm:${digits}` : `nama:${nama.toLowerCase()}`;
      const rmLabel =
        digits.length >= 3
          ? rawRm && rawRm !== "-"
            ? rawRm
            : digits
          : "Tanpa RM";

      const cur = agg.get(key);
      if (cur) {
        cur.kasus += 1;
      } else {
        agg.set(key, { rmLabel, nama, kasus: 1 });
      }
    }
  }

  return [...agg.entries()]
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => {
      const da = a.rmLabel.replace(/\D/g, "");
      const db = b.rmLabel.replace(/\D/g, "");
      if (da.length >= 3 && db.length >= 3) {
        return da.localeCompare(db, undefined, { numeric: true });
      }
      if (da.length >= 3) return -1;
      if (db.length >= 3) return 1;
      return a.nama.localeCompare(b.nama, "id");
    });
}

function laporanRowMatchesSearch(
  row: TindakanJoinResult,
  query: string,
): boolean {
  const fields = [
    row.nama_pasien,
    row.no_rm,
    row.tindakan,
    row.kategori,
    row.dokter,
    row.diagnosa,
    row.asisten,
    row.sirkuler,
    row.logger,
    row.ruangan,
    row.cath,
    row.severity_level,
    row.pembiayaan,
    row.kelas_pembiayaan,
    row.kesimpulan_laporan,
    row.plan_medis,
    row.faktor_risiko,
    row.temuan_pembuluh,
  ];
  return fields.some((f) => String(f ?? "").toLowerCase().includes(query));
}

function filterMatrixBySearch(
  rawMatrix: MonthlyMatrixAgg,
  searchQuery: string,
  ctx?: {
    reportRows?: readonly TindakanJoinResult[];
    tab?: MatrixLaporanTabKind;
    pasienOpts?: MonthlyMatrixPasienOpts;
  },
): MonthlyMatrixAgg {
  const query = searchQuery.toLowerCase();
  const filteredIndices = rawMatrix.rowLabels
    .map((label, idx) => {
      const labelMatch = label.toLowerCase().includes(query);
      const detailMatch = rawMatrix.details?.[idx]?.some((dayDetails) =>
        dayDetails.some(
          (p) =>
            p.nama.toLowerCase().includes(query) ||
            p.tindakan?.toLowerCase().includes(query) ||
            p.diagnosa?.toLowerCase().includes(query) ||
            p.kategori?.toLowerCase().includes(query) ||
            p.kesimpulan_laporan?.toLowerCase().includes(query) ||
            p.plan_medis?.toLowerCase().includes(query) ||
            p.dokter.toLowerCase().includes(query),
        ),
      );
      const rowMatch =
        ctx?.reportRows &&
        ctx.tab &&
        ctx.reportRows.some(
          (r) =>
            rowMatchesMatrixLabel(r, ctx.tab!, label, ctx.pasienOpts) &&
            laporanRowMatchesSearch(r, query),
        );
      return labelMatch || detailMatch || rowMatch ? idx : -1;
    })
    .filter((idx) => idx !== -1);

  if (filteredIndices.length === rawMatrix.rowLabels.length) return rawMatrix;

  return {
    ...rawMatrix,
    rowLabels: filteredIndices.map((i) => rawMatrix.rowLabels[i]!),
    data: filteredIndices.map((i) =>
      rawMatrix.data[i]!.map((count, di) => {
        const details = rawMatrix.details?.[i]?.[di] ?? [];
        if (rawMatrix.rowLabels[i]!.toLowerCase().includes(query)) return count;
        return details.filter(
          (p) =>
            p.nama.toLowerCase().includes(query) ||
            p.tindakan?.toLowerCase().includes(query) ||
            p.diagnosa?.toLowerCase().includes(query) ||
            p.kategori?.toLowerCase().includes(query) ||
            p.kesimpulan_laporan?.toLowerCase().includes(query) ||
            p.plan_medis?.toLowerCase().includes(query) ||
            p.dokter.toLowerCase().includes(query),
        ).length;
      }),
    ),
    rowTotals: [],
    colTotals: [],
    grandTotal: 0,
    details: filteredIndices.map((i) => {
      const rowDetails = rawMatrix.details?.[i] ?? [];
      return rowDetails.map((dayDetails) => {
        if (rawMatrix.rowLabels[i]!.toLowerCase().includes(query))
          return dayDetails;
        return dayDetails.filter(
          (p) =>
            p.nama.toLowerCase().includes(query) ||
            p.tindakan?.toLowerCase().includes(query) ||
            p.diagnosa?.toLowerCase().includes(query) ||
            p.kategori?.toLowerCase().includes(query) ||
            p.kesimpulan_laporan?.toLowerCase().includes(query) ||
            p.plan_medis?.toLowerCase().includes(query) ||
            p.dokter.toLowerCase().includes(query),
        );
      });
    }),
  };
}

function finalizeMatrixTotals(matrix: MonthlyMatrixAgg): MonthlyMatrixAgg {
  const data = matrix.data;
  const rowTotals = data.map((row) => row.reduce((a, b) => a + b, 0));
  const colTotals = Array.from({ length: matrix.daysInMonth }, (_, c) =>
    data.reduce((sum, row) => sum + (row[c] ?? 0), 0),
  );
  const grandTotal = rowTotals.reduce((a, b) => a + b, 0);
  return { ...matrix, rowTotals, colTotals, grandTotal };
}

export type LaporanFilterState = {
  tindakan: string[];
  diagnosa: string[];
  dokter: string[];
  ruangan: string[];
  severity: string[];
  asisten: string[];
  hasPdfReport: boolean | null; // null = semua, true = ada pdf, false = tidak ada pdf
  statusKelengkapan: "semua" | "belum_lengkap" | "kompleks" | "batal";
};

const DEFAULT_FILTERS: LaporanFilterState = {
  tindakan: [],
  diagnosa: [],
  dokter: [],
  ruangan: [],
  severity: [],
  asisten: [],
  hasPdfReport: null,
  statusKelengkapan: "semua",
};

export type UseTindakanLaporanReportArgs = {
  rows: readonly TindakanJoinResult[];
  pasienOptions?: readonly PasienOption[];
  loading?: boolean;
  filterSummaryLines?: readonly string[];
  /** false saat modal/dialog laporan tertutup — lewati agregasi berat. */
  enabled?: boolean;
};

export function useTindakanLaporanReport({
  rows,
  pasienOptions = [],
  loading = false,
  filterSummaryLines = [],
  enabled = true,
}: UseTindakanLaporanReportArgs) {
  const [tab, setTab] = useState<TindakanLaporanTab>("jenis");
  const [clinicalMatrixAxis, setClinicalMatrixAxis] =
    useState<ClinicalMatrixRowAxis>("diagnosa");
  const [monthYyyyMm, setMonthYyyyMm] = useState(currentMonthWibYyyyMm);
  const [searchQuery, setSearchQuery] = useState("");
  const [analisisPage, setAnalisisPage] = useState(1);
  const [filters, setFilters] = useState<LaporanFilterState>(DEFAULT_FILTERS);

  const ym = useMemo(() => parseYyyyMm(monthYyyyMm), [monthYyyyMm]);

  const pasienLookup = useMemo(
    () => buildPasienReportLookup(pasienOptions),
    [pasienOptions],
  );

  const monthScopedRows = useMemo(() => {
    if (!enabled || !ym) return [] as readonly TindakanJoinResult[];
    return filterLaporanRowsInYearMonth(rows, ym.y, ym.m);
  }, [enabled, rows, ym]);

  const reportRowsBase = useMemo(() => {
    if (!pasienOptions.length) return monthScopedRows;
    return monthScopedRows.map((r) =>
      mergePasienMasterIntoRowForReport(r, pasienOptions, pasienLookup),
    );
  }, [monthScopedRows, pasienOptions, pasienLookup]);

  // Ekstrak opsi unik untuk UI Filter Dropdown
  const filterOptions = useMemo(() => {
    const tindakans = new Set<string>();
    const diagnosas = new Set<string>();
    const dokters = new Set<string>();
    const ruangans = new Set<string>();
    const severities = new Set<string>();
    const asistens = new Set<string>();

    reportRowsBase.forEach((r) => {
      if (r.tindakan) tindakans.add(r.tindakan.trim().toUpperCase());
      if (r.diagnosa) diagnosas.add(r.diagnosa.trim());
      if (r.dokter) dokters.add(r.dokter.trim());
      if (r.ruangan) ruangans.add(r.ruangan.trim());
      if (r.severity_level) severities.add(r.severity_level.trim());
      if (r.asisten) asistens.add(r.asisten.trim());
    });

    return {
      tindakan: [...tindakans].sort(),
      diagnosa: [...diagnosas].sort(),
      dokter: [...dokters].sort(),
      ruangan: [...ruangans].sort(),
      severity: [...severities].sort(),
      asisten: [...asistens].sort(),
    };
  }, [reportRowsBase]);

  // Terapkan Filter Multi-kriteria
  const reportRows = useMemo(() => {
    return reportRowsBase.filter((row) => {
      if (filters.tindakan.length > 0 && !filters.tindakan.includes((row.tindakan || "").trim().toUpperCase())) {
        return false;
      }
      if (filters.diagnosa.length > 0 && !filters.diagnosa.includes(row.diagnosa || "")) {
        return false;
      }
      if (filters.dokter.length > 0 && !filters.dokter.includes(row.dokter || "")) {
        return false;
      }
      if (filters.ruangan.length > 0 && !filters.ruangan.includes(row.ruangan || "")) {
        return false;
      }
      if (filters.severity.length > 0 && !filters.severity.includes(row.severity_level || "")) {
        return false;
      }
      if (filters.asisten.length > 0 && !filters.asisten.includes(row.asisten || "")) {
        return false;
      }
      if (filters.hasPdfReport !== null) {
        const hasPdf = !!row.pci_report_link && row.pci_report_link.trim() !== "";
        if (filters.hasPdfReport !== hasPdf) return false;
      }
      if (filters.statusKelengkapan === "belum_lengkap") {
        const isMissingField = !row.diagnosa || !row.kesimpulan_laporan || !row.pembiayaan;
        if (!isMissingField) return false;
      } else if (filters.statusKelengkapan === "kompleks") {
        const isComplex = row.severity_level === "High" || (row.total_kontras && Number(row.total_kontras) > 100);
        if (!isComplex) return false;
      } else if (filters.statusKelengkapan === "batal") {
        if (row.status !== "Batal" && row.status !== "Dibatalkan") return false;
      }
      return true;
    });
  }, [reportRowsBase, filters]);

  const matrixPasienOpts = useMemo(
    (): MonthlyMatrixPasienOpts => ({
      pasienOptions,
      pasienLookup,
    }),
    [pasienOptions, pasienLookup],
  );

  const jenisMatrixPair = useMemo(() => {
    if (!enabled || !ym || tab !== "jenis") return null;
    return aggregateMonthlyJenisOperasiWithBatal(
      reportRows,
      ym.y,
      ym.m,
      matrixPasienOpts,
    );
  }, [enabled, reportRows, ym, matrixPasienOpts, tab]);

  const matrixJenis = jenisMatrixPair?.main ?? null;
  const matrixStatusBatal = jenisMatrixPair?.batal ?? null;

  const matrixCara = useMemo(() => {
    if (!enabled || !ym || tab !== "cara") return null;
    return aggregateMonthlyCaraBayar(
      reportRows,
      ym.y,
      ym.m,
      matrixPasienOpts,
    );
  }, [enabled, reportRows, ym, matrixPasienOpts, tab]);

  const matrixKategori = useMemo(() => {
    if (!enabled || !ym || tab !== "kategori") return null;
    return aggregateMonthlyKategori(
      reportRows,
      ym.y,
      ym.m,
      matrixPasienOpts,
    );
  }, [enabled, reportRows, ym, matrixPasienOpts, tab]);

  const laporanCaraBelumTerisi = useMemo(() => {
    if (!matrixCara) {
      return {
        count: 0,
        strong: false,
        rmList: [] as ReturnType<typeof buildBelumTerisiRmList>,
      };
    }
    const idx = matrixCara.rowLabels.indexOf(CARA_BAYAR_LABEL_BELUM_TERISI);
    if (idx < 0) {
      return {
        count: 0,
        strong: false,
        rmList: [] as ReturnType<typeof buildBelumTerisiRmList>,
      };
    }
    const count = matrixCara.rowTotals[idx] ?? 0;
    const gt = matrixCara.grandTotal;
    const strong = count > 0 && (count >= 5 || (gt > 0 && count / gt >= 0.15));
    const rmList = buildBelumTerisiRmList(matrixCara);
    return { count, strong, rmList };
  }, [matrixCara]);

  const rawMatrix =
    tab === "jenis"
      ? matrixJenis
      : tab === "kategori"
        ? matrixKategori
        : tab === "cara"
          ? matrixCara
          : null;

  const matrixSearchCtx = useMemo(
    () => ({
      reportRows,
      tab:
        tab === "jenis" || tab === "kategori" || tab === "cara"
          ? tab
          : undefined,
      pasienOpts: matrixPasienOpts,
    }),
    [reportRows, tab, matrixPasienOpts],
  );

  const activeMatrix = useMemo(() => {
    if (!rawMatrix || !searchQuery.trim()) return rawMatrix;
    return filterMatrixBySearch(rawMatrix, searchQuery, matrixSearchCtx);
  }, [rawMatrix, searchQuery, matrixSearchCtx]);

  const finalMatrix = useMemo(() => {
    if (!activeMatrix) return null;
    if (!searchQuery.trim()) return activeMatrix;
    return finalizeMatrixTotals(activeMatrix);
  }, [activeMatrix, searchQuery]);

  const activeMatrixStatusBatal = useMemo(() => {
    if (tab !== "jenis" || !matrixStatusBatal) return null;
    if (!searchQuery.trim()) return matrixStatusBatal;
    return filterMatrixBySearch(matrixStatusBatal, searchQuery, {
      ...matrixSearchCtx,
      tab: "jenis",
    });
  }, [tab, matrixStatusBatal, searchQuery, matrixSearchCtx]);

  const finalMatrixStatusBatal = useMemo(() => {
    if (!activeMatrixStatusBatal) return null;
    if (!searchQuery.trim()) return activeMatrixStatusBatal;
    return finalizeMatrixTotals(activeMatrixStatusBatal);
  }, [activeMatrixStatusBatal, searchQuery]);

  const filteredAnalisisRows = useMemo(() => {
    if (!reportRows.length) return [];

    if (!searchQuery.trim()) return reportRows;

    const query = searchQuery.toLowerCase();
    return reportRows.filter((r) => laporanRowMatchesSearch(r, query));
  }, [reportRows, searchQuery]);

  const filteredClinicalRows = useMemo(() => {
    if (!reportRows.length) return [];
    if (!searchQuery.trim()) return reportRows;
    const query = searchQuery.toLowerCase();
    return reportRows.filter((r) => laporanRowMatchesSearch(r, query));
  }, [reportRows, searchQuery]);

  const clinicalDiagnosisMatrix = useMemo((): ClinicalDiagnosisMatrixReport | null => {
    if (!enabled || !ym || tab !== "diagnosaKlinis") return null;
    return buildClinicalDiagnosisMatrixReport(filteredClinicalRows, {
      ...matrixPasienOpts,
      rowAxis: clinicalMatrixAxis,
    });
  }, [enabled, ym, tab, filteredClinicalRows, matrixPasienOpts, clinicalMatrixAxis]);

  const clinicalMatrixMeta = useMemo(
    () => clinicalMatrixAxisMeta(clinicalMatrixAxis),
    [clinicalMatrixAxis],
  );

  const paginatedAnalisisRows = useMemo(() => {
    if (tab !== "analisis") return [];
    const start = (analisisPage - 1) * ANALISIS_PAGE_SIZE;
    return filteredAnalisisRows.slice(start, start + ANALISIS_PAGE_SIZE);
  }, [filteredAnalisisRows, analisisPage, tab]);

  const totalAnalisisPages = Math.ceil(
    filteredAnalisisRows.length / ANALISIS_PAGE_SIZE,
  );

  const analisisStats = useMemo(() => {
    if (tab !== "analisis" || filteredAnalisisRows.length === 0) return null;

    const total = filteredAnalisisRows.length;
    const selesai = filteredAnalisisRows.filter(
      (r) => r.status === "Selesai",
    ).length;
    const successRate = Math.round((selesai / total) * 100);

    const doctorCounts: Record<string, number> = {};
    filteredAnalisisRows.forEach((r) => {
      const d = r.dokter || "Tanpa Dokter";
      doctorCounts[d] = (doctorCounts[d] || 0) + 1;
    });
    const topDoctor = Object.entries(doctorCounts).sort(
      (a, b) => b[1] - a[1],
    )[0];

    return { total, selesai, successRate, topDoctor };
  }, [tab, filteredAnalisisRows]);

  const subtitleLines = useMemo(() => {
    const base = [...filterSummaryLines];
    base.push(`Baris tindakan (setelah filter tabel): ${rows.length}`);
    if (pasienOptions.length > 0) {
      base.push(
        "Cara bayar: klasifikasi memakai master pasien (jenis + kelas) bila kasus terhubung ke RM / pasien_id.",
      );
    }
    if (matrixCara) {
      const idx = matrixCara.rowLabels.indexOf(CARA_BAYAR_LABEL_BELUM_TERISI);
      const n = idx >= 0 ? (matrixCara.rowTotals[idx] ?? 0) : 0;
      if (n > 0) {
        base.push(
          `Cara bayar: ${n} kasus tanpa data biaya terklasifikasi → baris ${CARA_BAYAR_LABEL_BELUM_TERISI} (bukan UMUM).`,
        );
      }
    }
    return base;
  }, [filterSummaryLines, rows.length, pasienOptions.length, matrixCara]);

  const matrixRowHeader =
    tab === "jenis"
      ? "Prosedur (Detail)"
      : tab === "kategori"
        ? "Kategori (Grup)"
        : tab === "diagnosaKlinis"
          ? clinicalMatrixMeta.rowHeaderLabel
          : "Cara bayar";

  const exportFileBase = useMemo(() => {
    const safe = monthYyyyMm.replace(/[^\d-]/g, "") || "bulan";
    if (tab === "jenis") return `laporan-tindakan-jenis-${safe}`;
    if (tab === "kategori") return `laporan-tindakan-kategori-${safe}`;
    if (tab === "cara") return `laporan-tindakan-cara-bayar-${safe}`;
    if (tab === "analisis") return `laporan-analisis-gabungan-${safe}`;
    if (tab === "diagnosaKlinis") {
      return `laporan-${clinicalMatrixMeta.exportFileSuffix}-${safe}`;
    }
    return `laporan-tindakan-kategori-${safe}`;
  }, [monthYyyyMm, tab, clinicalMatrixMeta.exportFileSuffix]);

  const buildExportHtml = useCallback(() => {
    if (tab === "analisis") {
      return buildAnalisisGabunganHtml(filteredAnalisisRows, subtitleLines);
    }
    if (tab === "diagnosaKlinis") {
      return clinicalDiagnosisMatrix
        ? buildClinicalDiagnosisMatrixHtml(clinicalDiagnosisMatrix, subtitleLines)
        : "";
    }
    if (!finalMatrix) return "";
    if (tab === "jenis")
      return buildBulananJenisOperasiHtml(
        finalMatrix,
        subtitleLines,
        finalMatrixStatusBatal ?? undefined,
      );
    if (tab === "cara")
      return buildBulananCaraBayarHtml(finalMatrix, subtitleLines);
    return buildBulananJenisOperasiHtml(finalMatrix, subtitleLines);
  }, [
    finalMatrix,
    finalMatrixStatusBatal,
    tab,
    subtitleLines,
    filteredAnalisisRows,
    clinicalDiagnosisMatrix,
  ]);

  const buildExportWhatsApp = useCallback(() => {
    if (tab === "analisis") {
      return buildAnalisisGabunganWhatsAppText(
        filteredAnalisisRows,
        subtitleLines,
      );
    }
    if (tab === "diagnosaKlinis") {
      return clinicalDiagnosisMatrix
        ? buildClinicalDiagnosisMatrixWhatsAppText(
            clinicalDiagnosisMatrix,
            subtitleLines,
          )
        : "";
    }
    if (!finalMatrix) return "";
    const title =
      tab === "jenis"
        ? "LAPORAN JENIS OPERASI / TINDAKAN CATHLAB"
        : tab === "cara"
          ? "LAPORAN CARA BAYAR CATHLAB"
          : "LAPORAN KATEGORI TINDAKAN CATHLAB";
    let text = buildBulananMatrixWhatsAppText(title, finalMatrix, subtitleLines);
    if (tab === "jenis" && finalMatrixStatusBatal?.rowLabels.length) {
      text += `\n\n${buildBulananMatrixWhatsAppText(
        "LAPORAN STATUS BATAL / DIBATALKAN",
        finalMatrixStatusBatal,
        subtitleLines,
      )}`;
    }
    return text;
  }, [
    finalMatrix,
    finalMatrixStatusBatal,
    tab,
    subtitleLines,
    filteredAnalisisRows,
    clinicalDiagnosisMatrix,
  ]);

  const handleDownloadExcel = useCallback(() => {
    if (tab === "analisis") {
      downloadAnalisisGabunganExcel(filteredAnalisisRows, exportFileBase);
    } else if (tab === "diagnosaKlinis") {
      if (clinicalDiagnosisMatrix) {
        downloadClinicalDiagnosisMatrixExcel(
            clinicalDiagnosisMatrix,
            exportFileBase,
        );
      }
    } else if (finalMatrix) {
      const title =
        tab === "jenis"
          ? "LAPORAN JENIS OPERASI / TINDAKAN CATHLAB"
          : tab === "cara"
            ? "LAPORAN CARA BAYAR CATHLAB"
            : "LAPORAN KATEGORI TINDAKAN CATHLAB";
      downloadMonthlyMatrixExcel(finalMatrix, title, exportFileBase);
      if (tab === "jenis" && finalMatrixStatusBatal?.rowLabels.length) {
        downloadMonthlyMatrixExcel(
          finalMatrixStatusBatal,
          "LAPORAN STATUS BATAL / DIBATALKAN",
          `${exportFileBase}-batal`,
        );
      }
    }
  }, [
    finalMatrix,
    finalMatrixStatusBatal,
    tab,
    filteredAnalisisRows,
    exportFileBase,
    clinicalDiagnosisMatrix,
  ]);

  const exportEmpty =
    !loading &&
    (tab === "analisis"
      ? filteredAnalisisRows.length === 0
      : tab === "diagnosaKlinis"
        ? !clinicalDiagnosisMatrix || clinicalDiagnosisMatrix.grandTotal === 0
      : !activeMatrix || activeMatrix.rowLabels.length === 0);

  const resetAnalisisPage = useCallback(() => {
    setAnalisisPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.tindakan.length > 0) count += 1;
    if (filters.diagnosa.length > 0) count += 1;
    if (filters.dokter.length > 0) count += 1;
    if (filters.ruangan.length > 0) count += 1;
    if (filters.severity.length > 0) count += 1;
    if (filters.asisten.length > 0) count += 1;
    if (filters.hasPdfReport !== null) count += 1;
    if (filters.statusKelengkapan !== "semua") count += 1;
    return count;
  }, [filters]);

  return {
    tab,
    setTab,
    clinicalMatrixAxis,
    setClinicalMatrixAxis,
    clinicalMatrixMeta,
    monthYyyyMm,
    setMonthYyyyMm,
    searchQuery,
    setSearchQuery,
    analisisPage,
    setAnalisisPage,
    ym,
    loading,
    reportRows,
    matrixPasienOpts,
    finalMatrix,
    finalMatrixStatusBatal,
    activeMatrix,
    activeMatrixStatusBatal,
    filteredAnalisisRows,
    filteredClinicalRows,
    clinicalDiagnosisMatrix,
    paginatedAnalisisRows,
    totalAnalisisPages,
    analisisStats,
    laporanCaraBelumTerisi,
    subtitleLines,
    matrixRowHeader,
    exportFileBase,
    buildExportHtml,
    buildExportWhatsApp,
    handleDownloadExcel,
    exportEmpty,
    resetAnalisisPage,
    filters,
    setFilters,
    resetFilters,
    filterOptions,
    activeFiltersCount,
    analisisPageSize: ANALISIS_PAGE_SIZE,
  };
}
