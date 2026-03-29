"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Copy, X } from "lucide-react";

import type { Pasien } from "@/app/dashboard/pasien/types/pasien";
import { formatKelasPerawatanDisplay } from "@/app/dashboard/pasien/utils/formatKelasPerawatan";
import { hitungUsia } from "@/app/dashboard/pasien/utils/formatUsia";

import type { TindakanJoinResult } from "../bridge/mapping.types";
import {
  WIREFRAME_DRAWER_TABS,
  FIELD_LABELS,
  formatFieldValue,
  getWireframeFieldValue,
  type WireframeTabId,
} from "../bridge/wireframeDrawerTabs";
import CathlabSlotField from "./CathlabSlotField";
import KategoriTindakanField from "./KategoriTindakanField";
import MasterPerawatTimField, {
  type TimPerawatFieldKey,
} from "./MasterPerawatTimField";
import TambahKeMasterPerawatForm from "./TambahKeMasterPerawatForm";
import RadiologiAutosaveField, {
  type RadiologiFieldKey,
} from "./RadiologiAutosaveField";
import KlinisAutosaveField, {
  type KlinisFieldKey,
} from "./KlinisAutosaveField";
import BiayaAutosaveField, {
  type BiayaAutosaveFieldKey,
} from "./BiayaAutosaveField";
import FastTrackBlock from "./FastTrackBlock";
import { buildResumeWhatsAppText } from "../lib/buildResumeWhatsAppText";
import { cn } from "@/lib/utils";
import { useTindakanLightMode } from "../hooks/useTindakanLightMode";

type Props = {
  open: boolean;
  record: TindakanJoinResult | null;
  /** Snapshot daftar tindakan (untuk tab Resume: riwayat pasien yang sama). */
  allTindakanRows?: TindakanJoinResult[];
  onClose: () => void;
  /** Setelah kolom kasus di-patch dari drawer (mis. kategori), muat ulang daftar. */
  onRecordPatch?: () => void;
};

function isSamePatientTindakan(
  ref: TindakanJoinResult,
  other: TindakanJoinResult,
): boolean {
  const rm = String(ref.no_rm ?? "").trim();
  const orm = String(other.no_rm ?? "").trim();
  if (rm && orm && rm === orm) return true;
  const pid = String(ref.pasien_id ?? "").trim();
  const opid = String(other.pasien_id ?? "").trim();
  if (pid && opid && pid === opid) return true;
  return false;
}

function sortTindakanByTanggalDesc(
  rows: TindakanJoinResult[],
): TindakanJoinResult[] {
  return [...rows].sort((a, b) => {
    const ta = String(a.tanggal ?? "").trim();
    const tb = String(b.tanggal ?? "").trim();
    if (ta !== tb) return tb.localeCompare(ta);
    return String(b.id ?? "").localeCompare(String(a.id ?? ""));
  });
}

/** Padding horizontal header modal (px-3 + scrollbar fudge) untuk hitung minWidth tab */
const HEADER_TAB_ROW_PAD_X = 28;

const RADIOLOGI_AUTOSAVE_FIELDS: RadiologiFieldKey[] = [
  "fluoro_time",
  "dose",
  "kv",
  "ma",
  "waktu",
];

const KLINIS_AUTOSAVE_FIELDS: KlinisFieldKey[] = [
  "diagnosa",
  "severity_level",
  "hasil_lab_ppm",
];

const BIAYA_AUTOSAVE_KEYS = new Set([
  "total",
  "krs",
  "consumable",
  "pemakaian",
]);

/**
 * Kolom biaya selain Perolehan BPJS (`total`): autosave hanya saat kosong;
 * setelah terisi → read-only terformat. Perolehan BPJS selalu input (casemix / perawat).
 */
function isBiayaWireframeEmpty(key: string, val: unknown): boolean {
  if (val === null || val === undefined || val === "") return true;
  if (key === "total" || key === "krs" || key === "consumable") {
    const n = Number(val);
    return !Number.isFinite(n);
  }
  return String(val).trim() === "";
}

function isBlank(v: unknown): boolean {
  return v === null || v === undefined || v === "";
}

function isTarifPresent(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string" && v.trim() === "") return false;
  return Number.isFinite(Number(v));
}

