"use client";
import { useState, useEffect, useRef, memo, useCallback } from "react";
import { createPortal } from "react-dom";
import { mutate } from "swr";
import {
  Search,
  Activity,
  Plus,
  Zap,
  BarChart3,
  FileSpreadsheet,
  ChevronDown,
  X,
  Receipt,
  ClipboardList,
  BarChart2,
  Calendar,
  CalendarDays,
  Package,
  Phone,
  ShieldCheck,
  RefreshCw,
  Users,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Pasien } from "@/app/dashboard/pasien/types/pasien";
import { cn } from "@/lib/utils";
import { UI_LAYERS, Z_INDEX_VALUES } from "@/lib/ui/layers";
import TambahPasienQuickModal from "./TambahPasienQuickModal";
import { TINDAKAN_STATUS } from "../bridge/bridge.constants";
import TarifModal from "./TarifModal";
import DiagnosaModal from "./DiagnosaModal";
import SeverityLevelModal from "./SeverityLevelModal";
import IndenanModal from "./IndenanModal";
import JadwalCathModal from "./JadwalCathModal";
interface Props {
  onRefresh?: () => Promise<void> | void;
  onCreateDraftForPasien?: (p: {
    pasienId: string;
    rm: string;
    nama: string;
    tanggal?: string;
  }) => Promise<void> | void;
  onSearch: (val: string) => void;
  onFilter: (
    dokter: string,
    ruangan: string,
    tindakan?: string,
    tanggalFrom?: string,
    tanggalTo?: string,
    isPciOnly?: boolean,
    status?: string,
  ) => void;
  dokterOptions: string[];
  ruanganOptions: string[];
  tindakanOptions: string[];
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
  /** Buka laporan matriks diagnosa klinis x tindakan. */
  onOpenLaporanDiagnosaKlinis?: () => void;
  /** Buka modal laporan pemakaian alkes. */
  onOpenLaporanPemakaian?: () => void;
  /** Buka modal laporan mutu. */
  onOpenLaporanMutu?: () => void;
  /** Buka modal laporan pasien. */
  onOpenLaporanPasien?: () => void;
  onPhoneDirectoryOpen?: () => void;
  /** Status collapse untuk menghemat ruang vertikal di HP */
  isCollapsed?: boolean;
  /** Ada filter non-default (badge di header) */
  onFilterActiveChange?: (active: boolean) => void;
  /** Sumber data sama dengan tabel tindakan. */
  jadwalRowsSource?: Record<string, unknown>[];
  onJadwalCreateRecord?: (
    payload: Record<string, unknown>,
  ) => Promise<{ id?: string } | null | unknown>;
  onJadwalPatchRow?: (id: string, patch: Record<string, unknown>) => void;
  onJadwalDeleteRow?: (id: string) => Promise<void> | void;
  onJadwalSyncMainTable?: (opts?: {
    force?: boolean;
  }) => Promise<void> | void;
  onJadwalRevealInMainTable?: (
    row: Record<string, unknown>,
    opts?: { silent?: boolean },
  ) => Promise<void> | void;
  /** Fokus baris riwayat dari modal Tambah Pasien ke tabel utama. */
  onRevealTindakanInTable?: (
    row: Record<string, unknown>,
    opts?: { silent?: boolean },
  ) => Promise<void> | void;
  /** Sinkronkan input filter toolbar dari parent (mis. reveal dari Jadwal). */
  toolbarFilterSync?: {
    search?: string;
    tanggalFrom?: string;
    tanggalTo?: string;
    dokter?: string;
    ruangan?: string;
    tindakan?: string;
    status?: string;
    isPciOnly?: boolean;
    seq: number;
  } | null;
  /** Nilai awal filter tanggal (sinkron dengan parent, default hari ini). */
  initialTanggalFrom?: string;
  initialTanggalTo?: string;
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

function TableToolbar({
  onRefresh,
  onCreateDraftForPasien,
  onSearch,
  onFilter,
  dokterOptions,
  ruanganOptions,
  tindakanOptions = [],
  isSyncing = false,
  isSyncingMasterPasien = false,
  onOpenFastTrack,
  onOpenTindakanTerbanyakLab,
  onOpenLaporan,
  onOpenLaporanDiagnosaKlinis,
  onOpenLaporanPemakaian,
  onOpenLaporanMutu,
  onOpenLaporanPasien,
  onPhoneDirectoryOpen,
  isCollapsed = false,
  onFilterActiveChange,
  jadwalRowsSource,
  onJadwalCreateRecord,
  onJadwalPatchRow,
  onJadwalDeleteRow,
  onJadwalSyncMainTable,
  onJadwalRevealInMainTable,
  onRevealTindakanInTable,
  toolbarFilterSync,
  initialTanggalFrom = "",
  initialTanggalTo = "",
}: Props) {
  const [dokter, setDokter] = useState("");
  const [ruangan, setRuangan] = useState("");
  const [tindakan, setTindakan] = useState("");
  const [tanggalFrom, setTanggalFrom] = useState(initialTanggalFrom);
  const [tanggalTo, setTanggalTo] = useState(initialTanggalTo);
  const [isPciOnly, setIsPciOnly] = useState(false);
  const [status, setStatus] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [addPasienOpen, setAddPasienOpen] = useState(false);
  const [tarifOpen, setTarifOpen] = useState(false);
  const [diagnosaOpen, setDiagnosaOpen] = useState(false);
  const [severityLevelOpen, setSeverityLevelOpen] = useState(false);
  const [indenanOpen, setIndenanOpen] = useState(false);
  const [jadwalCathOpen, setJadwalCathOpen] = useState(false);
  const [laporanMenuOpen, setLaporanMenuOpen] = useState(false);
  const [laporanMenuMounted, setLaporanMenuMounted] = useState(false);
  const [laporanMenuPos, setLaporanMenuPos] = useState<{
    top: number;
    left: number;
    minWidth: number;
  } | null>(null);
  const laporanMenuRef = useRef<HTMLDivElement | null>(null);
  const laporanMenuPortalRef = useRef<HTMLDivElement | null>(null);

  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPageVisibleRef = useRef(true);
  const isUserTypingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  const lastProcessedSeqRef = useRef<number | null>(null);

  const hasLaporanLab = typeof onOpenTindakanTerbanyakLab === "function";
  const hasLaporanMatriks = typeof onOpenLaporan === "function";
  const hasLaporanDiagnosaKlinis =
    typeof onOpenLaporanDiagnosaKlinis === "function";
  const hasLaporanPemakaian = typeof onOpenLaporanPemakaian === "function";
  const hasLaporanMutu = typeof onOpenLaporanMutu === "function";
  const hasLaporanPasien = typeof onOpenLaporanPasien === "function";
  const hasAnyLaporan =
    hasLaporanLab ||
    hasLaporanMatriks ||
    hasLaporanDiagnosaKlinis ||
    hasLaporanPemakaian ||
    hasLaporanMutu ||
    hasLaporanPasien;

  useEffect(() => setLaporanMenuMounted(true), []);

  const filterActive = Boolean(
    searchValue ||
      dokter ||
      ruangan ||
      tindakan ||
      status ||
      tanggalFrom ||
      tanggalTo ||
      isPciOnly,
  );

  const isAnySyncing = Boolean(isSyncing || isSyncingMasterPasien);
  const isRefreshBusy = isManualRefreshing || Boolean(isSyncing);

  const handleRefreshTable = async () => {
    if (typeof onRefresh !== "function" || isRefreshBusy) return;
    try {
      setIsManualRefreshing(true);
      await onRefresh();
    } finally {
      setIsManualRefreshing(false);
    }
  };

  const handleSavedPasien = useCallback(
    async (
      patient: Pasien,
      opts?: { tanggal?: string; ruangan?: string },
    ) => {
      setAddPasienOpen(false);
      if (typeof onCreateDraftForPasien === "function") {
        await onCreateDraftForPasien({
          pasienId: patient.id,
          rm: patient.noRM,
          nama: patient.nama,
          tanggal: opts?.tanggal,
        });
      } else if (typeof onRefresh === "function") {
        void onRefresh();
      }
    },
    [onCreateDraftForPasien, onRefresh],
  );

  useEffect(() => {
    onFilterActiveChange?.(filterActive);
  }, [filterActive, onFilterActiveChange]);

  useEffect(() => {
    if (!laporanMenuOpen) {
      setLaporanMenuPos(null);
      return;
    }
    const updatePos = () => {
      const el = laporanMenuRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setLaporanMenuPos({
        top: rect.bottom + 6,
        left: rect.left,
        minWidth: Math.max(rect.width, 224),
      });
    };
    updatePos();
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [laporanMenuOpen]);

  useEffect(() => {
    if (!laporanMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (laporanMenuRef.current?.contains(target)) return;
      if (laporanMenuPortalRef.current?.contains(target)) return;
      setLaporanMenuOpen(false);
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

  /** Sinkronkan filter toolbar dari parent saat baris di-reveal atau filter di-reset (hanya saat seq baru). */
  useEffect(() => {
    if (!toolbarFilterSync || !toolbarFilterSync.seq) return;
    if (lastProcessedSeqRef.current === toolbarFilterSync.seq) return;
    lastProcessedSeqRef.current = toolbarFilterSync.seq;

    if (toolbarFilterSync.dokter !== undefined) setDokter(toolbarFilterSync.dokter);
    if (toolbarFilterSync.ruangan !== undefined) setRuangan(toolbarFilterSync.ruangan);
    if (toolbarFilterSync.tindakan !== undefined) setTindakan(toolbarFilterSync.tindakan);
    if (toolbarFilterSync.status !== undefined) setStatus(toolbarFilterSync.status);
    if (toolbarFilterSync.isPciOnly !== undefined) setIsPciOnly(toolbarFilterSync.isPciOnly);
    if (toolbarFilterSync.search !== undefined) {
      setSearchValue(toolbarFilterSync.search);
      onSearch(toolbarFilterSync.search);
    }
    if (toolbarFilterSync.tanggalFrom !== undefined) setTanggalFrom(toolbarFilterSync.tanggalFrom);
    if (toolbarFilterSync.tanggalTo !== undefined) setTanggalTo(toolbarFilterSync.tanggalTo);
  }, [toolbarFilterSync, onSearch]);

  /** Tab terlihat — jangan polling saat background (hemat request & fokus UX). */
  useEffect(() => {
    const sync = () => setIsPageVisible(!document.hidden);
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  /**
   * Auto-refresh berkala tanpa setState tiap detik (hindari re-render toolbar penuh).
   * Hanya jalan saat tab fokus dan user tidak sedang mengetik di pencarian.
   */
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isPageVisibleRef.current) return;
      if (isUserTypingRef.current) return;
      const refresh = onRefreshRef.current;
      if (typeof refresh !== "function") return;
      void Promise.resolve(refresh()).catch((err) => {
        console.error("[TableToolbar] Refresh error:", err);
      });
    }, POLL_INTERVAL_SEC * 1000);
    return () => clearInterval(interval);
  }, []);

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

  /** 📅 Shortcut filter tanggal cepat */
  const setShortcutDate = (
    type: "today" | "yesterday" | "thisWeek" | "untilToday",
  ) => {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const now = new Date();
    let from = "";
    let to = formatter.format(now);

    if (type === "today") {
      from = to;
    } else if (type === "untilToday") {
      from = "";
      to = formatter.format(now);
    } else if (type === "yesterday") {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      from = formatter.format(yesterday);
      to = from;
    } else if (type === "thisWeek") {
      const today = new Date();
      const day = today.getDay(); // 0: Sun, 1: Mon, ...
      const diffToMonday = day === 0 ? 6 : day - 1;
      const monday = new Date(today);
      monday.setDate(today.getDate() - diffToMonday);
      from = formatter.format(monday);
      to = formatter.format(today);
    }

    setTanggalFrom(from);
    setTanggalTo(to);
    onFilter(dokter, ruangan, tindakan, from, to, isPciOnly, status);
  };

  useEffect(() => {
    return () => {
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
    };
  }, []);

  return (
    <div
      className={cn(
        "relative flex shrink-0 flex-col min-w-0 transition-colors duration-500",
        "bg-slate-50/95 dark:bg-black/75",
        /* Di atas area scroll + thead sticky (z-10) agar tidak tertutup */
        UI_LAYERS.floatingCard,
      )}
    >
      <div className="flex flex-col gap-0.5 px-1 py-0.5 sm:px-1.5 sm:py-1">
              <div
                className={cn(
                  "relative flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5 max-2xl:gap-x-1 max-2xl:gap-y-1",
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
                <div className="relative min-w-0 w-full max-2xl:order-first max-2xl:basis-full max-2xl:max-w-none 2xl:flex-1 2xl:min-w-[10rem] 2xl:max-w-xl 2xl:basis-auto 2xl:w-auto group">
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
                      "w-full pl-7 pr-8 py-1 text-[13px] font-semibold leading-snug rounded-md border focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all",
                      "bg-white border-cyan-500/40 text-slate-900 placeholder:text-slate-600 [color-scheme:light]",
                      "dark:bg-black dark:border-white/20 dark:text-slate-100 dark:placeholder:text-white/90 dark:[color-scheme:dark]",
                    )}
                  />
                  {searchValue && (
                    <button
                      type="button"
                      onClick={() => handleUserTyping("")}
                      className={cn(
                        "absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors",
                        "text-slate-400 hover:text-cyan-600 hover:bg-cyan-50",
                        "dark:text-slate-500 dark:hover:text-cyan-400 dark:hover:bg-cyan-950/30",
                      )}
                      title="Bersihkan pencarian"
                    >
                      <X size={14} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setAddPasienOpen(true)}
                  className={cn(
                    "group inline-flex h-8 max-2xl:h-7 max-2xl:px-1.5 max-2xl:text-[9px] max-2xl:gap-1 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-cyan/50 bg-cyan px-3 text-xs font-black shadow-lg shadow-cyan/30 transition hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan",
                    "text-white dark:text-black",
                    "focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black/60",
                  )}
                  title="Tambah saran pasien (tanpa pindah halaman)"
                >
                  <Plus
                    size={16}
                    strokeWidth={3}
                    className={cn(
                      "shrink-0 motion-safe:transition-transform group-hover:scale-110",
                      "text-white dark:text-black",
                    )}
                  />
                  <span
                    className={cn("tracking-wide text-white dark:text-black uppercase")}
                  >
                    Tambah Pasien
                  </span>
                </button>

                {typeof onOpenFastTrack === "function" ? (
                  <button
                    type="button"
                    onClick={() => onOpenFastTrack()}
                    className={cn(
                      "group inline-flex h-8 max-2xl:h-7 max-2xl:px-1.5 max-2xl:text-[9px] max-2xl:gap-1 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-orange-700 bg-orange-600 px-3 text-xs font-black shadow-lg shadow-orange-600/30 transition hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500",
                      "text-white",
                      "focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black/60",
                    )}
                    title="Daftar Fast-Track: filter bulan, dokter, IGD, door-to-balloon, foto"
                  >
                    <Zap
                      size={16}
                      strokeWidth={3}
                      className={cn(
                        "shrink-0 motion-safe:transition-transform group-hover:scale-110",
                        "text-white",
                      )}
                    />
                    <span className={cn("tracking-wide text-white uppercase")}>
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
                        "group inline-flex h-8 max-2xl:h-7 max-2xl:px-1.5 max-2xl:text-[9px] max-2xl:gap-1 shrink-0 items-center justify-center gap-1 rounded-lg border border-emerald-700 bg-emerald-600 px-2.5 pr-2 text-xs font-black shadow-lg shadow-emerald-600/30 transition hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
                        "text-white",
                        "focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black/60",
                        laporanMenuOpen && "brightness-110",
                      )}
                      title="Laporan: pilih jenis"
                    >
                      <FileSpreadsheet
                        size={16}
                        strokeWidth={3}
                        className="shrink-0 motion-safe:transition-transform group-hover:scale-110 text-white"
                      />
                      <span className="tracking-wide text-white uppercase">
                        Laporan
                      </span>
                      <ChevronDown
                        size={14}
                        strokeWidth={3}
                        className={cn(
                          "shrink-0 opacity-90 motion-safe:transition-transform text-white",
                          laporanMenuOpen && "rotate-180",
                        )}
                        aria-hidden
                      />
                    </button>
                    {laporanMenuMounted &&
                    laporanMenuOpen &&
                    laporanMenuPos &&
                    typeof document !== "undefined"
                      ? createPortal(
                          <div
                            ref={laporanMenuPortalRef}
                            id="tindakan-toolbar-laporan-menu"
                            role="menu"
                            aria-labelledby="tindakan-toolbar-laporan-trigger"
                            style={{
                              position: "fixed",
                              top: laporanMenuPos.top,
                              left: laporanMenuPos.left,
                              minWidth: laporanMenuPos.minWidth,
                              zIndex: Z_INDEX_VALUES.toolbarPopover,
                            }}
                            className={cn(
                              "rounded-xl border py-1.5 shadow-2xl",
                              UI_LAYERS.toolbarPopover,
                              "border-emerald-600/50 bg-white dark:border-emerald-500/40 dark:bg-zinc-950",
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
                            {hasLaporanDiagnosaKlinis ? (
                              <>
                                <div
                                  className="mx-2 border-t border-slate-200/80 dark:border-white/15"
                                  role="separator"
                                />
                                <button
                                  type="button"
                                  role="menuitem"
                                  className={cn(
                                    "flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold",
                                    "text-slate-900 hover:bg-teal-500/10 dark:text-white dark:hover:bg-teal-500/15",
                                    "focus-visible:bg-teal-500/10 focus-visible:outline-none dark:focus-visible:bg-teal-500/15",
                                  )}
                                  onClick={() => {
                                    setLaporanMenuOpen(false);
                                    onOpenLaporanDiagnosaKlinis?.();
                                  }}
                                >
                                  <ClipboardList
                                    size={16}
                                    strokeWidth={2.25}
                                    className="shrink-0 text-teal-600 dark:text-teal-400"
                                  />
                                  <span className="min-w-0 flex-1 font-extrabold tracking-wide">
                                    Laporan Diagnosa Klinis
                                  </span>
                                </button>
                              </>
                            ) : null}
                            {hasLaporanPemakaian ? (
                              <>
                                <div
                                  className="mx-2 border-t border-slate-200/80 dark:border-white/15"
                                  role="separator"
                                />
                                <button
                                  type="button"
                                  role="menuitem"
                                  className={cn(
                                    "flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold",
                                    "text-slate-900 hover:bg-amber-500/10 dark:text-white dark:hover:bg-amber-500/15",
                                    "focus-visible:bg-amber-500/10 focus-visible:outline-none dark:focus-visible:bg-amber-500/15",
                                  )}
                                  onClick={() => {
                                    setLaporanMenuOpen(false);
                                    onOpenLaporanPemakaian?.();
                                  }}
                                >
                                  <Package
                                    size={16}
                                    strokeWidth={2.25}
                                    className="shrink-0 text-amber-600 dark:text-amber-400"
                                  />
                                  <span className="min-w-0 flex-1 font-extrabold tracking-wide">
                                    Laporan Pemakaian Alkes
                                  </span>
                                </button>
                              </>
                            ) : null}
                            {hasLaporanMutu ? (
                              <>
                                <div
                                  className="mx-2 border-t border-slate-200/80 dark:border-white/15"
                                  role="separator"
                                />
                                <button
                                  type="button"
                                  role="menuitem"
                                  className={cn(
                                    "flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold",
                                    "text-slate-900 hover:bg-cyan-500/10 dark:text-white dark:hover:bg-cyan-500/15",
                                    "focus-visible:bg-cyan-500/10 focus-visible:outline-none dark:focus-visible:bg-cyan-500/15",
                                  )}
                                  onClick={() => {
                                    setLaporanMenuOpen(false);
                                    onOpenLaporanMutu?.();
                                  }}
                                >
                                  <ShieldCheck
                                    size={16}
                                    strokeWidth={2.25}
                                    className="shrink-0 text-cyan-600 dark:text-cyan-400"
                                  />
                                  <span className="min-w-0 flex-1 font-extrabold tracking-wide">
                                    Laporan MUTU
                                  </span>
                                </button>
                              </>
                            ) : null}
                            {hasLaporanPasien ? (
                              <>
                                <div
                                  className="mx-2 border-t border-slate-200/80 dark:border-white/15"
                                  role="separator"
                                />
                                <button
                                  type="button"
                                  role="menuitem"
                                  className={cn(
                                    "flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold",
                                    "text-slate-900 hover:bg-blue-500/10 dark:text-white dark:hover:bg-blue-500/15",
                                    "focus-visible:bg-blue-500/10 focus-visible:outline-none dark:focus-visible:bg-blue-500/15",
                                  )}
                                  onClick={() => {
                                    setLaporanMenuOpen(false);
                                    onOpenLaporanPasien?.();
                                  }}
                                >
                                  <Users
                                    size={16}
                                    strokeWidth={2.25}
                                    className="shrink-0 text-blue-600 dark:text-blue-400"
                                  />
                                  <span className="min-w-0 flex-1 font-extrabold tracking-wide">
                                    Laporan Pasien
                                  </span>
                                </button>
                              </>
                            ) : null}
                          </div>,
                          document.body,
                        )
                      : null}
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => setTarifOpen(true)}
                  className={cn(
                    "group inline-flex h-8 max-2xl:h-7 max-2xl:px-1.5 max-2xl:text-[9px] max-2xl:gap-1 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-indigo-800 bg-indigo-700 px-3 text-xs font-black shadow-lg shadow-indigo-600/30 transition hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                    "text-white",
                    "focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black/60",
                  )}
                  title="Lihat & Edit Tarif Tindakan (Autosave)"
                >
                  <Receipt
                    size={16}
                    strokeWidth={3}
                    className={cn(
                      "shrink-0 motion-safe:transition-transform group-hover:scale-110",
                      "text-white",
                    )}
                  />
                  <span className={cn("tracking-wide text-white uppercase")}>
                    Tarif
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setDiagnosaOpen(true)}
                  className={cn(
                    "group inline-flex h-8 max-2xl:h-7 max-2xl:px-1.5 max-2xl:text-[9px] max-2xl:gap-1 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-teal-800 bg-teal-700 px-3 text-xs font-black shadow-lg shadow-teal-600/30 transition hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500",
                    "text-white",
                    "focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black/60",
                  )}
                  title="Lihat & Edit Daftar Diagnosa ICD 10 (Autosave)"
                >
                  <ClipboardList
                    size={16}
                    strokeWidth={3}
                    className={cn(
                      "shrink-0 motion-safe:transition-transform group-hover:scale-110",
                      "text-white",
                    )}
                  />
                  <span className={cn("tracking-wide text-white uppercase")}>
                    Diagnosa
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSeverityLevelOpen(true)}
                  className={cn(
                    "group inline-flex h-8 max-2xl:h-7 max-2xl:px-1.5 max-2xl:text-[9px] max-2xl:gap-1 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-rose-800 bg-rose-700 px-3 text-xs font-black shadow-lg shadow-rose-600/30 transition hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500",
                    "text-white",
                    "focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black/60",
                  )}
                  title="Lihat & Edit Severity Level Tarif (Autosave)"
                >
                  <BarChart2
                    size={16}
                    strokeWidth={3}
                    className={cn(
                      "shrink-0 motion-safe:transition-transform group-hover:scale-110",
                      "text-white",
                    )}
                  />
                  <span className={cn("tracking-wide text-white uppercase")}>
                    Severity Level
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setIndenanOpen(true)}
                  className={cn(
                    "group inline-flex h-8 max-2xl:h-7 max-2xl:px-1.5 max-2xl:text-[9px] max-2xl:gap-1 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-blue-800 bg-blue-700 px-3 text-xs font-black shadow-lg shadow-blue-600/30 transition hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                    "text-white",
                    "focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black/60",
                  )}
                  title="Lihat Jadwal Indenan Pasien (Google Sheets)"
                >
                  <CalendarDays
                    size={16}
                    strokeWidth={3}
                    className={cn(
                      "shrink-0 motion-safe:transition-transform group-hover:scale-110",
                      "text-white",
                    )}
                  />
                  <span className={cn("tracking-wide text-white uppercase")}>
                    Indenan
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setJadwalCathOpen(true)}
                  className={cn(
                    "group inline-flex h-8 max-2xl:h-7 max-2xl:px-1.5 max-2xl:text-[9px] max-2xl:gap-1 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-violet-800 bg-violet-700 px-3 text-xs font-black shadow-lg shadow-violet-600/30 transition hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                    "text-white",
                    "focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black/60",
                  )}
                  title="Input jadwal tindakan Cath Lab"
                >
                  <Calendar
                    size={16}
                    strokeWidth={3}
                    className={cn(
                      "shrink-0 motion-safe:transition-transform group-hover:scale-110",
                      "text-white",
                    )}
                  />
                  <span className={cn("tracking-wide text-white uppercase")}>
                    Jadwal Cath
                  </span>
                </button>

                {onPhoneDirectoryOpen && (
                  <button
                    type="button"
                    onClick={onPhoneDirectoryOpen}
                    className={cn(
                      "group inline-flex h-8 max-2xl:h-7 max-2xl:px-1.5 max-2xl:text-[9px] max-2xl:gap-1 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-amber-800 bg-amber-700 px-3 text-xs font-black shadow-lg shadow-amber-600/30 transition hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
                      "text-white",
                      "focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black/60",
                    )}
                    title="Buka direktori nomor telepon rumah sakit"
                  >
                    <Phone
                      size={16}
                      strokeWidth={3}
                      className={cn(
                        "shrink-0 motion-safe:transition-transform group-hover:scale-110",
                        "text-white",
                      )}
                    />
                    <span className={cn("tracking-wide text-white uppercase")}>
                      Daftar Telp
                    </span>
                  </button>
                )}
              </div>

              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
              <div
                className={cn(
                  "relative flex flex-wrap items-end gap-1.5 sm:gap-2 min-w-0",
                  UI_LAYERS.toolbarFilterRow,
                )}
              >
                {/* Filter dokter — domain tab Dokter & tim (wireframe) */}
                <div className="relative min-w-0 w-full min-[420px]:w-auto min-[420px]:min-w-[9rem] group">
                  <select
                    value={dokter}
                    onChange={(e) => {
                      const v = e.target.value;
                      setDokter(v);
                      onFilter(v, ruangan, tindakan, tanggalFrom, tanggalTo, isPciOnly, status);
                    }}
                    className={cn(
                      "text-[13px] font-semibold pl-2 pr-7 py-1 rounded-md border focus:outline-none w-full appearance-none transition-all",
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
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none group-focus-within:pointer-events-auto">
                    {dokter ? (
                      <button
                        type="button"
                        onClick={() => {
                          setDokter("");
                          onFilter(
                            "",
                            ruangan,
                            tindakan,
                            tanggalFrom,
                            tanggalTo,
                            isPciOnly,
                            status,
                          );
                        }}
                        className={cn(
                          "p-0.5 rounded-md transition-colors pointer-events-auto",
                          "text-slate-400 hover:text-red-500 hover:bg-red-50",
                          "dark:text-slate-500 dark:hover:text-red-400 dark:hover:bg-red-950/30",
                        )}
                        title="Bersihkan filter dokter"
                      >
                        <X size={13} strokeWidth={2.5} />
                      </button>
                    ) : (
                      <ChevronDown
                        size={14}
                        className="text-cyan-700/60 dark:text-slate-400/60"
                      />
                    )}
                  </div>
                </div>

                {/* Filter ruangan — master lokasi */}
                <div className="relative min-w-0 w-full min-[420px]:w-auto min-[420px]:min-w-[9rem] group">
                  <select
                    value={ruangan}
                    onChange={(e) => {
                      const v = e.target.value;
                      setRuangan(v);
                      onFilter(dokter, v, tindakan, tanggalFrom, tanggalTo, isPciOnly, status);
                    }}
                    className={cn(
                      "text-[13px] font-semibold pl-2 pr-7 py-1 rounded-md border focus:outline-none w-full appearance-none transition-all",
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
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none group-focus-within:pointer-events-auto">
                    {ruangan ? (
                      <button
                        type="button"
                        onClick={() => {
                          setRuangan("");
                          onFilter(
                            dokter,
                            "",
                            tindakan,
                            tanggalFrom,
                            tanggalTo,
                            isPciOnly,
                            status,
                          );
                        }}
                        className={cn(
                          "p-0.5 rounded-md transition-colors pointer-events-auto",
                          "text-slate-400 hover:text-red-500 hover:bg-red-50",
                          "dark:text-slate-500 dark:hover:text-red-400 dark:hover:bg-red-950/30",
                        )}
                        title="Bersihkan filter ruangan"
                      >
                        <X size={13} strokeWidth={2.5} />
                      </button>
                    ) : (
                      <ChevronDown
                        size={14}
                        className="text-cyan-700/60 dark:text-slate-400/60"
                      />
                    )}
                  </div>
                </div>

                {/* Filter status tindakan */}
                <div className="relative min-w-0 w-full min-[420px]:w-auto min-[420px]:min-w-[9rem] group">
                  <select
                    value={status}
                    onChange={(e) => {
                      const v = e.target.value;
                      setStatus(v);
                      onFilter(
                        dokter,
                        ruangan,
                        tindakan,
                        tanggalFrom,
                        tanggalTo,
                        isPciOnly,
                        v,
                      );
                    }}
                    className={cn(
                      "text-[13px] font-semibold pl-2 pr-7 py-1 rounded-md border focus:outline-none w-full appearance-none transition-all",
                      "bg-white border-cyan-500/40 text-slate-900 [color-scheme:light]",
                      "dark:bg-black dark:border-white/20 dark:text-slate-100 dark:[color-scheme:dark]",
                    )}
                  >
                    <option value="">Semua status</option>
                    {TINDAKAN_STATUS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none group-focus-within:pointer-events-auto">
                    {status ? (
                      <button
                        type="button"
                        onClick={() => {
                          setStatus("");
                          onFilter(
                            dokter,
                            ruangan,
                            tindakan,
                            tanggalFrom,
                            tanggalTo,
                            isPciOnly,
                            "",
                          );
                        }}
                        className={cn(
                          "p-0.5 rounded-md transition-colors pointer-events-auto",
                          "text-slate-400 hover:text-red-500 hover:bg-red-50",
                          "dark:text-slate-500 dark:hover:text-red-400 dark:hover:bg-red-950/30",
                        )}
                        title="Bersihkan filter status"
                      >
                        <X size={13} strokeWidth={2.5} />
                      </button>
                    ) : (
                      <ChevronDown
                        size={14}
                        className="text-cyan-700/60 dark:text-slate-400/60"
                      />
                    )}
                  </div>
                </div>

                {/* Filter tindakan — master tindakan */}
                <div className="relative min-w-0 w-full min-[420px]:w-auto min-[420px]:min-w-[9rem] group">
                  <select
                    value={tindakan}
                    onChange={(e) => {
                      const v = e.target.value;
                      setTindakan(v);
                      onFilter(dokter, ruangan, v, tanggalFrom, tanggalTo, isPciOnly, status);
                    }}
                    className={cn(
                      "text-[13px] font-semibold pl-2 pr-7 py-1 rounded-md border focus:outline-none w-full appearance-none transition-all",
                      "bg-white border-cyan-500/40 text-slate-900 [color-scheme:light]",
                      "dark:bg-black dark:border-white/20 dark:text-slate-100 dark:[color-scheme:dark]",
                    )}
                  >
                    <option value="">Semua tindakan</option>
                    {tindakanOptions.map((t, idx) => (
                      <option key={idx} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none group-focus-within:pointer-events-auto">
                    {tindakan ? (
                      <button
                        type="button"
                        onClick={() => {
                          setTindakan("");
                          onFilter(
                            dokter,
                            ruangan,
                            "",
                            tanggalFrom,
                            tanggalTo,
                            isPciOnly,
                            status,
                          );
                        }}
                        className={cn(
                          "p-0.5 rounded-md transition-colors pointer-events-auto",
                          "text-slate-400 hover:text-red-500 hover:bg-red-50",
                          "dark:text-slate-500 dark:hover:text-red-400 dark:hover:bg-red-950/30",
                        )}
                        title="Bersihkan filter tindakan"
                      >
                        <X size={13} strokeWidth={2.5} />
                      </button>
                    ) : (
                      <ChevronDown
                        size={14}
                        className="text-cyan-700/60 dark:text-slate-400/60"
                      />
                    )}
                  </div>
                </div>

                {/* 📅 Filter tanggal (range) & Shortcuts */}
                <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                  {/* Shortcuts Filter Tanggal */}
                  <div className="flex items-center gap-1 mr-1">
                    <button
                      type="button"
                      onClick={() => setShortcutDate("today")}
                      className={cn(
                        "px-2 py-1 text-[10px] font-extrabold uppercase tracking-tight rounded-md border transition-all",
                        "border-cyan-500/40 bg-cyan-100/90 text-cyan-950 hover:bg-cyan-200/90",
                        "dark:border-cyan-500/30 dark:bg-cyan-950/40 dark:text-cyan-200 dark:hover:bg-cyan-900/40",
                      )}
                      title="Filter tindakan hari ini"
                    >
                      Hari Ini
                    </button>
                    <button
                      type="button"
                      onClick={() => setShortcutDate("yesterday")}
                      className={cn(
                        "px-2 py-1 text-[10px] font-extrabold uppercase tracking-tight rounded-md border transition-all",
                        "border-amber-500/40 bg-amber-100/90 text-amber-950 hover:bg-amber-200/90",
                        "dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-900/40",
                      )}
                      title="Filter tindakan kemarin"
                    >
                      Kemarin
                    </button>
                    <button
                      type="button"
                      onClick={() => setShortcutDate("untilToday")}
                      className={cn(
                        "px-2 py-1 text-[10px] font-extrabold uppercase tracking-tight rounded-md border transition-all",
                        "border-violet-500/40 bg-violet-100/90 text-violet-950 hover:bg-violet-200/90",
                        "dark:border-violet-500/30 dark:bg-violet-950/40 dark:text-violet-200 dark:hover:bg-violet-900/40",
                      )}
                      title="Tindakan hari ini dan semua tanggal sebelumnya (maks. 1000 baris)"
                    >
                      S/d Hari Ini
                    </button>
                    <button
                      type="button"
                      onClick={() => setShortcutDate("thisWeek")}
                      className={cn(
                        "px-2 py-1 text-[10px] font-extrabold uppercase tracking-tight rounded-md border transition-all",
                        "border-emerald-500/40 bg-emerald-100/90 text-emerald-950 hover:bg-emerald-200/90",
                        "dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-900/40",
                      )}
                      title="Filter tindakan minggu ini (dari Senin)"
                    >
                      Minggu Ini
                    </button>
                  </div>

                  <div className="relative group">
                    <input
                      type="date"
                      value={tanggalFrom}
                      min="1900-01-01"
                      onClick={(e) => openNativeDatePicker(e.currentTarget)}
                      onChange={(e) => {
                        const v = e.target.value;
                        setTanggalFrom(v);
                        onFilter(dokter, ruangan, tindakan, v, tanggalTo, isPciOnly, status);
                      }}
                      className={cn(
                        "cursor-pointer text-[13px] font-semibold pl-2 pr-8 py-1 rounded-md border focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all",
                        "[color-scheme:light] bg-white border-cyan-500/40 text-slate-900",
                        "dark:[color-scheme:dark] dark:bg-black dark:border-white/20 dark:text-slate-100",
                      )}
                      title="Tanggal dari"
                      aria-label="Tanggal dari"
                    />
                    {tanggalFrom && (
                      <button
                        type="button"
                        onClick={() => {
                          setTanggalFrom("");
                          onFilter(dokter, ruangan, tindakan, "", tanggalTo, isPciOnly, status);
                        }}
                        className={cn(
                          "absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md transition-colors",
                          "text-slate-400 hover:text-red-500 hover:bg-red-50",
                          "dark:text-slate-500 dark:hover:text-red-400 dark:hover:bg-red-950/30",
                        )}
                        title="Bersihkan tanggal dari"
                      >
                        <X size={13} strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-xs font-mono",
                      "text-cyan-700/80 dark:text-cyan-600/80",
                    )}
                  >
                    —
                  </span>
                  <div className="relative group">
                    <input
                      type="date"
                      value={tanggalTo}
                      min="1900-01-01"
                      onClick={(e) => openNativeDatePicker(e.currentTarget)}
                      onChange={(e) => {
                        const v = e.target.value;
                        setTanggalTo(v);
                        onFilter(dokter, ruangan, tindakan, tanggalFrom, v, isPciOnly, status);
                      }}
                      className={cn(
                        "cursor-pointer text-[13px] font-semibold pl-2 pr-8 py-1 rounded-md border focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all",
                        "[color-scheme:light] bg-white border-cyan-500/40 text-slate-900",
                        "dark:[color-scheme:dark] dark:bg-black dark:border-white/20 dark:text-slate-100",
                      )}
                      title="Tanggal sampai"
                      aria-label="Tanggal sampai"
                    />
                    {tanggalTo && (
                      <button
                        type="button"
                        onClick={() => {
                          setTanggalTo("");
                          onFilter(
                            dokter,
                            ruangan,
                            tindakan,
                            tanggalFrom,
                            "",
                            isPciOnly,
                            status,
                          );
                        }}
                        className={cn(
                          "absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md transition-colors",
                          "text-slate-400 hover:text-red-500 hover:bg-red-50",
                          "dark:text-slate-500 dark:hover:text-red-400 dark:hover:bg-red-950/30",
                        )}
                        title="Bersihkan tanggal sampai"
                      >
                        <X size={13} strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 pl-1.5 border-l border-slate-300/40 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !isPciOnly;
                      setIsPciOnly(next);
                      onFilter(dokter, ruangan, tindakan, tanggalFrom, tanggalTo, next, status);
                    }}
                    className={cn(
                      "px-2 py-1 text-[10px] font-extrabold uppercase tracking-tight rounded-md border transition-all",
                      isPciOnly
                        ? "border-cyan-600 bg-cyan-600 text-white shadow-[0_0_10px_rgba(8,145,178,0.3)] dark:border-cyan-400 dark:bg-cyan-500"
                        : "border-cyan-500/40 bg-cyan-50/50 text-cyan-800 hover:bg-cyan-100 dark:border-cyan-500/30 dark:bg-cyan-950/20 dark:text-cyan-400 dark:hover:bg-cyan-900/30",
                    )}
                    title="Filter gabungan tindakan PCI (PPCI, PTCA, dsb.)"
                  >
                    PCI
                  </button>
                </div>

                {/* Refresh tabel tanpa reload halaman */}
                {typeof onRefresh === "function" ? (
                  <button
                    type="button"
                    onClick={() => {
                      void handleRefreshTable();
                    }}
                    disabled={isRefreshBusy}
                    aria-busy={isRefreshBusy}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all",
                      "border border-cyan-600/50 bg-cyan-600 text-white shadow-sm",
                      "hover:bg-cyan-500 hover:brightness-105 active:scale-[0.98]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500",
                      "disabled:cursor-wait disabled:opacity-70",
                      "dark:border-cyan-400/40 dark:bg-cyan-700 dark:hover:bg-cyan-600",
                    )}
                    title="Segarkan data tabel (tanpa reload halaman)"
                  >
                    <RefreshCw
                      size={13}
                      strokeWidth={2.75}
                      className={cn(
                        "shrink-0",
                        isRefreshBusy && "animate-spin",
                      )}
                      aria-hidden
                    />
                    <span>{isManualRefreshing ? "Refresh…" : "Refresh"}</span>
                  </button>
                ) : null}

                {/* 🔄 Reset All Filters */}
                {(searchValue ||
                  dokter ||
                  ruangan ||
                  tindakan ||
                  status ||
                  tanggalFrom ||
                  tanggalTo ||
                  isPciOnly) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchValue("");
                      onSearch("");
                      setDokter("");
                      setRuangan("");
                      setTindakan("");
                      setStatus("");
                      setTanggalFrom("");
                      setTanggalTo("");
                      setIsPciOnly(false);
                      onFilter("", "", "", "", "", false, "");
                    }}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all",
                      "text-red-600 bg-red-50 hover:bg-red-100 border border-red-200",
                      "dark:text-red-400 dark:bg-red-950/20 dark:hover:bg-red-950/40 dark:border-red-900/50",
                    )}
                    title="Bersihkan semua filter"
                  >
                    <X size={12} strokeWidth={3} />
                    <span>Reset</span>
                  </button>
                )}
              </div>
                  </motion.div>
                )}
              </AnimatePresence>
      </div>

