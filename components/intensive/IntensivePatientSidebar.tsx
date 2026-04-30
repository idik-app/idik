"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  DoorOpen,
  Loader2,
  Search,
  Users,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  normalizeJenisKelamin,
  resolveJenisKelaminFromRow,
  type JenisKelaminLp,
} from "@/app/dashboard/layanan/tindakan/lib/displayTindakanRow";

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
  diagnosa?: unknown;
  dokter?: unknown;
  jenis_kelamin?: unknown;
  jk?: unknown;
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

type IccuRegisterListRow = {
  id?: unknown;
  pasien_id?: unknown;
  nama?: unknown;
  no_rm?: unknown;
  bed?: unknown;
  diagnosa?: unknown;
  dokter_dpjp_nama?: unknown;
  periode_masuk?: unknown;
  created_at?: unknown;
  latest_tindakan_id?: unknown;
  jenis_kelamin?: unknown;
};

function buildIccuRegisterSidebarHeadline(r: IccuRegisterListRow): string {
  const nama =
    String(r.nama ?? "")
      .trim()
      .toUpperCase() || "—";
  const rm = String(r.no_rm ?? "").trim();
  const bed = String(r.bed ?? "").trim();
  const base = rm ? `${nama} (${rm})` : nama;
  return bed ? `${base} · ${bed}` : base;
}

type PatientListItem = {
  listKey: string;
  tindakanId: string | null;
  headline: string;
  subline: string;
  allowOpen: boolean;
  sidebarDiagnosa: string | null;
  sidebarDokter: string | null;
  sidebarJenisKelamin: JenisKelaminLp | null;
};

function tindakanRowsToListItems(
  tindakanRows: IntensiveTindakanListRow[],
): PatientListItem[] {
  const out: PatientListItem[] = [];
  for (const r of tindakanRows) {
    const id = String(r.id ?? "").trim();
    if (!id) continue;
    const tind = String(r.tindakan ?? "").trim();
    const dx = String(r.diagnosa ?? "").trim();
    const dok = String(r.dokter ?? "").trim();
    out.push({
      listKey: `t:${id}`,
      tindakanId: id,
      headline: buildIntensivePatientHeadline(r),
      subline: `${formatTanggalRow(r.tanggal)}${
        tind ? ` · ${tind.length > 32 ? `${tind.slice(0, 32)}…` : tind}` : ""
      }`,
      allowOpen: true,
      sidebarDiagnosa: dx || null,
      sidebarDokter: dok || null,
      sidebarJenisKelamin: resolveJenisKelaminFromRow(
        r as unknown as Record<string, unknown>,
        null,
      ),
    });
  }
  return out;
}

function iccuRowsToListItems(
  registerRows: IccuRegisterListRow[],
): PatientListItem[] {
  return registerRows.map((r) => {
    const regId = String(r.id ?? "").trim() || "—";
    const tid = String(r.latest_tindakan_id ?? "").trim();
    const dx = String(r.diagnosa ?? "").trim();
    const dpjp = String(r.dokter_dpjp_nama ?? "").trim();
    const dateSource = r.periode_masuk ?? r.created_at;
    const parts: string[] = [formatTanggalRow(dateSource)];
    if (dx) {
      parts.push(dx.length > 20 ? `${dx.slice(0, 20)}…` : dx);
    }
    if (dpjp) {
      parts.push(`DPJP: ${dpjp.length > 14 ? `${dpjp.slice(0, 14)}…` : dpjp}`);
    }
    const sub = parts.filter((p) => p && p !== "—").join(" · ");
    return {
      listKey: `i:${regId}`,
      tindakanId: tid || null,
      headline: buildIccuRegisterSidebarHeadline(r),
      subline: sub || "—",
      allowOpen: Boolean(tid),
      sidebarDiagnosa: dx || null,
      sidebarDokter: dpjp || null,
      sidebarJenisKelamin: normalizeJenisKelamin(r.jenis_kelamin),
    };
  });
}

const PAGE_SIZE = 10;
const FETCH_LIMIT = 500;

