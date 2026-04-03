"use client";
import { useState, useEffect, useRef } from "react";
import {
  Search,
  Activity,
  Plus,
  Zap,
  BarChart3,
  FileSpreadsheet,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UI_LAYERS } from "@/lib/ui/layers";
import type { Pasien } from "@/app/dashboard/pasien/types/pasien";
import TambahPasienQuickModal from "./TambahPasienQuickModal";

interface Props {
  onRefresh?: () => Promise<void> | void;
  onCreateDraftForPasien?: (p: {
    pasienId: string;
    rm: string;
    nama: string;
  }) => Promise<void> | void;
  onSearch: (val: string) => void;
  onFilter: (
    dokter: string,
    ruangan: string,
    tanggalFrom?: string,
    tanggalTo?: string,
  ) => void;
  dokterOptions: string[];
  ruanganOptions: string[];
  /** Indikator halus: sinkronisasi latar sedang berjalan */
  isSyncing?: boolean;
  /** Buat master pasien minimal dari tabel `tindakan` (no_rm + nama_pasien). */
  onSyncMasterPasien?: () => Promise<void> | void;
  /** Indikator sinkronisasi master pasien berjalan (silent/background). */
  isSyncingMasterPasien?: boolean;
  /** Buka modal ringkasan Fast-Track (filter di dalam modal). */
  onOpenFastTrack?: () => void;
  /** Buka modal frekuensi tindakan × tahun (Lab Kateter). */
  onOpenTindakanTerbanyakLab?: () => void;
  /** Matriks bulanan: jenis operasi / cara bayar (filter mengikuti tabel). */
  onOpenLaporan?: () => void;
}

/** Interval auto-refresh saat tab terlihat (detik). */
const POLL_INTERVAL_SEC = 120;

/** Membuka picker tanggal native (Chromium/Edge: klik di area teks ikut membuka kalender). */
function openNativeDatePicker(el: HTMLInputElement) {
  if (typeof el.showPicker !== "function") return;
  try {
    el.showPicker();
  } catch {
    /* gesture / secure context */
  }
}

