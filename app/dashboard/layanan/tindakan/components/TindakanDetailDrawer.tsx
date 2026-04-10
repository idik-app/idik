"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
import MasterDokterField from "./MasterDokterField";
import MasterJenisTindakanField from "./MasterJenisTindakanField";
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
import SignTimeFields from "./SignTimeFields";
import { buildResumeWhatsAppText } from "../lib/buildResumeWhatsAppText";
import { cn } from "@/lib/utils";
import { UI_LAYERS } from "@/lib/ui/layers";
import { usePasienDetail, useTindakanDetail } from "../hooks/useMasterData";

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
  "dap_gy_cm2",
  "kv",
  "ma",
  "waktu",
];

const KLINIS_AUTOSAVE_FIELDS: KlinisFieldKey[] = [
  "diagnosa",
  "severity_level",
  "hasil_lab_ppm",
  "pci_report_link",
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

/** Sumber nilai sama dengan kolom "Tanggal tindakan" (wireframe: `tanggal_tindakan` → `tanggal`). */
function parseTanggalTindakanToDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const raw =
    typeof value === "string"
      ? value.trim()
      : value instanceof Date
        ? value.toISOString().slice(0, 10)
        : String(value).trim();
  if (!raw) return null;

  const ymd = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) {
    const d = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
    return Number.isFinite(d.getTime()) ? d : null;
  }

  const parsed = Date.parse(raw);
  if (Number.isFinite(parsed)) return new Date(parsed);

  const dmy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmy) {
    const d = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
    return Number.isFinite(d.getTime()) ? d : null;
  }

  return null;
}