      {addPasienOpen ? (
        <TambahPasienQuickModal
          open={addPasienOpen}
          onClose={() => setAddPasienOpen(false)}
          onSaved={handleSavedPasien}
          entryPoint="toolbar"
          onRevealTindakanInTable={onRevealTindakanInTable}
        />
      ) : null}

      {tarifOpen ? (
        <TarifModal open={tarifOpen} onClose={() => setTarifOpen(false)} />
      ) : null}

      {diagnosaOpen ? (
        <DiagnosaModal
          open={diagnosaOpen}
          onClose={() => setDiagnosaOpen(false)}
        />
      ) : null}

      {severityLevelOpen ? (
        <SeverityLevelModal
          open={severityLevelOpen}
          onClose={() => setSeverityLevelOpen(false)}
        />
      ) : null}

      {indenanOpen ? (
        <IndenanModal open={indenanOpen} onClose={() => setIndenanOpen(false)} />
      ) : null}

      {jadwalCathOpen ? (
        <JadwalCathModal
          open={jadwalCathOpen}
          onClose={() => setJadwalCathOpen(false)}
          rowsSource={jadwalRowsSource}
          onCreateRecord={onJadwalCreateRecord}
          onPatchRow={onJadwalPatchRow}
          onDeleteRow={onJadwalDeleteRow}
          onSyncMainTable={onJadwalSyncMainTable}
          onRevealInMainTable={(row) => {
            void onJadwalRevealInMainTable?.(row);
            setJadwalCathOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

export default memo(TableToolbar);
