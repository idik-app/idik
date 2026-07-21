"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  FileSpreadsheet,
  Loader2,
  Settings2,
  X,
  RotateCcw,
  ShieldCheck,
  Save,
} from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UI_LAYERS } from "@/lib/ui/layers";
import { cn } from "@/lib/utils";
import ReportExportActionBar from "./ReportExportActionBar";
import {
  buildMutuReportHtml,
  buildMutuReportWhatsAppText,
  downloadMutuReportExcel,
} from "../lib/tindakanReportTemplates";

type MutuReportId =
  | "penundaan-elektif"
  | "identifikasi-pasien"
  | "e-report-tanpa-kesalahan"
  | "kepatuhan-apd"
  | "kebersihan-tangan";

type MutuRow = {
  tanggal: string;
  numerator: string;
  denominator: string;
};

type MutuReportData = {
  rows: MutuRow[];
};

type MutuStorage = {
  roomName: string;
  monthOverrides?: Record<string, number>;
  reportsByMonth: Partial<
    Record<
      string,
      Partial<Record<MutuReportId, MutuReportData>>
    >
  >;
};

type MutuDefinition = {
  id: MutuReportId;
  badge: string;
  title: string;
  numeratorLabel: string;
  denominatorLabel: string;
  resultLabel: string;
  targetLabel?: string;
  exportFileSuffix: string;
};

const STORAGE_KEY = "idik_tindakan_laporan_mutu_v1";
const API_PATH = "/api/tindakan-laporan-mutu";

const REPORT_DEFINITIONS: readonly MutuDefinition[] = [
  {
    id: "penundaan-elektif",
    badge: "IMN",
    title: "PENUNDAAN PASIEN ELEKTIF",
    numeratorLabel: "JUMLAH PASIEN YANG JADWAL OPERASINYA TERTUNDA LEBIH DARI 1 JAM",
    denominatorLabel: "JUMLAH PASIEN ELEKTIF",
    resultLabel: "D/E x100%",
    targetLabel: "Target < 5%",
    exportFileSuffix: "imn-penundaan-pasien-elektif",
  },
  {
    id: "identifikasi-pasien",
    badge: "IMN",
    title: "KEPATUHAN IDENTIFIKASI PASIEN",
    numeratorLabel: "JUMLAH PEMBERI PELAYANAN YG MELAKUKAN IDENTIFIKASI YG BENAR",
    denominatorLabel: "JUMLAH PEMBERI PELAYANAN YG DIOBSERVASI DLM PERIODE OBSERVASI",
    resultLabel: "C/D x100%",
    exportFileSuffix: "imn-kepatuhan-identifikasi-pasien",
  },
  {
    id: "e-report-tanpa-kesalahan",
    badge: "IMPU",
    title: "E-REPORT PASIEN YANG DIBUAT TANPA KESALAHAN",
    numeratorLabel: "JUMLAH REPORT YANG DIBUAT TANPA KESALAHAN",
    denominatorLabel: "JUMLAH REPORT YANG DIBUAT DALAM PERIODE WAKTU",
    resultLabel: "C/D x100%",
    exportFileSuffix: "impu-e-report-tanpa-kesalahan",
  },
  {
    id: "kepatuhan-apd",
    badge: "IMN",
    title: "KEPATUHAN PENGGUNAAN APD",
    numeratorLabel: "JUMLAH PEMBERI PELAYANAN YANG PATUH MENGGUNAKAN APD",
    denominatorLabel: "JUMLAH PEMBERI PELAYANAN YANG DIOBSERVASI",
    resultLabel: "C/D x100%",
    exportFileSuffix: "imn-kepatuhan-penggunaan-apd",
  },
  {
    id: "kebersihan-tangan",
    badge: "IMN",
    title: "KEPATUHAN KEBERSIHAN TANGAN",
    numeratorLabel: "JUMLAH PEMBERI PELAYANAN YANG PATUH KEBERSIHAN TANGAN",
    denominatorLabel: "JUMLAH PEMBERI PELAYANAN YANG DIOBSERVASI",
    resultLabel: "C/D x100%",
    exportFileSuffix: "imn-kepatuhan-kebersihan-tangan",
  },
] as const;

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

function getDaysInMonth(yyyyMm: string): number {
  const match = /^(\d{4})-(\d{2})$/.exec(yyyyMm.trim());
  if (!match) return 31;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!year || month < 1 || month > 12) return 31;
  return new Date(year, month, 0).getDate();
}