function formatDrawerTitleHariTanggal(value: unknown): string {
  const d = parseTanggalTindakanToDate(value);
  if (!d) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
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
  const rowNamaDenorm =
    String(row.nama_pasien ?? "").trim() ||
    String(
      (row as TindakanJoinResult & { nama?: string | null }).nama ?? "",
    ).trim();
  const masterNama = pasien.nama?.trim() ?? "";
  /** Master pasien = sumber kebenaran untuk nama bila drawer sudah punya fetch by `pasien_id` / RM. */
  const nama_pasien = masterNama || rowNamaDenorm || null;
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

  /** Tab Biaya — "Kelas pembiayaan": jenis + kelas (mis. NPBI - 1, BPJS - 3); selaras laporan cara bayar. */
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

interface TabButtonProps {
  t: (typeof WIREFRAME_DRAWER_TABS)[number];
  isActive: boolean;
  onClick: () => void;
  mousePos: { x: number; y: number };
  isDragging: boolean;
}

function TabButton({
  t,
  isActive,
  onClick,
  mousePos,
  isDragging,
}: TabButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [scale, setScale] = useState(1);

  // Proximity Zoom Logic
  useEffect(() => {
    if (!buttonRef.current || isDragging) return;
    const btn = buttonRef.current;
    const updateScale = () => {
      const rect = btn.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dist = Math.sqrt(
        Math.pow(mousePos.x - centerX, 2) + Math.pow(mousePos.y - centerY, 2),
      );

      if (dist < 150) {
        // Proximity Zoom: Scale up from 1.1 to 1.15 based on distance
        const s = 1.15 - (dist / 150) * 0.05;
        setScale(s);
      } else {
        setScale(1);
      }
    };
    updateScale();
  }, [mousePos, isDragging]);

  return (
    <button
      ref={buttonRef}
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={onClick}
      style={{ transform: `scale(${scale})` }}
      className={cn(
        "shrink-0 rounded-md px-3 py-1.5 text-left text-[11px] font-black uppercase tracking-wider transition-all duration-300 ease-out sm:text-xs focus-visible:outline-none",
        isActive
          ? "border border-cyan-500 bg-cyan-500/10 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]"
          : "border border-transparent text-gray-500 hover:text-cyan-300 hover:border-cyan-500/30",
      )}
    >
      {t.label}
    </button>
  );
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
  const tabScrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Drag-to-Scroll Logic
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!tabScrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - tabScrollRef.current.offsetLeft);
    setScrollLeft(tabScrollRef.current.scrollLeft);
  };

  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.pageX, y: e.pageY });
    if (!isDragging || !tabScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - tabScrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    tabScrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const [modalMinWidthPx, setModalMinWidthPx] = useState<number | null>(null);
  const [waCopied, setWaCopied] = useState(false);

  // SWR hooks for master data
  const { pasien: pasienMaster } = usePasienDetail(
    open ? record?.pasien_id : null,
    open ? record?.no_rm : null,
    open ? record?.nama_pasien : null
  );

  const { tindakan: tindakanDetail } = useTindakanDetail(
    open && !isTarifPresent(record?.tarif_tindakan) ? record?.id : null
  );

  const detailTarifFromApi = useMemo(() => {
    if (!tindakanDetail) return null;
    const raw = tindakanDetail.tarif_tindakan;
    const n =
      typeof raw === "number"
        ? raw
        : Number(
            String(raw ?? "")
              .replace(/\s/g, "")
              .replace(",", "."),
          );
    return Number.isFinite(n) ? n : null;
  }, [tindakanDetail]);

  useEffect(() => {
    if (open) setTab("pasien");
  }, [open, record?.id]);

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
    const active = row.querySelector<HTMLElement>(
      '[role="tab"][aria-selected="true"]',
    );
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
    const tanggalVal = getWireframeFieldValue(
      displayRecord as unknown as Record<string, unknown>,
      "tanggal_tindakan",
    );
    const hariTanggal = formatDrawerTitleHariTanggal(tanggalVal);
    const rmStr = String(displayRecord.no_rm ?? "").trim();
    const namaStr = String(displayRecord.nama_pasien ?? "").trim() || "—";
    const tinStr = String(displayRecord.tindakan ?? "").trim();

    return (
      <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
        <span className="text-white/70">{hariTanggal}</span>
        <span className="text-white/40">-</span>
        <span className="font-black text-yellow-400">{rmStr || "—"}</span>
        <span className="text-white/40">-</span>
        <span className="font-bold text-white">{namaStr}</span>
        <span className="text-white/40">-</span>
        <span className="font-black text-cyan-400">{tinStr || "—"}</span>
      </div>
    );
  }, [displayRecord]);

  if (!open) return null;

  /**
   * Portal ke body: ancestor `LayoutMain` memakai `motion.div` (transform), sehingga
   * `fixed` di dalam tab tidak menutupi viewport penuh — BottomNav (mobile) tetap di atas
   * dan konten drawer terasa “terhalang”. Portal mengembalikan perilaku fixed ke viewport.
   */
  const layer =
    typeof document === "undefined" ? null : (
      <div className={`fixed inset-0 ${UI_LAYERS.drawerPortal}`}>
        <button
          type="button"
          aria-label="Tutup detail tindakan"
          className={cn("absolute inset-0", "bg-slate-900/40 dark:bg-black/65")}
          onClick={onClose}
        />
        {/* Flex center (bukan translate -50%) agar teks tidak blur di subpiksel / Windows */}
        <div className="absolute inset-0 z-[1] flex items-center justify-center pointer-events-none pl-[var(--sidebar-width,0px)] pr-2 sm:pr-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="tindakan-detail-modal-title"
            className={cn(
              "pointer-events-auto flex h-[85vh] max-h-[85vh] min-w-0 w-full max-w-4xl flex-col overflow-hidden rounded-xl border antialiased [text-rendering:optimizeLegibility]",
              "border-cyan-500/30 bg-[#050505] dark:border-cyan-400/20",
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
              "border-cyan-500/20 bg-black/40",
            )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div
                    id="tindakan-detail-modal-title"
                    className="text-[13px] font-bold leading-snug sm:text-sm"
                  >
                    {title}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className={cn(
                    "shrink-0 rounded-md border p-1.5 transition-all duration-300",
                    "border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/20 hover:shadow-[0_0_15px_rgba(34,211,238,0.4)]",
                  )}
                >
                  <X size={17} />
                </button>
              </div>

              <div className="mt-2 min-w-0">
                <div
                  ref={tabScrollRef}
                  onMouseDown={handleMouseDown}
                  onMouseLeave={handleMouseLeave}
                  onMouseUp={handleMouseUp}
                  onMouseMove={handleMouseMove}
                  className={cn(
                    "-mx-0.5 overflow-x-auto overflow-y-hidden px-0.5 pb-1 cursor-grab active:cursor-grabbing select-none",
                    "scrollbar-thin scroll-smooth scrollbar-h-[3px]",
                    "scrollbar-thumb-cyan-500/50 transition-colors duration-300",
                  )}
                >
                  <div
                    ref={tabRowMeasureRef}
                    className="flex w-max min-w-0 flex-nowrap gap-2 py-1"
                    role="tablist"
                    aria-label="Bagian detail tindakan"
                  >
                    {WIREFRAME_DRAWER_TABS.map((t) => (
                      <TabButton
                        key={t.id}
                        t={t}
                        isActive={tab === t.id}
                        onClick={() => !isDragging && setTab(t.id)}
                        mousePos={mousePos}
                        isDragging={isDragging}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div
              className={cn(
                "min-h-0 flex-1 overflow-y-auto px-4 py-4 scrollbar-thin scrollbar-thumb-cyan-900/40",
                "bg-transparent",
                tab === "klinis" && "max-h-none h-full",
              )}
            >
              {!displayRecord ? (
                <p className="text-sm font-semibold text-white">
                  Tidak ada data baris.
                </p>
              ) : tab === "history" ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                      Resume
                    </h3>
                    <p className="mt-1 text-xs font-medium text-white/80">
                      Ringkasan semua bagian ada di versi teks WhatsApp di
                      bawah. Lanjut: metadata sistem dan riwayat tindakan pasien
                      yang sama.
                    </p>
                  </div>

                  <div
                    className={cn(
                      "rounded-xl border p-4 transition-all duration-300",
                      "border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40",
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                        Versi teks WhatsApp
                      </p>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!resumeWhatsAppText) return;
                          try {
                            await navigator.clipboard.writeText(
                              resumeWhatsAppText,
                            );
                            setWaCopied(true);
                            window.setTimeout(() => setWaCopied(false), 2500);
                          } catch {
                            setWaCopied(false);
                          }
                        }}
                        disabled={!resumeWhatsAppText}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-black uppercase tracking-wider transition-all duration-300 disabled:opacity-50",
                          "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]",
                        )}
                      >
                        <Copy size={14} aria-hidden />
                        Salin untuk WA
                      </button>
                    </div>
                    {waCopied ? (
                      <p
                        className="mt-2 text-xs font-bold text-emerald-400 animate-pulse"
                        role="status"
                      >
                        Tersalin — tempel di WhatsApp.
                      </p>
                    ) : null}
                    <label className="mt-3 block">
                      <span className="sr-only">Pratinjau teks WhatsApp</span>
                      <textarea
                        readOnly
                        value={resumeWhatsAppText}
                        rows={8}
                        className={cn(
                          "mt-1 w-full resize-none rounded-lg border px-3 py-2.5 font-mono text-[11px] font-medium leading-relaxed outline-none transition-all duration-300",
                          "border-emerald-500/20 bg-black/40 text-emerald-50/90 focus:border-emerald-500/50 focus:shadow-[0_0_15px_rgba(16,185,129,0.1)]",
                        )}
                      />
                    </label>
                  </div>

                  <div
                    className={cn(
                      "rounded-lg border px-4 py-3 transition-all duration-300",
                      "border-cyan-500/20 bg-black/20 hover:border-cyan-500/40",
                    )}
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                      Metadata sistem
                    </p>
                    <dl className="mt-3 grid grid-cols-1 gap-4 text-xs sm:grid-cols-3">
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
                            <dt className="text-[10px] font-black uppercase tracking-wider text-gray-600">
                              {label}
                            </dt>
                            <dd className="mt-1 font-mono font-bold text-white">
                              {display}
                            </dd>
                          </div>
                        );
                      })}
                    </dl>
                  </div>

                  <section className="space-y-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">
                        Riwayat tindakan pasien
                      </p>
                      <p className="text-[10px] font-bold text-yellow-400">
                        {displayRecord.no_rm
                          ? `NO. RM: ${String(displayRecord.no_rm).trim()}`
                          : displayRecord.pasien_id
                            ? `PASIEN ID: ${String(displayRecord.pasien_id).trim()}`
                            : "IDENTITAS PASIEN TERBATAS"}
                      </p>
                    </div>
                    {riwayatPasienRows.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-cyan-500/20 bg-black/20 px-4 py-4 text-xs font-medium text-white/60">
                        Tidak ada baris lain yang cocok dengan RM / ID pasien
                        ini dalam snapshot data saat ini.
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
                                "rounded-xl border px-4 py-3 text-sm transition-all duration-300",
                                isCurrent
                                  ? "border-cyan-500 bg-cyan-500/10 shadow-[0_0_20px_rgba(34,211,238,0.1)]"
                                  : "border-cyan-500/20 bg-black/20 hover:border-cyan-500/40",
                              )}
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-xs font-black text-cyan-400">
                                  {formatFieldValue(
                                    "tanggal_tindakan",
                                    getWireframeFieldValue(
                                      r as unknown as Record<string, unknown>,
                                      "tanggal_tindakan",
                                    ),
                                  )}
                                </span>
                                {isCurrent ? (
                                  <span className="rounded border border-cyan-500 bg-cyan-500/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white">
                                    KASUS INI
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-1.5 font-bold text-white">
                                {r.tindakan?.trim() || "—"}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-medium text-white/70">
                                <span>
                                  <span className="font-black uppercase tracking-tighter text-gray-500 mr-1">
                                    Dokter:
                                  </span>
                                  {r.dokter?.trim() || "—"}
                                </span>
                                <span>
                                  <span className="font-black uppercase tracking-tighter text-gray-500 mr-1">
                                    Ruangan:
                                  </span>
                                  {r.ruangan?.trim() || "—"}
                                </span>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>
                </div>
              ) : (
                <>
                  {WIREFRAME_DRAWER_TABS.filter((x) => x.id === tab).map(
                    (def) => (
                      <div key={def.id} className="space-y-3">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                          {def.label}
                        </h3>
                        {def.id === "fast_track" ? (
                          <div className="rounded-xl border border-cyan-500/20 bg-black/20 p-4">
                            <FastTrackBlock
                              tindakanId={String(displayRecord.id ?? "").trim()}
                              isFastTrackValue={getWireframeFieldValue(
                                displayRecord as unknown as Record<
                                  string,
                                  unknown
                                >,
                                "is_fast_track",
                              )}
                              pasienDatangValue={getWireframeFieldValue(
                                displayRecord as unknown as Record<
                                  string,
                                  unknown
                                >,
                                "pasien_datang_igd",
                              )}
                              doorToBalloonValue={getWireframeFieldValue(
                                displayRecord as unknown as Record<
                                  string,
                                  unknown
                                >,
                                "door_to_balloon",
                              )}
                              totalValue={getWireframeFieldValue(
                                displayRecord as unknown as Record<
                                  string,
                                  unknown
                                >,
                                "total_waktu_fast_track",
                              )}
                              fastTrackFotosValue={getWireframeFieldValue(
                                displayRecord as unknown as Record<
                                  string,
                                  unknown
                                >,
                                "fast_track_fotos",
                              )}
                              onSaved={onRecordPatch}
                            />
                          </div>
                        ) : def.id === "klinis" ? (
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            {/* Column 1-2: Link Laporan and its Preview */}
                            <div className="space-y-3 sm:col-span-2">
                              {def.fields
                                .filter((k) => k === "pci_report_link")
                                .map((key) => {
                                  const rawVal = getWireframeFieldValue(
                                    displayRecord as unknown as Record<
                                      string,
                                      unknown
                                    >,
                                    key,
                                  );
                                  const tindakanId = String(
                                    displayRecord.id ?? "",
                                  ).trim();
                                  return (
                                    <div
                                      key={key}
                                      className={cn(
                                        "rounded-lg border px-3 py-2.5 transition-all duration-300",
                                        "border-cyan-500/10 bg-black/20 hover:border-cyan-500/30 hover:shadow-[0_0_10px_rgba(34,211,238,0.05)]",
                                      )}
                                    >
                                      <dt className="text-[9px] font-black uppercase tracking-widest text-gray-600">
                                        {FIELD_LABELS[key] ?? key}
                                      </dt>
                                      <dd className="mt-1 text-[13px] font-bold leading-snug text-white">
                                        <KlinisAutosaveField
                                          tindakanId={tindakanId}
                                          field={key as KlinisFieldKey}
                                          value={rawVal}
                                          onSaved={onRecordPatch}
                                        />
                                      </dd>
                                    </div>
                                  );
                                })}
                            </div>

                            {/* Column 3: Clinical Data Group (Diagnosa, Severity, Lab PPM) */}
                            <div className="space-y-3 sm:col-span-1">
                              <div
                                className={cn(
                                  "flex flex-col gap-4 rounded-lg border px-3 py-3 transition-all duration-300",
                                  "border-cyan-500/10 bg-black/20 hover:border-cyan-500/30 hover:shadow-[0_0_10px_rgba(34,211,238,0.05)]",
                                )}
                              >
                                {def.fields
                                  .filter((k) => k !== "pci_report_link")
                                  .map((key) => {
                                    const rawVal = getWireframeFieldValue(
                                      displayRecord as unknown as Record<
                                        string,
                                        unknown
                                      >,
                                      key,
                                    );
                                    const tindakanId = String(
                                      displayRecord.id ?? "",
                                    ).trim();
                                    return (
                                      <div key={key}>
                                        <dt className="text-[9px] font-black uppercase tracking-widest text-gray-600">
                                          {FIELD_LABELS[key] ?? key}
                                        </dt>
                                        <dd className="mt-1 text-[13px] font-bold leading-snug text-white">
                                          <KlinisAutosaveField
                                            tindakanId={tindakanId}
                                            field={key as KlinisFieldKey}
                                            value={rawVal}
                                            onSaved={onRecordPatch}
                                          />
                                        </dd>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                              {def.fields.map((key) => {
                                const rawVal = getWireframeFieldValue(
                                  displayRecord as unknown as Record<
                                    string,
                                    unknown
                                  >,
                                  key,
                                );
                                const tindakanId = String(
                                  displayRecord.id ?? "",
                                ).trim();
                                const isJenisTindakanEditable =
                                  def.id === "tindakan" &&
                                  key === "tindakan" &&
                                  Boolean(tindakanId);
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
                                const isDokterEditable =
                                  def.id === "tim" &&
                                  key === "dokter" &&
                                  Boolean(tindakanId);
                                const isRadiologiEditable =
                                  def.id === "radiologi" &&
                                  RADIOLOGI_AUTOSAVE_FIELDS.includes(
                                    key as RadiologiFieldKey,
                                  ) &&
                                  Boolean(tindakanId);

                                const canPatchTindakan = Boolean(tindakanId);
                                const isBiayaAutosaveField =
                                  BIAYA_AUTOSAVE_KEYS.has(key);
                                const isBiayaEditable =
                                  def.id === "biaya" &&
                                  isBiayaAutosaveField &&
                                  canPatchTindakan &&
                                  (key === "total" ||
                                    isBiayaWireframeEmpty(key, rawVal));

                                return (
                                  <div
                                    key={key}
                                    className={cn(
                                      "rounded-lg border px-3 py-2.5 transition-all duration-300",
                                      "border-cyan-500/10 bg-black/20 hover:border-cyan-500/30 hover:shadow-[0_0_10px_rgba(34,211,238,0.05)]",
                                      key === "no_rm" &&
                                        "border-yellow-500/20 bg-yellow-500/5",
                                    )}
                                  >
                                    <dt className="text-[9px] font-black uppercase tracking-widest text-gray-600">
                                      {FIELD_LABELS[key] ?? key}
                                    </dt>
                                    <dd
                                      className={cn(
                                        "mt-1 text-[13px] font-bold leading-snug text-white",
                                        key === "no_rm" && "text-yellow-400",
                                        key === "pemakaian" &&
                                          "whitespace-pre-wrap font-mono text-[11px] leading-relaxed tracking-tight text-cyan-50/90",
                                      )}
                                    >
                                      {isRadiologiEditable ? (
                                        <RadiologiAutosaveField
                                          tindakanId={tindakanId}
                                          field={key as RadiologiFieldKey}
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
                                      ) : isDokterEditable ? (
                                        <MasterDokterField
                                          tindakanId={tindakanId}
                                          value={
                                            rawVal === null ||
                                            rawVal === undefined
                                              ? null
                                              : String(rawVal)
                                          }
                                          onSaved={onRecordPatch}
                                        />
                                      ) : isTimPerawatEditable ? (
                                        <MasterPerawatTimField
                                          tindakanId={tindakanId}
                                          field={key as TimPerawatFieldKey}
                                          value={
                                            rawVal === null ||
                                            rawVal === undefined
                                              ? null
                                              : String(rawVal)
                                          }
                                          onSaved={onRecordPatch}
                                        />
                                      ) : isCathlabEditable ? (
                                        <CathlabSlotField
                                          tindakanId={tindakanId}
                                          value={
                                            rawVal === null ||
                                            rawVal === undefined
                                              ? null
                                              : String(rawVal)
                                          }
                                          onSaved={onRecordPatch}
                                        />
                                      ) : isJenisTindakanEditable ? (
                                        <MasterJenisTindakanField
                                          tindakanId={tindakanId}
                                          value={
                                            rawVal === null ||
                                            rawVal === undefined
                                              ? null
                                              : String(rawVal)
                                          }
                                          onSaved={onRecordPatch}
                                        />
                                      ) : isKategoriEditable ? (
                                        <KategoriTindakanField
                                          tindakanId={tindakanId}
                                          value={
                                            rawVal === null ||
                                            rawVal === undefined
                                              ? null
                                              : String(rawVal)
                                          }
                                          onSaved={onRecordPatch}
                                        />
                                      ) : (
                                        formatFieldValue(key, rawVal)
                                      )}
                                    </dd>
                                  </div>
                                );
                              })}
                            </dl>
                            {def.id === "tindakan" ? (
                              <div className="mt-4 rounded-xl border border-cyan-500/20 bg-black/20 p-4">
                                <SignTimeFields
                                  tindakanId={String(
                                    displayRecord.id ?? "",
                                  ).trim()}
                                  signInValue={getWireframeFieldValue(
                                    displayRecord as unknown as Record<
                                      string,
                                      unknown
                                    >,
                                    "fast_track_sign_in",
                                  )}
                                  timeOutValue={getWireframeFieldValue(
                                    displayRecord as unknown as Record<
                                      string,
                                      unknown
                                    >,
                                    "fast_track_time_out",
                                  )}
                                  signOutValue={getWireframeFieldValue(
                                    displayRecord as unknown as Record<
                                      string,
                                      unknown
                                    >,
                                    "fast_track_sign_out",
                                  )}
                                  onSaved={onRecordPatch}
                                />
                              </div>
                            ) : null}
                          </>
                        )}
                      </div>
                    ),
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );

  if (!layer) return null;
  return createPortal(layer, document.body);
}
