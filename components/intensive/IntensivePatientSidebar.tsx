"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Search,
  Users,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export type IntensiveTindakanListRow = {
  id?: unknown;
  nama_pasien?: unknown;
  nama?: unknown;
  no_rm?: unknown;
  tanggal?: unknown;
  tindakan?: unknown;
  ruangan?: unknown;
};

export function buildIntensivePatientHeadline(
  r: IntensiveTindakanListRow,
): string {
  const nama =
    String(r.nama_pasien ?? r.nama ?? "")
      .trim()
      .toUpperCase() || "—";
  const rm = String(r.no_rm ?? "").trim();
  return rm ? `${nama} (${rm})` : nama;
}

const PAGE_SIZE = 10;
const FETCH_LIMIT = 500;

function formatTanggalRow(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (!s) return "—";
  try {
    const d = parseISO(s.includes("T") ? s : `${s}T00:00:00`);
    if (Number.isNaN(d.getTime())) return s.slice(0, 10);
    return format(d, "d MMM yy", { locale: idLocale });
  } catch {
    return s.slice(0, 10);
  }
}

export default function IntensivePatientSidebar({
  selectedTindakanId,
  onSelectPatient,
  className,
}: {
  selectedTindakanId: string | null | undefined;
  onSelectPatient: (tindakanId: string, patientHeadline: string) => void;
  className?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 320);
  const [rows, setRows] = useState<IntensiveTindakanListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const queryKey = useMemo(() => {
    const p = new URLSearchParams();
    p.set("limit", String(FETCH_LIMIT));
    if (debouncedSearch) p.set("search", debouncedSearch);
    return p.toString();
  }, [debouncedSearch]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/tindakan?${queryKey}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (!json?.ok) {
          setError(
            String(
              json?.error ??
                json?.message ??
                "Tidak dapat memuat daftar (akses atau server).",
            ),
          );
          setRows([]);
          return;
        }
        setRows(Array.isArray(json.data) ? json.data : []);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Jaringan bermasalah.");
        setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [queryKey]);

  const sel = String(selectedTindakanId ?? "").trim();

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedRows = rows.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  /** Lompat ke halaman yang berisi pasien terpilih (hanya saat data baru / pencarian / id berubah). */
  useEffect(() => {
    if (loading || rows.length === 0 || !sel) return;
    const idx = rows.findIndex((r) => String(r.id ?? "").trim() === sel);
    if (idx < 0) return;
    setPage(Math.floor(idx / PAGE_SIZE) + 1);
  }, [loading, debouncedSearch, sel]);

  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1));
  const goFirst = () => setPage(1);
  const goLast = () => setPage(totalPages);

  if (collapsed) {
    return (
      <div
        className={cn(
          "flex w-11 shrink-0 flex-col items-center gap-1 border-r border-zinc-800 bg-zinc-950 py-2",
          className,
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-zinc-400 hover:text-white"
          title="Daftar pasien"
          onClick={() => setCollapsed(false)}
        >
          <Users className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-500 hover:text-zinc-300"
          title="Buka sidebar"
          onClick={() => setCollapsed(false)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 w-[min(260px,92vw)] shrink-0 flex-col border-r border-zinc-800 bg-zinc-950",
        className,
      )}
    >
      <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-zinc-800 px-2">
        <div className="flex min-w-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-zinc-400">
          <Users className="h-3.5 w-3.5 shrink-0 text-blue-400" />
          <span className="truncate">Pasien</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-zinc-500 hover:text-white"
          title="Sembunyikan sidebar"
          onClick={() => setCollapsed(true)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
      <div className="relative shrink-0 border-b border-zinc-800 p-2">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama / RM…"
          className="w-full rounded-md border border-zinc-800 bg-zinc-900 py-1.5 pl-8 pr-2 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-blue-600/50"
          autoComplete="off"
        />
      </div>
      <div className="min-h-0 max-h-[min(420px,45vh)] flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 md:max-h-none">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-xs text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            Memuat…
          </div>
        ) : error ? (
          <p className="px-3 py-4 text-center text-[11px] leading-relaxed text-amber-400/90">
            {error}
          </p>
        ) : rows.length === 0 ? (
          <p className="px-3 py-6 text-center text-[11px] text-zinc-500">
            Tidak ada data tindakan.
          </p>
        ) : (
          <ul className="py-1">
            {pagedRows.map((r) => {
              const id = String(r.id ?? "").trim();
              if (!id) return null;
              const headline = buildIntensivePatientHeadline(r);
              const isActive = id === sel;
              const tind = String(r.tindakan ?? "").trim();
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => onSelectPatient(id, headline)}
                    className={cn(
                      "flex w-full flex-col items-start gap-0.5 border-b border-zinc-800/80 px-3 py-2 text-left transition-colors",
                      isActive
                        ? "border-l-2 border-l-blue-500 bg-blue-600/20 pl-[10px]"
                        : "border-l-2 border-l-transparent hover:bg-zinc-900/90",
                    )}
                  >
                    <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-zinc-100">
                      {headline}
                    </span>
                    <span className="line-clamp-2 text-[9px] text-zinc-500">
                      {formatTanggalRow(r.tanggal)}
                      {tind
                        ? ` · ${tind.length > 32 ? `${tind.slice(0, 32)}…` : tind}`
                        : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {!loading && !error && rows.length > 0 ? (
        <div className="flex shrink-0 flex-col gap-1 border-t border-zinc-800 bg-zinc-950/95 px-1.5 py-1.5">
          <div className="flex items-center justify-between gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-zinc-400 hover:text-white disabled:opacity-30"
              disabled={safePage <= 1}
              onClick={goFirst}
              title="Halaman pertama"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-zinc-400 hover:text-white disabled:opacity-30"
              disabled={safePage <= 1}
              onClick={goPrev}
              title="Sebelumnya"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="min-w-[4.5rem] text-center text-[10px] font-mono tabular-nums text-zinc-400">
              {safePage} / {totalPages}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-zinc-400 hover:text-white disabled:opacity-30"
              disabled={safePage >= totalPages}
              onClick={goNext}
              title="Berikutnya"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-zinc-400 hover:text-white disabled:opacity-30"
              disabled={safePage >= totalPages}
              onClick={goLast}
              title="Halaman terakhir"
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="text-center text-[9px] text-zinc-600">
            {(safePage - 1) * PAGE_SIZE + 1}–
            {Math.min(safePage * PAGE_SIZE, rows.length)} dari {rows.length}
          </p>
        </div>
      ) : null}
    </aside>
  );
}