function formatMonthLabel(yyyyMm: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(yyyyMm.trim());
  if (!match) return yyyyMm;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!year || month < 1 || month > 12) return yyyyMm;
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  })
    .format(new Date(year, month - 1, 1))
    .toUpperCase();
}

function createDefaultRows(dayCount: number): MutuRow[] {
  return Array.from({ length: dayCount }, (_, index) => ({
    tanggal: String(index + 1),
    numerator: "",
    denominator: "",
  }));
}

function normalizeRows(rows: MutuRow[] | undefined, dayCount: number): MutuRow[] {
  const base = createDefaultRows(dayCount);
  if (!rows?.length) return base;
  return base.map((fallback, index) => ({
    tanggal: rows[index]?.tanggal ?? fallback.tanggal,
    numerator: rows[index]?.numerator ?? "",
    denominator: rows[index]?.denominator ?? "",
  }));
}

function parsePositiveNumber(raw: string): number | null {
  const normalized = raw.replace(/[^\d.-]/g, "").trim();
  if (!normalized) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  return value;
}

function formatPercent(numeratorRaw: string, denominatorRaw: string): string {
  const numerator = parsePositiveNumber(numeratorRaw);
  const denominator = parsePositiveNumber(denominatorRaw);
  if (numerator == null || denominator == null || denominator <= 0) return "—";
  const percent = (numerator / denominator) * 100;
  return `${percent.toFixed(percent % 1 === 0 ? 0 : 2)}%`;
}

function readStorage(): MutuStorage {
  if (typeof window === "undefined") {
    return { roomName: "IDIK", reportsByMonth: {} };
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { roomName: "IDIK", reportsByMonth: {} };
  }
  try {
    const parsed = JSON.parse(raw) as MutuStorage;
    return {
      roomName: String(parsed.roomName || "IDIK"),
      monthOverrides: parsed.monthOverrides ?? {},
      reportsByMonth: parsed.reportsByMonth ?? {},
    };
  } catch {
    return { roomName: "IDIK", reportsByMonth: {} };
  }
}

function ensureMonthState(
  storage: MutuStorage,
  monthYyyyMm: string,
  dayCount: number,
): MutuStorage {
  const next: MutuStorage = {
    roomName: storage.roomName || "IDIK",
    monthOverrides: { ...(storage.monthOverrides ?? {}) },
    reportsByMonth: { ...(storage.reportsByMonth ?? {}) },
  };
  const existingMonth = { ...(next.reportsByMonth[monthYyyyMm] ?? {}) };
  for (const def of REPORT_DEFINITIONS) {
    existingMonth[def.id] = {
      rows: normalizeRows(existingMonth[def.id]?.rows, dayCount),
    };
  }
  next.reportsByMonth[monthYyyyMm] = existingMonth;
  next.monthOverrides![monthYyyyMm] = dayCount;
  return next;
}

function summarizeRows(rows: MutuRow[]) {
  return rows.reduce(
    (acc, row) => {
      const numerator = parsePositiveNumber(row.numerator);
      const denominator = parsePositiveNumber(row.denominator);
      if (numerator != null) acc.numerator += numerator;
      if (denominator != null) acc.denominator += denominator;
      if (
        (String(row.numerator).trim() || String(row.denominator).trim()) &&
        (numerator != null || denominator != null)
      ) {
        acc.filledRows += 1;
      }
      return acc;
    },
    { numerator: 0, denominator: 0, filledRows: 0 },
  );
}

function hasFilledMutuRows(rows: readonly MutuRow[]): boolean {
  return rows.some(
    (row) =>
      String(row.tanggal).trim() !== "" ||
      String(row.numerator).trim() !== "" ||
      String(row.denominator).trim() !== "",
  );
}

