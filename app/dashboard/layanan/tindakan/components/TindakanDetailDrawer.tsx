"use client";

import { useEffect, useMemo, useRef, useState, memo } from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  Check,
  ClipboardList,
  Copy,
  History,
  type LucideIcon,
  MapPin,
  PanelLeft,
  Stethoscope,
  User,
  Users,
  Wallet,
  X,
  Zap,
} from "lucide-react";

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
import PasienAutosaveField, {
  isPasienDrawerAutosaveKey,
  type PasienDrawerAutosaveKey,
} from "./PasienAutosaveField";
import RsPerujukField from "./RsPerujukField";
import RuanganTindakanField from "./RuanganTindakanField";
import SignTimeFields from "./SignTimeFields";
import { buildResumeWhatsAppText } from "../lib/buildResumeWhatsAppText";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { UI_LAYERS } from "@/lib/ui/layers";
import { usePasienDetail, useTindakanDetail } from "@/app/hooks/useMasterData";

type Props = {
  open: boolean;
  initialTab?: WireframeTabId;
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

const RADIOLOGI_AUTOSAVE_FIELDS: RadiologiFieldKey[] = [
  "fluoro_time",
  "air_kerma",
  "dap_dose",
  "kv",
  "ma",
  "waktu",
];

const KLINIS_AUTOSAVE_FIELDS: (KlinisFieldKey | string)[] = [
  "diagnosa",
  "severity_level",
  "hasil_lab_ppm",
  "pci_report_link",
  "kesimpulan_laporan",
  "plan_medis",
  "temuan_pembuluh",
  "faktor_risiko",
  "total_kontras",
  "operan_ranap",
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

  /** Field klinis — "Tersimpan otomatis per pasien": jika baris tindakan kosong, ambil dari master pasien. */
  const pci_report_link = isBlank(row.pci_report_link)
    ? pasien.pci_report_link || null
    : row.pci_report_link;
  const diagnosa = isBlank(row.diagnosa)
    ? pasien.diagnosa || null
    : row.diagnosa;
  const faktor_risiko = isBlank(row.faktor_risiko)
    ? pasien.faktor_risiko || null
    : row.faktor_risiko;
  const severity_level = isBlank(row.severity_level)
    ? pasien.severity_level || null
    : row.severity_level;
  const hasil_lab_ppm = isBlank(row.hasil_lab_ppm)
    ? pasien.hasil_lab_ppm || null
    : row.hasil_lab_ppm;

  // Temuan pembuluh (coronary anatomy) hanya di-copy otomatis jika tindakan berkaitan dengan jantung koroner.
  // Untuk tindakan perifer/vein seperti EVLA, kita biarkan kosong jika baris tindakan memang kosong.
  const tStr = String(row.tindakan ?? "").toLowerCase();
  const kStr = String(row.kategori ?? "");
  const isCoronaryMaybe =
    tStr.includes("pci") ||
    tStr.includes("cag") ||
    tStr.includes("dca") ||
    tStr.includes("ptca") ||
    tStr.includes("stent") ||
    ["PCI", "Diagnostic"].includes(kStr);
  const isPeriferOrVein =
    tStr.includes("evla") || tStr.includes("varises") || kStr === "EVLA";

  const temuan_pembuluh = isBlank(row.temuan_pembuluh)
    ? isCoronaryMaybe && !isPeriferOrVein
      ? pasien.temuan_pembuluh || null
      : null
    : row.temuan_pembuluh;

  const kesimpulan_laporan = isBlank(row.kesimpulan_laporan)
    ? pasien.kesimpulan_laporan || null
    : row.kesimpulan_laporan;
  const plan_medis = isBlank(row.plan_medis)
    ? pasien.plan_medis || null
    : row.plan_medis;
  const total_kontras = isBlank(row.total_kontras)
    ? pasien.total_kontras || null
    : row.total_kontras;

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
    pci_report_link,
    diagnosa,
    faktor_risiko,
    severity_level,
    hasil_lab_ppm,
    temuan_pembuluh,
    kesimpulan_laporan,
    plan_medis,
    total_kontras,
  };
}

const TAB_ICONS: Record<WireframeTabId, LucideIcon> = {
  pasien: User,
  fast_track: Zap,
  tindakan: Stethoscope,
  lokasi: MapPin,
  tim: Users,
  radiologi: Activity,
  klinis: ClipboardList,
  biaya: Wallet,
  kelengkapan: Check,
  history: History,
};

