"use client";

import { useCallback, useMemo, useState } from "react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { TindakanJoinResult } from "../bridge/mapping.types";
import {
  displayNamaPasien,
  displayRm,
  formatJenisKelaminDisplay,
  resolveJenisKelaminFromRow,
} from "../lib/displayTindakanRow";
import { normalizeNamaPasien } from "@/app/dashboard/pasien/utils/normalizeNamaPasien";
import {
  canonicalDoctorStoredValue,
  type DoctorOption,
} from "@/components/ui/doctor-combobox";
import ReportExportActionBar from "./ReportExportActionBar";
import { parseFastTrackFotosUrls } from "../lib/fastTrackFotos";
import {
  buildFastTrackReportHtml,
  buildFastTrackWhatsAppText,
  type FastTrackReportFilters,
} from "../lib/tindakanReportTemplates";

function currentMonthYyyyMmWib(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
}

function parseEpochMs(raw: unknown): number | null {
  const t = String(raw ?? "").trim();
  if (!t) return null;
  const d = Date.parse(t);
  return Number.isFinite(d) ? d : null;
}

function formatWaktuDisplay(raw: string | null | undefined): string {
  const t = String(raw ?? "").trim();
  if (!t) return "—";
  const ms = parseEpochMs(t);
  if (ms == null) return t;
  return format(new Date(ms), "d MMM yyyy, HH:mm", { locale: idLocale });
}

function tanggalYyyyMm(raw: unknown): string {
  const t = String(raw ?? "").trim();
  if (t.length >= 7) return t.slice(0, 7);
  return "";
}