export default function TindakanLaporanMutuModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [activeTab, setActiveTab] = useState<MutuReportId>("penundaan-elektif");
  const [monthYyyyMm, setMonthYyyyMm] = useState(currentMonthWibYyyyMm);
  const [storage, setStorage] = useState<MutuStorage>(() => ({
    roomName: "IDIK",
    reportsByMonth: {},
  }));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const loadedMonthRef = useRef<string | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextAutosaveRef = useRef(false);

  const configuredDayCount =
    storage.monthOverrides?.[monthYyyyMm] ?? getDaysInMonth(monthYyyyMm);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    loadedMonthRef.current = null;
    setSaveError(null);
    setIsLoading(true);
    const localState = ensureMonthState(readStorage(), monthYyyyMm, configuredDayCount);
    setStorage(localState);

    void (async () => {
      try {
        const res = await fetch(
          `${API_PATH}?monthYyyyMm=${encodeURIComponent(monthYyyyMm)}`,
          { cache: "no-store" },
        );
        const json = await res.json();
        if (cancelled || !json?.ok) {
          if (!cancelled && json?.message) {
            setSaveError(String(json.message));
          }
          return;
        }
        if (!json.data) return;
        setStorage((current) => {
          const next = ensureMonthState(current, monthYyyyMm, Number(json.data.dayCount) || configuredDayCount);
          skipNextAutosaveRef.current = true;
          return {
            ...next,
            roomName: String(json.data.roomName || next.roomName || "IDIK"),
            monthOverrides: {
              ...(next.monthOverrides ?? {}),
              [monthYyyyMm]: Number(json.data.dayCount) || configuredDayCount,
            },
            reportsByMonth: {
              ...next.reportsByMonth,
              [monthYyyyMm]: json.data.reports ?? next.reportsByMonth[monthYyyyMm],
            },
          };
        });
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error ? error.message : "Gagal memuat laporan mutu.";
          setSaveError(message);
        }
      } finally {
        if (!cancelled) {
          loadedMonthRef.current = monthYyyyMm;
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, monthYyyyMm, configuredDayCount]);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
  }, [storage, open]);

  useEffect(() => {
    if (!open) return;
    if (loadedMonthRef.current !== monthYyyyMm) return;
    const monthReports = storage.reportsByMonth[monthYyyyMm];
    if (!monthReports) return;
    if (skipNextAutosaveRef.current) {
      skipNextAutosaveRef.current = false;
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    setIsSaving(true);
    setSaveError(null);

    saveTimeoutRef.current = setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(API_PATH, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              monthYyyyMm,
              roomName: storage.roomName || "IDIK",
              dayCount: configuredDayCount,
              reports: monthReports,
            }),
          });
          const json = await res.json();
          if (!json?.ok) {
            throw new Error(String(json?.message || "Gagal menyimpan laporan mutu."));
          }
          setLastSaved(new Date());
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Gagal menyimpan laporan mutu.";
          setSaveError(message);
        } finally {
          setIsSaving(false);
        }
      })();
    }, 700);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [storage, open, monthYyyyMm, configuredDayCount]);

  const activeDefinition = useMemo(
    () => REPORT_DEFINITIONS.find((item) => item.id === activeTab) ?? REPORT_DEFINITIONS[0],
    [activeTab],
  );

  const activeRows =
    storage.reportsByMonth[monthYyyyMm]?.[activeTab]?.rows ?? createDefaultRows(configuredDayCount);

  const summary = useMemo(() => summarizeRows(activeRows), [activeRows]);
  const summaryPercent = useMemo(
    () => formatPercent(String(summary.numerator), String(summary.denominator)),
    [summary.denominator, summary.numerator],
  );
  const exportFileBase = useMemo(() => {
    const safeMonth = monthYyyyMm.replace(/[^\d-]/g, "") || "bulan";
    return `laporan-mutu-${activeDefinition.exportFileSuffix}-${safeMonth}`;
  }, [activeDefinition.exportFileSuffix, monthYyyyMm]);
  const exportEmpty = useMemo(
    () => !hasFilledMutuRows(activeRows),
    [activeRows],
  );
  const buildExportHtml = React.useCallback(
    () =>
      buildMutuReportHtml({
        definition: activeDefinition,
        monthLabel: formatMonthLabel(monthYyyyMm),
        roomName: storage.roomName || "IDIK",
        rows: activeRows,
      }),
    [activeDefinition, activeRows, monthYyyyMm, storage.roomName],
  );
  const buildExportWhatsApp = React.useCallback(
    () =>
      buildMutuReportWhatsAppText({
        definition: activeDefinition,
        monthLabel: formatMonthLabel(monthYyyyMm),
        roomName: storage.roomName || "IDIK",
        rows: activeRows,
      }),
    [activeDefinition, activeRows, monthYyyyMm, storage.roomName],
  );
  const handleDownloadExcel = React.useCallback(() => {
    downloadMutuReportExcel({
      definition: activeDefinition,
      monthLabel: formatMonthLabel(monthYyyyMm),
      roomName: storage.roomName || "IDIK",
      rows: activeRows,
      filename: exportFileBase,
    });
  }, [activeDefinition, activeRows, exportFileBase, monthYyyyMm, storage.roomName]);

  const updateStorage = (updater: (current: MutuStorage) => MutuStorage) => {
    setStorage((current) => updater(ensureMonthState(current, monthYyyyMm, configuredDayCount)));
  };

  const handleCellChange = (
    reportId: MutuReportId,
    rowIndex: number,
    field: keyof MutuRow,
    value: string,
  ) => {
    updateStorage((current) => {
      const monthState = { ...(current.reportsByMonth[monthYyyyMm] ?? {}) };
      const report = monthState[reportId] ?? { rows: createDefaultRows(configuredDayCount) };
      const rows = [...report.rows];
      const row = { ...(rows[rowIndex] ?? createDefaultRows(configuredDayCount)[rowIndex]) };
      row[field] = field === "tanggal" ? value : value.replace(/[^\d.,-]/g, "");
      rows[rowIndex] = row;
      monthState[reportId] = { rows: normalizeRows(rows, configuredDayCount) };
      return {
        ...current,
        reportsByMonth: {
          ...current.reportsByMonth,
          [monthYyyyMm]: monthState,
        },
      };
    });
  };

  const handleDayCountChange = (nextDayCount: number) => {
    const safeDayCount = Math.max(1, Math.min(31, nextDayCount || 1));
    updateStorage((current) => {
      const ensured = ensureMonthState(current, monthYyyyMm, safeDayCount);
      const monthState = { ...(ensured.reportsByMonth[monthYyyyMm] ?? {}) };
      for (const def of REPORT_DEFINITIONS) {
        monthState[def.id] = {
          rows: normalizeRows(monthState[def.id]?.rows, safeDayCount),
        };
      }
      return {
        ...ensured,
        monthOverrides: {
          ...(ensured.monthOverrides ?? {}),
          [monthYyyyMm]: safeDayCount,
        },
        reportsByMonth: {
          ...ensured.reportsByMonth,
          [monthYyyyMm]: monthState,
        },
      };
    });
  };

  const handleResetTab = () => {
    if (typeof window !== "undefined" && !window.confirm("Reset data tab MUTU aktif untuk bulan ini?")) {
      return;
    }
    updateStorage((current) => {
      const monthState = { ...(current.reportsByMonth[monthYyyyMm] ?? {}) };
      monthState[activeTab] = { rows: createDefaultRows(configuredDayCount) };
      return {
        ...current,
        reportsByMonth: {
          ...current.reportsByMonth,
          [monthYyyyMm]: monthState,
        },
      };
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName={cn("bg-black/40 backdrop-blur-sm", UI_LAYERS.dialogOverlayTop)}
        className={cn(
          "h-[88vh] max-h-[88vh] w-[min(100vw-1rem,98vw)] max-w-[min(98vw,96rem)] overflow-hidden p-0",
          "border-slate-300/60 bg-white dark:border-white/10 dark:bg-zinc-950",
          UI_LAYERS.dialogContentTop,
        )}
      >
        <DialogPrimitive.Close
          className={cn(
            "absolute right-4 top-4 rounded-full p-2 transition-all duration-200",
            "hover:bg-slate-100 active:scale-95 dark:hover:bg-white/5",
            "text-slate-400 hover:text-slate-600 dark:text-white/30 dark:hover:text-white/60",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50",
            UI_LAYERS.dialogNestedPopover,
          )}
        >
          <X size={20} strokeWidth={2.5} />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>

        <div className="flex h-full min-h-0 flex-col p-4 text-slate-900 dark:text-white sm:p-6">
          <div className="mb-3 flex shrink-0 flex-col gap-3 pr-10 lg:flex-row lg:items-start lg:justify-between">
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="flex items-center gap-2 text-left font-bold tracking-wide">
                <FileSpreadsheet
                  className="shrink-0 text-emerald-600 dark:text-emerald-300"
                  size={22}
                  strokeWidth={2.25}
                  aria-hidden
                />
                Laporan MUTU
              </DialogTitle>
              <p className="text-sm text-slate-600 dark:text-white/85">
                Tabulasi indikator mutu bulanan dengan tabel yang bisa diedit per bulan.
              </p>
            </DialogHeader>

            <div className="flex flex-wrap items-end gap-2">
              <ReportExportActionBar
                className="shrink-0"
                disabled={isLoading}
                empty={exportEmpty}
                fileNameBase={exportFileBase}
                buildHtml={buildExportHtml}
                buildWhatsAppText={buildExportWhatsApp}
                onDownloadExcel={handleDownloadExcel}
              />
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-900 dark:text-white/60">
                  Bulan laporan
                </span>
                <input
                  type="month"
                  value={monthYyyyMm}
                  onChange={(event) => setMonthYyyyMm(event.target.value)}
                  className={cn(
                    "rounded-md border px-2 py-1 text-[13px] font-semibold font-mono",
                    "border-emerald-300/80 bg-white text-slate-900 [color-scheme:light]",
                    "dark:border-white/10 dark:bg-white/5 dark:text-white dark:[color-scheme:dark]",
                  )}
                />
              </label>

              <button
                type="button"
                onClick={() => setSettingsOpen((value) => !value)}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-extrabold transition",
                  settingsOpen
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10",
                )}
              >
                <Settings2 size={15} />
                Pengaturan
              </button>
            </div>
          </div>

          <div className="mb-3 flex shrink-0 flex-wrap items-center gap-2 text-xs">
            <div className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white/85">
              {isLoading ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  Memuat
                </>
              ) : isSaving ? (
                <>
                  <Save size={13} />
                  Menyimpan
                </>
              ) : (
                <>
                  <ShieldCheck size={13} className="text-emerald-600 dark:text-emerald-400" />
                  Tersinkron Supabase
                </>
              )}
            </div>
            {lastSaved ? (
              <div className="text-slate-500 dark:text-white/60">
                Tersimpan {new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(lastSaved)}
              </div>
            ) : null}
            {saveError ? (
              <div className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-300">
                <AlertCircle size={13} />
                {saveError}
              </div>
            ) : null}
          </div>

          <div className="mb-3 flex shrink-0 flex-wrap gap-2 rounded-lg border border-emerald-200/80 bg-emerald-50/50 p-2 dark:border-white/10 dark:bg-white/5">
            {REPORT_DEFINITIONS.map((definition) => (
              <button
                key={definition.id}
                type="button"
                onClick={() => setActiveTab(definition.id)}
                className={cn(
                  "rounded-md px-3 py-2 text-left text-[11px] font-extrabold transition",
                  activeTab === definition.id
                    ? "bg-emerald-600 text-white dark:bg-emerald-600/80"
                    : "text-slate-700 hover:bg-emerald-100 dark:text-white/80 dark:hover:bg-white/10",
                )}
              >
                <div className="text-[9px] uppercase tracking-wider opacity-75">
                  {definition.badge}
                </div>
                <div>{definition.title}</div>
              </button>
            ))}
          </div>

          <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200/80 dark:border-white/10">
              <div className="shrink-0 border-b border-slate-200/80 bg-white px-4 py-4 dark:border-white/10 dark:bg-zinc-950">
                <div className="text-center">
                  <h2 className="text-lg font-black tracking-wide">
                    {activeDefinition.badge}. {activeDefinition.title}
                  </h2>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                  <div className="font-semibold">BULAN : {formatMonthLabel(monthYyyyMm)}</div>
                  <div className="font-semibold md:text-right">RUANGAN : {storage.roomName || "IDIK"}</div>
                </div>
              </div>

              <div className="min-h-0 overflow-auto bg-white dark:bg-zinc-950">
                <table className="w-full min-w-[860px] border-collapse text-[11px]">
                  <thead className="sticky top-0 z-[2] bg-slate-50 dark:bg-zinc-900">
                    <tr>
                      <th className="border border-slate-300/80 px-2 py-2 text-center font-black dark:border-white/10">
                        NO
                      </th>
                      <th className="border border-slate-300/80 px-2 py-2 text-center font-black dark:border-white/10">
                        TANGGAL
                      </th>
                      <th className="border border-slate-300/80 px-2 py-2 text-center font-black dark:border-white/10">
                        {activeDefinition.numeratorLabel}
                      </th>
                      <th className="border border-slate-300/80 px-2 py-2 text-center font-black dark:border-white/10">
                        {activeDefinition.denominatorLabel}
                      </th>
                      <th className="border border-slate-300/80 px-2 py-2 text-center font-black dark:border-white/10">
                        {activeDefinition.resultLabel}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeRows.map((row, rowIndex) => {
                      const denominator = parsePositiveNumber(row.denominator);
                      const percentLabel = formatPercent(row.numerator, row.denominator);
                      const overTarget =
                        activeDefinition.id === "penundaan-elektif" &&
                        denominator != null &&
                        denominator > 0 &&
                        parsePositiveNumber(row.numerator) != null &&
                        ((parsePositiveNumber(row.numerator) ?? 0) / denominator) * 100 > 5;
                      return (
                        <tr key={`${activeDefinition.id}-${monthYyyyMm}-${rowIndex}`}>
                          <td className="border border-slate-300/80 px-2 py-1.5 text-center font-bold text-red-600 dark:border-white/10 dark:text-red-300">
                            {rowIndex + 1}.
                          </td>
                          <td className="border border-slate-300/80 px-2 py-1 dark:border-white/10">
                            <input
                              value={row.tanggal}
                              onChange={(event) =>
                                handleCellChange(activeDefinition.id, rowIndex, "tanggal", event.target.value)
                              }
                              className={cn(
                                "w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-center font-semibold",
                                "text-slate-900 focus:border-emerald-500 focus:bg-emerald-50 focus:outline-none dark:text-white dark:focus:bg-white/10",
                              )}
                            />
                          </td>
                          <td className="border border-slate-300/80 px-2 py-1 dark:border-white/10">
                            <input
                              inputMode="numeric"
                              value={row.numerator}
                              onChange={(event) =>
                                handleCellChange(activeDefinition.id, rowIndex, "numerator", event.target.value)
                              }
                              className={cn(
                                "w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-center font-semibold",
                                "text-slate-900 focus:border-emerald-500 focus:bg-emerald-50 focus:outline-none dark:text-white dark:focus:bg-white/10",
                              )}
                              placeholder="0"
                            />
                          </td>
                          <td className="border border-slate-300/80 px-2 py-1 dark:border-white/10">
                            <input
                              inputMode="numeric"
                              value={row.denominator}
                              onChange={(event) =>
                                handleCellChange(activeDefinition.id, rowIndex, "denominator", event.target.value)
                              }
                              className={cn(
                                "w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-center font-semibold",
                                "text-slate-900 focus:border-emerald-500 focus:bg-emerald-50 focus:outline-none dark:text-white dark:focus:bg-white/10",
                              )}
                              placeholder="0"
                            />
                          </td>
                          <td
                            className={cn(
                              "border border-slate-300/80 px-2 py-1 text-center font-extrabold dark:border-white/10",
                              overTarget ? "text-red-600 dark:text-red-300" : "text-slate-900 dark:text-white",
                            )}
                          >
                            {percentLabel}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <aside
              className={cn(
                "flex min-h-0 flex-col gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-white/5",
                !settingsOpen && "lg:hidden",
              )}
            >
              <div className="rounded-lg border border-emerald-200/80 bg-white p-3 dark:border-white/10 dark:bg-zinc-950">
                <div className="mb-2 flex items-center gap-2 text-sm font-black">
                  <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
                  Ringkasan tab aktif
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="dark:text-white/85">{activeDefinition.resultLabel}</span>
                    <span className="font-black dark:text-white">{summaryPercent}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="dark:text-white/85">Total pembilang</span>
                    <span className="font-black dark:text-white">{summary.numerator}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="dark:text-white/85">Total penyebut</span>
                    <span className="font-black dark:text-white">{summary.denominator}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="dark:text-white/85">Baris terisi</span>
                    <span className="font-black dark:text-white">{summary.filledRows}</span>
                  </div>
                  {activeDefinition.targetLabel ? (
                    <div className="rounded-md bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                      {activeDefinition.targetLabel}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200/80 bg-white p-3 dark:border-white/10 dark:bg-zinc-950">
                <div className="mb-3 text-sm font-black">Pengaturan</div>
                <div className="space-y-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:text-white/60">
                      Ruangan
                    </span>
                    <input
                      value={storage.roomName}
                      onChange={(event) =>
                        setStorage((current) => ({
                          ...current,
                          roomName: event.target.value,
                        }))
                      }
                      className={cn(
                        "rounded-md border px-2 py-1.5 text-sm font-semibold",
                        "border-slate-300 bg-white text-slate-900",
                        "dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/90",
                      )}
                      placeholder="IDIK"
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:text-white/60">
                      Jumlah baris hari bulan ini
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={configuredDayCount}
                      onChange={(event) => handleDayCountChange(Number(event.target.value))}
                      className={cn(
                        "rounded-md border px-2 py-1.5 text-sm font-semibold",
                        "border-slate-300 bg-white text-slate-900",
                        "dark:border-white/10 dark:bg-white/5 dark:text-white",
                      )}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleResetTab}
                    className={cn(
                      "inline-flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs font-extrabold transition",
                      "border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100",
                      "dark:border-rose-400/30 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-950/60",
                    )}
                  >
                    <RotateCcw size={14} />
                    Reset tab aktif
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