interface DrawerSidebarTabButtonProps {
  t: (typeof WIREFRAME_DRAWER_TABS)[number];
  isActive: boolean;
  hasData?: boolean;
  onClick: () => void;
}

function DrawerSidebarTabButton({
  t,
  isActive,
  hasData,
  onClick,
}: DrawerSidebarTabButtonProps) {
  const Icon = TAB_ICONS[t.id as WireframeTabId];

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      title={t.label}
      onClick={onClick}
      className={cn(
        "group relative flex w-full cursor-pointer select-text items-start gap-2 rounded-xl px-2.5 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide transition-all duration-200 sm:text-xs focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-[#005EB8]/35",
        isActive
          ? "border border-[#005EB8]/35 bg-[#005EB8]/10 text-[#005EB8] shadow-sm"
          : "border border-transparent text-[#4A5568] hover:border-[#E8EDF2] hover:bg-white hover:text-[#2D3748]",
      )}
    >
      {Icon ? (
        <Icon
          size={15}
          className={cn(
            "mt-0.5 shrink-0 transition-colors duration-200",
            isActive
              ? "text-[#005EB8]"
              : "text-[#4A5568] group-hover:text-[#005EB8]/90",
          )}
        />
      ) : null}
      <span className="min-w-0 flex-1 select-text leading-snug">
        <span className="select-text sm:hidden">{t.short}</span>
        <span className="hidden select-text sm:inline">{t.label}</span>
      </span>
      {hasData && !isActive ? (
        <span className="absolute right-1.5 top-2 flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#005EB8] opacity-40" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#005EB8]" />
        </span>
      ) : null}
    </button>
  );
}