export default function TableToolbar({
  onRefresh,
  onCreateDraftForPasien,
  onSearch,
  onFilter,
  dokterOptions,
  ruanganOptions,
  isSyncing = false,
  isSyncingMasterPasien = false,
  onOpenFastTrack,
  onOpenTindakanTerbanyakLab,
  onOpenLaporan,
}: Props) {
  const [dokter, setDokter] = useState("");
  const [ruangan, setRuangan] = useState("");
  const [tanggalFrom, setTanggalFrom] = useState("");
  const [tanggalTo, setTanggalTo] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [, setCountdown] = useState(POLL_INTERVAL_SEC);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [addPasienOpen, setAddPasienOpen] = useState(false);
  const [laporanMenuOpen, setLaporanMenuOpen] = useState(false);
  const laporanMenuRef = useRef<HTMLDivElement | null>(null);

  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasLaporanLab = typeof onOpenTindakanTerbanyakLab === "function";
  const hasLaporanMatriks = typeof onOpenLaporan === "function";
  const hasAnyLaporan = hasLaporanLab || hasLaporanMatriks;

  useEffect(() => {
    if (!laporanMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      const el = laporanMenuRef.current;
      if (!el?.contains(e.target as Node)) setLaporanMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLaporanMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [laporanMenuOpen]);

  const handleSavedPasien = async (patient: Pasien) => {
    const pasienId = String(patient.id ?? "").trim();
    const rm = String(patient.noRM ?? "").trim();
    const nama = String(patient.nama ?? "").trim();
    if (typeof onCreateDraftForPasien === "function") {
      await onCreateDraftForPasien({ pasienId, rm, nama });
    }
    await Promise.resolve(
      typeof onRefresh === "function" ? onRefresh() : undefined,
    );
  };

  const isAnySyncing = isSyncing || isSyncingMasterPasien;

  /** Tab terlihat — jangan polling saat background (hemat request & fokus UX). */
  useEffect(() => {
    const sync = () => setIsPageVisible(!document.hidden);
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  /** ⏱ Polling ringan: hanya saat tab fokus, jeda saat user mengetik di cari. */
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (!isPageVisible) return prev;
        if (isUserTyping) return prev;
        if (prev <= 1) {
          queueMicrotask(() => {
            Promise.resolve(
              typeof onRefresh === "function" ? onRefresh() : undefined,
            )
              .catch((err) => {
                console.error("[TableToolbar] Refresh error:", err);
              })
              .finally(() => {
                setCountdown(POLL_INTERVAL_SEC);
              });
          });
          return POLL_INTERVAL_SEC;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPageVisible, isUserTyping, onRefresh]);

  /** ⏸ Pause auto-refresh ketika mengetik */
  const handleUserTyping = (val: string) => {
    setSearchValue(val);
    onSearch(val);
    setIsUserTyping(true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      setIsUserTyping(false);
    }, 10000);
  };

  useEffect(() => {
    return () => {
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
    };
  }, []);

  return (
    <div
      className={cn(
        "relative flex shrink-0 flex-col gap-1 px-1.5 py-1 sm:px-2 sm:py-1.5 min-w-0 transition-colors duration-500",
        "bg-slate-50/90 dark:bg-black/35",
        /* Di atas area scroll + thead sticky (z-10) agar submenu Laporan tidak tertutup tabel */
        UI_LAYERS.hud,
      )}
    >
      <div
        className={cn(
          "relative flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5",
          UI_LAYERS.toolbarActionsRow,
        )}
      >
        <h3
          className={cn(
            "font-extrabold tracking-wide inline-flex items-center gap-1.5 flex-wrap text-[11px] sm:text-xs min-w-0",
            "text-cyan-900 dark:text-cyan-300",
          )}
        >
          <Activity
            size={14}
            className={cn("shrink-0 text-cyan-700 dark:text-cyan-400")}
          />
          <span className="sr-only" aria-live="polite">
            {isAnySyncing
              ? isSyncingMasterPasien
                ? "Sinkronisasi master pasien sedang berjalan di latar."
                : "Memperbarui data di latar."
              : ""}
          </span>
          {isAnySyncing ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5",
                "border-cyan-500/35 bg-white/90 dark:border-cyan-800/35 dark:bg-black/30",
              )}
              title={
                isSyncingMasterPasien
                  ? "Sinkronisasi master pasien di latar"
                  : "Memperbarui data di latar"
              }
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400/90 shadow-[0_0_6px_rgba(52,211,153,0.5)] motion-safe:animate-pulse"
                aria-hidden
              />
              <span
                className={cn(
                  "hidden sm:inline text-[10px] font-semibold font-mono tracking-tight",
                  "text-cyan-700/85 dark:text-cyan-500/80",
                )}
              >
                {isSyncingMasterPasien ? "Sinkron Pasien" : "Sinkron"}
              </span>
            </span>
          ) : null}
        </h3>
        <button
          type="button"
          onClick={() => setAddPasienOpen(true)}
          className={cn(
            "group inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[hsl(var(--cyan)/0.85)] bg-[hsl(var(--cyan))] px-3 text-xs font-extrabold shadow-[0_0_18px_hsl(var(--cyan)/0.4)] transition hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--cyan))]",
            "text-black dark:text-slate-100",
            "focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black/60",
          )}
          title="Tambah saran pasien (tanpa pindah halaman)"
        >
          <Plus
            size={16}
            strokeWidth={2.5}
            className={cn(
              "shrink-0 motion-safe:transition-transform group-hover:scale-110",
              "text-black dark:text-slate-100",
            )}
          />
          <span className={cn("tracking-wide text-black dark:text-slate-100")}>
            Tambah Pasien
          </span>
        </button>
        {typeof onOpenFastTrack === "function" ? (
          <button
            type="button"
            onClick={() => onOpenFastTrack()}
            className={cn(
              "group inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-extrabold shadow-[0_0_14px_rgba(245,158,11,0.35)] transition hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/90",
              "border-amber-600/85 bg-amber-500 text-black dark:border-amber-500/70 dark:bg-amber-600 dark:text-white",
              "focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black/60",
            )}
            title="Daftar Fast-Track: filter bulan, dokter, IGD, door-to-balloon, foto"
          >
            <Zap
              size={16}
              strokeWidth={2.5}
              className={cn(
                "shrink-0 motion-safe:transition-transform group-hover:scale-110",
                "text-black dark:text-white",
              )}
            />
            <span className={cn("tracking-wide text-black dark:text-white")}>
              Fast-Track
            </span>
          </button>
        ) : null}
        {hasAnyLaporan ? (
          <div className="relative shrink-0" ref={laporanMenuRef}>
            <button
              type="button"
              id="tindakan-toolbar-laporan-trigger"
              aria-haspopup="menu"
              aria-expanded={laporanMenuOpen}
              aria-controls="tindakan-toolbar-laporan-menu"
              onClick={() => setLaporanMenuOpen((o) => !o)}
              className={cn(
                "group inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-lg border px-2.5 pr-2 text-xs font-extrabold shadow-[0_0_14px_rgba(16,185,129,0.3)] transition hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/90",
                "border-emerald-600/85 bg-emerald-600 text-white dark:border-emerald-500/70 dark:bg-emerald-700 dark:text-white",
                "focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black/60",
                laporanMenuOpen && "brightness-110",
              )}
              title="Laporan: pilih jenis"
            >
              <FileSpreadsheet
                size={16}
                strokeWidth={2.5}
                className="shrink-0 motion-safe:transition-transform group-hover:scale-110"
              />
              <span className="tracking-wide">Laporan</span>
              <ChevronDown
                size={14}
                strokeWidth={2.5}
                className={cn(
                  "shrink-0 opacity-90 motion-safe:transition-transform",
                  laporanMenuOpen && "rotate-180",
                )}
                aria-hidden
              />
            </button>
            {laporanMenuOpen ? (
              <div
                id="tindakan-toolbar-laporan-menu"
                role="menu"
                aria-labelledby="tindakan-toolbar-laporan-trigger"
                className={cn(
                  "absolute left-0 top-full mt-1 min-w-[14rem] rounded-lg border py-1 shadow-lg",
                  UI_LAYERS.popover,
                  "border-emerald-600/40 bg-white dark:border-emerald-500/35 dark:bg-black/95",
                  "ring-1 ring-black/5 dark:ring-white/10",
                )}
              >
                {hasLaporanLab ? (
                  <button
                    type="button"
                    role="menuitem"
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold",
                      "text-slate-900 hover:bg-violet-500/10 dark:text-white dark:hover:bg-violet-500/15",
                      "focus-visible:bg-violet-500/10 focus-visible:outline-none dark:focus-visible:bg-violet-500/15",
                    )}
                    onClick={() => {
                      setLaporanMenuOpen(false);
                      onOpenTindakanTerbanyakLab?.();
                    }}
                  >
                    <BarChart3
                      size={16}
                      strokeWidth={2.25}
                      className="shrink-0 text-violet-600 dark:text-violet-400"
                    />
                    <span className="min-w-0 flex-1 font-extrabold tracking-wide">
                      Laporan Tindakan Terbanyak
                    </span>
                  </button>
                ) : null}
                {hasLaporanLab && hasLaporanMatriks ? (
                  <div
                    className="mx-2 border-t border-slate-200/80 dark:border-white/15"
                    role="separator"
                  />
                ) : null}
                {hasLaporanMatriks ? (
                  <button
                    type="button"
                    role="menuitem"
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold",
                      "text-slate-900 hover:bg-emerald-500/10 dark:text-white dark:hover:bg-emerald-500/15",
                      "focus-visible:bg-emerald-500/10 focus-visible:outline-none dark:focus-visible:bg-emerald-500/15",
                    )}
                    onClick={() => {
                      setLaporanMenuOpen(false);
                      onOpenLaporan?.();
                    }}
                  >
                    <FileSpreadsheet
                      size={16}
                      strokeWidth={2.25}
                      className="shrink-0 text-emerald-600 dark:text-emerald-400"
                    />
                    <span className="min-w-0 flex-1 font-extrabold tracking-wide">
                      Laporan bulanan
                    </span>
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="relative z-0 flex flex-wrap items-end gap-1.5 sm:gap-2 min-w-0">
        <div className="relative min-w-0 w-full min-[480px]:w-auto min-[480px]:flex-1 min-[480px]:min-w-[12rem] min-[480px]:max-w-2xl">
          <Search
            size={13}
            className={cn(
              "absolute left-2 top-1/2 -translate-y-1/2 opacity-70 pointer-events-none",
              "text-cyan-700 dark:text-slate-200/90",
            )}
          />
          <input
            type="text"
            value={searchValue}
            placeholder="Cari (RM, nama, JK, dokter, tindakan, ruangan…)"
            onChange={(e) => handleUserTyping(e.target.value)}
            className={cn(
              "w-full pl-7 pr-2.5 py-1 text-[13px] font-semibold leading-snug rounded-md border focus:outline-none focus:ring-1 focus:ring-cyan-500",
              "bg-white border-cyan-500/40 text-slate-900 placeholder:text-slate-600 [color-scheme:light]",
              "dark:bg-black dark:border-white/20 dark:text-slate-100 dark:placeholder:text-white/90 dark:[color-scheme:dark]",
            )}
          />
        </div>
        {/* Filter dokter — domain tab Dokter & tim (wireframe) */}
        <select
          value={dokter}
          onChange={(e) => {
            const v = e.target.value;
            setDokter(v);
            onFilter(v, ruangan, tanggalFrom, tanggalTo);
          }}
          className={cn(
            "text-[13px] font-semibold px-2 py-1 rounded-md border focus:outline-none min-w-0 w-full min-[420px]:w-auto min-[420px]:min-w-[9rem]",
            "bg-white border-cyan-500/40 text-slate-900 [color-scheme:light]",
            "dark:bg-black dark:border-white/20 dark:text-slate-100 dark:[color-scheme:dark]",
          )}
        >
          <option value="">Semua dokter</option>
          {dokterOptions.map((d, idx) => (
            <option key={idx} value={d}>
              {d}
            </option>
          ))}
        </select>

        {/* Filter ruangan — master lokasi */}
        <select
          value={ruangan}
          onChange={(e) => {
            const v = e.target.value;
            setRuangan(v);
            onFilter(dokter, v, tanggalFrom, tanggalTo);
          }}
          className={cn(
            "text-[13px] font-semibold px-2 py-1 rounded-md border focus:outline-none min-w-0 w-full min-[420px]:w-auto min-[420px]:min-w-[9rem]",
            "bg-white border-cyan-500/40 text-slate-900 [color-scheme:light]",
            "dark:bg-black dark:border-white/20 dark:text-slate-100 dark:[color-scheme:dark]",
          )}
        >
          <option value="">Semua ruangan</option>
          {ruanganOptions.map((s, idx) => (
            <option key={idx} value={s}>
              {s}
            </option>
          ))}
        </select>

        {/* 📅 Filter tanggal (range) */}
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <input
            type="date"
            value={tanggalFrom}
            min="1900-01-01"
            onClick={(e) => openNativeDatePicker(e.currentTarget)}
            onChange={(e) => {
              const v = e.target.value;
              setTanggalFrom(v);
              onFilter(dokter, ruangan, v, tanggalTo);
            }}
            className={cn(
              "cursor-pointer text-[13px] font-semibold px-2 py-1 rounded-md border focus:outline-none focus:ring-1 focus:ring-cyan-500",
              "[color-scheme:light] bg-white border-cyan-500/40 text-slate-900",
              "dark:[color-scheme:dark] dark:bg-black dark:border-white/20 dark:text-slate-100",
            )}
            title="Tanggal dari"
            aria-label="Tanggal dari"
          />
          <span
            className={cn(
              "text-xs font-mono",
              "text-cyan-700/80 dark:text-cyan-600/80",
            )}
          >
            —
          </span>
          <input
            type="date"
            value={tanggalTo}
            min="1900-01-01"
            onClick={(e) => openNativeDatePicker(e.currentTarget)}
            onChange={(e) => {
              const v = e.target.value;
              setTanggalTo(v);
              onFilter(dokter, ruangan, tanggalFrom, v);
            }}
            className={cn(
              "cursor-pointer text-[13px] font-semibold px-2 py-1 rounded-md border focus:outline-none focus:ring-1 focus:ring-cyan-500",
              "[color-scheme:light] bg-white border-cyan-500/40 text-slate-900",
              "dark:[color-scheme:dark] dark:bg-black dark:border-white/20 dark:text-slate-100",
            )}
            title="Tanggal sampai"
            aria-label="Tanggal sampai"
          />
        </div>
      </div>

      <TambahPasienQuickModal
        open={addPasienOpen}
        onClose={() => setAddPasienOpen(false)}
        onSaved={handleSavedPasien}
      />
    </div>
  );
}
