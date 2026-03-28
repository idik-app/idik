"use client";
import { useState, useEffect, useRef } from "react";
import { Search, Activity, Plus } from "lucide-react";
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

  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    <div className="flex shrink-0 flex-col gap-1.5 px-2 py-1.5 sm:px-3 sm:py-2 md:px-3 bg-black/40 border-b border-cyan-800/40 backdrop-blur-sm min-w-0">
      <div className="flex min-w-0 flex-col gap-1.5 min-[520px]:flex-row min-[520px]:items-center min-[520px]:justify-between min-[520px]:gap-2">
        <h3 className="text-cyan-300 font-semibold tracking-wide inline-flex items-center gap-1.5 flex-wrap text-[11px] sm:text-xs">
          <Activity size={14} className="text-cyan-400 shrink-0" />
          <span>Daftar kasus tindakan</span>
          <span className="sr-only" aria-live="polite">
            {isSyncing ? "Memperbarui data di latar." : ""}
          </span>
          {isSyncing ? (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-cyan-800/35 bg-black/30 px-1.5 py-0.5"
              title="Memperbarui data di latar"
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400/90 shadow-[0_0_6px_rgba(52,211,153,0.5)] motion-safe:animate-pulse"
                aria-hidden
              />
              <span className="hidden sm:inline text-[10px] font-normal font-mono text-cyan-500/80 tracking-tight">
                Sinkron
              </span>
            </span>
          ) : null}
        </h3>
        <button
          type="button"
          onClick={() => setAddPasienOpen(true)}
          className="group inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[hsl(var(--cyan)/0.85)] bg-[hsl(var(--cyan))] px-3 text-xs font-semibold text-black shadow-[0_0_18px_hsl(var(--cyan)/0.4)] transition hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--cyan))] focus-visible:ring-offset-2 focus-visible:ring-offset-black/60 w-full min-[520px]:w-auto"
          title="Tambah pasien (tanpa pindah halaman)"
        >
          <Plus
            size={16}
            strokeWidth={2.5}
            className="shrink-0 text-black motion-safe:transition-transform group-hover:scale-110"
          />
          <span className="tracking-wide text-black">Tambah Pasien</span>
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-1.5 sm:gap-2 min-w-0">
        <div className="relative min-w-0 w-full min-[480px]:w-auto min-[480px]:flex-1 min-[480px]:min-w-[12rem] min-[480px]:max-w-2xl">
          <Search
            size={13}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-cyan-400 opacity-70 pointer-events-none"
          />
          <input
            type="text"
            value={searchValue}
            placeholder="Cari (RM, nama, JK, dokter, tindakan, ruangan…)"
            onChange={(e) => handleUserTyping(e.target.value)}
            className="w-full pl-7 pr-2.5 py-1 text-[13px] leading-snug rounded-md bg-black/40 border border-cyan-800/40 text-cyan-100 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
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
          className="text-[13px] px-2 py-1 rounded-md bg-black/40 border border-cyan-800/40 text-cyan-100 focus:outline-none min-w-0 w-full min-[420px]:w-auto min-[420px]:min-w-[9rem]"
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
          className="text-[13px] px-2 py-1 rounded-md bg-black/40 border border-cyan-800/40 text-cyan-100 focus:outline-none min-w-0 w-full min-[420px]:w-auto min-[420px]:min-w-[9rem]"
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
            className="cursor-pointer [color-scheme:dark] text-[13px] px-2 py-1 rounded-md bg-black/40 border border-cyan-800/40 text-cyan-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            title="Tanggal dari"
            aria-label="Tanggal dari"
          />
          <span className="text-cyan-600/80 text-xs font-mono">—</span>
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
            className="cursor-pointer [color-scheme:dark] text-[13px] px-2 py-1 rounded-md bg-black/40 border border-cyan-800/40 text-cyan-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
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