function TindakanDetailDrawer({
  open,
  initialTab,
  record,
  allTindakanRows = [],
  onClose,
  onRecordPatch,
}: Props) {
  const [tab, setTab] = useState<WireframeTabId>("pasien");
  const lastIdRef = useRef<string | null>(null);

  // Sync tab with initialTab when drawer opens or initialTab changes
  useEffect(() => {
    if (open && initialTab) {
      setTab(initialTab);
    }
  }, [open, initialTab]);

  const [waCopied, setWaCopied] = useState(false);
  const [titleCopied, setTitleCopied] = useState(false);
  /** Di viewport < sm: panel tab bisa disembunyikan agar konten lebar; default tertutup. */
  const [mobileTabMenuOpen, setMobileTabMenuOpen] = useState(false);

  // SWR hooks for master data
  const { pasien: pasienMaster, mutate: mutatePasien } = usePasienDetail(
    open ? record?.pasien_id : null,
    open ? record?.no_rm : null,
    open ? record?.nama_pasien : null,
  );

  const { tindakan: tindakanDetail, mutate: mutateTindakan } =
    useTindakanDetail(open ? record?.id : null);

  // Jika record di-sync (mis. pci_report_link masuk dari drive), UI harus refresh
  useEffect(() => {
    if (!open || !record?.id) return;

    // Polling kecil jika record sedang ditunggu (Background Sync HUD aktif)
    // Ini memastikan jika user sedang buka drawer, link yang baru masuk
    // akan muncul tanpa harus buka-tutup drawer.
    const interval = setInterval(() => {
      void mutateTindakan();
    }, 10000); // 10 detik polling saat drawer terbuka

    return () => clearInterval(interval);
  }, [open, record?.id]);

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
    if (!open) {
      lastIdRef.current = null;
      return;
    }
    const currentId = record?.id ? String(record.id) : null;
    // Persist active tab when switching records:
    // If we're opening a new record but the drawer was already open (switching),
    // we DON'T reset to "pasien". We stay on whatever tab the user was on.
    // If the drawer was CLOSED (lastIdRef was null) and we're just opening it,
    // only then do we reset to "pasien" (or respect initialTab).
    if (currentId && currentId !== lastIdRef.current) {
      if (!lastIdRef.current && !initialTab) {
        setTab("pasien");
      }
      lastIdRef.current = currentId;
    }
  }, [open, record?.id, initialTab]);

  const displayRecord = useMemo(() => {
    if (!record) return null;

    // Gabungkan data dari record (snapshot table), pasienMaster (SWR),
    // dan tindakanDetail (SWR - data paling baru dari DB).
    // Ini krusial agar saat Background Sync di drive masuk,
    // link pci_report_link langsung muncul tanpa user harus tutup-buka drawer.
    const baseRow = {
      ...record,
      ...(tindakanDetail || {}), // Prioritaskan data terbaru dari DB (SWR)
    };

    const merged = mergePasienMasterIntoRow(
      baseRow as TindakanJoinResult,
      pasienMaster,
    );

    // Fallback khusus tarif jika belum ada di DB
    if (isTarifPresent(merged.tarif_tindakan) || detailTarifFromApi == null)
      return merged;
    return { ...merged, tarif_tindakan: detailTarifFromApi };
  }, [record, pasienMaster, tindakanDetail, detailTarifFromApi]);

  /** Untuk autosave master pasien: utamakan FK baris, lalu id hasil lookup RM/nama. */
  const pasienEditId = useMemo(() => {
    if (!displayRecord) return "";
    const fromRow = String(displayRecord.pasien_id ?? "").trim();
    if (fromRow) return fromRow;
    return String(pasienMaster?.id ?? "").trim();
  }, [displayRecord, pasienMaster?.id]);

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

  useEffect(() => {
    if (!open) setMobileTabMenuOpen(false);
  }, [open]);

  // Jembatan Navigasi Otomatis (Auto-Jump Tab)
  // Jika sedang di tab awal (Pasien) dan link laporan terdeteksi masuk (via Sync Drive),
  // otomatis arahkan navigasi ke tab Klinis agar user langsung melihat hasilnya.
  useEffect(() => {
    if (!open || !displayRecord?.pci_report_link || tab !== "pasien") return;

    // Hanya auto-jump jika link tersebut baru saja muncul (via SWR/Sync)
    // dan user sedang tidak aktif mengedit field lain di tab Pasien.
    const timer = setTimeout(() => {
      setTab("klinis");
      toast.info("Laporan ditemukan!", {
        description: "Navigasi otomatis dialihkan ke tab Klinis.",
        duration: 3000,
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [open, displayRecord?.pci_report_link]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const fullTitleText = useMemo(() => {
    if (!displayRecord) return "";
    const tanggalVal = getWireframeFieldValue(
      displayRecord as unknown as Record<string, unknown>,
      "tanggal_tindakan",
    );
    const hariTanggal = formatDrawerTitleHariTanggal(tanggalVal);
    const rmStr = String(displayRecord.no_rm ?? "").trim();
    const namaStr = String(displayRecord.nama_pasien ?? "").trim() || "—";
    const tinStr = String(displayRecord.tindakan ?? "").trim();
    return `${hariTanggal} ${rmStr || "—"} ${namaStr} ${tinStr || "—"}`;
  }, [displayRecord]);

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
      <div className="flex min-w-0 flex-1 cursor-default select-none items-center gap-2 overflow-hidden whitespace-nowrap">
        <div className="flex select-none items-center gap-2 overflow-hidden whitespace-nowrap">
          <span className="text-[#4A5568]">{hariTanggal}</span>
          <span className="font-black text-[#005EB8]">{rmStr || "—"}</span>
          <span className="font-bold text-[#2D3748]">{namaStr}</span>
          <span className="font-semibold text-[#005EB8]">{tinStr || "—"}</span>
        </div>
        {displayRecord && (
          <button
            type="button"
            title="Salin judul"
            onClick={async (e) => {
              e.stopPropagation();
              try {
                await navigator.clipboard.writeText(fullTitleText);
                setTitleCopied(true);
                toast.success("Judul disalin ke clipboard", {
                  duration: 2000,
                  position: "top-center",
                });
                setTimeout(() => setTitleCopied(false), 2000);
              } catch (err) {
                toast.error("Gagal menyalin judul");
              }
            }}
            className={cn(
              "flex h-5 w-5 shrink-0 cursor-pointer select-none items-center justify-center rounded-lg border border-[#005EB8]/40 bg-white text-[#005EB8] transition-all duration-300 hover:bg-[#E8EDF2]",
              titleCopied && "border-emerald-600/40 bg-emerald-50 text-emerald-700",
            )}
          >
            {titleCopied ? <Check size={10} /> : <Copy size={10} />}
          </button>
        )}
      </div>
    );
  }, [displayRecord, fullTitleText, titleCopied]);

  /**
   * Portal ke body (atau fullscreen element): ancestor `LayoutMain` memakai `motion.div` (transform), sehingga
   * `fixed` di dalam tab tidak menutupi viewport penuh — BottomNav (mobile) tetap di atas
   * dan konten drawer terasa “terhalang”. Portal mengembalikan perilaku fixed ke viewport.
   */
  const [mountPoint, setMountPoint] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setMountPoint(document.fullscreenElement as HTMLElement || document.body);
    const handle = () => setMountPoint(document.fullscreenElement as HTMLElement || document.body);
    document.addEventListener("fullscreenchange", handle);
    return () => document.removeEventListener("fullscreenchange", handle);
  }, []);

  if (!open || !mountPoint) return null;

  const layer = (
    <div className={`fixed inset-0 ${UI_LAYERS.drawerPortal}`}>
        <button
          type="button"
          aria-label="Tutup detail tindakan"
          className={cn("absolute inset-0", "bg-[#2D3748]/45")}
          onClick={onClose}
        />
        {/* Flex center (bukan translate -50%) agar teks tidak blur di subpiksel / Windows */}
        <div className="absolute inset-0 z-[1] flex items-center justify-center pointer-events-none pl-[var(--sidebar-width,0px)] pr-2 sm:pr-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="tindakan-detail-modal-title"
            className={cn(
              "pointer-events-auto flex h-[85vh] max-h-[85vh] min-w-0 w-full max-w-5xl flex-col overflow-hidden rounded-2xl border antialiased [text-rendering:optimizeLegibility]",
              "border-[#E8EDF2] bg-[#F0F4F8] shadow-[0_24px_48px_rgba(45,55,72,0.12)]",
              "font-[family-name:Inter,ui-sans-serif,system-ui,sans-serif]",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={cn(
                "shrink-0 border-b px-3 py-2.5 sm:px-4",
                "border-[#E8EDF2] bg-white",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    className={cn(
                      "shrink-0 rounded-lg border p-1.5 transition-all sm:hidden",
                      "border-[#E8EDF2] bg-white text-[#005EB8] hover:bg-[#F0F4F8]",
                    )}
                    aria-expanded={mobileTabMenuOpen}
                    aria-controls="tindakan-drawer-tabnav"
                    onClick={() => setMobileTabMenuOpen((v) => !v)}
                    aria-label={
                      mobileTabMenuOpen
                        ? "Tutup menu bagian"
                        : "Buka menu bagian"
                    }
                  >
                    {mobileTabMenuOpen ? (
                      <X size={17} aria-hidden />
                    ) : (
                      <PanelLeft size={17} aria-hidden />
                    )}
                  </button>
                  <div
                    id="tindakan-detail-modal-title"
                    className="flex min-w-0 flex-1 cursor-default select-none items-center gap-2 overflow-hidden text-[13px] font-bold leading-snug text-[#2D3748] sm:text-sm"
                  >
                    {title}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className={cn(
                    "shrink-0 rounded-lg border p-1.5 transition-all duration-300",
                    "border-[#E8EDF2] bg-white text-[#4A5568] hover:border-[#005EB8]/30 hover:text-[#005EB8]",
                  )}
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            <div className="relative flex min-h-0 min-w-0 flex-1">
              {mobileTabMenuOpen ? (
                <button
                  type="button"
                  aria-label="Tutup menu bagian"
                  className="absolute inset-0 z-10 bg-[#2D3748]/25 sm:hidden"
                  onClick={() => setMobileTabMenuOpen(false)}
                />
              ) : null}
              <nav
                id="tindakan-drawer-tabnav"
                className={cn(
                  "relative z-10 flex shrink-0 flex-col gap-1 overflow-y-auto border-r py-3 pl-2 pr-1.5 sm:w-[15rem] sm:pl-3 sm:pr-2",
                  "border-[#E8EDF2] bg-white scrollbar-thin scrollbar-thumb-[#CBD5E0]",
                  "max-sm:absolute max-sm:inset-y-0 max-sm:left-0 max-sm:z-20 max-sm:w-52 max-sm:shadow-[4px_0_32px_rgba(45,55,72,0.15)]",
                  "max-sm:transition-transform max-sm:duration-200 max-sm:ease-out",
                  !mobileTabMenuOpen &&
                    "max-sm:pointer-events-none max-sm:-translate-x-full",
                )}
                role="tablist"
                aria-label="Bagian detail tindakan"
              >
                {WIREFRAME_DRAWER_TABS.map((t) => {
                  const hasData = displayRecord
                    ? t.fields.some((f) => {
                        const val = getWireframeFieldValue(
                          displayRecord as unknown as Record<string, unknown>,
                          f,
                        );
                        return !isBlank(val);
                      }) ||
                      Boolean(
                        t.id === "fast_track" &&
                          getWireframeFieldValue(
                            displayRecord as unknown as Record<string, unknown>,
                            "is_fast_track",
                          ),
                      )
                    : false;

                  return (
                    <DrawerSidebarTabButton
                      key={t.id}
                      t={t}
                      isActive={tab === t.id}
                      hasData={hasData}
                      onClick={() => {
                        setTab(t.id);
                        setMobileTabMenuOpen(false);
                      }}
                    />
                  );
                })}
              </nav>

              <div
                className={cn(
                  "clinical-detail-drawer-panel min-h-0 min-w-0 flex-1 overflow-y-auto px-3 py-3 sm:px-5 sm:py-5",
                  "bg-[#D1D9E5] text-[#2C3E50] scrollbar-thin scrollbar-thumb-[#94A3B8]",
                  "font-[family-name:Inter,ui-sans-serif,system-ui,sans-serif]",
                  "[&_input:not([type='checkbox']):not([type='radio'])]:rounded-xl",
                  "[&_input:not([type='checkbox']):not([type='radio'])]:!border-white/12",
                  "[&_input:not([type='checkbox']):not([type='radio'])]:!bg-[#5C6573]",
                  "[&_input:not([type='checkbox']):not([type='radio'])]:!text-white",
                  "[&_input]:placeholder:!text-white/55",
                  "[&_select]:rounded-xl [&_select]:!border-white/12 [&_select]:!bg-[#5C6573] [&_select]:!text-white",
                )}
              >
              {!displayRecord ? (
                <p className="text-sm font-semibold text-[#2C3E50]/85">
                  Tidak ada data baris.
                </p>
              ) : (
                <>
                  {/* Tab: History (Resume) */}
                  <div className={cn(tab !== "history" && "hidden")}>
                    <div className="space-y-4">
                      {/* ... existing history content ... */}
                      <div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2C3E50]">
                          Resume
                        </h3>
                        <p className="mt-1 text-xs font-medium text-[#2C3E50]/80">
                          Ringkasan semua bagian ada di versi teks WhatsApp di
                          bawah. Lanjut: metadata sistem dan riwayat tindakan
                          pasien yang sama.
                        </p>
                      </div>

                      {/* Ringkasan Klinis Sesi Ini */}
                      <div
                        className={cn(
                          "rounded-2xl border border-[#9AA8B8]/80 bg-[#B8C5D3] p-4 shadow-none transition-all duration-300",
                        )}
                      >
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-white">
                          Hasil Klinis Sesi Ini
                        </h3>
                        <div className="mt-3 space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <dt className="text-[10px] font-black uppercase tracking-wider text-white/90">
                                Diagnosa Awal & Severity
                              </dt>
                              <dd className="mt-1 flex items-center gap-2">
                                <span className="text-xs font-bold text-white">
                                  {displayRecord.diagnosa || "—"}
                                </span>
                                {displayRecord.severity_level && (
                                  <span className="rounded bg-red-900/25 px-1.5 py-0.5 text-[10px] font-black text-red-100 ring-1 ring-red-200/40">
                                    Lvl {displayRecord.severity_level}
                                  </span>
                                )}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-[10px] font-black uppercase tracking-wider text-white/90">
                                Kelompok Kasus (Grup)
                              </dt>
                              <dd className="mt-1">
                                <span className="rounded bg-[#2C3E50]/35 px-1.5 py-0.5 text-[10px] font-black text-white">
                                  {displayRecord.kategori || "—"}
                                </span>
                              </dd>
                            </div>
                          </div>
                          {displayRecord.kesimpulan_laporan && (
                            <div>
                              <dt className="text-[10px] font-black uppercase tracking-wider text-white/90">
                                Hasil Akhir (Temuan Medis)
                              </dt>
                              <dd className="mt-1 border-l-2 border-white/35 pl-3 text-xs font-medium italic leading-relaxed text-white/95">
                                {displayRecord.kesimpulan_laporan}
                              </dd>
                            </div>
                          )}
                          {displayRecord.plan_medis && (
                            <div>
                              <dt className="text-[10px] font-black uppercase tracking-wider text-white/90">
                                Rencana Lanjutan (Plan)
                              </dt>
                              <dd className="mt-1 text-xs font-medium leading-relaxed text-white/90">
                                {displayRecord.plan_medis}
                              </dd>
                            </div>
                          )}
                        </div>
                      </div>

                      <div
                        className={cn(
                          "rounded-2xl border border-[#9AA8B8]/80 bg-[#B8C5D3] p-4 shadow-none transition-all duration-300",
                        )}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-white">
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
                                window.setTimeout(
                                  () => setWaCopied(false),
                                  2500,
                                );
                              } catch {
                                setWaCopied(false);
                              }
                            }}
                            disabled={!resumeWhatsAppText}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-black uppercase tracking-wider transition-all duration-300 disabled:opacity-50",
                              "border-[#2C3E50] bg-[#2C3E50] text-white hover:bg-[#243342]",
                            )}
                          >
                            <Copy size={14} aria-hidden />
                            Salin untuk WA
                          </button>
                        </div>
                        {waCopied ? (
                          <p
                            className="mt-2 text-xs font-semibold text-white/85 animate-pulse"
                            role="status"
                          >
                            Tersalin — tempel di WhatsApp.
                          </p>
                        ) : null}
                        <label className="mt-3 block">
                          <span className="sr-only">
                            Pratinjau teks WhatsApp
                          </span>
                          <textarea
                            readOnly
                            value={resumeWhatsAppText}
                            rows={8}
                            className={cn(
                              "mt-1 w-full resize-none rounded-xl border border-white/12 bg-[#5C6573] px-3 py-2.5 font-mono text-[11px] font-medium leading-relaxed text-white/95 outline-none transition-all duration-300 placeholder:text-white/55",
                            )}
                          />
                        </label>
                      </div>

                      <div
                        className={cn(
                          "rounded-xl border border-[#9AA8B8]/80 bg-[#B8C5D3] px-4 py-3 shadow-none transition-all duration-300",
                        )}
                      >
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90">
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
                                <dt className="text-[10px] font-black uppercase tracking-wider text-white/90">
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
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2C3E50]">
                            Riwayat tindakan pasien
                          </p>
                          <p className="text-[10px] font-bold text-[#2C3E50]">
                            {displayRecord.no_rm
                              ? `NO. RM: ${String(displayRecord.no_rm).trim()}`
                              : displayRecord.pasien_id
                                ? `PASIEN ID: ${String(displayRecord.pasien_id).trim()}`
                                : "IDENTITAS PASIEN TERBATAS"}
                          </p>
                        </div>
                        {riwayatPasienRows.length === 0 ? (
                          <p className="rounded-xl border border-dashed border-[#6B7280] bg-[#B8C5D3]/60 px-4 py-4 text-xs font-medium text-[#2C3E50]">
                            Tidak ada baris lain yang cocok dengan RM / ID
                            pasien ini dalam snapshot data saat ini.
                          </p>
                        ) : (
                          <ul className="space-y-2">
                            {riwayatPasienRows.map((r, idx) => {
                              const rid = String(r.id ?? "").trim();
                              const curId = String(
                                displayRecord.id ?? "",
                              ).trim();
                              const isCurrent =
                                rid !== "" && curId !== "" && rid === curId;
                              return (
                                <li
                                  key={rid || `peer-${idx}-${r.tanggal ?? ""}`}
                                  className={cn(
                                    "rounded-xl border px-4 py-3 text-sm transition-all duration-300",
                                    isCurrent
                                      ? "border-[#2C3E50] bg-[#A8B4C2] shadow-sm"
                                      : "border-[#9AA8B8] bg-[#C5CEDA] hover:border-[#2C3E50]/35",
                                  )}
                                >
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-mono text-xs font-black text-[#2C3E50]">
                                      {formatFieldValue(
                                        "tanggal_tindakan",
                                        getWireframeFieldValue(
                                          r as unknown as Record<
                                            string,
                                            unknown
                                          >,
                                          "tanggal_tindakan",
                                        ),
                                      )}
                                    </span>
                                    {isCurrent ? (
                                      <span className="rounded border border-[#2C3E50] bg-[#2C3E50] px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white">
                                        KASUS INI
                                      </span>
                                    ) : null}
                                  </div>
                                  <p className="mt-1.5 font-bold text-[#2C3E50]">
                                    {r.tindakan?.trim() || "—"}
                                    {r.kategori && (
                                      <span className="ml-2 rounded bg-[#2C3E50]/20 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-[#2C3E50]">
                                        {r.kategori}
                                      </span>
                                    )}
                                  </p>
                                  {r.kesimpulan_laporan && (
                                    <p className="mt-1 text-[11px] italic text-[#2C3E50]/80 line-clamp-1">
                                      {r.kesimpulan_laporan}
                                    </p>
                                  )}
                                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-medium text-[#2C3E50]/85">
                                    <span>
                                      <span className="font-black uppercase tracking-tighter text-[#2C3E50]/70 mr-1">
                                        Dokter:
                                      </span>
                                      {r.dokter?.trim() || "—"}
                                    </span>
                                    <span>
                                      <span className="font-black uppercase tracking-tighter text-[#2C3E50]/70 mr-1">
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
                  </div>

                  {/* Other Tabs */}
                  {WIREFRAME_DRAWER_TABS.filter((x) => x.id !== "history").map(
                    (def) => (
                      <div
                        key={def.id}
                        className={cn("space-y-3", tab !== def.id && "hidden")}
                      >
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2C3E50]">
                          {def.label}
                        </h3>
                        {def.id === "fast_track" ? (
                          <div className="rounded-2xl border border-[#9AA8B8]/80 bg-[#B8C5D3] p-4 shadow-none">
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
                                  const pasienId = String(
                                    displayRecord.pasien_id ?? "",
                                  ).trim();
                                  return (
                                    <div
                                      key={key}
                                      className={cn(
                                        "rounded-lg border px-3 py-2.5 transition-all duration-300",
                                        "border-[#9AA8B8]/80 bg-[#B8C5D3] shadow-none hover:border-[#2C3E50]/25",
                                      )}
                                    >
                                      <dt className="text-[9px] font-black uppercase tracking-widest text-white/90">
                                        {FIELD_LABELS[key] ?? key}
                                      </dt>
                                      <dd className="mt-1 text-[13px] font-bold leading-snug text-white">
                                        <KlinisAutosaveField
                                          tindakanId={tindakanId}
                                          pasienId={pasienId}
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
                                  "flex flex-col gap-4 rounded-xl border border-[#9AA8B8]/80 bg-[#B8C5D3] px-3 py-3 shadow-none transition-all duration-300",
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
                                    const pasienId = String(
                                      displayRecord.pasien_id ?? "",
                                    ).trim();
                                    return (
                                      <div key={key}>
                                        <dt className="text-[9px] font-black uppercase tracking-widest text-white/90">
                                          {FIELD_LABELS[key] ?? key}
                                        </dt>
                                        <dd className="mt-1 text-[13px] font-bold leading-snug text-white">
                                          <KlinisAutosaveField
                                            tindakanId={tindakanId}
                                            pasienId={pasienId}
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
                            <dl
                              className={cn(
                                "grid grid-cols-1 gap-3",
                                def.id === "radiologi"
                                  ? "sm:grid-cols-4"
                                  : "sm:grid-cols-3",
                              )}
                            >
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
                                const pasienId = String(
                                  displayRecord.pasien_id ?? "",
                                ).trim();
                                const isJenisTindakanEditable =
                                  def.id === "tindakan" &&
                                  key === "tindakan" &&
                                  Boolean(tindakanId);
                                const isKategoriEditable =
                                  def.id === "tindakan" &&
                                  key === "kategori" &&
                                  Boolean(tindakanId);
                                const isRuanganEditable =
                                  def.id === "lokasi" &&
                                  key === "ruangan" &&
                                  Boolean(tindakanId);
                                const isCathlabEditable =
                                  def.id === "lokasi" &&
                                  key === "cath" &&
                                  Boolean(tindakanId);
                                const isTimPerawatEditable =
                                  (def.id === "tim" || def.id === "kelengkapan") &&
                                  (key === "asisten" ||
                                    key === "sirkuler" ||
                                    key === "logger" ||
                                    key === "asmed" ||
                                    key === "resume_erm" ||
                                    key === "sjp" ||
                                    key === "berkas_laporan" ||
                                    key === "consumable_kelengkapan" ||
                                    key === "billing_simrs" ||
                                    key === "pj_laporan") &&
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
                                const isGenericKlinisEditable =
                                  KLINIS_AUTOSAVE_FIELDS.includes(
                                    key as KlinisFieldKey,
                                  ) && Boolean(tindakanId);

                                const isCompactField = [
                                  "kv",
                                  "ma",
                                  "total_kontras",
                                  "air_kerma",
                                  "dap_dose",
                                ].includes(key);

                                const canPatchTindakan = Boolean(tindakanId);
                                const isBiayaAutosaveField =
                                  BIAYA_AUTOSAVE_KEYS.has(key);
                                const isBiayaEditable =
                                  def.id === "biaya" &&
                                  isBiayaAutosaveField &&
                                  canPatchTindakan &&
                                  (key === "total" ||
                                    isBiayaWireframeEmpty(key, rawVal));
                                const isPasienMasterEditable =
                                  def.id === "pasien" &&
                                  isPasienDrawerAutosaveKey(key) &&
                                  Boolean(pasienEditId);
                                const isRsPerujukEditable =
                                  def.id === "pasien" &&
                                  key === "rs_perujuk" &&
                                  canPatchTindakan;

                                return (
                                  <div
                                    key={key}
                                    className={cn(
                                      "rounded-xl border border-[#9AA8B8]/80 bg-[#B8C5D3] px-3 py-2.5 shadow-none transition-all duration-300",
                                      "hover:border-[#2C3E50]/25",
                                      key === "no_rm" &&
                                        "border-[#2C3E50]/35 bg-[#A8B4C4]",
                                      isCompactField && "sm:col-span-1",
                                      (key === "air_kerma" ||
                                        key === "dap_dose") &&
                                        "border-[#9AA8B8]/80 bg-[#B8C5D3]",
                                    )}
                                  >
                                    <dt className="text-[9px] font-black uppercase tracking-widest text-white/90">
                                      {FIELD_LABELS[key] ?? key}
                                    </dt>
                                    <dd
                                      className={cn(
                                        "mt-1 text-[13px] font-bold leading-snug text-white",
                                        key === "no_rm" && "text-white",
                                        key === "pemakaian" &&
                                          "whitespace-pre-wrap font-mono text-[11px] leading-relaxed tracking-tight text-white/95",
                                      )}
                                    >
                                      {isPasienMasterEditable ? (
                                        <PasienAutosaveField
                                          pasienId={pasienEditId}
                                          wireframeKey={key as PasienDrawerAutosaveKey}
                                          rawValue={rawVal}
                                          onPasienUpdated={(p) => {
                                            void mutatePasien(
                                              { ok: true, data: p },
                                              { revalidate: false },
                                            );
                                          }}
                                          onSaved={onRecordPatch}
                                        />
                                      ) : isRsPerujukEditable ? (
                                        <RsPerujukField
                                          tindakanId={tindakanId}
                                          value={
                                            rawVal === null ||
                                            rawVal === undefined
                                              ? null
                                              : String(rawVal)
                                          }
                                          onSaved={onRecordPatch}
                                        />
                                      ) : isRadiologiEditable ? (
                                        <RadiologiAutosaveField
                                          tindakanId={tindakanId}
                                          field={key as RadiologiFieldKey}
                                          value={rawVal}
                                          onSaved={onRecordPatch}
                                        />
                                      ) : isGenericKlinisEditable ? (
                                        <KlinisAutosaveField
                                          tindakanId={tindakanId}
                                          pasienId={pasienId}
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
                                      ) : isRuanganEditable ? (
                                        <RuanganTindakanField
                                          tindakanId={tindakanId}
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
                              <div className="mt-4 rounded-2xl border border-[#9AA8B8]/80 bg-[#B8C5D3] p-4 shadow-none">
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
      </div>
    );

  return createPortal(layer, mountPoint);
}

export default memo(TindakanDetailDrawer);
