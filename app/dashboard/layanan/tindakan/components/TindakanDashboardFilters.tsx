"use client";

import { useMemo } from "react";
import { LayoutGrid, RotateCcw } from "lucide-react";

import { DateYmdPicker } from "@/components/ui/date-ymd-picker";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TindakanJoinResult } from "../bridge/mapping.types";
import {
  defaultTindakanDashboardFilters,
  type TindakanDashboardFilterState,
} from "../lib/filterTindakanDashboardRows";

function uniqSorted(values: string[]): string[] {
  return [...new Set(values.map((s) => s.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "id"),
  );
}

export default function TindakanDashboardFilters({
  value,
  onChange,
  rows,
  isLight,
  themeTone,
}: {
  value: TindakanDashboardFilterState;
  onChange: (next: TindakanDashboardFilterState) => void;
  rows: readonly TindakanJoinResult[];
  isLight: boolean;
  themeTone: "cyan" | "emerald";
}) {
  const dokterOptions = useMemo(
    () => uniqSorted(rows.map((r) => String(r.dokter ?? "").trim())),
    [rows],
  );
  const tindakanOptions = useMemo(
    () => uniqSorted(rows.map((r) => String(r.tindakan ?? "").trim())),
    [rows],
  );
  const kategoriOptions = useMemo(
    () => uniqSorted(rows.map((r) => String(r.kategori ?? "").trim())),
    [rows],
  );

  const accent =
    themeTone === "emerald"
      ? isLight
        ? "border-emerald-400/50 focus-visible:ring-emerald-500/40"
        : "border-emerald-700/50 focus-visible:ring-emerald-400/30"
      : isLight
        ? "border-cyan-400/50 focus-visible:ring-cyan-500/40"
        : "border-cyan-700/50 focus-visible:ring-cyan-400/30";

  const labelCls = cn(
    "text-[10px] font-bold uppercase tracking-wide",
    isLight ? "text-slate-600" : "text-cyan-200/75",
  );

  const fieldWrap = "flex min-w-0 flex-1 flex-col gap-1 sm:min-w-[8rem]";

  const reset = () => onChange(defaultTindakanDashboardFilters());

  return (
    <div
      className={cn(
        "overflow-visible rounded-xl border p-3 sm:p-4",
        isLight
          ? themeTone === "emerald"
            ? "border-emerald-200/80 bg-emerald-50/40"
            : "border-cyan-200/80 bg-cyan-50/35"
          : themeTone === "emerald"
            ? "border-emerald-800/45 bg-emerald-950/25"
            : "border-cyan-800/45 bg-cyan-950/25",
      )}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <LayoutGrid
            className={cn(
              "h-4 w-4",
              isLight
                ? themeTone === "emerald"
                  ? "text-emerald-700"
                  : "text-cyan-700"
                : themeTone === "emerald"
                  ? "text-emerald-300"
                  : "text-cyan-300",
            )}
          />
          <span
            className={cn(
              "text-sm font-bold",
              isLight ? "text-slate-800" : "text-cyan-50",
            )}
          >
            Filter laporan
          </span>
        </div>
        <button
          type="button"
          onClick={reset}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition",
            isLight
              ? "border-slate-300/80 bg-white/90 text-slate-700 hover:bg-white"
              : "border-cyan-700/50 bg-black/30 text-cyan-100 hover:bg-black/45",
          )}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-3">
          <div className={fieldWrap}>
            <label className={labelCls} htmlFor="tdb-date-from">
              Tanggal awal
            </label>
            <DateYmdPicker
              id="tdb-date-from"
              value={value.dateFrom}
              onChange={(ymd) => onChange({ ...value, dateFrom: ymd })}
              placeholder="Semua (tanpa batas awal)"
              isLight={isLight}
              buttonClassName={accent}
            />
          </div>
          <div className={fieldWrap}>
            <label className={labelCls} htmlFor="tdb-date-to">
              Tanggal akhir
            </label>
            <DateYmdPicker
              id="tdb-date-to"
              value={value.dateTo}
              onChange={(ymd) => onChange({ ...value, dateTo: ymd })}
              placeholder="Semua (tanpa batas akhir)"
              isLight={isLight}
              buttonClassName={accent}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className={fieldWrap}>
            <label className={labelCls} htmlFor="tdb-dokter">
              Dokter
            </label>
            <Input
              id="tdb-dokter"
              list="tdb-dokter-list"
              placeholder="Semua dokter"
              value={value.dokter}
              onChange={(e) => onChange({ ...value, dokter: e.target.value })}
              className={cn("h-9 text-xs", accent, isLight ? "bg-white" : "bg-black/40")}
            />
            <datalist id="tdb-dokter-list">
              {dokterOptions.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </div>
          <div className={fieldWrap}>
            <label className={labelCls} htmlFor="tdb-tindakan">
              Tindakan
            </label>
            <Input
              id="tdb-tindakan"
              list="tdb-tindakan-list"
              placeholder="Semua tindakan"
              value={value.tindakan}
              onChange={(e) => onChange({ ...value, tindakan: e.target.value })}
              className={cn("h-9 text-xs", accent, isLight ? "bg-white" : "bg-black/40")}
            />
            <datalist id="tdb-tindakan-list">
              {tindakanOptions.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </div>
          <div className={fieldWrap}>
            <label className={labelCls} htmlFor="tdb-rm">
              No. RM
            </label>
            <Input
              id="tdb-rm"
              placeholder="Cari RM"
              value={value.noRm}
              onChange={(e) => onChange({ ...value, noRm: e.target.value })}
              className={cn("h-9 text-xs", accent, isLight ? "bg-white" : "bg-black/40")}
            />
          </div>
          <div className={fieldWrap}>
            <label className={labelCls} htmlFor="tdb-kategori">
              Kategori
            </label>
            <Input
              id="tdb-kategori"
              list="tdb-kategori-list"
              placeholder="Semua kategori"
              value={value.kategori}
              onChange={(e) => onChange({ ...value, kategori: e.target.value })}
              className={cn("h-9 text-xs", accent, isLight ? "bg-white" : "bg-black/40")}
            />
            <datalist id="tdb-kategori-list">
              {kategoriOptions.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className={fieldWrap}>
            <span className={labelCls}>STENT (teks / pemakaian)</span>
            <select
              value={value.stent}
              onChange={(e) =>
                onChange({
                  ...value,
                  stent: e.target.value as TindakanDashboardFilterState["stent"],
                })
              }
              className={cn(
                "h-9 w-full rounded-md border px-2 text-xs outline-none transition focus-visible:ring-2",
                accent,
                isLight ? "bg-white text-slate-900" : "bg-black/40 text-cyan-50",
              )}
            >
              <option value="any">Semua</option>
              <option value="yes">Mengandung &quot;stent&quot;</option>
              <option value="no">Tanpa &quot;stent&quot;</option>
            </select>
          </div>
          <div className={fieldWrap}>
            <span className={labelCls}>BALLON (teks / pemakaian)</span>
            <select
              value={value.ballon}
              onChange={(e) =>
                onChange({
                  ...value,
                  ballon: e.target.value as TindakanDashboardFilterState["ballon"],
                })
              }
              className={cn(
                "h-9 w-full rounded-md border px-2 text-xs outline-none transition focus-visible:ring-2",
                accent,
                isLight ? "bg-white text-slate-900" : "bg-black/40 text-cyan-50",
              )}
            >
              <option value="any">Semua</option>
              <option value="yes">Mengandung ballon / balloon</option>
              <option value="no">Tanpa ballon / balloon</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
