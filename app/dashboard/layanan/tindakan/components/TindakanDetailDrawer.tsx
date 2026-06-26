"use client";

import { useEffect, useMemo, useRef, useState, memo, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import {
  Activity,
  Check,
  ClipboardList,
  Copy,
  FileText,
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
import { formatTanggalLahirFromDb } from "@/app/dashboard/pasien/data/pasienSchema";
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
import PpdsField from "./PpdsField";
import DokterAnestesiField from "./DokterAnestesiField";
import MasterJenisTindakanField from "./MasterJenisTindakanField";
import RadiologiAutosaveField, {
  type RadiologiFieldKey,
} from "./RadiologiAutosaveField";
import KlinisAutosaveField, {
  type KlinisFieldKey,
} from "./KlinisAutosaveField";
import BiayaAutosaveField, {
  type BiayaAutosaveFieldKey,
  type BiayaAutosaveSyncedInfo,
} from "./BiayaAutosaveField";
import KelasPembiayaanBiayaField from "./KelasPembiayaanBiayaField";
import FastTrackBlock from "./FastTrackBlock";
import PasienAutosaveField, {
  isPasienDrawerAutosaveKey,
  type PasienDrawerAutosaveKey,
} from "./PasienAutosaveField";
import RsPerujukField from "./RsPerujukField";
import RuanganTindakanField from "./RuanganTindakanField";
import StatusTindakanField from "./StatusTindakanField";
import SignTimeFields from "./SignTimeFields";
import TindakanTanggalDrawerField from "./TindakanTanggalDrawerField";
import { buildResumeWhatsAppText } from "../lib/buildResumeWhatsAppText";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { UI_LAYERS, Z_INDEX_VALUES } from "@/lib/ui/layers";
import {
  MASTER_PASIEN_COMPACT_SWR_KEY,
  useMasterDoctors,
  usePasienDetail,
  useTindakanDetail,
} from "@/app/hooks/useMasterData";
import {
  canonicalDoctorStoredValue,
  type DoctorOption,
} from "@/components/ui/doctor-combobox";
import { mutate as mutateSwrGlobal } from "swr";

type Props = {
  open: boolean;
  initialTab?: WireframeTabId;
  record: TindakanJoinResult | null;
  /** Snapshot daftar tindakan (untuk tab Resume: riwayat pasien yang sama). */
  allTindakanRows?: TindakanJoinResult[];
  onClose: () => void;
  /** Setelah kolom/autosave sukses: refresh list atau patch optimistik (`BiayaAutosaveField` mengirim `BiayaAutosaveSyncedInfo`). */
  onRecordPatch?: (info?: BiayaAutosaveSyncedInfo) => void;
  /**
   * Simpan field tindakan lewat bridge (optimistic row + revalidate) — dipakai Sign in / Time out / Sign out
   * agar kolom Time out di tabel langsung ikut.
   */
  patchTindakanFields?: (
    id: string,
    body: Record<string, unknown>,
  ) => Promise<void>;
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
 * Kolom biaya: `total` selalu input; krs/consumable/pemakaian autosave hanya saat kosong;
 * `kelas_pembiayaan` memakai dua dropdown (selaras form Tambah Pasien).
 */
function isBiayaWireframeEmpty(key: string, val: unknown): boolean {
  if (val === null || val === undefined || val === "") return true;
  if (key === "total" || key === "krs" || key === "consumable") {
    const n = Number(val);
    return !Number.isFinite(n);
  }
  return String(val).trim() === "";
}

/** Tab Biaya (≥sm): kiri = nominal, kanan = kelas pembiayaan + pemakaian (teks). */
function biayaDrawerCardGridClass(key: string): string {
  return cn(
    key === "tarif_tindakan" && "sm:col-start-1 sm:row-start-1",
    key === "total" && "sm:col-start-2 sm:row-start-1",
    key === "kelas_pembiayaan" && "sm:col-start-3 sm:row-start-1",
    key === "krs" && "sm:col-start-1 sm:row-start-2",
    key === "selisih" && "sm:col-start-2 sm:row-start-2",
    key === "consumable" && "sm:col-start-1 sm:row-start-3 sm:col-span-2",
    key === "pemakaian" &&
      "sm:col-start-3 sm:row-start-2 sm:row-span-2 min-h-[12rem]",
  );
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

function resolveDrawerDokterLabel(
  record: TindakanJoinResult,
  doctorOptions?: DoctorOption[],
): string {
  const stored =
    String(record.dokter ?? "").trim() ||
    String(
      (record as TindakanJoinResult & { operator?: string | null }).operator ??
        "",
    ).trim();
  if (!stored) return "";

  let label = stored;
  if (doctorOptions?.length) {
    label = canonicalDoctorStoredValue(doctorOptions, stored) || stored;
  }

  // Header: tanpa gelar belakang / spesialis setelah koma.
  return label.split(",")[0].trim();
}

/** Jangan timpa nilai baris tabel dengan `null`/kosong dari fetch detail SWR. */
function mergeTindakanDetailIntoRecord(
  record: TindakanJoinResult,
  detail: Partial<TindakanJoinResult> | null | undefined,
): TindakanJoinResult {
  if (!detail) return record;
  const out: Record<string, unknown> = { ...record };
  for (const [key, value] of Object.entries(detail)) {
    if (value === null || value === undefined) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    out[key] = value;
  }
  return out as TindakanJoinResult;
}

function buildDrawerHeaderTitle(
  record: TindakanJoinResult,
  doctorOptions?: DoctorOption[],
) {
  const tanggalVal = getWireframeFieldValue(
    record as unknown as Record<string, unknown>,
    "tanggal_tindakan",
  );
  const hariTanggal = formatDrawerTitleHariTanggal(tanggalVal);
  const rmStr = String(record.no_rm ?? "").trim();
  const namaStr = String(record.nama_pasien ?? "").trim() || "—";
  const tinStr = String(record.tindakan ?? "").trim();
  const dokterStr = resolveDrawerDokterLabel(record, doctorOptions);
  const ruanganStr = String(record.ruangan ?? "").trim();
  const copyText = [hariTanggal, rmStr || "—", namaStr, tinStr || "—"]
    .filter(Boolean)
    .join(" ");
  return {
    hariTanggal,
    rmStr,
    namaStr,
    tinStr,
    dokterStr,
    ruanganStr,
    copyText,
  };
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

  const dobStr =
    typeof tgl_lahir === "string" && tgl_lahir.trim()
      ? tgl_lahir.trim()
      : (pasien.tanggalLahir?.trim() ?? "");
  const isoDob = formatTanggalLahirFromDb(dobStr);
  let umur: number | null = null;
  if (row.umur !== null && row.umur !== undefined) {
    const n = Number(row.umur);
    if (Number.isFinite(n)) umur = n;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDob)) {
    umur = hitungUsia(isoDob).angka;
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
  collapsed?: boolean;
  onClick: () => void;
}

function DrawerSidebarTabButton({
  t,
  isActive,
  hasData,
  collapsed,
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
        "group relative flex w-full cursor-pointer select-text items-start gap-2 rounded-xl px-2.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.12em] transition-all duration-200 sm:text-xs focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-slate-400/35",
        isActive
          ? "border border-slate-300 bg-white text-slate-900 shadow-[0_1px_4px_rgba(15,23,42,0.07)]"
          : "border border-transparent text-slate-600 hover:border-slate-300 hover:bg-[#DDE6F2] hover:text-slate-900",
        collapsed && "justify-center px-0",
      )}
    >
      {Icon ? (
        <Icon
          size={15}
          className={cn(
            "mt-0.5 shrink-0 transition-colors duration-200",
            isActive
              ? "text-indigo-700"
              : "text-slate-500 group-hover:text-slate-700",
            collapsed && "mt-0",
          )}
        />
      ) : null}
      {!collapsed && (
        <span className="min-w-0 flex-1 select-text leading-snug">
          <span className="select-text sm:hidden">{t.short}</span>
          <span className="hidden select-text sm:inline">{t.label}</span>
        </span>
      )}
      {hasData && !isActive ? (
        <span
          className={cn(
            "absolute right-1.5 top-2 flex h-1.5 w-1.5",
            collapsed && "right-1 top-1",
          )}
        >
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-500/35" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-indigo-500" />
        </span>
      ) : null}
    </button>
  );
}

function checkAllFieldsCompleted(record: any): boolean {
  if (!record) return false;

  const fieldsToCheck = [
    // Pasien
    ["no_rm"],
    ["nama_pasien"],
    ["jenis_kelamin", "jk"],
    ["tgl_lahir"],
    ["alamat"],
    ["no_telp"],
    // Tindakan
    ["tanggal", "tanggal_tindakan"],
    ["waktu"],
    ["tindakan"],
    ["kategori"],
    ["status"],
    ["temuan_pembuluh"],
    ["kesimpulan_laporan"],
    ["plan_medis"],
    // Lokasi
    ["ruangan"],
    ["cath"],
    // Tim
    ["dokter"],
    ["asisten"],
    ["sirkuler"],
    ["logger"],
    // Radiologi
    ["fluoro_time"],
    ["air_kerma", "dose"],
    ["dap_dose", "dap_gy_cm2"],
    ["total_kontras"],
    ["kv"],
    ["ma"],
    // Klinis
    ["pci_report_link"],
    ["diagnosa"],
    ["severity_level"],
    // Biaya
    ["kelas_pembiayaan", "kelas"],
    ["tarif_tindakan"],
    ["total"],
    ["krs"],
    // Kelengkapan
    ["asmed"],
    ["resume_erm"],
    ["sjp"],
    ["berkas_laporan"],
    ["consumable_kelengkapan"],
    ["billing_simrs"],
    ["pj_laporan"]
  ];

  for (const keys of fieldsToCheck) {
    const hasValue = keys.some(key => {
      const val = record[key];
      return val !== null && val !== undefined && String(val).trim() !== "" && String(val).trim() !== "—" && String(val).trim() !== "-";
    });
    if (!hasValue) return false;
  }
  return true;
}

function TindakanDetailDrawer({
  open,
  initialTab,
  record,
  allTindakanRows = [],
  onClose,
  onRecordPatch,
  patchTindakanFields,
}: Props) {
  const [tab, setTab] = useState<WireframeTabId>("pasien");
  const dragControls = useDragControls();
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
  /** Desktop sidebar toggle: jika true, sidebar kiri (nav) disembunyikan. */
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  // SWR hooks for master data
  const { pasien: pasienMaster, mutate: mutatePasien } = usePasienDetail(
    open ? record?.pasien_id : null,
    open ? record?.no_rm : null,
    open ? record?.nama_pasien : null,
  );

  const { doctors: doctorMasterRaw } = useMasterDoctors();
  const doctorOptions = useMemo<DoctorOption[]>(
    () =>
      doctorMasterRaw.map(
        (r: {
          id: string;
          nama_dokter: string;
          spesialis: string | null;
          aktif?: boolean;
        }) => ({
          id: r.id,
          nama_dokter: r.nama_dokter,
          spesialis: r.spesialis,
          aktif: r.aktif,
        }),
      ),
    [doctorMasterRaw],
  );

  const { tindakan: tindakanDetail, mutate: mutateTindakan } =
    useTindakanDetail(open ? record?.id : null);

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

  const displayRecord = useMemo(() => {
    if (!record) return null;

    // Gabungkan data dari record (snapshot table), pasienMaster (SWR),
    // dan tindakanDetail (SWR - data paling baru dari DB).
    // Ini krusial agar saat Background Sync di drive masuk,
    // link pci_report_link langsung muncul tanpa user harus tutup-buka drawer.
    const baseRow = mergeTindakanDetailIntoRecord(record, tindakanDetail);

    const merged = mergePasienMasterIntoRow(
      baseRow as TindakanJoinResult,
      pasienMaster,
    );

    // Fallback khusus tarif jika belum ada di DB
    if (isTarifPresent(merged.tarif_tindakan) || detailTarifFromApi == null)
      return merged;
    return { ...merged, tarif_tindakan: detailTarifFromApi };
  }, [record, pasienMaster, tindakanDetail, detailTarifFromApi]);

  const handleRecordPatch = useCallback(
    (info?: any) => {
      const wasCompleteBefore = checkAllFieldsCompleted(displayRecord);

      // Tampilkan toast notifikasi sukses untuk autosave field
      if (info && typeof info.field === "string") {
        const label = FIELD_LABELS[info.field] || info.field;
        toast.success(`${label} berhasil disimpan`, {
          id: `autosave-${info.field}`,
          duration: 2000,
        });

        // 1. Mutate the tindakan SWR cache immediately so the drawer shows the latest data.
        void mutateTindakan(
          (currentData: any) => {
            if (currentData && currentData.data) {
              const updatedData = {
                ...currentData.data,
              };
              if (info.value !== undefined) {
                updatedData[info.field] = info.value;
              }

              const mergedCheck = {
                ...displayRecord,
                ...updatedData,
              };

              if (!wasCompleteBefore && checkAllFieldsCompleted(mergedCheck)) {
                toast.success("Semua data tindakan telah terisi lengkap dan tersimpan!", {
                  description: "Seluruh field wajib & penunjang telah berhasil di-autosave.",
                  duration: 5000,
                });
              }

              return {
                ...currentData,
                data: updatedData,
              };
            }
            return currentData;
          },
          { revalidate: true },
        );
      } else {
        toast.success("Perubahan berhasil disimpan", {
          id: "autosave-generic",
          duration: 2000,
        });
        void mutateTindakan();
      }

      // Also trigger revalidation of pasien detail just in case
      void mutatePasien();

      // 2. Notify parent to sync the table list
      if (onRecordPatch) {
        const tid = String(displayRecord?.id ?? "").trim();
        if (info && typeof info.field === "string" && tid) {
          onRecordPatch({
            tindakanId: tid,
            field: info.field,
            value: info.value,
          });
        } else {
          onRecordPatch(info);
        }
      }
    },
    [onRecordPatch, mutateTindakan, mutatePasien, displayRecord],
  );

  // Jika record di-sync (mis. pci_report_link masuk dari drive), UI harus refresh
  useEffect(() => {
    if (!open || !record?.id || record?.pci_report_link || tindakanDetail?.pci_report_link) return;

    // Polling kecil jika record sedang ditunggu (Background Sync HUD aktif)
    // Ini memastikan jika user sedang buka drawer, link yang baru masuk
    // akan muncul tanpa harus buka-tutup drawer.
    const interval = setInterval(() => {
      void mutateTindakan();
    }, 10000); // 10 detik polling saat drawer terbuka

    return () => clearInterval(interval);
  }, [open, record?.id, record?.pci_report_link, tindakanDetail?.pci_report_link, mutateTindakan]);

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

  /** Untuk autosave master pasien: utamakan FK baris, lalu id hasil lookup RM/nama. */
  const pasienEditId = useMemo(() => {
    if (!displayRecord) return "";
    const fromRow = String(displayRecord.pasien_id ?? "").trim();
    if (fromRow) return fromRow;
    return String(pasienMaster?.id ?? "").trim();
  }, [displayRecord, pasienMaster?.id]);

  const riwayatPasienRows = useMemo(() => {
    if (!displayRecord || tab !== "history") return [];
    const peers = allTindakanRows.filter((r) =>
      isSamePatientTindakan(displayRecord, r),
    );
    return sortTindakanByTanggalDesc(peers);
  }, [allTindakanRows, displayRecord, tab]);

  const resumeWhatsAppText = useMemo(() => {
    if (!displayRecord || tab !== "history") return "";
    return buildResumeWhatsAppText(displayRecord, riwayatPasienRows);
  }, [displayRecord, riwayatPasienRows, tab]);

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

  const title = useMemo(() => {
    if (!displayRecord) return "Detail tindakan";
    const { hariTanggal, rmStr, namaStr, tinStr, dokterStr, ruanganStr } =
      buildDrawerHeaderTitle(displayRecord, doctorOptions);

    return (
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden whitespace-nowrap">
        <div className="flex min-w-0 cursor-default select-text items-center gap-2 overflow-hidden whitespace-nowrap">
          <span className="text-slate-300">{hariTanggal}</span>
          <span className="font-black tabular-nums text-amber-100">
            {rmStr || "—"}
          </span>
          <span className="font-bold text-white">{namaStr}</span>
          <span className="font-medium text-slate-200">{tinStr || "—"}</span>
        </div>
        <button
          type="button"
          title="Salin judul"
          onClick={async (e) => {
            e.stopPropagation();
            try {
              const text = buildDrawerHeaderTitle(
                displayRecord,
                doctorOptions,
              ).copyText;
              await navigator.clipboard.writeText(text);
              setTitleCopied(true);
              toast.success("Judul disalin ke clipboard", {
                duration: 2000,
                position: "top-center",
              });
              setTimeout(() => setTitleCopied(false), 2000);
            } catch {
              toast.error("Gagal menyalin judul");
            }
          }}
          className={cn(
            "flex h-5 w-5 shrink-0 cursor-pointer select-none items-center justify-center rounded-lg border border-white/25 bg-white/10 text-slate-200 transition-all duration-300 hover:border-white/40 hover:bg-white/20 hover:text-white",
            titleCopied && "border-emerald-400/50 bg-emerald-950/60 text-emerald-300",
          )}
        >
          {titleCopied ? <Check size={10} /> : <Copy size={10} />}
        </button>
        {(dokterStr || ruanganStr) && (
          <div className="flex min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap">
            {dokterStr && (
              <span className="font-medium text-slate-200">{dokterStr}</span>
            )}
            {ruanganStr && (
              <span className="font-medium text-slate-300">{ruanganStr}</span>
            )}
          </div>
        )}
      </div>
    );
  }, [displayRecord, doctorOptions, titleCopied]);

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

  if (!mountPoint) return null;

  const layer = (
    <AnimatePresence>
      {open && (
        <div
          className={cn(
            "fixed inset-0 pointer-events-none",
            UI_LAYERS.drawerPortal
          )}
          style={{ zIndex: Z_INDEX_VALUES.drawerPortal }}
        >
          {/* 
            Backdrop hanya aktif di mobile (< sm) agar user bisa fokus.
            Di desktop, backdrop dihilangkan (pointer-events-none) agar tabel di belakang bisa diklik.
          */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            type="button"
            aria-label="Tutup detail tindakan"
            className={cn(
              "absolute inset-0 sm:hidden", 
              "bg-[#2D3748]/45 pointer-events-auto"
            )}
            onMouseDown={(e) => {
              e.preventDefault();
              onClose();
            }}
            onClick={onClose}
          />
          {/* Flex center (bukan translate -50%) agar teks tidak blur di subpiksel / Windows */}
          <div className={cn(
            "absolute inset-0 z-[1] flex items-center justify-center pointer-events-none px-2 sm:px-4 transition-all duration-500 ease-in-out",
            sidebarCollapsed && "sm:translate-x-[12%]"
          )}>
            <motion.div
              role="dialog"
              aria-modal="false"
              aria-labelledby="tindakan-detail-modal-title"
              drag
              dragControls={dragControls}
              dragListener={false}
              dragMomentum={false}
              dragElastic={0.1}
              dragConstraints={{ left: -800, right: 800, top: -400, bottom: 400 }}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ 
                type: "spring", 
                damping: 20, 
                stiffness: 400,
                opacity: { duration: 0.15 }
              }}
              className={cn(
                "pointer-events-auto flex h-[85vh] max-h-[85vh] min-w-0 w-full max-w-5xl cursor-default flex-col overflow-hidden rounded-2xl border antialiased [text-rendering:optimizeLegibility]",
                "border-slate-200/90 bg-slate-50/90 shadow-[0_24px_56px_rgba(15,23,42,0.15),0_0_1px_rgba(15,23,42,0.1)]",
                "font-[family-name:Inter,ui-sans-serif,system-ui,sans-serif]",
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                onPointerDown={(e) => {
                  const target = e.target as HTMLElement;
                  if (
                    target.closest("button") ||
                    target.closest("input") ||
                    target.closest("select") ||
                    target.closest("textarea") ||
                    target.closest("a") ||
                    target.closest("[role='button']")
                  ) {
                    return;
                  }
                  dragControls.start(e);
                }}
                className={cn(
                  "shrink-0 border-b px-3 py-2.5 sm:px-4 cursor-grab active:cursor-grabbing",
                  "border-white/10 bg-gradient-to-r from-[#1B2B44] to-[#2D4A6E] shadow-[0_1px_0_rgba(255,255,255,0.08)_inset]",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
                    <button
                      type="button"
                      className={cn(
                        "shrink-0 rounded-lg border p-1.5 transition-all",
                        "border-white/20 bg-white/10 text-slate-100 hover:border-white/35 hover:bg-white/20 hover:text-white",
                      )}
                      aria-expanded={mobileTabMenuOpen}
                      aria-controls="tindakan-drawer-tabnav"
                      onClick={() => {
                        if (window.innerWidth < 640) {
                          setMobileTabMenuOpen((v) => !v);
                        } else {
                          setSidebarCollapsed((v) => !v);
                        }
                      }}
                      aria-label={
                        mobileTabMenuOpen || !sidebarCollapsed
                          ? "Tutup menu bagian"
                          : "Buka menu bagian"
                      }
                    >
                      {mobileTabMenuOpen || (window.innerWidth >= 640 && !sidebarCollapsed) ? (
                        <X size={17} aria-hidden />
                      ) : (
                        <PanelLeft size={17} aria-hidden />
                      )}
                    </button>
                    <div
                      id="tindakan-detail-modal-title"
                      className="flex min-w-0 flex-1 cursor-default select-text items-center gap-2 overflow-hidden text-[13px] font-bold leading-snug text-white sm:text-sm"
                    >
                      {title}
                    </div>
                  </div>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onClose();
                    }}
                    onClick={onClose}
                    className={cn(
                      "shrink-0 rounded-lg border p-1.5 transition-all duration-300",
                      "border-white/20 bg-white/10 text-slate-200 hover:border-white/35 hover:bg-white/20 hover:text-white",
                    )}
                  >
                    <X size={17} />
                  </button>
                </div>
              </div>

            <div className="relative flex min-h-0 min-w-0 flex-1">
              {mobileTabMenuOpen && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  type="button"
                  aria-label="Tutup menu bagian"
                  className="absolute inset-0 z-10 bg-[#2D3748]/25 sm:hidden pointer-events-auto"
                  onClick={() => setMobileTabMenuOpen(false)}
                />
              )}
              <nav
                id="tindakan-drawer-tabnav"
                className={cn(
                  "relative z-10 flex shrink-0 flex-col gap-1 overflow-y-auto border-r py-3 pl-2 pr-1.5 transition-all duration-300 sm:w-[15rem] sm:pl-3 sm:pr-2",
                  "border-slate-300 bg-gradient-to-b from-[#E6ECF5] to-[#D3DFF0] scrollbar-thin scrollbar-thumb-slate-400",
                  "max-sm:absolute max-sm:inset-y-0 max-sm:left-0 max-sm:z-20 max-sm:w-52 max-sm:shadow-[4px_0_32px_rgba(45,55,72,0.15)]",
                  "max-sm:transition-transform max-sm:duration-200 max-sm:ease-out",
                  !mobileTabMenuOpen &&
                    "max-sm:pointer-events-none max-sm:-translate-x-full",
                  sidebarCollapsed && "sm:w-14 sm:px-1.5"
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
                        collapsed={sidebarCollapsed}
                        onClick={() => {
                          setTab(t.id);
                          setMobileTabMenuOpen(false);
                        }}
                      />
                    );
                  })}

                  {/* Tombol Tutup di bawah navigasi (khusus desktop) */}
                  <div className="mt-auto pt-4 sm:block hidden">
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onClose();
                      }}
                      onClick={onClose}
                      className={cn(
                        "group relative flex w-full cursor-pointer items-center gap-2 rounded-xl px-2.5 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] transition-all duration-200 sm:text-xs",
                        "border border-rose-200/50 bg-rose-50/50 text-rose-700 hover:border-rose-300 hover:bg-rose-100 shadow-sm",
                        sidebarCollapsed && "justify-center px-0"
                      )}
                      title="Tutup Detail"
                    >
                      <X
                        size={15}
                        className={cn(
                          "shrink-0 transition-colors duration-200 text-rose-600 group-hover:text-rose-700",
                          sidebarCollapsed && "mt-0"
                        )}
                      />
                      {!sidebarCollapsed && (
                        <span className="min-w-0 flex-1 select-none leading-snug">
                          Tutup
                        </span>
                      )}
                    </button>
                  </div>
              </nav>

                <div
                  className={cn(
                    "clinical-detail-drawer-panel min-h-0 min-w-0 flex-1 overflow-y-auto px-3 py-3 sm:px-5 sm:py-5",
                    "bg-gradient-to-br from-slate-100 via-[#E6E9EF] to-slate-200 text-slate-700 scrollbar-thin scrollbar-thumb-slate-300/60",
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
                  <p className="text-sm font-semibold text-slate-700/90">
                    Tidak ada data baris.
                  </p>
                ) : (
                  <>
                    {/* Tab: History (Resume) */}
                    <div className={cn(tab !== "history" && "hidden")}>
                      {tab === "history" && (
                        <div className="space-y-4 text-slate-800">
                        <div>
                          <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-800">
                            Resume
                          </h3>
                          <p className="mt-1 text-xs font-medium leading-relaxed text-slate-600/95">
                            Ringkasan semua bagian ada di versi teks WhatsApp di
                            bawah. Lanjut: metadata sistem dan riwayat tindakan
                            pasien yang sama.
                          </p>
                        </div>

                        {/* Ringkasan Klinis Sesi Ini */}
                        <div
                          className={cn(
                            "rounded-2xl border border-slate-200/70 bg-white/95 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.06)] transition-all duration-300",
                            "dark:border-slate-300/90 dark:bg-white dark:shadow-[0_1px_3px_rgba(15,23,42,0.08)]",
                          )}
                        >
                          <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                            Hasil Klinis Sesi Ini
                          </h3>
                          <div className="mt-3 space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <dt className="text-[10px] font-medium uppercase tracking-[0.1em] text-slate-500/95">
                                  Diagnosa Awal & Severity
                                </dt>
                                <dd className="mt-1 flex flex-wrap items-center gap-2">
                                  <span className="text-xs font-semibold text-slate-900/95">
                                    {displayRecord.diagnosa || "—"}
                                  </span>
                                  {displayRecord.severity_level && (
                                    <span
                                      className={cn(
                                        "rounded-lg bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-800 ring-1 ring-rose-200/90",
                                      )}
                                    >
                                      Lvl {displayRecord.severity_level}
                                    </span>
                                  )}
                                </dd>
                              </div>
                              <div>
                                {/* Kelompok Kasus (Grup) dikosongkan agar tidak mengisi otomatis */}
                              </div>
                            </div>
                            {displayRecord.kesimpulan_laporan && (
                              <div>
                                <dt className="text-[10px] font-medium uppercase tracking-[0.1em] text-slate-500/95">
                                  Hasil Akhir (Temuan Medis)
                                </dt>
                                <dd
                                  className={cn(
                                    "mt-1 border-l-2 border-indigo-300/60 pl-3 text-xs font-medium italic leading-relaxed text-slate-700/95",
                                  )}
                                >
                                  {displayRecord.kesimpulan_laporan}
                                </dd>
                              </div>
                            )}
                            {displayRecord.plan_medis && (
                              <div>
                                <dt className="text-[10px] font-medium uppercase tracking-[0.1em] text-slate-500/95">
                                  Rencana Lanjutan (Plan)
                                </dt>
                                <dd className="mt-1 text-xs font-medium leading-relaxed text-slate-700/95">
                                  {displayRecord.plan_medis}
                                </dd>
                              </div>
                            )}
                          </div>
                        </div>

                        <div
                          className={cn(
                            "rounded-2xl border border-slate-200/70 bg-white/95 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.06)] transition-all duration-300",
                            "dark:border-slate-300/90 dark:bg-white dark:shadow-[0_1px_3px_rgba(15,23,42,0.08)]",
                          )}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
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
                                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] transition-all duration-300 disabled:opacity-50",
                                "border-slate-700/20 bg-slate-800 text-white shadow-sm hover:bg-slate-900",
                              )}
                            >
                              <Copy size={14} aria-hidden />
                              Salin untuk WA
                            </button>
                          </div>
                          {waCopied ? (
                            <p
                              className="mt-2 text-xs font-semibold text-emerald-700"
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
                                "mt-1 w-full resize-none rounded-xl border border-slate-200/80 bg-slate-50/90 px-3 py-2.5 font-mono text-[11px] font-medium leading-relaxed text-slate-800/95 outline-none transition-all duration-300",
                                "placeholder:text-slate-400",
                              )}
                            />
                          </label>
                        </div>

                        <div
                          className={cn(
                            "rounded-xl border border-slate-200/70 bg-white/95 px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.05)] transition-all duration-300",
                            "dark:border-slate-300/90 dark:bg-white",
                          )}
                        >
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
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
                                  <dt className="text-[10px] font-medium uppercase tracking-[0.1em] text-slate-500/95">
                                    {label}
                                  </dt>
                                  <dd className="mt-1 font-mono text-sm font-semibold text-slate-900/95">
                                    {display}
                                  </dd>
                                </div>
                              );
                            })}
                          </dl>
                        </div>

                        <section className="space-y-3">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-700/95">
                              Riwayat tindakan pasien
                            </p>
                            <p className="text-[10px] font-medium text-slate-600">
                              {displayRecord.no_rm
                                ? `NO. RM: ${String(displayRecord.no_rm).trim()}`
                                : displayRecord.pasien_id
                                  ? `PASIEN ID: ${String(displayRecord.pasien_id).trim()}`
                                  : "IDENTITAS PASIEN TERBATAS"}
                            </p>
                          </div>
                          {riwayatPasienRows.length === 0 ? (
                            <p
                              className={cn(
                                "rounded-xl border border-dashed border-slate-300 bg-white px-4 py-4 text-xs font-medium text-slate-600",
                              )}
                            >
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
                                      "rounded-xl border px-4 py-3 text-sm text-slate-800/95 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-300",
                                      isCurrent
                                        ? "border-indigo-200/80 bg-indigo-50/50 ring-1 ring-indigo-200/40"
                                        : "border-slate-200/70 bg-white/90 hover:border-slate-300/80",
                                    )}
                                  >
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="font-mono text-xs font-bold text-slate-800">
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
                                        <span
                                          className={cn(
                                            "rounded-lg border border-slate-700/25 bg-slate-800 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white shadow-sm",
                                          )}
                                        >
                                          KASUS INI
                                        </span>
                                      ) : null}
                                    </div>
                                    <p className="mt-1.5 font-bold text-slate-900">
                                      {r.tindakan?.trim() || "—"}
                                      {r.kategori && (
                                        <span
                                          className={cn(
                                            "ml-2 rounded-lg border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-700",
                                          )}
                                        >
                                          {r.kategori}
                                        </span>
                                      )}
                                    </p>
                                    {r.kesimpulan_laporan && (
                                      <p className="mt-1 text-[11px] italic text-slate-600 line-clamp-1">
                                        {r.kesimpulan_laporan}
                                      </p>
                                    )}
                                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-medium text-slate-700">
                                      <span>
                                        <span className="mr-1 font-bold uppercase tracking-tighter text-slate-500">
                                          Dokter:
                                        </span>
                                        {r.dokter?.trim() || "—"}
                                      </span>
                                      <span>
                                        <span className="mr-1 font-bold uppercase tracking-tighter text-slate-500">
                                          Ruangan:
                                        </span>
                                        {r.ruangan?.trim() || "—"}
                                      </span>
                                    </div>
                                    {r.pci_report_link && (
                                      <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-200/20">
                                        <a
                                          href={r.pci_report_link}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 rounded bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                                        >
                                          <FileText size={11} className="mr-1 inline" />
                                          LIHAT PDF
                                        </a>
                                      </div>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </section>
                        </div>
                      )}
                    </div>

                    {/* Other Tabs */}
                    {WIREFRAME_DRAWER_TABS.filter((x) => x.id !== "history").map(
                      (def) => (
                        <div
                          key={def.id}
                          className={cn("space-y-3", tab !== def.id && "hidden")}
                        >
                          {tab === def.id && (
                            <>
                              <h3 className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-800/95">
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
                                onSaved={() => handleRecordPatch({ field: "is_fast_track" })}
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
                                            onSaved={() => handleRecordPatch({ field: key })}
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
                                              onSaved={() => handleRecordPatch({ field: key })}
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
                                    : def.id === "biaya"
                                      ? "sm:grid-cols-3 sm:grid-rows-3"
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
                                  const isStatusEditable =
                                    def.id === "tindakan" &&
                                    key === "status" &&
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
                                  const isDokterAnestesiEditable =
                                    def.id === "tim" &&
                                    key === "dokter_anestesi" &&
                                    Boolean(tindakanId);
                                  const isPpdsEditable =
                                    def.id === "tim" &&
                                    key === "ppds" &&
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
                                  const isKelasPembiayaanField =
                                    def.id === "biaya" &&
                                    key === "kelas_pembiayaan" &&
                                    canPatchTindakan;
                                  const isBiayaEditable =
                                    def.id === "biaya" &&
                                    isBiayaAutosaveField &&
                                    canPatchTindakan;
                                  const isPasienMasterEditable =
                                    def.id === "pasien" &&
                                    isPasienDrawerAutosaveKey(key) &&
                                    Boolean(pasienEditId);
                                  const isRsPerujukEditable =
                                    def.id === "pasien" &&
                                    key === "rs_perujuk" &&
                                    canPatchTindakan;
                                  const isPasienUmurReadonly =
                                    def.id === "pasien" && key === "umur";
                                  const drawerCharcoalTindakan =
                                    def.id === "tindakan";
                                  const isTanggalTindakanEditable =
                                    def.id === "tindakan" &&
                                    key === "tanggal_tindakan" &&
                                    Boolean(tindakanId);

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
                                        def.id === "tindakan" &&
                                          key === "kategori" &&
                                          "sm:col-span-3",
                                        def.id === "biaya" &&
                                          biayaDrawerCardGridClass(key),
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
                                              void mutateSwrGlobal(
                                                MASTER_PASIEN_COMPACT_SWR_KEY,
                                              );
                                            }}
                                            onSaved={() => handleRecordPatch({ field: key })}
                                          />
                                        ) : isPasienUmurReadonly ? (
                                          <div
                                            className={cn(
                                              "mt-0.5 w-full rounded-md border border-cyan-900/50 bg-black/40 px-2 py-1.5 text-sm font-mono tabular-nums text-white",
                                            )}
                                          >
                                            {(() => {
                                              const u = rawVal;
                                              if (
                                                typeof u === "number" &&
                                                Number.isFinite(u)
                                              ) {
                                                return `${u} TH`;
                                              }
                                              if (
                                                typeof u === "string" &&
                                                /^\d+$/.test(u.trim())
                                              ) {
                                                return `${u.trim()} TH`;
                                              }
                                              const dob = getWireframeFieldValue(
                                                displayRecord as unknown as Record<
                                                  string,
                                                  unknown
                                                >,
                                                "tgl_lahir",
                                              );
                                              const iso = formatTanggalLahirFromDb(
                                                dob ?? "",
                                              );
                                              if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
                                                return hitungUsia(iso).teks;
                                              }
                                              return "—";
                                            })()}
                                          </div>
                                        ) : isRsPerujukEditable ? (
                                          <RsPerujukField
                                            variant="drawerPasien"
                                            placeholder="Nama RS perujuk…"
                                            tindakanId={tindakanId}
                                            value={
                                              rawVal === null ||
                                              rawVal === undefined
                                                ? null
                                                : String(rawVal)
                                            }
                                            onSaved={() => handleRecordPatch({ field: "rs_perujuk" })}
                                          />
                                        ) : isRadiologiEditable ? (
                                          <RadiologiAutosaveField
                                            key={`${tindakanId}:${key}`}
                                            tindakanId={tindakanId}
                                            field={key as RadiologiFieldKey}
                                            value={rawVal}
                                            onSaved={() => handleRecordPatch({ field: key })}
                                          />
                                        ) : isGenericKlinisEditable ? (
                                          <KlinisAutosaveField
                                            tindakanId={tindakanId}
                                            pasienId={pasienId}
                                            field={key as KlinisFieldKey}
                                            value={rawVal}
                                            onSaved={() => handleRecordPatch({ field: key })}
                                            controlVariant={
                                              drawerCharcoalTindakan
                                                ? "drawerCharcoal"
                                                : "default"
                                            }
                                          />
                                        ) : isKelasPembiayaanField ? (
                                          <KelasPembiayaanBiayaField
                                            tindakanId={tindakanId}
                                            value={rawVal}
                                            pasien={
                                              (pasienMaster as Pasien | null) ??
                                              null
                                            }
                                            onSaved={() => handleRecordPatch({ field: "kelas_pembiayaan" })}
                                          />
                                        ) : isBiayaEditable ? (
                                          <BiayaAutosaveField
                                            tindakanId={tindakanId}
                                            field={key as BiayaAutosaveFieldKey}
                                            value={rawVal}
                                            onSaved={handleRecordPatch}
                                          />
                                        ) : isDokterAnestesiEditable ? (
                                          <DokterAnestesiField
                                            tindakanId={tindakanId}
                                            variant="drawer"
                                            value={
                                              rawVal === null ||
                                              rawVal === undefined
                                                ? null
                                                : String(rawVal)
                                            }
                                            onSaved={() => handleRecordPatch({ field: "dokter_anestesi" })}
                                          />
                                        ) : isPpdsEditable ? (
                                          <PpdsField
                                            tindakanId={tindakanId}
                                            value={
                                              rawVal === null ||
                                              rawVal === undefined
                                                ? null
                                                : String(rawVal)
                                            }
                                            onSaved={() => handleRecordPatch({ field: "ppds" })}
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
                                            onSaved={() => handleRecordPatch({ field: "dokter" })}
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
                                            onSaved={() => handleRecordPatch({ field: key })}
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
                                            onSaved={() => handleRecordPatch({ field: "ruangan" })}
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
                                            onSaved={() => handleRecordPatch({ field: "cath" })}
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
                                            onSaved={() => handleRecordPatch({ field: "tindakan" })}
                                            controlVariant={
                                              drawerCharcoalTindakan
                                                ? "drawerCharcoal"
                                                : "default"
                                            }
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
                                            onSaved={() => handleRecordPatch({ field: "kategori" })}
                                            controlVariant={
                                              drawerCharcoalTindakan
                                                ? "drawerCharcoal"
                                                : "default"
                                            }
                                          />
                                        ) : isStatusEditable ? (
                                          <StatusTindakanField
                                            tindakanId={tindakanId}
                                            value={
                                              rawVal === null ||
                                              rawVal === undefined
                                                ? null
                                                : String(rawVal)
                                            }
                                            statusKeterangan={
                                              displayRecord.status_keterangan
                                            }
                                            onSaved={(info) =>
                                              handleRecordPatch(info)
                                            }
                                          />
                                        ) : isTanggalTindakanEditable ? (
                                          <TindakanTanggalDrawerField
                                            tindakanId={tindakanId}
                                            value={rawVal}
                                            onSaved={() => handleRecordPatch({ field: "tanggal_tindakan" })}
                                          />
                                        ) : (
                                          formatFieldValue(key, rawVal)
                                        )}
                                      </dd>
                                    </div>
                                  );
                                })}
                              </dl>
                              {def.id === "tindakan" && (
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
                                    patchExecutor={
                                      patchTindakanFields
                                        ? (body) =>
                                            patchTindakanFields(
                                              String(displayRecord.id ?? ""),
                                              body,
                                            )
                                        : undefined
                                    }
                                    onSaved={
                                      patchTindakanFields
                                        ? undefined
                                        : handleRecordPatch
                                    }
                                  />
                                </div>
                              )}
                            </>
                          )}
                          </>
                          )}
                        </div>
                      ),
                    )}
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      )}
    </AnimatePresence>
  );

  return createPortal(layer, mountPoint);
}

export default memo(TindakanDetailDrawer);
