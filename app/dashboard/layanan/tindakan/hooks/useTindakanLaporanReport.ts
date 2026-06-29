"use client";

import { useCallback, useDeferredValue, useMemo, useState } from "react";

import type { PasienOption } from "@/components/ui/pasien-combobox";
import type { TindakanJoinResult } from "../bridge/mapping.types";
import {
  aggregateMonthlyCaraBayar,
  aggregateMonthlyJenisOperasi,
  aggregateMonthlyKategori,
  aggregateMonthlyStatusBatal,
  CARA_BAYAR_LABEL_BELUM_TERISI,
  type MonthlyMatrixAgg,
} from "../lib/tindakanBulananMatrix";
import {
  buildPasienReportLookup,
  mergePasienMasterIntoRowForReport,
} from "../lib/displayTindakanRow";
import {
  buildAnalisisGabunganHtml,
  buildAnalisisGabunganWhatsAppText,
  buildBulananCaraBayarHtml,
  buildBulananJenisOperasiHtml,
  buildBulananMatrixWhatsAppText,
  downloadAnalisisGabunganExcel,
  downloadMonthlyMatrixExcel,
} from "../lib/tindakanReportTemplates";

export type TindakanLaporanTab = "jenis" | "kategori" | "cara" | "analisis";

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

function filterMatrixBySearch(
  rawMatrix: MonthlyMatrixAgg,
  searchQuery: string,
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
      return labelMatch || detailMatch ? idx : -1;
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

export type UseTindakanLaporanReportArgs = {
  rows: readonly TindakanJoinResult[];
  pasienOptions?: readonly PasienOption[];
  loading?: boolean;
  filterSummaryLines?: readonly string[];
};

export function useTindakanLaporanReport({
  rows,
  pasienOptions = [],
  loading = false,
  filterSummaryLines = [],
}: UseTindakanLaporanReportArgs) {
  const [tab, setTab] = useState<TindakanLaporanTab>("jenis");
  const [monthYyyyMm, setMonthYyyyMm] = useState(currentMonthWibYyyyMm);
  const [searchQuery, setSearchQuery] = useState("");
  const [analisisPage, setAnalisisPage] = useState(1);

  const ym = useMemo(() => parseYyyyMm(monthYyyyMm), [monthYyyyMm]);

  const deferredRows = useDeferredValue(rows);
  const deferredPasien = useDeferredValue(pasienOptions);
  const reportRowsCatchUp =
    deferredRows !== rows || deferredPasien !== pasienOptions;

  const pasienLookup = useMemo(
    () => buildPasienReportLookup(deferredPasien),
    [deferredPasien],
  );

  const reportRows = useMemo(
    () =>
      deferredRows.map((r) =>
        mergePasienMasterIntoRowForReport(r, deferredPasien, pasienLookup),
      ),
    [deferredRows, deferredPasien, pasienLookup],
  );

  const matrixPasienOpts = useMemo(
    () => ({
      pasienOptions: deferredPasien,
      pasienLookup,
    }),
    [deferredPasien, pasienLookup],
  );

  const matrixJenis = useMemo(() => {
    if (!ym) return null;
    return aggregateMonthlyJenisOperasi(
      reportRows,
      ym.y,
      ym.m,
      matrixPasienOpts,
    );
  }, [reportRows, ym, matrixPasienOpts]);

  const matrixStatusBatal = useMemo(() => {
    if (!ym) return null;
    return aggregateMonthlyStatusBatal(
      reportRows,
      ym.y,
      ym.m,
      matrixPasienOpts,
    );
  }, [reportRows, ym, matrixPasienOpts]);

  const matrixCara = useMemo(() => {
    if (!ym) return null;
    return aggregateMonthlyCaraBayar(
      reportRows,
      ym.y,
      ym.m,
      matrixPasienOpts,
    );
  }, [reportRows, ym, matrixPasienOpts]);

  const matrixKategori = useMemo(() => {
    if (!ym) return null;
    return aggregateMonthlyKategori(
      reportRows,
      ym.y,
      ym.m,
      matrixPasienOpts,
    );
  }, [reportRows, ym, matrixPasienOpts]);

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

  const activeMatrix = useMemo(() => {
    if (!rawMatrix || !searchQuery.trim()) return rawMatrix;
    return filterMatrixBySearch(rawMatrix, searchQuery);
  }, [rawMatrix, searchQuery]);

  const finalMatrix = useMemo(() => {
    if (!activeMatrix) return null;
    if (!searchQuery.trim()) return activeMatrix;
    return finalizeMatrixTotals(activeMatrix);
  }, [activeMatrix, searchQuery]);

  const activeMatrixStatusBatal = useMemo(() => {
    if (tab !== "jenis" || !matrixStatusBatal) return null;
    if (!searchQuery.trim()) return matrixStatusBatal;
    return filterMatrixBySearch(matrixStatusBatal, searchQuery);
  }, [tab, matrixStatusBatal, searchQuery]);

  const finalMatrixStatusBatal = useMemo(() => {
    if (!activeMatrixStatusBatal) return null;
    if (!searchQuery.trim()) return activeMatrixStatusBatal;
    return finalizeMatrixTotals(activeMatrixStatusBatal);
  }, [activeMatrixStatusBatal, searchQuery]);

  const filteredAnalisisRows = useMemo(() => {
    if (tab !== "analisis") return [];
    if (!ym) return [];

    const monthRows = reportRows.filter((r) => {
      const s = String(r.tanggal ?? "").trim();
      if (s.length < 7) return false;
      const y = Number.parseInt(s.slice(0, 4), 10);
      const m = Number.parseInt(s.slice(5, 7), 10);
      return y === ym.y && m === ym.m;
    });

    if (!searchQuery.trim()) return monthRows;

    const query = searchQuery.toLowerCase();
    return monthRows.filter((r) => {
      const fields = [
        r.nama_pasien,
        r.no_rm,
        r.tindakan,
        r.kategori,
        r.dokter,
        r.diagnosa,
        r.asisten,
        r.sirkuler,
        r.logger,
        r.ruangan,
        r.cath,
        r.severity_level,
        r.pembiayaan,
        r.kelas_pembiayaan,
        r.kesimpulan_laporan,
        r.plan_medis,
        r.faktor_risiko,
        r.temuan_pembuluh,
      ];
      return fields.some((f) => String(f ?? "").toLowerCase().includes(query));
    });
  }, [reportRows, ym, tab, searchQuery]);

  const paginatedAnalisisRows = useMemo(() => {
    const start = (analisisPage - 1) * ANALISIS_PAGE_SIZE;
    return filteredAnalisisRows.slice(start, start + ANALISIS_PAGE_SIZE);
  }, [filteredAnalisisRows, analisisPage]);

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
        : "Cara bayar";

  const exportFileBase = useMemo(() => {
    const safe = monthYyyyMm.replace(/[^\d-]/g, "") || "bulan";
    if (tab === "jenis") return `laporan-tindakan-jenis-${safe}`;
    if (tab === "kategori") return `laporan-tindakan-kategori-${safe}`;
    if (tab === "cara") return `laporan-tindakan-cara-bayar-${safe}`;
    if (tab === "analisis") return `laporan-analisis-gabungan-${safe}`;
    return `laporan-tindakan-kategori-${safe}`;
  }, [monthYyyyMm, tab]);

  const buildExportHtml = useCallback(() => {
    if (tab === "analisis") {
      return buildAnalisisGabunganHtml(filteredAnalisisRows, subtitleLines);
    }
    if (!activeMatrix) return "";
    if (tab === "jenis")
      return buildBulananJenisOperasiHtml(
        activeMatrix,
        subtitleLines,
        activeMatrixStatusBatal ?? undefined,
      );
    if (tab === "cara")
      return buildBulananCaraBayarHtml(activeMatrix, subtitleLines);
    return buildBulananJenisOperasiHtml(activeMatrix, subtitleLines);
  }, [
    activeMatrix,
    activeMatrixStatusBatal,
    tab,
    subtitleLines,
    filteredAnalisisRows,
  ]);

  const buildExportWhatsApp = useCallback(() => {
    if (tab === "analisis") {
      return buildAnalisisGabunganWhatsAppText(
        filteredAnalisisRows,
        subtitleLines,
      );
    }
    if (!activeMatrix) return "";
    const title =
      tab === "jenis"
        ? "LAPORAN JENIS OPERASI / TINDAKAN CATHLAB"
        : tab === "cara"
          ? "LAPORAN CARA BAYAR CATHLAB"
          : "LAPORAN KATEGORI TINDAKAN CATHLAB";
    let text = buildBulananMatrixWhatsAppText(title, activeMatrix, subtitleLines);
    if (tab === "jenis" && activeMatrixStatusBatal?.rowLabels.length) {
      text += `\n\n${buildBulananMatrixWhatsAppText(
        "LAPORAN STATUS BATAL / DIBATALKAN",
        activeMatrixStatusBatal,
        subtitleLines,
      )}`;
    }
    return text;
  }, [
    activeMatrix,
    activeMatrixStatusBatal,
    tab,
    subtitleLines,
    filteredAnalisisRows,
  ]);

  const handleDownloadExcel = useCallback(() => {
    if (tab === "analisis") {
      downloadAnalisisGabunganExcel(filteredAnalisisRows, exportFileBase);
    } else if (activeMatrix) {
      const title =
        tab === "jenis"
          ? "LAPORAN JENIS OPERASI / TINDAKAN CATHLAB"
          : tab === "cara"
            ? "LAPORAN CARA BAYAR CATHLAB"
            : "LAPORAN KATEGORI TINDAKAN CATHLAB";
      downloadMonthlyMatrixExcel(activeMatrix, title, exportFileBase);
      if (tab === "jenis" && activeMatrixStatusBatal?.rowLabels.length) {
        downloadMonthlyMatrixExcel(
          activeMatrixStatusBatal,
          "LAPORAN STATUS BATAL / DIBATALKAN",
          `${exportFileBase}-batal`,
        );
      }
    }
  }, [
    activeMatrix,
    activeMatrixStatusBatal,
    tab,
    filteredAnalisisRows,
    exportFileBase,
  ]);

  const exportEmpty =
    !loading &&
    (tab === "analisis"
      ? filteredAnalisisRows.length === 0
      : !activeMatrix || activeMatrix.rowLabels.length === 0);

  const resetAnalisisPage = useCallback(() => {
    setAnalisisPage(1);
  }, []);

  return {
    tab,
    setTab,
    monthYyyyMm,
    setMonthYyyyMm,
    searchQuery,
    setSearchQuery,
    analisisPage,
    setAnalisisPage,
    ym,
    loading,
    reportRowsCatchUp,
    finalMatrix,
    finalMatrixStatusBatal,
    activeMatrix,
    activeMatrixStatusBatal,
    filteredAnalisisRows,
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
    analisisPageSize: ANALISIS_PAGE_SIZE,
  };
}
