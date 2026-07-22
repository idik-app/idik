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
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { UI_LAYERS } from "@/lib/ui/layers";
import { cn } from "@/lib/utils";
import ReportExportActionBar from "./ReportExportActionBar";
import type { TindakanJoinResult } from "../bridge/mapping.types";
import {
  buildPenundaanElektifRowsFromTindakan,
  type MutuPatientTooltip,
  type MutuPenundaanElektifRow,
} from "../lib/tindakanMutuPenundaanElektif";
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
    Record<string, Partial<Record<MutuReportId, MutuReportData>>>
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

type PatientPopoverState = {
  title: string;
  patients: MutuPatientTooltip[];
  anchor: HTMLElement;
} | null;

const STORAGE_KEY = "idik_tindakan_laporan_mutu_v1";
const API_PATH = "/api/tindakan-laporan-mutu";

const REPORT_DEFINITIONS: readonly MutuDefinition[] = [
  {
    id: "penundaan-elektif",
    badge: "IMN",
    title: "PENUNDAAN PASIEN ELEKTIF",
    numeratorLabel:
      "JUMLAH PASIEN YANG JADWAL OPERASINYA TERTUNDA LEBIH DARI 1 JAM",
    denominatorLabel: "JUMLAH PASIEN ELEKTIF",
    resultLabel: "D/E x100%",
    targetLabel: "Target < 5%",
    exportFileSuffix: "imn-penundaan-pasien-elektif",
  },
  {
    id: "identifikasi-pasien",
    badge: "IMN",
    title: "KEPATUHAN IDENTIFIKASI PASIEN",
    numeratorLabel:
      "JUMLAH PEMBERI PELAYANAN YG MELAKUKAN IDENTIFIKASI YG BENAR",
    denominatorLabel:
      "JUMLAH PEMBERI PELAYANAN YG DIOBSERVASI DLM PERIODE OBSERVASI",
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
  if (!raw) return { roomName: "IDIK", reportsByMonth: {} };
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

function MutuPatientPopover({
  state,
  onOpenChange,
}: {
  state: PatientPopoverState;
  onOpenChange: (open: boolean) => void;
}) {
  const virtualRef = useRef<{ getBoundingClientRect: () => DOMRect }>({
    getBoundingClientRect: () => new DOMRect(0, 0, 0, 0),
  });

  if (state?.anchor) {
    virtualRef.current = state.anchor;
  }

  return (
    <Popover open={Boolean(state)} onOpenChange={onOpenChange}>
      {state ? <PopoverAnchor virtualRef={virtualRef} /> : null}
      <PopoverContent
        className={cn(
          "w-80 border-slate-200/90 bg-white p-2.5 text-[11px] text-slate-800 shadow-xl",
          UI_LAYERS.dialogNestedPopover,
        )}
        sideOffset={8}
      >
        {state ? (
          <>
            <div className="mb-1.5 border-b border-slate-200 pb-1.5 font-bold text-[#1B2B44]">
              {state.title}
            </div>
            <ul className="custom-scrollbar max-h-48 overflow-auto pr-1">
              {state.patients.length > 0 ? (
                state.patients.map((detail, idx) => (
                  <li
                    key={`${detail.no_rm}-${detail.nama}-${idx}`}
                    className="border-b border-slate-100 py-1.5 last:border-0"
                  >
                    <div className="font-semibold text-[#2D4A6E]">
                      {detail.nama}
                      {detail.tindakan ? ` · ${detail.tindakan}` : ""}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-2 text-[10px] text-slate-600">
                      <span>RM: {detail.no_rm}</span>
                      <span className="font-bold text-slate-800">
                        Dr: {detail.dokter}
                      </span>
                    </div>
                    {detail.status ? (
                      <div className="mt-0.5 text-[10px] font-semibold text-slate-500">
                        Status: {detail.status}
                      </div>
                    ) : null}
                  </li>
                ))
              ) : (
                <li className="py-2 italic text-slate-400">Tidak ada pasien</li>
              )}
            </ul>
          </>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

export default function TindakanLaporanMutuModal({
  open,
  onOpenChange,
  rows = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows?: readonly TindakanJoinResult[];
}) {
  const [activeTab, setActiveTab] = useState<MutuReportId>("penundaan-elektif");
  const [monthYyyyMm, setMonthYyyyMm] = useState(currentMonthWibYyyyMm);
  const [storage, setStorage] = useState<MutuStorage>(() => ({
    roomName: "IDIK",
    reportsByMonth: {},
  }));
  const [settingsOpen, setSettingsOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(min-width: 1024px)").matches;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [patientPopover, setPatientPopover] = useState<PatientPopoverState>(null);
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
    const localState = ensureMonthState(
      readStorage(),
      monthYyyyMm,
      configuredDayCount,
    );
    setStorage(localState);

    void (async () => {
      try {
        const res = await fetch(
          `${API_PATH}?monthYyyyMm=${encodeURIComponent(monthYyyyMm)}`,
          { cache: "no-store" },
        );
        const json = await res.json();
        if (cancelled || !json?.ok) {
          if (!cancelled && json?.message) setSaveError(String(json.message));
          return;
        }
        if (!json.data) return;
        setStorage((current) => {
          const next = ensureMonthState(
            current,
            monthYyyyMm,
            Number(json.data.dayCount) || configuredDayCount,
          );
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
              [monthYyyyMm]:
                json.data.reports ?? next.reportsByMonth[monthYyyyMm],
            },
          };
        });
      } catch (error) {
        if (!cancelled) {
          setSaveError(
            error instanceof Error
              ? error.message
              : "Gagal memuat laporan mutu.",
          );
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

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
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
            throw new Error(
              String(json?.message || "Gagal menyimpan laporan mutu."),
            );
          }
          setLastSaved(new Date());
        } catch (error) {
          setSaveError(
            error instanceof Error
              ? error.message
              : "Gagal menyimpan laporan mutu.",
          );
        } finally {
          setIsSaving(false);
        }
      })();
    }, 700);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [storage, open, monthYyyyMm, configuredDayCount]);

  useEffect(() => {
    setPatientPopover(null);
  }, [activeTab, monthYyyyMm, open]);

  const activeDefinition = useMemo(
    () =>
      REPORT_DEFINITIONS.find((item) => item.id === activeTab) ??
      REPORT_DEFINITIONS[0],
    [activeTab],
  );

  const isPenundaanElektifTab = activeTab === "penundaan-elektif";

  const penundaanElektifRows = useMemo(
    () => buildPenundaanElektifRowsFromTindakan(rows, monthYyyyMm),
    [rows, monthYyyyMm],
  );

  const activeRows: MutuRow[] = isPenundaanElektifTab
    ? penundaanElektifRows
    : storage.reportsByMonth[monthYyyyMm]?.[activeTab]?.rows ??
      createDefaultRows(configuredDayCount);

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
  }, [
    activeDefinition,
    activeRows,
    exportFileBase,
    monthYyyyMm,
    storage.roomName,
  ]);

  const updateStorage = (updater: (current: MutuStorage) => MutuStorage) => {
    setStorage((current) =>
      updater(ensureMonthState(current, monthYyyyMm, configuredDayCount)),
    );
  };

  const handleCellChange = (
    reportId: MutuReportId,
    rowIndex: number,
    field: keyof MutuRow,
    value: string,
  ) => {
    updateStorage((current) => {
      const monthState = { ...(current.reportsByMonth[monthYyyyMm] ?? {}) };
      const report =
        monthState[reportId] ?? { rows: createDefaultRows(configuredDayCount) };
      const nextRows = [...report.rows];
      const row = {
        ...(nextRows[rowIndex] ?? createDefaultRows(configuredDayCount)[rowIndex]),
      };
      row[field] =
        field === "tanggal" ? value : value.replace(/[^\d.,-]/g, "");
      nextRows[rowIndex] = row;
      monthState[reportId] = {
        rows: normalizeRows(nextRows, configuredDayCount),
      };
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
    if (
      typeof window !== "undefined" &&
      !window.confirm("Reset data tab MUTU aktif untuk bulan ini?")
    ) {
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

  const openPatientPopover = (
    title: string,
    patients: MutuPatientTooltip[],
    trigger: HTMLElement,
  ) => {
    setPatientPopover({ title, patients, anchor: trigger });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName={cn("bg-[#2D3748]/45", UI_LAYERS.dialogOverlayTop)}
        className={cn(
          "flex h-[90vh] max-h-[90vh] w-[min(100vw-1rem,98vw)] max-w-[min(98vw,96rem)] flex-col overflow-hidden p-0",
          "rounded-2xl border-slate-200/90 bg-slate-50/95 text-slate-800 shadow-[0_24px_56px_rgba(15,23,42,0.18)]",
          UI_LAYERS.dialogContentTop,
        )}
      >
        {/* Navy header — selaras drawer detail tindakan */}
        <div className="shrink-0 border-b border-white/10 bg-gradient-to-r from-[#1B2B44] to-[#2D4A6E] px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="flex items-center gap-2 text-left text-base font-bold tracking-wide text-white sm:text-lg">
                <FileSpreadsheet
                  className="shrink-0 text-amber-100"
                  size={20}
                  strokeWidth={2.25}
                  aria-hidden
                />
                Laporan MUTU
              </DialogTitle>
              <p className="text-[12px] font-medium text-slate-200">
                Tabulasi indikator mutu bulanan · selaras drawer detail tindakan
              </p>
            </DialogHeader>

            <div className="flex flex-wrap items-end gap-2">
              <ReportExportActionBar
                className="shrink-0 [&_button]:border-white/25 [&_button]:bg-white/10 [&_button]:text-white [&_button:hover]:bg-white/20"
                disabled={isLoading}
                empty={exportEmpty}
                fileNameBase={exportFileBase}
                buildHtml={buildExportHtml}
                buildWhatsAppText={buildExportWhatsApp}
                onDownloadExcel={handleDownloadExcel}
              />
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-300">
                  Bulan
                </span>
                <input
                  type="month"
                  value={monthYyyyMm}
                  onChange={(event) => setMonthYyyyMm(event.target.value)}
                  className="rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 text-[13px] font-semibold text-white [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </label>
              <button
                type="button"
                onClick={() => setSettingsOpen((v) => !v)}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-extrabold transition",
                  settingsOpen
                    ? "border-white/40 bg-white text-[#1B2B44]"
                    : "border-white/25 bg-white/10 text-white hover:bg-white/20",
                )}
              >
                <Settings2 size={15} />
                Pengaturan
              </button>
            </div>
          </div>

          <DialogPrimitive.Close
            className={cn(
              "absolute right-3 top-3 rounded-lg border border-white/20 bg-white/10 p-1.5 text-slate-200 transition",
              "hover:border-white/35 hover:bg-white/20 hover:text-white",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
            )}
          >
            <X size={17} />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3 sm:p-4">
          <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs">
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-semibold text-slate-700 shadow-sm">
              {isLoading ? (
                <>
                  <Loader2 size={13} className="animate-spin text-indigo-600" />
                  Memuat
                </>
              ) : isSaving ? (
                <>
                  <Save size={13} className="text-[#2D4A6E]" />
                  Menyimpan
                </>
              ) : (
                <>
                  <ShieldCheck size={13} className="text-indigo-700" />
                  Tersinkron Supabase
                </>
              )}
            </div>
            {lastSaved ? (
              <div className="text-slate-500">
                Tersimpan{" "}
                {new Intl.DateTimeFormat("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(lastSaved)}
              </div>
            ) : null}
            {saveError ? (
              <div className="inline-flex items-center gap-1 font-semibold text-rose-700">
                <AlertCircle size={13} />
                {saveError}
              </div>
            ) : null}
          </div>

          {/* Tab strip — gaya nav drawer */}
          <div className="flex shrink-0 flex-wrap gap-1.5 rounded-xl border border-slate-300 bg-gradient-to-b from-[#E6ECF5] to-[#D3DFF0] p-2">
            {REPORT_DEFINITIONS.map((definition) => (
              <button
                key={definition.id}
                type="button"
                onClick={() => setActiveTab(definition.id)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left text-[11px] font-extrabold transition",
                  activeTab === definition.id
                    ? "border-slate-300 bg-white text-slate-900 shadow-sm"
                    : "border-transparent text-slate-600 hover:bg-[#DDE6F2]",
                )}
              >
                <div
                  className={cn(
                    "text-[9px] uppercase tracking-wider",
                    activeTab === definition.id
                      ? "text-indigo-700"
                      : "text-slate-500",
                  )}
                >
                  {definition.badge}
                </div>
                <div>{definition.title}</div>
              </button>
            ))}
          </div>

          <div
            className={cn(
              "grid min-h-0 flex-1 gap-3 overflow-hidden",
              settingsOpen
                ? "lg:grid-cols-[minmax(0,1fr)_17.5rem]"
                : "grid-cols-1",
            )}
          >
            {/* Panel konten */}
            <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-100 via-[#E6E9EF] to-slate-200 shadow-sm">
              <div className="shrink-0 border-b border-slate-200/80 bg-white/95 px-4 py-3">
                <h2 className="text-center text-base font-black tracking-wide text-[#1B2B44] sm:text-lg">
                  {activeDefinition.badge}. {activeDefinition.title}
                </h2>
                <div className="mt-2 grid grid-cols-1 gap-1 text-sm font-semibold text-slate-700 md:grid-cols-2">
                  <div>BULAN : {formatMonthLabel(monthYyyyMm)}</div>
                  <div className="md:text-right">
                    RUANGAN : {storage.roomName || "IDIK"}
                  </div>
                </div>
                {isPenundaanElektifTab ? (
                  <p className="mt-2 text-center text-[11px] font-medium text-slate-600">
                    Otomatis dari tabel tindakan · klik angka untuk melihat daftar
                    pasien
                  </p>
                ) : null}
              </div>

              {/* Scroll area — min-h-0 agar tubuh tabel bisa digulir sampai bawah */}
              <div className="custom-scrollbar min-h-0 flex-1 overflow-auto bg-white/95">
                <table className="w-full min-w-[860px] border-collapse text-[11px]">
                  <thead className="sticky top-0 z-[2]">
                    <tr className="bg-[#E6ECF5]">
                      <th className="border border-slate-300/80 px-2 py-2.5 text-center font-black text-[#1B2B44]">
                        NO
                      </th>
                      <th className="border border-slate-300/80 px-2 py-2.5 text-center font-black text-[#1B2B44]">
                        TANGGAL
                      </th>
                      <th className="border border-slate-300/80 px-2 py-2.5 text-center font-black text-[#1B2B44]">
                        {activeDefinition.numeratorLabel}
                      </th>
                      <th className="border border-slate-300/80 px-2 py-2.5 text-center font-black text-[#1B2B44]">
                        {activeDefinition.denominatorLabel}
                      </th>
                      <th className="border border-slate-300/80 px-2 py-2.5 text-center font-black text-[#1B2B44]">
                        {activeDefinition.resultLabel}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeRows.map((row, rowIndex) => {
                      const denominator = parsePositiveNumber(row.denominator);
                      const percentLabel = formatPercent(
                        row.numerator,
                        row.denominator,
                      );
                      const overTarget =
                        activeDefinition.id === "penundaan-elektif" &&
                        denominator != null &&
                        denominator > 0 &&
                        parsePositiveNumber(row.numerator) != null &&
                        ((parsePositiveNumber(row.numerator) ?? 0) /
                          denominator) *
                          100 >
                          5;
                      const penundaanRow = isPenundaanElektifTab
                        ? (penundaanElektifRows[rowIndex] as
                            | MutuPenundaanElektifRow
                            | undefined)
                        : undefined;
                      const numeratorCount =
                        parsePositiveNumber(row.numerator) ?? 0;
                      const denominatorCount =
                        parsePositiveNumber(row.denominator) ?? 0;

                      return (
                        <tr
                          key={`${activeDefinition.id}-${monthYyyyMm}-${rowIndex}`}
                          className="odd:bg-white even:bg-slate-50/80 hover:bg-[#EEF3FA]"
                        >
                          <td className="border border-slate-300/80 px-2 py-1.5 text-center font-bold text-rose-700">
                            {rowIndex + 1}.
                          </td>
                          <td className="border border-slate-300/80 px-2 py-1">
                            {isPenundaanElektifTab ? (
                              <div className="px-2 py-1 text-center font-semibold text-slate-800">
                                {row.tanggal}
                              </div>
                            ) : (
                              <input
                                value={row.tanggal}
                                onChange={(event) =>
                                  handleCellChange(
                                    activeDefinition.id,
                                    rowIndex,
                                    "tanggal",
                                    event.target.value,
                                  )
                                }
                                className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-center font-semibold text-slate-800 focus:border-indigo-400 focus:bg-white focus:outline-none"
                              />
                            )}
                          </td>
                          <td className="border border-slate-300/80 px-2 py-1">
                            {isPenundaanElektifTab ? (
                              numeratorCount > 0 ? (
                                <button
                                  type="button"
                                  title="Lihat pasien tertunda"
                                  className="w-full rounded-md px-2 py-1 text-center font-bold text-indigo-800 underline-offset-2 hover:bg-indigo-50 hover:underline"
                                  onClick={(event) =>
                                    openPatientPopover(
                                      `Tertunda · Tgl ${row.tanggal}`,
                                      penundaanRow?.patientsTertunda ?? [],
                                      event.currentTarget,
                                    )
                                  }
                                >
                                  {row.numerator || "0"}
                                </button>
                              ) : (
                                <div className="px-2 py-1 text-center font-semibold text-slate-500">
                                  0
                                </div>
                              )
                            ) : (
                              <input
                                inputMode="numeric"
                                value={row.numerator}
                                onChange={(event) =>
                                  handleCellChange(
                                    activeDefinition.id,
                                    rowIndex,
                                    "numerator",
                                    event.target.value,
                                  )
                                }
                                className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-center font-semibold text-slate-800 focus:border-indigo-400 focus:bg-white focus:outline-none"
                                placeholder="0"
                              />
                            )}
                          </td>
                          <td className="border border-slate-300/80 px-2 py-1">
                            {isPenundaanElektifTab ? (
                              denominatorCount > 0 ? (
                                <button
                                  type="button"
                                  title="Lihat pasien elektif"
                                  className="w-full rounded-md px-2 py-1 text-center font-bold text-[#1B2B44] underline-offset-2 hover:bg-slate-100 hover:underline"
                                  onClick={(event) =>
                                    openPatientPopover(
                                      `Pasien elektif · Tgl ${row.tanggal}`,
                                      penundaanRow?.patientsElektif ?? [],
                                      event.currentTarget,
                                    )
                                  }
                                >
                                  {row.denominator || "0"}
                                </button>
                              ) : (
                                <div className="px-2 py-1 text-center font-semibold text-slate-500">
                                  0
                                </div>
                              )
                            ) : (
                              <input
                                inputMode="numeric"
                                value={row.denominator}
                                onChange={(event) =>
                                  handleCellChange(
                                    activeDefinition.id,
                                    rowIndex,
                                    "denominator",
                                    event.target.value,
                                  )
                                }
                                className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-center font-semibold text-slate-800 focus:border-indigo-400 focus:bg-white focus:outline-none"
                                placeholder="0"
                              />
                            )}
                          </td>
                          <td
                            className={cn(
                              "border border-slate-300/80 px-2 py-1 text-center font-extrabold",
                              overTarget
                                ? "text-rose-700"
                                : "text-slate-800",
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

            {settingsOpen ? (
              <aside className="flex min-h-0 flex-col gap-3 overflow-auto rounded-2xl border border-slate-300 bg-gradient-to-b from-[#E6ECF5] to-[#D3DFF0] p-3">
                <div className="rounded-xl border border-slate-200/80 bg-white/95 p-3 shadow-sm">
                  <div className="mb-2 flex items-center gap-2 text-sm font-black text-[#1B2B44]">
                    <ShieldCheck size={16} className="text-indigo-700" />
                    Ringkasan tab aktif
                  </div>
                  <div className="space-y-2 text-xs text-slate-700">
                    <div className="flex items-center justify-between gap-2">
                      <span>{activeDefinition.resultLabel}</span>
                      <span className="font-black text-[#1B2B44]">
                        {summaryPercent}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span>Total pembilang</span>
                      <span className="font-black">{summary.numerator}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span>Total penyebut</span>
                      <span className="font-black">{summary.denominator}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span>Baris terisi</span>
                      <span className="font-black">{summary.filledRows}</span>
                    </div>
                    {activeDefinition.targetLabel ? (
                      <div className="rounded-md bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-900">
                        {activeDefinition.targetLabel}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-white/95 p-3 shadow-sm">
                  <div className="mb-3 text-sm font-black text-[#1B2B44]">
                    Pengaturan
                  </div>
                  <div className="space-y-3">
                    <label className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
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
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        placeholder="IDIK"
                      />
                    </label>

                    <label className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        Jumlah baris hari bulan ini
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        value={configuredDayCount}
                        disabled={isPenundaanElektifTab}
                        onChange={(event) =>
                          handleDayCountChange(Number(event.target.value))
                        }
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={handleResetTab}
                      disabled={isPenundaanElektifTab}
                      className={cn(
                        "inline-flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-extrabold transition",
                        "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
                        "disabled:cursor-not-allowed disabled:opacity-45",
                      )}
                    >
                      <RotateCcw size={14} />
                      {isPenundaanElektifTab
                        ? "Tab otomatis dari tindakan"
                        : "Reset tab aktif"}
                    </button>
                  </div>
                </div>
              </aside>
            ) : null}
          </div>
        </div>

        {patientPopover ? (
          <MutuPatientPopover
            state={patientPopover}
            onOpenChange={(next) => {
              if (!next) setPatientPopover(null);
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