export default function FastTrackListModal({
  open,
  onOpenChange,
  rows,
  loading,
  doctorOptionsMaster,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: readonly TindakanJoinResult[];
  loading: boolean;
  doctorOptionsMaster: readonly DoctorOption[];
}) {
  const [monthYyyyMm, setMonthYyyyMm] = useState(currentMonthYyyyMmWib);
  const [filterDokter, setFilterDokter] = useState("");
  const [filterTindakan, setFilterTindakan] = useState("");
  const [igdFrom, setIgdFrom] = useState("");
  const [igdTo, setIgdTo] = useState("");
  const [d2bFrom, setD2bFrom] = useState("");
  const [d2bTo, setD2bTo] = useState("");

  const dokterOptions = useMemo(() => {
    const set = new Set<string>();
    const master = doctorOptionsMaster;
    for (const r of rows) {
      const d = String(r.dokter ?? "").trim();
      if (!d) continue;
      const canon =
        master.length > 0 ? canonicalDoctorStoredValue(master, d) : d;
      set.add(canon);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "id"));
  }, [rows, doctorOptionsMaster]);

  const tindakanOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      const t = String(r.tindakan ?? "").trim();
      if (t) set.add(t);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "id"));
  }, [rows]);

  const igdFromMs = igdFrom.trim() ? Date.parse(igdFrom) : null;
  const igdToMs = igdTo.trim() ? Date.parse(igdTo) : null;
  const d2bFromMs = d2bFrom.trim() ? Date.parse(d2bFrom) : null;
  const d2bToMs = d2bTo.trim() ? Date.parse(d2bTo) : null;

  const filteredRows = useMemo(() => {
    const master = doctorOptionsMaster;
    let list = [...rows];

    if (monthYyyyMm.trim()) {
      const prefix = monthYyyyMm.trim();
      list = list.filter((r) => tanggalYyyyMm(r.tanggal) === prefix);
    }

    if (filterDokter.trim()) {
      const fd = filterDokter.trim();
      list = list.filter((r) => {
        const rowD = String(r.dokter ?? "").trim();
        if (!master.length) return rowD === fd;
        return (
          canonicalDoctorStoredValue(master, rowD) ===
          canonicalDoctorStoredValue(master, fd)
        );
      });
    }

    if (filterTindakan.trim()) {
      const ft = filterTindakan.trim();
      list = list.filter((r) => String(r.tindakan ?? "").trim() === ft);
    }

    if (igdFromMs != null && Number.isFinite(igdFromMs)) {
      list = list.filter((r) => {
        const ms = parseEpochMs(r.pasien_datang_igd);
        return ms != null && ms >= igdFromMs;
      });
    }
    if (igdToMs != null && Number.isFinite(igdToMs)) {
      list = list.filter((r) => {
        const ms = parseEpochMs(r.pasien_datang_igd);
        return ms != null && ms <= igdToMs;
      });
    }

    if (d2bFromMs != null && Number.isFinite(d2bFromMs)) {
      list = list.filter((r) => {
        const ms = parseEpochMs(r.door_to_balloon);
        return ms != null && ms >= d2bFromMs;
      });
    }
    if (d2bToMs != null && Number.isFinite(d2bToMs)) {
      list = list.filter((r) => {
        const ms = parseEpochMs(r.door_to_balloon);
        return ms != null && ms <= d2bToMs;
      });
    }

    return list.sort((a, b) => {
      const ta = String(a.tanggal ?? "").trim();
      const tb = String(b.tanggal ?? "").trim();
      const byDate = tb.localeCompare(ta);
      if (byDate !== 0) return byDate;
      return String(b.id ?? "").localeCompare(String(a.id ?? ""));
    });
  }, [
    rows,
    monthYyyyMm,
    filterDokter,
    filterTindakan,
    igdFromMs,
    igdToMs,
    d2bFromMs,
    d2bToMs,
    doctorOptionsMaster,
  ]);

  const reportFilters = useMemo((): FastTrackReportFilters => {
    return {
      monthYyyyMm,
      filterDokter,
      filterTindakan,
      igdFrom,
      igdTo,
      d2bFrom,
      d2bTo,
    };
  }, [
    monthYyyyMm,
    filterDokter,
    filterTindakan,
    igdFrom,
    igdTo,
    d2bFrom,
    d2bTo,
  ]);

  const buildExportHtml = useCallback(
    () => buildFastTrackReportHtml(filteredRows, reportFilters),
    [filteredRows, reportFilters],
  );

  const buildExportWhatsApp = useCallback(
    () => buildFastTrackWhatsAppText(filteredRows, reportFilters),
    [filteredRows, reportFilters],
  );

  const exportFileBase = useMemo(
    () =>
      `laporan-fast-track-${monthYyyyMm.trim() || "semua"}`,
    [monthYyyyMm],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[95vh] w-[min(100vw-1rem,96vw)] max-w-[min(96vw,92rem)] overflow-hidden p-0 flex flex-col",
          "border-slate-300/60 bg-white/98 backdrop-blur-xl dark:border-amber-500/35 dark:bg-black/85",
        )}
      >
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col gap-3 p-4 sm:p-6",
            "text-slate-900 dark:text-white",
          )}
        >
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <DialogHeader className="space-y-1 text-left sm:pr-2">
              <DialogTitle className="text-left font-bold tracking-wide">
                Fast-Track (IGD → cathlab)
              </DialogTitle>
              <p
                className={cn(
                  "text-[12px] font-semibold leading-snug",
                  "text-slate-600 dark:text-white/85",
                )}
              >
                Filter mengikuti kolom tab Fast-Track di drawer: waktu pasien
                tiba IGD, door-to-balloon, dan foto dokumentasi.
              </p>
            </DialogHeader>
            <ReportExportActionBar
              className="shrink-0 sm:pt-0.5"
              disabled={loading}
              empty={!loading && filteredRows.length === 0}
              fileNameBase={exportFileBase}
              buildHtml={buildExportHtml}
              buildWhatsAppText={buildExportWhatsApp}
            />
          </div>

          <div
            className={cn(
              "flex shrink-0 flex-wrap items-end gap-2 rounded-lg border p-2.5",
              "border-amber-200/80 bg-amber-50/50 dark:border-amber-800/40 dark:bg-black/30",
            )}
          >
            <label className="flex min-w-[10rem] flex-col gap-0.5">
              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wide",
                  "text-amber-900 dark:text-amber-200/90",
                )}
              >
                Tahun & bulan
              </span>
              <input
                type="month"
                value={monthYyyyMm}
                onChange={(e) => setMonthYyyyMm(e.target.value)}
                className={cn(
                  "rounded-md border px-2 py-1 text-[13px] font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/60",
                  "border-amber-300/80 bg-white text-slate-900 [color-scheme:light]",
                  "dark:border-white/20 dark:bg-black dark:text-white dark:[color-scheme:dark]",
                )}
                aria-label="Pilih tahun dan bulan"
              />
            </label>
            <label className="flex min-w-[9rem] flex-col gap-0.5">
              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wide",
                  "text-amber-900 dark:text-amber-200/90",
                )}
              >
                Dokter
              </span>
              <select
                value={filterDokter}
                onChange={(e) => setFilterDokter(e.target.value)}
                className={cn(
                  "max-w-[14rem] rounded-md border px-2 py-1 text-[13px] font-semibold focus:outline-none",
                  "border-amber-300/80 bg-white text-slate-900",
                  "dark:border-white/20 dark:bg-black dark:text-white",
                )}
              >
                <option value="">Semua</option>
                {dokterOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-[9rem] flex-col gap-0.5">
              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wide",
                  "text-amber-900 dark:text-amber-200/90",
                )}
              >
                Tindakan
              </span>
              <select
                value={filterTindakan}
                onChange={(e) => setFilterTindakan(e.target.value)}
                className={cn(
                  "max-w-[14rem] rounded-md border px-2 py-1 text-[13px] font-semibold focus:outline-none",
                  "border-amber-300/80 bg-white text-slate-900",
                  "dark:border-white/20 dark:bg-black dark:text-white",
                )}
              >
                <option value="">Semua</option>
                {tindakanOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-[11rem] flex-col gap-0.5">
              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wide",
                  "text-amber-900 dark:text-amber-200/90",
                )}
              >
                IGD — dari
              </span>
              <input
                type="datetime-local"
                value={igdFrom}
                onChange={(e) => setIgdFrom(e.target.value)}
                className={cn(
                  "rounded-md border px-2 py-1 text-[12px] font-semibold font-mono focus:outline-none",
                  "border-amber-300/80 bg-white text-slate-900",
                  "dark:border-white/20 dark:bg-black dark:text-white",
                )}
              />
            </label>
            <label className="flex min-w-[11rem] flex-col gap-0.5">
              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wide",
                  "text-amber-900 dark:text-amber-200/90",
                )}
              >
                IGD — sampai
              </span>
              <input
                type="datetime-local"
                value={igdTo}
                onChange={(e) => setIgdTo(e.target.value)}
                className={cn(
                  "rounded-md border px-2 py-1 text-[12px] font-semibold font-mono focus:outline-none",
                  "border-amber-300/80 bg-white text-slate-900",
                  "dark:border-white/20 dark:bg-black dark:text-white",
                )}
              />
            </label>
            <label className="flex min-w-[11rem] flex-col gap-0.5">
              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wide",
                  "text-amber-900 dark:text-amber-200/90",
                )}
              >
                Door-to-balloon — dari
              </span>
              <input
                type="datetime-local"
                value={d2bFrom}
                onChange={(e) => setD2bFrom(e.target.value)}
                className={cn(
                  "rounded-md border px-2 py-1 text-[12px] font-semibold font-mono focus:outline-none",
                  "border-amber-300/80 bg-white text-slate-900",
                  "dark:border-white/20 dark:bg-black dark:text-white",
                )}
              />
            </label>
            <label className="flex min-w-[11rem] flex-col gap-0.5">
              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wide",
                  "text-amber-900 dark:text-amber-200/90",
                )}
              >
                Door-to-balloon — sampai
              </span>
              <input
                type="datetime-local"
                value={d2bTo}
                onChange={(e) => setD2bTo(e.target.value)}
                className={cn(
                  "rounded-md border px-2 py-1 text-[12px] font-semibold font-mono focus:outline-none",
                  "border-amber-300/80 bg-white text-slate-900",
                  "dark:border-white/20 dark:bg-black dark:text-white",
                )}
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setMonthYyyyMm(currentMonthYyyyMmWib());
                setFilterDokter("");
                setFilterTindakan("");
                setIgdFrom("");
                setIgdTo("");
                setD2bFrom("");
                setD2bTo("");
              }}
              className={cn(
                "h-8 self-end rounded-md border px-2.5 text-[12px] font-bold transition",
                "border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
                "dark:border-white/25 dark:bg-black/40 dark:text-white dark:hover:bg-black/55",
              )}
            >
              Reset filter
            </button>
          </div>

          {loading ? (
            <div
              className={cn(
                "rounded-xl border px-4 py-10 text-center text-sm font-semibold",
                "border-slate-200 bg-slate-50 text-slate-700 dark:border-amber-800/40 dark:bg-black/25 dark:text-white/90",
              )}
            >
              Memuat data…
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200/80 dark:border-white/15">
              <table className="w-full min-w-[1200px] border-separate border-spacing-0 text-left text-[12px] font-semibold">
                <thead className="sticky top-0 z-10">
                  <tr
                    className={cn(
                      "border-b text-center backdrop-blur-md shadow-[0_8px_24px_rgba(245,158,11,0.12)]",
                      "border-amber-200/70 bg-gradient-to-b from-amber-400/85 via-amber-200/65 to-amber-100/40 dark:border-amber-400/55 dark:from-amber-300/30 dark:via-amber-200/20 dark:to-amber-200/10",
                    )}
                  >
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white w-10">
                      No
                    </th>
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white min-w-[120px]">
                      Foto
                    </th>
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white w-24">
                      Tanggal
                    </th>
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white w-24">
                      RM
                    </th>
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white min-w-[160px]">
                      Nama pasien
                    </th>
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white w-20">
                      JK
                    </th>
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white w-28">
                      Lahir
                    </th>
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white w-14">
                      Umur
                    </th>
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white min-w-[140px]">
                      Alamat
                    </th>
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white min-w-[100px]">
                      Telp
                    </th>
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white min-w-[120px]">
                      Dokter
                    </th>
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white min-w-[120px]">
                      Tindakan
                    </th>
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white min-w-[150px]">
                      Pasien tiba IGD
                    </th>
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white min-w-[150px]">
                      Door-to-balloon
                    </th>
                    <th className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-slate-900 dark:text-white w-24">
                      Total waktu
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={15}
                        className={cn(
                          "px-4 py-8 text-center text-[13px]",
                          "text-slate-600 dark:text-white/85",
                        )}
                      >
                        Tidak ada baris untuk filter ini.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((rec, i) => {
                      const raw = rec as unknown as Record<string, unknown>;
                      const jk = resolveJenisKelaminFromRow(raw, null);
                      const fotos = parseFastTrackFotosUrls(rec.fast_track_fotos);
                      return (
                        <tr
                          key={String(rec.id ?? i)}
                          className={cn(
                            "border-b align-top",
                            "border-amber-200/50 dark:border-amber-900/30",
                          )}
                        >
                          <td className="px-2 py-2 text-center font-mono tabular-nums text-amber-900 dark:text-amber-200/90">
                            {i + 1}
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex flex-wrap gap-1">
                              {fotos.length === 0 ? (
                                <span className="text-slate-500 dark:text-white/70">
                                  —
                                </span>
                              ) : (
                                fotos.map((url) => (
                                  <a
                                    key={url}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block shrink-0"
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={url}
                                      alt=""
                                      className="h-14 w-14 rounded-md border border-amber-200/80 object-cover dark:border-amber-700/50"
                                    />
                                  </a>
                                ))
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-center font-mono text-[11px] text-slate-800 dark:text-white/90">
                            {String(rec.tanggal ?? "").slice(0, 10) || "—"}
                          </td>
                          <td className="px-2 py-2 text-center font-mono text-[11px] text-slate-800 dark:text-white/90">
                            {displayRm(raw)}
                          </td>
                          <td className="px-2 py-2 text-[12px] text-slate-800 dark:text-white/90">
                            {normalizeNamaPasien(displayNamaPasien(raw))}
                          </td>
                          <td className="px-2 py-2 text-center text-[12px] text-slate-800 dark:text-white/90">
                            {formatJenisKelaminDisplay(jk)}
                          </td>
                          <td className="px-2 py-2 text-center font-mono text-[11px] text-slate-800 dark:text-white/90">
                            {String(rec.tgl_lahir ?? "").trim().slice(0, 10) ||
                              "—"}
                          </td>
                          <td className="px-2 py-2 text-center font-mono text-[11px] text-slate-800 dark:text-white/90">
                            {rec.umur != null ? String(rec.umur) : "—"}
                          </td>
                          <td className="px-2 py-2 text-[11px] leading-snug text-slate-800 dark:text-white/90">
                            {String(rec.alamat ?? "").trim() || "—"}
                          </td>
                          <td className="px-2 py-2 font-mono text-[11px] text-slate-800 dark:text-white/90">
                            {String(rec.no_telp ?? "").trim() || "—"}
                          </td>
                          <td className="px-2 py-2 text-[12px] text-slate-800 dark:text-white/90">
                            {String(rec.dokter ?? "").trim() || "—"}
                          </td>
                          <td className="px-2 py-2 text-[12px] text-slate-800 dark:text-white/90">
                            {String(rec.tindakan ?? "").trim() || "—"}
                          </td>
                          <td className="px-2 py-2 text-[11px] leading-snug text-slate-800 dark:text-white/90">
                            {formatWaktuDisplay(rec.pasien_datang_igd)}
                          </td>
                          <td className="px-2 py-2 text-[11px] leading-snug text-slate-800 dark:text-white/90">
                            {formatWaktuDisplay(rec.door_to_balloon)}
                          </td>
                          <td className="px-2 py-2 text-center font-mono text-[11px] text-slate-800 dark:text-white/90">
                            {String(rec.total_waktu_fast_track ?? "").trim() ||
                              "—"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          <p
            className={cn(
              "shrink-0 text-[11px] font-semibold",
              "text-slate-500 dark:text-white/75",
            )}
          >
            Menampilkan {filteredRows.length} baris
            {monthYyyyMm ? ` · bulan ${monthYyyyMm}` : ""}.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