type AccessibleRuangan = { id: string; slug: string; nama: string | null };

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
  iccuActiveListRefreshNonce,
  /** Untuk rute tanpa `[room]` (mis. `/intensive/dashboard`) — samakan dengan unit Jarvis/register. */
  fallbackUnitSlug,
  /** Dipanggil setiap `patientItems` berubah — untuk header default (baris pertama). */
  onPatientListSnapshot,
}: {
  selectedTindakanId: string | null | undefined;
  onSelectPatient: (tindakanId: string, patientHeadline: string) => void;
  className?: string;
  /**
   * Naikkan nilai ini setelah daftar pasien aktif ICCU berubah (arsip, hapus, tambah, restore).
   * Memicu fetch ulang **tanpa** memutar spinner loading penuh.
   */
  iccuActiveListRefreshNonce?: number;
  fallbackUnitSlug?: string;
  onPatientListSnapshot?: (
    items: {
      headline: string;
      tindakanId: string | null;
      diagnosa: string | null;
      dokter: string | null;
      jenis_kelamin: JenisKelaminLp | null;
    }[],
  ) => void;
}) {
  const params = useParams();
  const router = useRouter();
  const fromPath = String(params?.room ?? "")
    .trim()
    .toLowerCase();
  const roomSlug =
    fromPath ||
    String(fallbackUnitSlug ?? "")
      .trim()
      .toLowerCase();
  const [collapsed, setCollapsed] = useState(false);
  const [rooms, setRooms] = useState<AccessibleRuangan[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 320);
  const [patientItems, setPatientItems] = useState<PatientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const listFromRegister = Boolean(roomSlug);

  const tindakanQueryKey = useMemo(() => {
    const p = new URLSearchParams();
    p.set("limit", String(FETCH_LIMIT));
    if (debouncedSearch) p.set("search", debouncedSearch);
    if (roomSlug) p.set("unit", roomSlug);
    return p.toString();
  }, [debouncedSearch, roomSlug]);

  const iccuRegisterQueryKey = useMemo(() => {
    const p = new URLSearchParams();
    p.set("roomSlug", roomSlug);
    p.set("page", "1");
    p.set("pageSize", String(FETCH_LIMIT));
    p.set("listStatus", "active");
    if (debouncedSearch) p.set("q", debouncedSearch);
    return p.toString();
  }, [debouncedSearch, roomSlug]);

  useEffect(() => {
    let cancelled = false;
    setRoomsLoading(true);
    setRoomsError(null);
    fetch("/api/me/accessible-ruangan", { credentials: "include" })
      .then((res) => res.json())
      .then((json: { ok?: boolean; data?: unknown; error?: string }) => {
        if (cancelled) return;
        if (!json?.ok) {
          setRoomsError(
            String(json?.error ?? "Tidak dapat memuat daftar unit."),
          );
          setRooms([]);
          return;
        }
        const raw = Array.isArray(json.data) ? json.data : [];
        const next: AccessibleRuangan[] = [];
        for (const x of raw) {
          if (!x || typeof x !== "object") continue;
          const o = x as Record<string, unknown>;
          const id = o.id != null ? String(o.id) : "";
          const slug = o.slug != null ? String(o.slug).trim() : "";
          if (!id || !slug) continue;
          next.push({
            id,
            slug,
            nama: o.nama != null ? String(o.nama) : null,
          });
        }
        setRooms(next);
      })
      .catch(() => {
        if (cancelled) return;
        setRoomsError("Gagal memuat unit.");
        setRooms([]);
      })
      .finally(() => {
        if (!cancelled) setRoomsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roomSlug]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const run = listFromRegister
      ? fetch(`/api/iccu-register?${iccuRegisterQueryKey}`)
      : fetch(`/api/tindakan?${tindakanQueryKey}`);

    run
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
          setPatientItems([]);
          return;
        }
        const raw = Array.isArray(json.data) ? json.data : [];
        if (listFromRegister) {
          setPatientItems(iccuRowsToListItems(raw as IccuRegisterListRow[]));
        } else {
          setPatientItems(
            tindakanRowsToListItems(raw as IntensiveTindakanListRow[]),
          );
        }
      })
      .catch(() => {
        if (cancelled) return;
        setError("Jaringan bermasalah.");
        setPatientItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [iccuRegisterQueryKey, listFromRegister, tindakanQueryKey]);

  const iccuRefreshNonceRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!listFromRegister) return;
    if (iccuActiveListRefreshNonce === undefined) return;
    if (iccuRefreshNonceRef.current === undefined) {
      iccuRefreshNonceRef.current = iccuActiveListRefreshNonce;
      return;
    }
    if (iccuRefreshNonceRef.current === iccuActiveListRefreshNonce) return;
    iccuRefreshNonceRef.current = iccuActiveListRefreshNonce;

    let cancelled = false;
    fetch(`/api/iccu-register?${iccuRegisterQueryKey}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (!json?.ok) return;
        const raw = Array.isArray(json.data) ? json.data : [];
        setPatientItems(iccuRowsToListItems(raw as IccuRegisterListRow[]));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [iccuActiveListRefreshNonce, iccuRegisterQueryKey, listFromRegister]);

  useEffect(() => {
    if (!onPatientListSnapshot) return;
    onPatientListSnapshot(
      patientItems.map((it) => ({
        headline: it.headline,
        tindakanId: it.tindakanId,
        diagnosa: it.sidebarDiagnosa,
        dokter: it.sidebarDokter,
        jenis_kelamin: it.sidebarJenisKelamin,
      })),
    );
  }, [patientItems, onPatientListSnapshot]);

  const sel = String(selectedTindakanId ?? "").trim();

  const totalPages = Math.max(1, Math.ceil(patientItems.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedRows = patientItems.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  /** Lompat ke halaman yang berisi pasien terpilih (hanya saat data baru / pencarian / id berubah). */
  useEffect(() => {
    if (loading || patientItems.length === 0 || !sel) return;
    const idx = patientItems.findIndex(
      (it) => it.tindakanId && it.tindakanId === sel,
    );
    if (idx < 0) return;
    setPage(Math.floor(idx / PAGE_SIZE) + 1);
  }, [loading, debouncedSearch, patientItems, sel]);

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
          title="Unit & pasien"
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
          <DoorOpen className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
          <span className="truncate">Ruangan</span>
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
      <div className="shrink-0 border-b border-zinc-800 max-h-[min(200px,32vh)] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
        {roomsLoading ? (
          <div className="flex items-center gap-2 px-3 py-3 text-[11px] text-zinc-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Memuat unit…
          </div>
        ) : roomsError ? (
          <p className="px-3 py-2 text-center text-[10px] leading-relaxed text-amber-400/90">
            {roomsError}
          </p>
        ) : rooms.length === 0 ? (
          <p className="px-3 py-2 text-center text-[10px] text-zinc-500">
            Belum ada akses unit. Hubungi admin.
          </p>
        ) : (
          <ul className="py-0.5">
            {rooms.map((r) => {
              const slug = r.slug.trim().toLowerCase();
              const isHere = roomSlug && slug === roomSlug;
              const label = (r.nama && r.nama.trim()) || slug;
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (isHere) return;
                      router.push(`/${encodeURIComponent(slug)}/dashboard`);
                    }}
                    className={cn(
                      "flex w-full flex-col items-start gap-0.5 border-b border-zinc-800/80 px-3 py-2 text-left transition-colors",
                      isHere
                        ? "border-l-2 border-l-emerald-500 bg-emerald-600/15 pl-[10px]"
                        : "border-l-2 border-l-transparent hover:bg-zinc-900/90",
                    )}
                  >
                    <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-zinc-100">
                      {label}
                    </span>
                    <span className="text-[9px] text-zinc-500 font-mono">
                      /{slug}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="flex h-9 shrink-0 items-center gap-1.5 border-b border-zinc-800 px-2.5 text-[9px] font-bold uppercase tracking-wide text-zinc-500">
        <Users className="h-3 w-3 text-blue-400" />
        Pasien (unit ini)
      </div>
      <div className="relative shrink-0 border-b border-zinc-800 p-2">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={
            listFromRegister ? "Cari nama / RM / dx…" : "Cari nama / RM…"
          }
          className="w-full rounded-md border border-zinc-800 bg-zinc-900 py-1.5 pl-8 pr-2 text-xs text-zinc-100 dark:placeholder:text-white/90 placeholder:text-zinc-600 outline-none focus:border-blue-600/50"
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
        ) : patientItems.length === 0 ? (
          <p className="px-3 py-6 text-center text-[11px] text-zinc-500">
            {listFromRegister
              ? "Belum ada pasien terdaftar di unit ini."
              : "Tidak ada data tindakan."}
          </p>
        ) : (
          <ul className="py-1">
            {pagedRows.map((it) => {
              const isActive = Boolean(
                it.tindakanId && sel && it.tindakanId === sel,
              );
              return (
                <li key={it.listKey}>
                  <button
                    type="button"
                    title={
                      it.allowOpen
                        ? undefined
                        : "Belum ada entri tindakan untuk pasien ini di unit ini"
                    }
                    onClick={() => {
                      if (!it.tindakanId) {
                        toast.info(
                          "Pasien ini belum punya entri tindakan di unit ini. Buat tindakan di layanan atau daftarkan lewat alur yang ada.",
                        );
                        return;
                      }
                      onSelectPatient(it.tindakanId, it.headline);
                    }}
                    className={cn(
                      "flex w-full flex-col items-start gap-0.5 border-b border-zinc-800/80 px-3 py-2 text-left transition-colors",
                      !it.allowOpen && "cursor-default opacity-60",
                      isActive
                        ? "border-l-2 border-l-blue-500 bg-blue-600/20 pl-[10px]"
                        : "border-l-2 border-l-transparent hover:bg-zinc-900/90",
                    )}
                  >
                    <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-zinc-100">
                      {it.headline}
                    </span>
                    <span className="line-clamp-2 text-[9px] text-zinc-500">
                      {it.subline}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {!loading && !error && patientItems.length > 0 ? (
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
            {Math.min(safePage * PAGE_SIZE, patientItems.length)} dari{" "}
            {patientItems.length}
          </p>
        </div>
      ) : null}
    </aside>
  );
}