/** Jenis pembiayaan + kelas perawatan (angka), contoh: `NPBI - 1` */
function buildKelasPembiayaanFromPasienMaster(pasien: Pasien): string | null {
  const jp = pasien.jenisPembiayaan?.trim() || "";
  const kelasShort = formatKelasPerawatanDisplay(pasien.kelasPerawatan);
  const hasKelas = kelasShort !== "—" && kelasShort !== "";
  if (jp && hasKelas) return `${jp} - ${kelasShort}`;
  if (jp) return jp;
  if (hasKelas) return kelasShort;
  return null;
}

/** Gabungkan field pasien dari master `public.pasien` jika baris tindakan tidak menyalin kolom tersebut. */
function mergePasienMasterIntoRow(
  row: TindakanJoinResult,
  pasien: Pasien | null,
): TindakanJoinResult {
  if (!pasien) return row;
  const no_rm = isBlank(row.no_rm) ? pasien.noRM?.trim() || null : row.no_rm;
  const nama_pasien = isBlank(row.nama_pasien)
    ? pasien.nama?.trim() || null
    : row.nama_pasien;
  const tgl_lahir = isBlank(row.tgl_lahir)
    ? pasien.tanggalLahir?.trim() || null
    : row.tgl_lahir;
  const alamat = isBlank(row.alamat)
    ? pasien.alamat?.trim() || null
    : row.alamat;
  const no_telp = isBlank(row.no_telp)
    ? pasien.noHP?.trim() || null
    : row.no_telp;
  const rawJk =
    row.jenis_kelamin ??
    (row as TindakanJoinResult & { jk?: string | null }).jk ??
    null;
  const jenis_kelamin = isBlank(rawJk)
    ? (pasien.jenisKelamin ?? null)
    : String(rawJk).trim() || null;

  let umur = row.umur;
  if (umur === null || umur === undefined) {
    const dobStr =
      typeof tgl_lahir === "string" && tgl_lahir.trim()
        ? tgl_lahir.trim()
        : (pasien.tanggalLahir?.trim() ?? "");
    if (dobStr) umur = hitungUsia(dobStr).angka;
  }

  /** Tab Biaya: "Kelas pembiayaan" = Jenis Pembiayaan + Kelas perawatan dari master pasien */
  const kelas_pembiayaan = isBlank(row.kelas_pembiayaan)
    ? buildKelasPembiayaanFromPasienMaster(pasien)
    : row.kelas_pembiayaan;

  return {
    ...row,
    no_rm,
    nama_pasien,
    jenis_kelamin,
    tgl_lahir,
    umur,
    alamat,
    no_telp,
    kelas_pembiayaan,
  };
}

export default function TindakanDetailDrawer({
  open,
  record,
  allTindakanRows = [],
  onClose,
  onRecordPatch,
}: Props) {
  const [tab, setTab] = useState<WireframeTabId>("pasien");
  const tabRowMeasureRef = useRef<HTMLDivElement>(null);
  const [modalMinWidthPx, setModalMinWidthPx] = useState<number | null>(null);
  const [pasienMaster, setPasienMaster] = useState<Pasien | null>(null);
  /** Tarif dari GET /api/tindakan/:id (master + enrich) bila baris daftar belum membawa nilai. */
  const [detailTarifFromApi, setDetailTarifFromApi] = useState<number | null>(
    null,
  );
  const [perawatMasterReloadToken, setPerawatMasterReloadToken] = useState(0);
  const [waCopied, setWaCopied] = useState(false);
  const isLight = useTindakanLightMode();

  useEffect(() => {
    if (open) setTab("pasien");
  }, [open, record?.id]);

  useEffect(() => {
    if (!open || !record) {
      setPasienMaster(null);
      return;
    }

    const ac = new AbortController();
    setPasienMaster(null);

    void (async () => {
      const opts: RequestInit = {
        credentials: "include",
        cache: "no-store",
        signal: ac.signal,
      };

      const parsePasien = (raw: unknown): Pasien | null =>
        raw && typeof raw === "object" && "id" in (raw as object)
          ? (raw as Pasien)
          : null;

      try {
        const pid = String(record.pasien_id ?? "").trim();
        if (pid) {
          const res = await fetch(
            `/api/pasien/${encodeURIComponent(pid)}`,
            opts,
          );
          const json = (await res.json().catch(() => ({}))) as {
            ok?: boolean;
            data?: unknown;
          };
          if (res.ok && json?.ok) {
            const p = parsePasien(json.data);
            if (p && !ac.signal.aborted) {
              setPasienMaster(p);
              return;
            }
          }
        }

        const rm = String(record.no_rm ?? "").trim();
        if (rm) {
          const res = await fetch(
            `/api/pasien?noRm=${encodeURIComponent(rm)}`,
            opts,
          );
          const json = (await res.json().catch(() => ({}))) as {
            ok?: boolean;
            data?: unknown;
          };
          if (res.ok && json?.ok) {
            const p = parsePasien(json.data);
            if (p && !ac.signal.aborted) {
              setPasienMaster(p);
              return;
            }
          }
        }

        const nama = String(record.nama_pasien ?? "").trim();
        if (nama) {
          const res = await fetch(
            `/api/pasien?nama=${encodeURIComponent(nama)}`,
            opts,
          );
          const json = (await res.json().catch(() => ({}))) as {
            ok?: boolean;
            data?: unknown;
          };
          if (res.ok && json?.ok) {
            const p = parsePasien(json.data);
            if (p && !ac.signal.aborted) setPasienMaster(p);
          }
        }
      } catch (e) {
        if ((e as Error)?.name === "AbortError") return;
      }
    })();

    return () => ac.abort();
    // Primitif saja — panjang array harus tetap (bukan `record` mentah yang bisa bikin HMR / pola deps bervariasi).
  }, [open, record?.id, record?.pasien_id, record?.no_rm, record?.nama_pasien]);

  useEffect(() => {
    if (!open || !record?.id) {
      setDetailTarifFromApi(null);
      return;
    }
    const id = String(record.id).trim();
    if (!id) {
      setDetailTarifFromApi(null);
      return;
    }

    if (isTarifPresent(record.tarif_tindakan)) {
      setDetailTarifFromApi(null);
      return;
    }

    const ac = new AbortController();
    setDetailTarifFromApi(null);

    void (async () => {
      try {
        const res = await fetch(`/api/tindakan/${encodeURIComponent(id)}`, {
          credentials: "include",
          cache: "no-store",
          signal: ac.signal,
        });
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          data?: { tarif_tindakan?: unknown };
        };
        if (!res.ok || !json?.ok || ac.signal.aborted) return;
        const raw = json.data?.tarif_tindakan;
        const n =
          typeof raw === "number"
            ? raw
            : Number(
                String(raw ?? "")
                  .replace(/\s/g, "")
                  .replace(",", "."),
              );
        if (Number.isFinite(n)) setDetailTarifFromApi(n);
      } catch (e) {
        if ((e as Error)?.name === "AbortError") return;
      }
    })();

    return () => ac.abort();
  }, [open, record?.id, record?.tarif_tindakan]);

  const displayRecord = useMemo(() => {
    if (!record) return null;
    const merged = mergePasienMasterIntoRow(record, pasienMaster);
    if (isTarifPresent(merged.tarif_tindakan) || detailTarifFromApi == null)
      return merged;
    return { ...merged, tarif_tindakan: detailTarifFromApi };
  }, [record, pasienMaster, detailTarifFromApi]);

  const riwayatPasienRows = useMemo(() => {
    if (!displayRecord) return [];
    const peers = allTindakanRows.filter((r) =>
      isSamePatientTindakan(displayRecord, r),
    );
    return sortTindakanByTanggalDesc(peers);
  }, [allTindakanRows, displayRecord]);

  const resumeWhatsAppText = useMemo(() => {
    if (!displayRecord) return "";
    return buildResumeWhatsAppText(displayRecord, riwayatPasienRows);
  }, [displayRecord, riwayatPasienRows]);

  useEffect(() => {
    setWaCopied(false);
  }, [tab, displayRecord?.id]);

  useLayoutEffect(() => {
    if (!open) {
      setModalMinWidthPx(null);
      return;
    }
    const row = tabRowMeasureRef.current;
    if (!row) return;

    const update = () => {
      const vw = window.innerWidth;
      const shellPad = 24;
      const sidebarRaw = getComputedStyle(document.documentElement)
        .getPropertyValue("--sidebar-width")
        .trim();
      const sidebarPx = Number.parseFloat(sidebarRaw);
      const sidebar = Number.isFinite(sidebarPx) ? sidebarPx : 0;
      const maxUsable = Math.max(280, vw - shellPad - sidebar);
      const needed = Math.ceil(row.scrollWidth + HEADER_TAB_ROW_PAD_X);
      setModalMinWidthPx(Math.min(needed, maxUsable));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(row);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [open]);

  /** Tab aktif tetap terlihat di strip horizontal (Pasien sering terpotong di kiri). */
  useLayoutEffect(() => {
    if (!open) return;
    const row = tabRowMeasureRef.current;
    if (!row) return;
    const active = row.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
    active?.scrollIntoView({
      inline: "center",
      block: "nearest",
      behavior: "smooth",
    });
  }, [open, tab]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const title = useMemo(() => {
    if (!displayRecord) return "Detail tindakan";
    const rm = displayRecord.no_rm ?? "";
    const nama = displayRecord.nama_pasien ?? "";
    const tin = displayRecord.tindakan ?? "";
    return [rm && `RM ${rm}`, nama || "—", tin].filter(Boolean).join(" · ");
  }, [displayRecord]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[400]">
      <button
        type="button"
        aria-label="Tutup detail tindakan"
        className={cn(
          "absolute inset-0",
          isLight ? "bg-slate-900/40" : "bg-black/65",
        )}
        onClick={onClose}
      />
      {/* Flex center (bukan translate -50%) agar teks tidak blur di subpiksel / Windows */}
      <div className="absolute inset-0 z-[1] flex items-center justify-center pointer-events-none pl-[var(--sidebar-width,0px)] pr-2 sm:pr-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="tindakan-detail-modal-title"
          className={cn(
            "pointer-events-auto flex max-h-[min(92vh,760px)] min-w-0 w-full max-w-[min(64rem,calc(100vw-var(--sidebar-width,0px)-1rem))] flex-col overflow-hidden rounded-xl border antialiased [text-rendering:optimizeLegibility] sm:max-w-[min(64rem,calc(100vw-var(--sidebar-width,0px)-2rem))]",
            isLight
              ? "border-cyan-500/30 bg-gradient-to-b from-white via-slate-50 to-cyan-50/40 shadow-[0_12px_40px_rgba(0,80,100,0.15)]"
              : "border-cyan-800/40 bg-gradient-to-b from-[#04070d] via-[#0a1018] to-black shadow-[0_8px_32px_rgba(0,0,0,0.45)]",
          )}
          style={
            modalMinWidthPx != null
              ? { minWidth: `${modalMinWidthPx}px` }
              : undefined
          }
          onClick={(e) => e.stopPropagation()}
        >
        <div
          className={cn(
            "shrink-0 border-b px-3 py-2 sm:px-3.5",
            isLight
              ? "border-cyan-200/80 bg-white/95"
              : "border-cyan-800/30 bg-black/40",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p
                id="tindakan-detail-modal-title"
                className={cn(
                  "text-[13px] font-bold leading-snug break-words sm:text-sm",
                  isLight ? "text-slate-950" : "text-cyan-100",
                )}
              >
                {title}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={cn(
                "shrink-0 rounded-md border p-1.5 transition-colors",
                isLight
                  ? "border-cyan-500/40 text-cyan-900 hover:bg-cyan-100"
                  : "border-cyan-800/45 text-cyan-300 hover:bg-cyan-500/10",
              )}
            >
              <X size={17} />
            </button>
          </div>

          <div className="mt-2 min-w-0">
            <div
              className={cn(
                "-mx-0.5 overflow-x-auto overflow-y-hidden px-0.5 pb-0.5 scrollbar-thin scroll-smooth",
                isLight
                  ? "scrollbar-thumb-cyan-400/50"
                  : "scrollbar-thumb-cyan-800/60",
              )}
            >
              <div
                ref={tabRowMeasureRef}
                className="flex w-max min-w-0 flex-nowrap gap-1.5"
                role="tablist"
                aria-label="Bagian detail tindakan"
              >
                {WIREFRAME_DRAWER_TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={tab === t.id}
                    onClick={() => setTab(t.id)}
                    className={cn(
                      "shrink-0 rounded-md px-2 py-1 text-left text-[11px] font-semibold leading-snug whitespace-nowrap transition-[color,background-color,border-color,font-weight] duration-150 ease-out sm:px-2.5 sm:text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40 focus-visible:ring-offset-1",
                      isLight
                        ? "focus-visible:ring-offset-white"
                        : "focus-visible:ring-offset-[#070d14]",
                      tab === t.id
                        ? isLight
                          ? "border border-cyan-600/45 bg-cyan-100/90 font-bold text-cyan-950"
                          : "border border-cyan-500/40 bg-black/50 font-bold text-cyan-50"
                        : isLight
                          ? "border border-transparent bg-transparent font-semibold text-slate-600 hover:bg-cyan-50 hover:text-cyan-950"
                          : "border border-transparent bg-transparent font-medium text-cyan-200/80 hover:bg-white/[0.06] hover:text-cyan-50",
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto px-3 py-2 sm:px-3 sm:py-2.5",
            isLight ? "bg-slate-50/80" : "bg-transparent",
          )}
        >
          {!displayRecord ? (
            <p
              className={cn(
                "text-sm font-semibold",
                isLight ? "text-slate-700" : "text-gray-500",
              )}
            >
              Tidak ada data baris.
            </p>
          ) : tab === "history" ? (
            <div className="space-y-3">
              <div>
                <h3
                  className={cn(
                    "text-xs font-mono font-bold uppercase tracking-wider",
                    isLight ? "text-cyan-800" : "text-cyan-500/80",
                  )}
                >
                  Resume
                </h3>
                <p
                  className={cn(
                    "mt-1 text-xs font-medium",
                    isLight ? "text-slate-600" : "text-gray-500",
                  )}
                >
                  Ringkasan semua bagian ada di versi teks WhatsApp di bawah.
                  Lanjut: metadata sistem dan riwayat tindakan pasien yang sama.
                </p>
              </div>

              <div
                className={cn(
                  "rounded-xl border p-3",
                  isLight
                    ? "border-emerald-400/50 bg-emerald-50/90"
                    : "border-emerald-900/45 bg-emerald-950/20",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p
                    className={cn(
                      "text-[11px] font-bold uppercase tracking-wide",
                      isLight ? "text-emerald-900" : "text-emerald-300/90",
                    )}
                  >
                    Versi teks WhatsApp
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!resumeWhatsAppText) return;
                      try {
                        await navigator.clipboard.writeText(resumeWhatsAppText);
                        setWaCopied(true);
                        window.setTimeout(() => setWaCopied(false), 2500);
                      } catch {
                        setWaCopied(false);
                      }
                    }}
                    disabled={!resumeWhatsAppText}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50",
                      isLight
                        ? "border-emerald-600/40 bg-emerald-200/80 text-emerald-950 hover:bg-emerald-300/80"
                        : "border-emerald-500/40 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25",
                    )}
                  >
                    <Copy size={14} aria-hidden />
                    Salin untuk WA
                  </button>
                </div>
                <p
                  className={cn(
                    "mt-1 text-[10px] font-medium",
                    isLight ? "text-slate-600" : "text-gray-500",
                  )}
                >
                  Judul memakai *tebal* (format WA). Tempel langsung ke chat.
                </p>
                {waCopied ? (
                  <p
                    className={cn(
                      "mt-2 text-xs font-semibold",
                      isLight ? "text-emerald-800" : "text-emerald-300/90",
                    )}
                    role="status"
                  >
                    Tersalin — tempel di WhatsApp.
                  </p>
                ) : null}
                <label className="mt-2 block">
                  <span className="sr-only">Pratinjau teks WhatsApp</span>
                  <textarea
                    readOnly
                    value={resumeWhatsAppText}
                    rows={10}
                    className={cn(
                      "mt-1 w-full resize-y rounded-lg border px-2.5 py-2 font-mono text-[11px] font-medium leading-relaxed outline-none focus-visible:ring-2",
                      isLight
                        ? "border-emerald-500/45 bg-white text-slate-900 focus-visible:ring-emerald-500/40"
                        : "border-emerald-900/50 bg-black/40 text-emerald-50/95 focus-visible:ring-emerald-500/35",
                    )}
                  />
                </label>
              </div>

              <div
                className={cn(
                  "rounded-lg border px-3 py-2.5",
                  isLight
                    ? "border-cyan-300/60 bg-white"
                    : "border-cyan-900/35 bg-black/30",
                )}
              >
                <p
                  className={cn(
                    "text-[11px] font-bold uppercase tracking-wide",
                    isLight ? "text-slate-600" : "text-gray-500",
                  )}
                >
                  Metadata sistem
                </p>
                <dl className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                  {(
                    [
                      ["id", "ID kasus"],
                      ["created_at", "Dibuat"],
                      ["updated_at", "Diperbarui"],
                    ] as const
                  ).map(([key, label]) => {
                    const rec = displayRecord as unknown as Record<
                      string,
                      unknown
                    >;
                    const raw =
                      key === "id"
                        ? displayRecord.id
                        : key === "updated_at"
                          ? getWireframeFieldValue(rec, "updated_at") ||
                            getWireframeFieldValue(rec, "inserted_at")
                          : getWireframeFieldValue(rec, key);
                    const display =
                      key === "id"
                        ? raw != null && String(raw).trim() !== ""
                          ? String(raw)
                          : "—"
                        : formatFieldValue(key, raw);
                    return (
                      <div key={key}>
                        <dt
                          className={cn(
                            "text-[10px] font-semibold",
                            isLight ? "text-slate-600" : "text-gray-500",
                          )}
                        >
                          {label}
                        </dt>
                        <dd
                          className={cn(
                            "mt-0.5 font-mono font-semibold",
                            isLight ? "text-slate-950" : "text-cyan-200/90",
                          )}
                        >
                          {display}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </div>

              <section className="space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p
                    className={cn(
                      "text-[11px] font-bold uppercase tracking-wide",
                      isLight ? "text-cyan-900" : "text-cyan-400/75",
                    )}
                  >
                    Riwayat tindakan pasien
                  </p>
                  <p
                    className={cn(
                      "text-[10px] font-medium",
                      isLight ? "text-slate-600" : "text-gray-500",
                    )}
                  >
                    {displayRecord.no_rm
                      ? `No. RM ${String(displayRecord.no_rm).trim()}`
                      : displayRecord.pasien_id
                        ? `Pasien ID ${String(displayRecord.pasien_id).trim()}`
                        : "Identitas pasien terbatas"}
                  </p>
                </div>
                {riwayatPasienRows.length === 0 ? (
                  <p
                    className={cn(
                      "rounded-lg border border-dashed px-3 py-3 text-xs font-medium",
                      isLight
                        ? "border-cyan-400/50 bg-white text-slate-700"
                        : "border-cyan-900/45 bg-black/20 text-gray-500",
                    )}
                  >
                    Tidak ada baris lain yang cocok dengan RM / ID pasien ini
                    dalam snapshot data saat ini. Muat ulang daftar bila perlu.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {riwayatPasienRows.map((r, idx) => {
                      const rid = String(r.id ?? "").trim();
                      const curId = String(displayRecord.id ?? "").trim();
                      const isCurrent =
                        rid !== "" && curId !== "" && rid === curId;
                      return (
                        <li
                          key={rid || `peer-${idx}-${r.tanggal ?? ""}`}
                          className={cn(
                            "rounded-xl border px-3 py-2.5 text-sm font-semibold",
                            isCurrent
                              ? isLight
                                ? "border-cyan-500/50 bg-cyan-100/90 shadow-sm"
                                : "border-cyan-400/50 bg-cyan-950/35 shadow-[0_0_0_1px_rgba(34,211,238,0.12)]"
                              : isLight
                                ? "border-cyan-200/80 bg-white"
                                : "border-cyan-900/40 bg-black/25",
                          )}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                "font-mono text-xs font-bold",
                                isLight ? "text-cyan-900" : "text-cyan-300/90",
                              )}
                            >
                              {formatFieldValue(
                                "tanggal_tindakan",
                                getWireframeFieldValue(
                                  r as unknown as Record<string, unknown>,
                                  "tanggal_tindakan",
                                ),
                              )}
                            </span>
                            {isCurrent ? (
                              <span
                                className={cn(
                                  "rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                                  isLight
                                    ? "border-cyan-600/40 bg-cyan-200/80 text-cyan-950"
                                    : "border-cyan-500/40 bg-cyan-500/15 text-cyan-200",
                                )}
                              >
                                Kasus ini
                              </span>
                            ) : null}
                          </div>
                          <p
                            className={cn(
                              "mt-1 font-bold",
                              isLight ? "text-slate-950" : "text-cyan-50/95",
                            )}
                          >
                            {r.tindakan?.trim() || "—"}
                          </p>
                          <div
                            className={cn(
                              "mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-medium",
                              isLight ? "text-slate-700" : "text-gray-400",
                            )}
                          >
                            <span>
                              <span
                                className={
                                  isLight ? "text-slate-900" : "text-gray-600"
                                }
                              >
                                Dokter:
                              </span>{" "}
                              {r.dokter?.trim() || "—"}
                            </span>
                            <span>
                              <span
                                className={
                                  isLight ? "text-slate-900" : "text-gray-600"
                                }
                              >
                                Ruangan:
                              </span>{" "}
                              {r.ruangan?.trim() || "—"}
                            </span>
                            {r.kategori?.trim() ? (
                              <span>
                                <span
                                  className={
                                    isLight ? "text-slate-900" : "text-gray-600"
                                  }
                                >
                                  Kategori:
                                </span>{" "}
                                {r.kategori.trim()}
                              </span>
                            ) : null}
                          </div>
                          {rid ? (
                            <p
                              className={cn(
                                "mt-1 font-mono text-[10px] font-semibold",
                                isLight ? "text-slate-600" : "text-gray-600",
                              )}
                            >
                              ID {rid}
                            </p>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>
          ) : (
            <>
              {WIREFRAME_DRAWER_TABS.filter((x) => x.id === tab).map((def) => (
                <div key={def.id} className="space-y-1.5">
                  <h3
                    className={cn(
                      "text-[10px] font-mono font-bold uppercase tracking-wider",
                      isLight ? "text-cyan-800" : "text-cyan-500/75",
                    )}
                  >
                    {def.label}
                  </h3>
                  {def.id === "fast_track" ? (
                    <FastTrackBlock
                      tindakanId={String(displayRecord.id ?? "").trim()}
                      pasienDatangValue={getWireframeFieldValue(
                        displayRecord as unknown as Record<string, unknown>,
                        "pasien_datang_igd",
                      )}
                      doorToBalloonValue={getWireframeFieldValue(
                        displayRecord as unknown as Record<string, unknown>,
                        "door_to_balloon",
                      )}
                      totalValue={getWireframeFieldValue(
                        displayRecord as unknown as Record<string, unknown>,
                        "total_waktu_fast_track",
                      )}
                      onSaved={onRecordPatch}
                    />
                  ) : (
                  <dl className="grid grid-cols-1 gap-1.5 text-sm font-semibold">
                    {def.fields.map((key) => {
                      const rawVal = getWireframeFieldValue(
                        displayRecord as unknown as Record<string, unknown>,
                        key,
                      );
                      const tindakanId = String(displayRecord.id ?? "").trim();
                      const isKategoriEditable =
                        def.id === "tindakan" &&
                        key === "kategori" &&
                        Boolean(tindakanId);
                      const isCathlabEditable =
                        def.id === "lokasi" &&
                        key === "cath" &&
                        Boolean(tindakanId);
                      const isTimPerawatEditable =
                        def.id === "tim" &&
                        (key === "asisten" ||
                          key === "sirkuler" ||
                          key === "logger") &&
                        Boolean(tindakanId);
                      const isRadiologiEditable =
                        def.id === "radiologi" &&
                        RADIOLOGI_AUTOSAVE_FIELDS.includes(
                          key as RadiologiFieldKey,
                        ) &&
                        Boolean(tindakanId);
                      const isKlinisEditable =
                        def.id === "klinis" &&
                        KLINIS_AUTOSAVE_FIELDS.includes(
                          key as KlinisFieldKey,
                        ) &&
                        Boolean(tindakanId);

                      const canPatchTindakan = Boolean(tindakanId);
                      const isBiayaAutosaveField = BIAYA_AUTOSAVE_KEYS.has(key);
                      const isBiayaEditable =
                        def.id === "biaya" &&
                        isBiayaAutosaveField &&
                        canPatchTindakan &&
                        (key === "total" || isBiayaWireframeEmpty(key, rawVal));

                      return (
                        <div
                          key={key}
                          className={cn(
                            "rounded-md border px-2 py-1.5",
                            isLight
                              ? "border-cyan-200/80 bg-white shadow-sm"
                              : "border-cyan-900/25 bg-black/25",
                          )}
                        >
                          <dt
                            className={cn(
                              "text-[10px] font-bold leading-tight",
                              isLight ? "text-slate-600" : "text-gray-500",
                            )}
                          >
                            {FIELD_LABELS[key] ?? key}
                          </dt>
                          <dd
                            className={cn(
                              "mt-0.5 text-[13px] font-semibold leading-snug break-words",
                              isLight ? "text-slate-950" : "text-cyan-100/95",
                            )}
                          >
                            {isRadiologiEditable ? (
                              <RadiologiAutosaveField
                                tindakanId={tindakanId}
                                field={key as RadiologiFieldKey}
                                value={rawVal}
                                onSaved={onRecordPatch}
                              />
                            ) : isKlinisEditable ? (
                              <KlinisAutosaveField
                                tindakanId={tindakanId}
                                field={key as KlinisFieldKey}
                                value={rawVal}
                                onSaved={onRecordPatch}
                              />
                            ) : isBiayaEditable ? (
                              <BiayaAutosaveField
                                tindakanId={tindakanId}
                                field={key as BiayaAutosaveFieldKey}
                                value={rawVal}
                                onSaved={onRecordPatch}
                              />
                            ) : def.id === "biaya" &&
                              isBiayaAutosaveField &&
                              !canPatchTindakan ? (
                              <div>
                                <span>{formatFieldValue(key, rawVal)}</span>
                                <p
                                  className={cn(
                                    "mt-1 text-[11px] font-medium",
                                    isLight
                                      ? "text-amber-900"
                                      : "text-amber-200/75",
                                  )}
                                >
                                  Baris tanpa ID kasus yang valid — isian biaya
                                  tidak dapat disimpan dari sini.
                                </p>
                              </div>
                            ) : isTimPerawatEditable ? (
                              <MasterPerawatTimField
                                tindakanId={tindakanId}
                                field={key as TimPerawatFieldKey}
                                value={
                                  rawVal === null || rawVal === undefined
                                    ? null
                                    : String(rawVal)
                                }
                                onSaved={onRecordPatch}
                                masterReloadToken={perawatMasterReloadToken}
                              />
                            ) : isCathlabEditable ? (
                              <CathlabSlotField
                                tindakanId={tindakanId}
                                value={
                                  rawVal === null || rawVal === undefined
                                    ? null
                                    : String(rawVal)
                                }
                                onSaved={onRecordPatch}
                              />
                            ) : isKategoriEditable ? (
                              <KategoriTindakanField
                                tindakanId={tindakanId}
                                value={
                                  rawVal === null || rawVal === undefined
                                    ? null
                                    : String(rawVal)
                                }
                                onSaved={onRecordPatch}
                              />
                            ) : key === "kategori" && !tindakanId ? (
                              <div>
                                <span>{formatFieldValue(key, rawVal)}</span>
                                <p
                                  className={cn(
                                    "mt-1 text-[11px] font-medium",
                                    isLight
                                      ? "text-amber-900"
                                      : "text-amber-200/75",
                                  )}
                                >
                                  Baris tanpa ID kasus — kategori tidak dapat
                                  disimpan dari sini.
                                </p>
                              </div>
                            ) : (
                              formatFieldValue(key, rawVal)
                            )}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                  )}
                  {def.id === "fast_track" ? (
                    <div
                      className={cn(
                        "mt-3 rounded-xl border-2 px-3 py-3",
                        isLight
                          ? "border-rose-500/45 bg-rose-50/95 shadow-sm"
                          : "border-rose-500/40 bg-rose-950/35 shadow-[0_0_24px_rgba(244,63,94,0.12)]",
                      )}
                      role="note"
                    >
                      <p
                        className={cn(
                          "text-[11px] font-extrabold uppercase tracking-wide",
                          isLight ? "text-rose-900" : "text-rose-200/95",
                        )}
                      >
                        Saran pamungkas — STEMI
                      </p>
                      <p
                        className={cn(
                          "mt-2 text-xs font-semibold leading-relaxed",
                          isLight ? "text-rose-950" : "text-rose-50/95",
                        )}
                      >
                        Infark miokard dengan elevasi ST memerlukan{" "}
                        <span className="font-bold">tindakan secepat mungkin</span>
                        : setiap penundaan berarti kehilangan miokardium
                        irreversibel. Aktifkan jalur{" "}
                        <span className="font-bold">Fast-Track IGD → lab → kathlab</span>
                        — EKG dan triase dini, terapi antiplatelet/antikoagulan sesuai
                        protokol rumah sakit, konsultasi kardiologi segera, dan
                        dokumentasi waktu (kedatangan IGD, first medical contact,
                        first device) untuk mengejar target{" "}
                        <span className="font-bold">door-to-balloon</span> sesuai
                        standar (umumnya ≤90 menit; ideal lebih singkat di pusat PCI
                        primer). Hindari hambatan administratif yang tidak perlu.
                      </p>
                    </div>
                  ) : null}
                  {def.id === "tim" ? (
                    <TambahKeMasterPerawatForm
                      onAdded={() => setPerawatMasterReloadToken((t) => t + 1)}
                    />
                  ) : null}
                </div>
              ))}
            </>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
