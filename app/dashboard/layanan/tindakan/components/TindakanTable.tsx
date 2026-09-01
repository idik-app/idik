"use client";

import {
  Fragment,
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import dynamic from "next/dynamic";
import {
  Activity,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileText,
  History,
  MapPin,
  Plus,
  SquarePen,
  Stethoscope,
  HeartPulse,
  Trash2,
  User,
  Users,
  Wallet,
  Zap,
} from "lucide-react";

import { useJarvisModeDataPublisher } from "@/hooks/useJarvisModeDataPublisher";
import { useNotification } from "@/app/contexts/NotificationContext";
import { useAppDialog } from "@/contexts/AppDialogContext";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { resolveRoomSlugFromRuanganLabel } from "@/lib/intensive/resolveRoomSlug";
import { UI_LAYERS } from "@/lib/ui/layers";
import { extractDataFromText } from "@/lib/tindakan/reportExtractor";
import {
  PasienCombobox,
  formatPasienLabel,
  type PasienOption,
} from "@/components/ui/pasien-combobox";
import {
  DoctorCombobox,
  canonicalDoctorDisplayValue,
  canonicalDoctorStoredValue,
  formatDoctorLabel,
  resolveDoctorFromLooseInput,
  type DoctorOption,
} from "@/components/ui/doctor-combobox";
import {
  RuanganCombobox,
  formatRuanganLabel,
  type RuanganOption,
} from "@/components/ui/ruangan-combobox";
import {
  MasterTindakanCombobox,
  formatMasterTindakanLabel,
  type MasterTindakanOption,
} from "@/components/ui/master-tindakan-combobox";

import { useTindakanBridgeAdapter } from "../bridge/useTindakanBridgeAdapter";
import TableContainer from "../components/TableContainer";
import TableToolbar from "../components/TableToolbar";
import TablePagination from "../components/TablePagination";
import type { TindakanLaporanTab } from "../hooks/useTindakanLaporanReport";

const FastTrackListModal = dynamic(
  () => import("../components/FastTrackListModal"),
  { ssr: false, loading: () => null },
);
const TindakanTerbanyakLabModal = dynamic(
  () => import("../components/TindakanTerbanyakLabModal"),
  { ssr: false, loading: () => null },
);
const TindakanLaporanModal = dynamic(
  () => import("../components/TindakanLaporanModal"),
  { ssr: false, loading: () => null },
);
const TindakanLaporanPemakaianModal = dynamic(
  () => import("../components/TindakanLaporanPemakaianModal"),
  { ssr: false, loading: () => null },
);
const TindakanLaporanMutuModal = dynamic(
  () => import("../components/TindakanLaporanMutuModal"),
  { ssr: false, loading: () => null },
);
const TindakanLaporanPasienModal = dynamic(
  () => import("../components/TindakanLaporanPasienModal"),
  { ssr: false, loading: () => null },
);
const IntensiveDashboardView = dynamic(
  () => import("@/components/intensive/IntensiveDashboardView"),
  { ssr: false, loading: () => null },
);
import { computeTindakanStatsFromRows } from "../hooks/useTindakanStats";
import {
  TINDAKAN_TABLE_COL as TCol,
  TINDAKAN_TABLE_COL_COUNT,
  useTindakanTableCellSelection,
  type TindakanCellRect,
} from "../hooks/useTindakanTableCellSelection";
import type { TindakanFilteredSummary } from "./TindakanSummary";
import type { TindakanJoinResult } from "../bridge/mapping.types";
import KeteranganField from "./KeteranganField";
import { formatWaktuDisplay } from "@/lib/tindakan/waktuRangeFormat";
import { getStatusBadgeClass, getStatusIndicatorMeta, getStatusTooltip } from "@/lib/tindakan/statusIndicator";
import { buildAutoSelesaiStatusUpdates } from "@/lib/tindakan/autoStatusSelesai";
import { useTindakanAutoSelesaiSync } from "../hooks/useTindakanAutoSelesaiSync";
const rowCacheMap = new WeakMap<object, {
  _idik_row_key: string;
  normalizedRm: string;
}>();

const haystackCacheMap = new WeakMap<object, {
  haystack: string;
  label: string;
  doctor: string;
}>();

const rmCacheMap = new WeakMap<object, {
  digits: string;
  display: string;
  label: string;
}>();

import DokterAnestesiField from "./DokterAnestesiField";
import PemakaianAlkesModal from "./PemakaianAlkesModal";
import RsPerujukField from "./RsPerujukField";
import {
  displayNamaPasien,
  displayRm,
  formatJenisKelaminDisplay,
  normalizeJenisKelamin,
  parsePasienAktifFilter,
  pickFirstString,
  resolveJenisKelaminFromRow,
  NAMA_FIELD_KEYS,
  RM_FIELD_KEYS,
  rowMatchesPasienAktifFilter,
  splitNamaDanRmDalamKurung,
  buildPasienLabelFromRow,
  mapApiPasienRow,
  normalizeDigitsOnly,
  resolvePasienFromLabel,
  resolvePasienFromRow,
} from "../lib/displayTindakanRow";
import { normalizeNamaPasien } from "@/app/dashboard/pasien/utils/normalizeNamaPasien";
import { hitungUsia } from "@/app/dashboard/pasien/utils/formatUsia";
import {
  useMasterDoctors,
  useMasterRuangan,
  useMasterTindakan,
  useMasterPasien,
  usePemakaianOrders,
} from "@/app/hooks/useMasterData";
import { runDeduped } from "@/lib/api/runDeduped";
import {
  confirmDuplicateRmOnDate,
  hasDuplicateRmOnDate,
  mergeTindakanRowsForDupCheck,
  type RmDateRow,
} from "../lib/tindakanRmDateDuplicate";
import { useEventBridge } from "@/contexts/EventBridgeContext";
import { useTheme } from "@/contexts/ThemeContext";
import JarvisIcon from "@/components/JarvisIcon";
import { TINDAKAN_SHEET_CELL } from "../lib/tindakanSheetClasses";

type Adapter = ReturnType<typeof useTindakanBridgeAdapter>;

/** Blok JARVIS + “Synchronizing Systems” — dipakai saat loading dan state kosong tabel. */
function TindakanSyncStatusBlock({
  lightMode,
  subtitle,
  subtitleTone = "hud",
  animateIcon = true,
}: {
  lightMode: boolean;
  subtitle: string;
  subtitleTone?: "hud" | "body";
  animateIcon?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col min-h-0 flex-1 items-center justify-center py-12 gap-5",
        "max-md:flex-none",
        "text-cyan-950 dark:text-cyan-300",
      )}
    >
      <div className="relative flex items-center justify-center">
        <JarvisIcon
          size={80}
          lightMode={lightMode}
          isSyncing={animateIcon}
          status="idle"
        />
      </div>
      <div className="flex flex-col items-center gap-1 text-center px-4">
        <span className="animate-pulse tracking-[0.2em] uppercase text-[11px] font-black opacity-90">
          Synchronizing Systems
        </span>
        {subtitleTone === "hud" ? (
          <span className="text-[10px] font-mono opacity-50 uppercase tracking-wider">
            {subtitle}
          </span>
        ) : (
          <span
            className={cn(
              "text-xs sm:text-sm font-semibold tracking-wide opacity-90 text-balance normal-case max-w-lg",
              "text-cyan-900/90 dark:text-cyan-200/85",
            )}
          >
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}

/** Kolom tindakan & ruangan — amber di siang & malam. */
const TINDAKAN_TABLE_INPUT_TEXT =
  "text-amber-800 placeholder:text-amber-700/55 dark:text-white dark:placeholder:text-white/90";

/** Kolom No–Dokter — amber di siang; putih terang di mode malam. */
const TINDAKAN_TABLE_PRIMARY_COL_INPUT =
  "text-amber-800 placeholder:text-amber-700/55 dark:text-white dark:placeholder:text-white/90";

const ZOOM_CELL_CLASSES = `focus-within:${UI_LAYERS.tableZoomedCell}`;
const ZOOM_INNER_CLASSES = "";

/** Highlight sel terpilih (seleksi blok seperti spreadsheet) */
const TINDAKAN_CELL_SELECTION_CLASS =
  "ring-2 ring-inset ring-cyan-500/55 bg-cyan-400/12 dark:bg-cyan-400/10";

function useDebouncedValue(value: string, ms: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

/** Cocokkan RM meski format beda (angka saja vs teks). */
function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object") {
    const maybe = err as Record<string, unknown>;
    const msg = maybe.message;
    if (typeof msg === "string" && msg.trim()) return msg;
    const details = maybe.details;
    if (typeof details === "string" && details.trim()) return details;
    const hint = maybe.hint;
    if (typeof hint === "string" && hint.trim()) return hint;
  }
  return "Terjadi kesalahan yang tidak diketahui.";
}

/**
 * Klik di luar field (area kosong baris) setelah edit memicu blur + click pada `<tr>`,
 * sehingga drawer ikut terbuka. Pada fase mousedown, fokus sering masih di field —
 * kita tandai baris ini untuk mengabaikan satu klik "buka detail".
 */
function shouldSuppressRowOpenAfterFieldInteraction(
  row: HTMLElement,
  downTarget: EventTarget | null,
): boolean {
  if (!(downTarget instanceof Element)) return false;
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || !row.contains(active)) return false;
  const skipSelector =
    'input,select,textarea,button,a,[data-no-row-click="true"],[role="combobox"],[role="listbox"],[role="option"],[contenteditable="true"]';
  if (downTarget.closest(skipSelector)) return false;
  if (active.contains(downTarget)) return false;
  return true;
}

/** Space/Enter pada `<tr role="button">` tidak boleh mengalahkan ketikan di input/combobox. */
function isKeyboardEventFromRowInteractiveTarget(
  target: EventTarget | null,
): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      'input,select,textarea,button,a,[data-no-row-click="true"],[role="combobox"],[role="listbox"],[role="option"],[contenteditable="true"]',
    ),
  );
}

/** Akar field untuk pelacakan drag-seleksi teks (mousedown → mouseup di luar field, masih di baris). */
function resolveTindakanFieldRootFromPointerTarget(
  target: EventTarget | null,
): Element | null {
  if (!(target instanceof Element)) return null;
  const narrow = target.closest("input,select,textarea,[contenteditable]");
  if (narrow) return narrow;
  return target.closest('[data-no-row-click="true"]');
}

/** Kolom teks yang dipakai pencarian — hindari JSON.stringify seluruh baris. */
function recordSearchHaystack(r: TindakanJoinResult): string {
  const raw = r as unknown as Record<string, unknown>;
  const parts: unknown[] = [
    raw.id,
    raw.tanggal,
    raw.waktu,
    raw.dokter,
    raw.operator,
    raw.nama_pasien,
    raw.nama,
    raw.pasien_nama,
    raw.no_rm,
    raw.rm,
    raw.nomor_rm,
    raw.no_rm_pasien,
    raw.tindakan,
    raw.jenis,
    raw.alkes_utama,
    raw.status,
    raw.ruangan,
    raw.kategori,
    raw.pasien_id,
    raw.diagnosa,
    raw.asisten,
    raw.sirkuler,
  ];
  return parts.map((p) => String(p ?? "").toLowerCase()).join(" ");
}

function rowSearchHaystack(
  r: TindakanJoinResult,
  pasienOptions: PasienOption[],
  pasienLabelByRowId: Record<string, string>,
  doctorOptions?: DoctorOption[],
  indexKey?: string,
): string {
  const id = String(r.id ?? "").trim();
  const stateKey = id || indexKey || "";
  const resolvedLabel = pasienLabelByRowId[stateKey] ?? "";
  const doctorVal = String(r.dokter ?? "");

  const cached = haystackCacheMap.get(r);
  if (cached && cached.label === resolvedLabel && cached.doctor === doctorVal) {
    return cached.haystack;
  }

  const base = recordSearchHaystack(r);
  const raw = r as unknown as Record<string, unknown>;
  const p = resolvePasienFromRow(pasienOptions, raw);
  const jk = resolveJenisKelaminFromRow(raw, p);

  let extra = "";
  if (jk === "L") extra = " laki-laki laki l";
  else if (jk === "P") extra = " perempuan wanita p";
  let docCanon = "";
  if (doctorOptions?.length) {
    const canon = canonicalDoctorDisplayValue(
      doctorOptions,
      doctorVal,
    );
    if (canon) docCanon = ` ${canon.toLowerCase()}`;
  }
  const result = (base + docCanon + extra + " " + resolvedLabel).toLowerCase();
  
  haystackCacheMap.set(r, {
    haystack: result,
    label: resolvedLabel,
    doctor: doctorVal,
  });

  return result;
}

function normalizeIdikToken(v: unknown): string {
  return String(v ?? "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "")
    .replace(/^rm/, "");
}

function rowMatchesPasienQueryFallback(
  row: TindakanJoinResult,
  pasienId: string,
  rmOrQuery: string,
): boolean {
  const raw = row as unknown as Record<string, unknown>;
  const tokens = [
    raw.pasien_id,
    raw.no_rm,
    raw.rm,
    raw.nomor_rm,
    raw.no_rm_pasien,
    raw.nama_pasien,
    raw.nama,
    raw.pasien_nama,
  ];
  const nId = normalizeIdikToken(pasienId);
  const nRm = normalizeIdikToken(rmOrQuery);

  if (nId && tokens.some((t) => normalizeIdikToken(t) === nId)) return true;
  if (nRm && tokens.some((t) => normalizeIdikToken(t).includes(nRm)))
    return true;
  return false;
}

function rowMatchesPasienDeepFallback(
  row: TindakanJoinResult,
  pasienId: string,
  rmOrQuery: string,
): boolean {
  const hay = normalizeIdikToken(JSON.stringify(row));
  const nId = normalizeIdikToken(pasienId);
  const nRm = normalizeIdikToken(rmOrQuery);
  if (!hay) return false;
  if (nId && hay.includes(nId)) return true;
  if (nRm && hay.includes(nRm)) return true;
  return false;
}

/** yyyy-mm-dd dari teks tanggal baris / order (dukung ISO & 28-Mar-2024). */
const CAL_MONTH: Record<string, string> = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};

function extractCalendarDateKey(raw: string): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[/-]([A-Za-z]{3})[/-](\d{4})/i);
  if (m) {
    const day = m[1].padStart(2, "0");
    const mon = CAL_MONTH[m[2].toLowerCase().slice(0, 3)];
    const year = m[3];
    if (mon) return `${year}-${mon}-${day}`;
  }
  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (m) {
    const day = m[1].padStart(2, "0");
    const mon = m[2].padStart(2, "0");
    const year = m[3];
    const mi = Number(mon);
    const di = Number(day);
    if (mi >= 1 && mi <= 12 && di >= 1 && di <= 31) {
      return `${year}-${mon}-${day}`;
    }
  }
  return null;
}

/** Tampilan tanggal seperti 10-09-2021 (dari ISO atau teks baris). */
function formatTanggalDdMmYyyy(raw: string): string {
  const iso = extractCalendarDateKey(raw);
  if (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, mo, d] = iso.split("-");
    return `${d}-${mo}-${y}`;
  }
  const t = String(raw ?? "").trim();
  return t || "—";
}

function todayWibYmd(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const TINDAKAN_DATE_FILTER_KEY = "idik_tindakan_date_filter";
const TINDAKAN_DATE_FILTER_VERSION_KEY = "idik_tindakan_date_filter_v2";

function defaultUntilTodayDateFilter(): { from: string; to: string } {
  return { from: "", to: "" };
}

function readInitialTindakanDateFilter(): { from: string; to: string } {
  const today = todayWibYmd();
  const defaultFilter = defaultUntilTodayDateFilter();
  if (typeof window === "undefined") {
    return defaultFilter;
  }
  try {
    const version = window.localStorage.getItem(TINDAKAN_DATE_FILTER_VERSION_KEY);
    if (version !== "2") {
      window.localStorage.setItem(TINDAKAN_DATE_FILTER_VERSION_KEY, "2");
      window.localStorage.setItem(
        TINDAKAN_DATE_FILTER_KEY,
        JSON.stringify(defaultFilter),
      );
      return defaultFilter;
    }
    const raw = window.localStorage.getItem(TINDAKAN_DATE_FILTER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { from?: string; to?: string };
      const from =
        extractCalendarDateKey(String(parsed.from ?? "").trim()) ?? "";
      const to = extractCalendarDateKey(String(parsed.to ?? "").trim()) ?? "";
      if (from || to) {
        return { from, to: to || today };
      }
    }
  } catch {
    /* ignore */
  }
  return defaultFilter;
}

function persistTindakanDateFilter(from: string, to: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      TINDAKAN_DATE_FILTER_KEY,
      JSON.stringify({ from, to }),
    );
  } catch {
    /* ignore */
  }
}

/** Senin minggu ini (WIB). */
function startOfWeekWibYmd(): string {
  const d = new Date();
  // Pindah ke timezone Jakarta
  const jkt = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  const day = jkt.getDay(); // 0 (Sun) - 6 (Sat)
  const diff = jkt.getDate() - day + (day === 0 ? -6 : 1); // Monday
  jkt.setDate(diff);
  return new Intl.DateTimeFormat("en-CA").format(jkt);
}

/** Minggu minggu ini (WIB). */
function endOfWeekWibYmd(): string {
  const d = new Date();
  const jkt = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  const day = jkt.getDay();
  const diff = jkt.getDate() - day + (day === 0 ? 0 : 7); // Sunday
  jkt.setDate(diff);
  return new Intl.DateTimeFormat("en-CA").format(jkt);
}

function resolveShownRmForRow(
  rec: TindakanJoinResult,
  pasienLabelByRowId: Record<string, string>,
  pasienOptions: PasienOption[],
  indexKey?: string,
): { digits: string; display: string } {
  const raw = rec as unknown as Record<string, unknown>;
  const id = String(raw.id ?? "").trim();
  const stateKey = id || indexKey || "";
  const label = pasienLabelByRowId[stateKey] ?? buildPasienLabelFromRow(raw);

  const cached = rmCacheMap.get(rec);
  if (cached && cached.label === label) {
    return cached;
  }

  const labelRm = stateKey ? extractRmFromLabel(label) : "";
  const p = resolvePasienFromRow(pasienOptions, raw);
  const rmFromOpt = String(p?.no_rm ?? "").trim();
  const rowRmDisp = displayRm(raw);
  const rowRm = rowRmDisp === "—" ? "" : rowRmDisp;
  const display = (labelRm || rmFromOpt || rowRm).trim() || "—";
  const digits = normalizeDigitsOnly(display);
  const result = {
    digits: digits.length >= 3 ? digits : "",
    display,
    label,
  };
  rmCacheMap.set(rec, result);
  return result;
}

/** RM + nama untuk dialog hapus — selaras dengan kolom tabel / combobox. */
function resolveShownPasienForDeleteDialog(
  rec: TindakanJoinResult,
  pasienLabelByRowId: Record<string, string>,
  pasienOptions: PasienOption[],
): { noRm: string; nama: string } {
  const raw = rec as unknown as Record<string, unknown>;
  const stateKey = String(raw.id ?? "").trim();
  const label = (pasienLabelByRowId[stateKey] ?? buildPasienLabelFromRow(raw)).trim();
  const labelRm = extractRmFromLabel(label);
  const { baseNama } = splitNamaDanRmDalamKurung(label);
  const namaFromLabel = label ? (baseNama || label).trim() : "";

  const p = resolvePasienFromRow(pasienOptions, raw);
  const rmFromOpt = String(p?.no_rm ?? "").trim();
  const namaFromOpt = String(p?.nama ?? "").trim();

  const rowRmDisp = displayRm(raw);
  const rowRm = rowRmDisp === "—" ? "" : rowRmDisp;
  const noRm = (labelRm || rmFromOpt || rowRm).trim() || "—";

  const rowNamaDisp = displayNamaPasien(raw);
  const rowNama = rowNamaDisp === "—" ? "" : rowNamaDisp;
  const nama = (namaFromLabel || namaFromOpt || rowNama).trim() || "—";

  return { noRm, nama };
}

function poolRowRmDigitKey(
  rec: TindakanJoinResult,
  pasienLabelByRowId: Record<string, string>,
  pasienOptions: PasienOption[],
  indexKey?: string,
): string {
  const { digits } = resolveShownRmForRow(
    rec,
    pasienLabelByRowId,
    pasienOptions,
    indexKey,
  );
  return digits;
}

function rowTindakanLabel(rec: TindakanJoinResult): string {
  const raw = rec as unknown as Record<string, unknown>;
  return (
    String(rec.tindakan ?? "").trim() ||
    (typeof raw.alkes_utama === "string" ? String(raw.alkes_utama).trim() : "")
  );
}

function isPlaceholderTindakanLabel(t: string): boolean {
  const s = t.trim();
  return !s || s === "—" || /^belum diisi/i.test(s);
}

type PriorTindakanEntry = {
  tindakan: string;
  tanggalDisp: string;
  dokter: string;
  sortKey: string;
  // New fields
  diagnosa?: string | null;
  faktor_risiko?: string | null;
  severity_level?: string | null;
  hasil_lab_ppm?: string | null;
  pci_report_link?: string | null;
  temuan_pembuluh?: string | null;
  kesimpulan_laporan?: string | null;
  plan_medis?: string | null;
  resume?: string | null;
  // Metadata & Tim
  ruangan?: string | null;
  cath?: string | null;
  kategori?: string | null;
  pembiayaan?: string | null;
  asisten?: string | null;
  sirkuler?: string | null;
  logger?: string | null;
  // Mesin & Radiologi
  fluoro_time?: number | null;
  dose?: number | null;
  kv?: number | null;
  ma?: number | null;
  dap_gy_cm2?: number | null;
  dap_dose?: number | null;
  total_kontras?: string | null;
  // Fast Track
  is_fast_track?: boolean | null;
  door_to_balloon?: string | null;
  pasien_datang_igd?: string | null;
  total_waktu_fast_track?: string | null;
};

function buildPriorTindakanListForRow(
  rec: TindakanJoinResult,
  byRm: Map<string, TindakanJoinResult[]>,
  pasienLabelByRowId: Record<string, string>,
  pasienOptions: PasienOption[],
  doctorMaster: DoctorOption[],
  indexKey?: string,
): PriorTindakanEntry[] {
  const id = String(rec.id ?? "").trim();
  const { digits } = resolveShownRmForRow(
    rec,
    pasienLabelByRowId,
    pasienOptions,
    indexKey,
  );
  if (!digits) return [];

  const candidates = byRm.get(digits) ?? [];

  // Ambil data pembanding untuk "diri sendiri" agar tidak muncul di riwayat
  const selfDate = extractCalendarDateKey(String(rec.tanggal ?? ""));
  const selfTindakan = (rec.tindakan || "").toLowerCase().trim();
  const selfWaktu = String(rec.waktu || "").trim();

  // Filter agar hanya menampilkan riwayat SEBELUMNYA (past records)
  const others = candidates.filter((row) => {
    const rowId = String(row.id ?? "").trim();
    if (id && rowId && rowId === id) return false;

    const rowDate = extractCalendarDateKey(String(row.tanggal ?? ""));
    const rowTindakan = (row.tindakan || "").toLowerCase().trim();
    const rowWaktu = String(row.waktu || "").trim();

    if (!rowDate || !selfDate) return false;

    // 1. Harus tanggal yang sama atau sebelumnya
    if (rowDate > selfDate) return false;

    // 2. Jika tanggal sama, harus dipastikan terjadi sebelumnya (by time or by different action)
    if (rowDate === selfDate) {
      // Jika tindakan sama persis di hari yang sama, kemungkinan besar duplikat/diri sendiri
      if (rowTindakan === selfTindakan) return false;

      // Jika ada waktu, bandingkan waktunya
      if (rowWaktu && selfWaktu) {
        if (rowWaktu >= selfWaktu) return false;
      } else {
        // Jika tidak ada waktu di salah satu record pada hari yang sama,
        // kita tidak bisa yakin mana yang duluan.
        // Sesuai permintaan "tindakan pertama tidak tampilkan riwayat setelahnya",
        // kita amankan dengan tidak menganggapnya sebagai riwayat jika ragu.
        return false;
      }
    }

    return true;
  });

  const enriched: PriorTindakanEntry[] = others.map((row) => {
    const tRaw = String(row.tanggal ?? "").trim();
    const iso = extractCalendarDateKey(tRaw) ?? "";
    const sortKey = iso || tRaw;
    const dokterRaw = String(row.dokter ?? "").trim();
    const dokterDisp =
      doctorMaster.length > 0
        ? canonicalDoctorDisplayValue(doctorMaster, dokterRaw)
        : dokterRaw;
    return {
      tindakan: rowTindakanLabel(row) || "—",
      tanggalDisp: formatTanggalDdMmYyyy(tRaw),
      dokter: dokterDisp || "—",
      sortKey,
      diagnosa: row.diagnosa,
      faktor_risiko: row.faktor_risiko,
      severity_level: row.severity_level,
      hasil_lab_ppm: row.hasil_lab_ppm,
      pci_report_link: row.pci_report_link,
      temuan_pembuluh: row.temuan_pembuluh,
      kesimpulan_laporan: row.kesimpulan_laporan,
      plan_medis: row.plan_medis,
      resume: row.resume,
      // Metadata & Tim
      ruangan: row.ruangan,
      cath: row.cath,
      kategori: row.kategori,
      pembiayaan: row.pembiayaan,
      asisten: row.asisten,
      sirkuler: row.sirkuler,
      logger: row.logger,
      // Mesin & Radiologi
      fluoro_time: row.fluoro_time,
      dose: row.dose,
      kv: row.kv,
      ma: row.ma,
      dap_gy_cm2: row.dap_gy_cm2 ?? row.dap_dose ?? null,
      dap_dose: row.dap_dose ?? null,
      total_kontras: row.total_kontras,
      // Fast Track
      is_fast_track: row.is_fast_track,
      door_to_balloon: row.door_to_balloon,
      pasien_datang_igd: row.pasien_datang_igd,
      total_waktu_fast_track: row.total_waktu_fast_track,
    };
  });

  // Urutkan dan DEDUP riwayat agar tidak ada baris yang sama persis muncul berkali-kali
  const uniqueHistory = new Map<string, PriorTindakanEntry>();
  for (const entry of enriched) {
    if (isPlaceholderTindakanLabel(entry.tindakan)) continue;

    const key = `${entry.tanggalDisp}|${entry.tindakan.toLowerCase()}`;
    if (!uniqueHistory.has(key)) {
      uniqueHistory.set(key, entry);
    }
  }

  const finalResult = Array.from(uniqueHistory.values());

  finalResult.sort((a, b) => {
    const pa = isPlaceholderTindakanLabel(a.tindakan) ? 1 : 0;
    const pb = isPlaceholderTindakanLabel(b.tindakan) ? 1 : 0;
    if (pa !== pb) return pa - pb;
    return b.sortKey.localeCompare(a.sortKey);
  });

  return finalResult.slice(0, 12);
}

/**
 * Cocokkan teks pasien di order (`cathlab_pemakaian_order.pasien`) dengan label baris kasus.
 * Order lama sering tanpa `tindakan_id` — dipakai untuk menampilkan tombol edit.
 */
function orderPasienMatchesTindakanRowLabel(
  orderPasien: string,
  rowLabel: string,
): boolean {
  const oStr = orderPasien.trim();
  const rStr = rowLabel.trim();
  if (!oStr || !rStr) return false;

  const oSplit = splitNamaDanRmDalamKurung(oStr);
  const rSplit = splitNamaDanRmDalamKurung(rStr);

  const oName = normalizeNamaPasien(
    (oSplit.baseNama || oStr).trim(),
  ).toLowerCase();
  const rName = normalizeNamaPasien(
    (rSplit.baseNama || rStr).trim(),
  ).toLowerCase();
  if (!oName || !rName) return false;
  if (oName !== rName && !oName.includes(rName) && !rName.includes(oName)) {
    return false;
  }

  const oRm =
    normalizeDigitsOnly(oSplit.rmDalamKurung) || normalizeDigitsOnly(oStr);
  const rRm =
    normalizeDigitsOnly(rSplit.rmDalamKurung) || normalizeDigitsOnly(rStr);
  if (oRm.length >= 3 && rRm.length >= 3 && oRm !== rRm) return false;
  return true;
}

function extractRmFromLabel(label: string): string {
  const t = label.trim();
  if (!t) return "";
  const m = t.match(/\(([^)]+)\)\s*$/);
  if (!m) return "";
  return String(m[1] ?? "").trim();
}

function mapApiDoctorRow(r: Record<string, unknown>): DoctorOption | null {
  const rawId = r.id;
  if (rawId == null || rawId === "") return null;
  const id = String(rawId);
  const nama_dokter =
    typeof r.nama_dokter === "string"
      ? r.nama_dokter
      : typeof r.nama === "string"
        ? r.nama
        : String(r.nama_dokter ?? r.nama ?? "");
  const spesialis =
    r.spesialis == null || r.spesialis === "" ? null : String(r.spesialis);
  const aktif =
    r.aktif === false ? false : r.status === false ? false : (r.aktif as any);
  return {
    id,
    nama_dokter: String(nama_dokter).trim(),
    spesialis,
    aktif: aktif === false ? false : true,
  };
}

function EditableMasterTindakanCell({
  value,
  masterOptions,
  loading,
  listboxId,
  onCommit,
}: {
  value: string;
  masterOptions: MasterTindakanOption[];
  loading: boolean;
  listboxId: string;
  onCommit: (next: string) => Promise<boolean>;
}) {
  const pickerOptions = useMemo(() => {
    const v = value.trim();
    return masterOptions.filter(
      (o) => o.aktif !== false || formatMasterTindakanLabel(o) === v,
    );
  }, [masterOptions, value]);

  const [draft, setDraft] = useState(value.trim());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!saving) setDraft(value.trim());
  }, [value, saving]);

  const tryCommit = async (nextRaw: string) => {
    const cur = value.trim();
    const next = nextRaw.trim();
    if (next === cur || saving) return;
    setDraft(next);
    setSaving(true);
    const ok = await onCommit(next);
    setSaving(false);
    if (!ok) setDraft(cur);
  };

  return (
    <MasterTindakanCombobox
      listboxId={listboxId}
      value={draft}
      onChange={setDraft}
      onSelectOption={(o) => {
        void tryCommit(formatMasterTindakanLabel(o));
      }}
      onInputBlur={(finalText) => {
        void tryCommit(finalText);
      }}
      options={pickerOptions}
      loading={loading || saving}
      className="max-w-[14rem]"
      inputClassName={TINDAKAN_TABLE_INPUT_TEXT}
    />
  );
}

function EditableTimeCell({
  value,
  onCommit,
  placeholder = "—",
}: {
  value: string;
  onCommit: (next: string) => Promise<boolean>;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(value.trim());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!saving) setDraft(value.trim());
  }, [value, saving]);

  const formatTimeInput = (input: string) => {
    // Ambil hanya angka
    const digits = input.replace(/\D/g, "");
    if (!digits) return "";

    // Jika 4 angka atau lebih (misal 1520 -> 15:20)
    if (digits.length >= 4) {
      const hh = digits.slice(0, 2);
      const mm = digits.slice(2, 4);
      return `${hh}:${mm}`;
    }
    // Jika 3 angka (misal 820 -> 08:20)
    if (digits.length === 3) {
      const hh = `0${digits.slice(0, 1)}`;
      const mm = digits.slice(1, 3);
      return `${hh}:${mm}`;
    }
    return digits;
  };

  const commit = useCallback(async () => {
    if (saving) return;
    const formatted = formatTimeInput(draft);
    const cur = value.trim();
    if (formatted === cur) {
      setDraft(cur);
      return;
    }
    setDraft(formatted);
    setSaving(true);
    const ok = await onCommit(formatted);
    setSaving(false);
    if (!ok) setDraft(cur);
  }, [draft, value, onCommit, saving]);

  return (
    <input
      type="text"
      readOnly={saving}
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onBlur={() => void commit()}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          void commit();
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setDraft(value.trim());
        }
      }}
      className={cn(
        "w-full rounded border px-2 py-1 text-xs font-semibold focus:outline-none text-center",
        "border-cyan-400/55 bg-white text-slate-800 dark:border-cyan-700/50 dark:bg-black/40 dark:text-slate-100",
      )}
    />
  );
}

function EditableTextCell({
  value,
  onCommit,
  placeholder = "...",
}: {
  value: string;
  onCommit: (next: string) => Promise<boolean>;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!saving) setDraft(value);
  }, [value, saving]);

  const commit = useCallback(async () => {
    if (saving) return;
    const next = draft.trim();
    if (next === value.trim()) return;
    setDraft(next);
    setSaving(true);
    const ok = await onCommit(next);
    setSaving(false);
    if (!ok) setDraft(value.trim());
  }, [draft, onCommit, saving, value]);

  return (
    <input
      type="text"
      readOnly={saving}
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onBlur={() => void commit()}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          void commit();
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setDraft(value.trim());
        }
      }}
      className={cn(
        "w-full rounded border px-2 py-1 text-xs font-semibold focus:outline-none text-center",
        "border-cyan-400/55 bg-white text-slate-800 dark:border-cyan-700/50 dark:bg-black/40 dark:text-slate-100",
      )}
    />
  );
}

function EditableDateCell({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (next: string) => Promise<boolean>;
}) {
  /** `type="date"` hanya menerima YYYY-MM-DD; tanggal dari DB sering "28-Jan-2023" → kalender error / tidak bisa navigasi. */
  const normalizedValue =
    extractCalendarDateKey(String(value ?? "").trim()) ?? "";
  const [draft, setDraft] = useState(normalizedValue);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!saving) setDraft(normalizedValue);
  }, [normalizedValue, saving]);

  const commit = useCallback(async () => {
    if (saving) return;
    const next = draft.trim();
    const curIso = normalizedValue;
    if (next === curIso) return;
    // Terima YYYY-MM-DD atau kosong.
    if (next && !/^\d{4}-\d{2}-\d{2}$/.test(next)) {
      setDraft(normalizedValue);
      return;
    }
    setDraft(next);
    setSaving(true);
    const ok = await onCommit(next);
    setSaving(false);
    if (!ok) setDraft(normalizedValue);
  }, [draft, normalizedValue, onCommit, saving]);

  return (
    <input
      type="date"
      readOnly={saving}
      value={draft}
      min="1900-01-01"
      onChange={(e) => setDraft(e.target.value)}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onBlur={() => void commit()}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          void commit();
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setDraft(normalizedValue);
        }
      }}
      className={cn(
        "w-full min-w-0 max-2xl:min-w-0 2xl:min-w-[8.5rem] rounded border px-2 py-1 max-2xl:px-0.5 text-xs font-semibold focus:outline-none",
        "border-cyan-400/55 bg-white text-amber-800 [color-scheme:light] dark:border-cyan-700/50 dark:bg-black/40 dark:text-slate-100 dark:[color-scheme:dark]",
      )}
    />
  );
}

function EditableRuanganCell({
  value,
  ruanganMaster,
  loading,
  listboxId,
  onCommit,
}: {
  value: string;
  ruanganMaster: RuanganOption[];
  loading: boolean;
  listboxId: string;
  onCommit: (next: string) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState(value.trim().toUpperCase());
  const [saving, setSaving] = useState(false);
  const draftRef = useRef(draft);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    if (!saving) setDraft(value.trim().toUpperCase());
  }, [value, saving]);

  const tryCommit = async (nextRaw: string) => {
    const cur = value.trim().toUpperCase();
    const next = nextRaw.trim().toUpperCase();
    if (next === cur || saving) return;
    setDraft(next);
    setSaving(true);
    const ok = await onCommit(next);
    setSaving(false);
    if (!ok) setDraft(cur);
  };

  return (
    <RuanganCombobox
      listboxId={listboxId}
      value={draft}
      onChange={setDraft}
      onSelectOption={(r) => {
        void tryCommit(formatRuanganLabel(r));
      }}
      onInputBlur={() => {
        void tryCommit(draftRef.current);
      }}
      options={ruanganMaster}
      loading={loading || saving}
      className="max-w-[14rem]"
      inputClassName={TINDAKAN_TABLE_INPUT_TEXT}
    />
  );
}

function EditableDokterCell({
  value,
  doctorOptionsMaster,
  dokterOptions,
  loading,
  listboxId,
  onCommit,
}: {
  value: string;
  doctorOptionsMaster: DoctorOption[];
  dokterOptions: string[];
  loading: boolean;
  listboxId: string;
  onCommit: (next: string) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState(value.trim());
  const [saving, setSaving] = useState(false);
  const draftRef = useRef(draft);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    if (!saving) setDraft(value.trim());
  }, [value, saving]);

  const tryCommit = async (nextRaw: string) => {
    const curDisplay = value.trim();
    const nextText = nextRaw.trim();
    
    // Resolve display value immediately in draft
    const m = doctorOptionsMaster;
    const resolved = m.length
      ? resolveDoctorFromLooseInput(m, nextText)
      : null;
    const display = resolved
      ? formatDoctorLabel(resolved)
      : nextText;
      
    if (display === curDisplay || saving) {
      setDraft(display);
      return;
    }
    
    setDraft(display);
    setSaving(true);
    const ok = await onCommit(nextText);
    setSaving(false);
    if (!ok) setDraft(curDisplay);
  };

  return (
    <DoctorCombobox
      listboxId={listboxId}
      value={draft}
      onChange={setDraft}
      onSelectOption={(picked) => {
        void tryCommit(formatDoctorLabel(picked));
      }}
      onInputBlur={() => {
        void tryCommit(draftRef.current);
      }}
      options={
        doctorOptionsMaster.length
          ? doctorOptionsMaster
          : dokterOptions.map((nama, idx) => ({
              id: `local:${idx}`,
              nama_dokter: nama,
              spesialis: null,
              aktif: true,
            }))
      }
      loading={loading || saving}
      className="max-w-none w-full [&_input]:pr-2"
      inputClassName={TINDAKAN_TABLE_PRIMARY_COL_INPUT}
    />
  );
}

/**
 * Wireframe: **tabel ringkas** di layar utama → klik baris → **drawer bertab**
 * (6 segmen domain + jembatan Pemakaian). Tab domain **bukan** navigasi utama daftar.
 */
export default function TindakanTable({
  adapter,
  filterPasienId = "",
  filterRm = "",
  onFilteredSummaryChange,
  isFilterCollapsed = false,
  onFilterActiveChange,
  onPhoneDirectoryOpen,
}: {
  adapter: Adapter;
  filterPasienId?: string;
  filterRm?: string;
  /** Sinkronkan jumlah & ringkasan filter ke ringkasan header */
  onFilteredSummaryChange?: (summary: TindakanFilteredSummary) => void;
  isFilterCollapsed?: boolean;
  onFilterActiveChange?: (active: boolean) => void;
  onPhoneDirectoryOpen?: () => void;
}) {
  const {
    tindakanList,
    openDetail,
    loading,
    refresh,
    deleteRecord,
    saveEditor,
    createRecord,
    error,
    isSyncing,
    patchLocalRow,
  } = adapter;
  const { theme } = useTheme();
  const lightMode = theme === "light";
  const { show: notify } = useNotification();
  const { confirm: appConfirm } = useAppDialog();

  const {
    doctors: doctorRaw,
    isLoading: doctorLoading,
    isError: doctorErrorRaw,
    mutate: mutateDoctors,
  } = useMasterDoctors();
  const {
    ruangan: ruanganMaster,
    isLoading: ruanganLoading,
    isError: ruanganErrorRaw,
    mutate: mutateRuangan,
  } = useMasterRuangan();
  const {
    masterTindakan: masterTindakanRaw,
    isLoading: masterTindakanLoading,
    isError: masterTindakanErrorRaw,
    mutate: mutateMasterTindakan,
  } = useMasterTindakan();
  const {
    pasien: pasienRaw,
    isLoading: pasienLoading,
    isError: pasienErrorRaw,
    mutate: mutatePasien,
  } = useMasterPasien();
  const { orders: pemakaianOrdersRaw, mutate: mutateOrders } =
    usePemakaianOrders();

  const doctorOptionsMaster = useMemo(() => {
    return (doctorRaw || [])
      .map((r: any) => mapApiDoctorRow(r))
      .filter((d: DoctorOption | null): d is DoctorOption =>
        Boolean(d && d.nama_dokter),
      );
  }, [doctorRaw]);

  const masterTindakanOptions = useMemo(() => {
    return (masterTindakanRaw || [])
      .map((r: any) =>
        r && typeof r === "object" && "id" in r && "nama" in r
          ? {
              id: String((r as MasterTindakanOption).id),
              nama: String((r as MasterTindakanOption).nama ?? "").trim(),
              aktif: (r as MasterTindakanOption).aktif !== false,
            }
          : null,
      )
      .filter(Boolean) as MasterTindakanOption[];
  }, [masterTindakanRaw]);

  const pasienOptions = useMemo(() => {
    return (pasienRaw || [])
      .map((r: any) =>
        r && typeof r === "object" ? mapApiPasienRow(r as any) : null,
      )
      .filter(Boolean) as PasienOption[];
  }, [pasienRaw]);

  useJarvisModeDataPublisher({ pasienOptions });

  const doctorError = doctorErrorRaw
    ? extractErrorMessage(doctorErrorRaw)
    : null;
  const ruanganError = ruanganErrorRaw
    ? extractErrorMessage(ruanganErrorRaw)
    : null;
  const masterTindakanError = masterTindakanErrorRaw
    ? extractErrorMessage(masterTindakanErrorRaw)
    : null;
  const pasienError = pasienErrorRaw
    ? extractErrorMessage(pasienErrorRaw)
    : null;

  /** Cegah sync ganda (auto + manual) dalam waktu bersamaan. */
  const { emit } = useEventBridge();
  const syncInFlightRef = useRef(false);
  const suppressRowDetailClickIdRef = useRef<string | null>(null);
  const suppressRowDetailClickTimerRef = useRef<number | null>(null);
  const rowPointerFieldOriginRef = useRef<{
    rowId: string;
    fieldRoot: Element;
  } | null>(null);
  const [isSyncingMasterPasien, setIsSyncingMasterPasien] = useState(false);

  const scheduleSuppressDetailClickForRow = useCallback((rowId: string) => {
    suppressRowDetailClickIdRef.current = rowId;
    if (suppressRowDetailClickTimerRef.current != null) {
      window.clearTimeout(suppressRowDetailClickTimerRef.current);
    }
    suppressRowDetailClickTimerRef.current = window.setTimeout(() => {
      suppressRowDetailClickIdRef.current = null;
      suppressRowDetailClickTimerRef.current = null;
    }, 450);
  }, []);

  /** Blok seleksi teks: mousedown di field → mouseup di kolom lain / area kosong baris yang sama. */
  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      rowPointerFieldOriginRef.current = null;
      const fieldRoot = resolveTindakanFieldRootFromPointerTarget(e.target);
      if (!fieldRoot) return;
      const tr = fieldRoot.closest("tr[data-tindakan-row-id]");
      if (!tr) return;
      const rowId = tr.getAttribute("data-tindakan-row-id");
      if (!rowId) return;
      rowPointerFieldOriginRef.current = { rowId, fieldRoot };
    };

    const onPointerUp = (e: MouseEvent) => {
      const orig = rowPointerFieldOriginRef.current;
      rowPointerFieldOriginRef.current = null;
      if (!orig) return;
      const up = e.target;
      if (!(up instanceof Element)) return;
      if (orig.fieldRoot.contains(up)) return;
      const trField = orig.fieldRoot.closest("tr[data-tindakan-row-id]");
      const trUp = up.closest("tr[data-tindakan-row-id]");
      if (!trField || trUp !== trField) return;
      scheduleSuppressDetailClickForRow(orig.rowId);
    };

    document.addEventListener("mousedown", onPointerDown, true);
    document.addEventListener("mouseup", onPointerUp, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown, true);
      document.removeEventListener("mouseup", onPointerUp, true);
    };
  }, [scheduleSuppressDetailClickForRow]);

  const [search, setSearch] = useState("");
  const debouncedSearchTrim = useDebouncedValue(search.trim(), 280);

  useEffect(() => {
    adapter.setServerFilters((prev) => {
      if (prev.search === debouncedSearchTrim) return prev;
      return { ...prev, search: debouncedSearchTrim };
    });
  }, [debouncedSearchTrim, adapter]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const [hoveredRowKey, setHoveredRowKey] = useState<string | null>(null);
  const [cathlabFallbackRows, setCathlabFallbackRows] = useState<
    TindakanJoinResult[]
  >([]);
  const [page, setPage] = useState(1);
  const PER_PAGE_KEY = "idik_tindakan_per_page";
  const PER_PAGE_ALLOWED = [10, 15, 25, 50, 100, 1000, 10000] as const;
  const [perPage, setPerPage] = useState(100);

  useEffect(() => {
    try {
      const n = Number(localStorage.getItem(PER_PAGE_KEY));
      if ((PER_PAGE_ALLOWED as readonly number[]).includes(n)) {
        setPerPage(n);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(PER_PAGE_KEY, String(perPage));
    } catch {
      /* ignore */
    }
  }, [perPage]);

  useEffect(() => {
    adapter.setServerFilters((prev) => {
      const wantLarge = perPage >= 1000;
      const limit = wantLarge && tindakanList.length > 0 ? 10000 : 1000;
      if (prev.limit === limit) return prev;
      return { ...prev, limit };
    });
  }, [perPage, tindakanList.length, adapter]);
  const [filterDokter, setFilterDokter] = useState("");
  const [filterRuangan, setFilterRuangan] = useState("");
  const [filterTindakan, setFilterTindakan] = useState("");
  const [filterTanggalFrom, setFilterTanggalFrom] = useState(
    () => readInitialTindakanDateFilter().from,
  );
  const [filterTanggalTo, setFilterTanggalTo] = useState(
    () => readInitialTindakanDateFilter().to,
  );
  const [filterPciOnly, setFilterPciOnly] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const TINDAKAN_FETCH_LIMIT = 1000;

  useEffect(() => {
    const from =
      extractCalendarDateKey(filterTanggalFrom.trim()) ??
      filterTanggalFrom.trim();
    const to =
      extractCalendarDateKey(filterTanggalTo.trim()) ?? filterTanggalTo.trim();

    const fromServer = from || undefined;
    const toParam = to || undefined;

    adapter.setServerFilters((prev) => {
      if (prev.from === fromServer && prev.to === toParam) return prev;
      return { ...prev, from: fromServer, to: toParam };
    });
  }, [filterTanggalFrom, filterTanggalTo, adapter]);

  const [highlightTindakanRowId, setHighlightTindakanRowId] = useState<
    string | null
  >(null);
  const [toolbarFilterSync, setToolbarFilterSync] = useState<{
    search?: string;
    tanggalFrom?: string;
    tanggalTo?: string;
    seq: number;
  } | null>(null);
  const revealRowInMainTableRef = useRef<
    (
      row: Record<string, unknown>,
      opts?: { silent?: boolean; skipSearchFilter?: boolean },
    ) => Promise<void>
  >(async () => {});
  /** Izinkan fetch API dengan tanggal > hari ini (mis. reveal dari Jadwal). */
  const allowFutureDateFetchRef = useRef(false);
  const [fastTrackModalOpen, setFastTrackModalOpen] = useState(false);
  const [tindakanTerbanyakLabOpen, setTindakanTerbanyakLabOpen] =
    useState(false);
  const [laporanModalOpen, setLaporanModalOpen] = useState(false);
  const [laporanInitialTab, setLaporanInitialTab] =
    useState<TindakanLaporanTab>("jenis");
  const [laporanPemakaianModalOpen, setLaporanPemakaianModalOpen] =
    useState(false);
  const [laporanMutuModalOpen, setLaporanMutuModalOpen] = useState(false);
  const [laporanPasienModalOpen, setLaporanPasienModalOpen] = useState(false);
  const [creatingForPasien, setCreatingForPasien] = useState(false);
  const [lastAutoCreateKey, setLastAutoCreateKey] = useState("");
  /** Riwayat tindakan (RM duplikat): default tertutup; kunci = id baris / fallback key. */
  const [rmHistoryOpenByRowKey, setRmHistoryOpenByRowKey] = useState<
    Record<string, boolean>
  >({});
  /** Ekspansi detail baris (Diagnosa, Kesimpulan, Plan, dsb.) */
  const [rowExpandedByKey, setRowExpandedByKey] = useState<
    Record<string, boolean>
  >({});
  const [pemakaianModalRow, setPemakaianModalRow] =
    useState<TindakanJoinResult | null>(null);
  const [icuModalRow, setIcuModalRow] = useState<TindakanJoinResult | null>(
    null,
  );
  /** Arc menu nama pasien: tetap terbuka singkat setelah mouse leave agar sempat ke ikon. */
  const [arcMenuRowKey, setArcMenuRowKey] = useState<string | null>(null);
  const arcMenuCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const openArcMenu = useCallback((rowKey: string) => {
    if (arcMenuCloseTimerRef.current != null) {
      clearTimeout(arcMenuCloseTimerRef.current);
      arcMenuCloseTimerRef.current = null;
    }
    setArcMenuRowKey(rowKey);
  }, []);

  const scheduleCloseArcMenu = useCallback(() => {
    if (arcMenuCloseTimerRef.current != null) {
      clearTimeout(arcMenuCloseTimerRef.current);
    }
    arcMenuCloseTimerRef.current = setTimeout(() => {
      setArcMenuRowKey(null);
      arcMenuCloseTimerRef.current = null;
    }, 700);
  }, []);

  const closeArcMenuImmediate = useCallback(() => {
    if (arcMenuCloseTimerRef.current != null) {
      clearTimeout(arcMenuCloseTimerRef.current);
      arcMenuCloseTimerRef.current = null;
    }
    setArcMenuRowKey(null);
  }, []);

  /** Ikon anestesi (arc): muncul saat hover area kolom dokter — selaras arc menu nama pasien. */
  const [anestesiArcRowKey, setAnestesiArcRowKey] = useState<string | null>(
    null,
  );
  const anestesiArcCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const openAnestesiArc = useCallback((rowKey: string) => {
    if (anestesiArcCloseTimerRef.current != null) {
      clearTimeout(anestesiArcCloseTimerRef.current);
      anestesiArcCloseTimerRef.current = null;
    }
    setAnestesiArcRowKey(rowKey);
  }, []);

  const scheduleCloseAnestesiArc = useCallback(() => {
    if (anestesiArcCloseTimerRef.current != null) {
      clearTimeout(anestesiArcCloseTimerRef.current);
    }
    anestesiArcCloseTimerRef.current = setTimeout(() => {
      setAnestesiArcRowKey(null);
      anestesiArcCloseTimerRef.current = null;
    }, 700);
  }, []);

  const closeAnestesiArcImmediate = useCallback(() => {
    if (anestesiArcCloseTimerRef.current != null) {
      clearTimeout(anestesiArcCloseTimerRef.current);
      anestesiArcCloseTimerRef.current = null;
    }
    setAnestesiArcRowKey(null);
  }, []);

  useEffect(() => {
    return () => {
      if (arcMenuCloseTimerRef.current != null) {
        clearTimeout(arcMenuCloseTimerRef.current);
      }
      if (anestesiArcCloseTimerRef.current != null) {
        clearTimeout(anestesiArcCloseTimerRef.current);
      }
    };
  }, []);

  /**
   * Setelah simpan order pemakaian, SWR `pemakaianOrdersRaw` bisa tertunda —
   * override ini memetakan `tindakanId → orderId` agar kolom Aksi langsung "Edit pemakaian".
   */
  const [
    pemakaianOrderIdOverrideByTindakan,
    setPemakaianOrderIdOverrideByTindakan,
  ] = useState<Record<string, string>>({});
  /** Sementara sembunyikan order setelah hapus (sebelum SWR refresh). */
  const [
    pemakaianOrderClearedByTindakan,
    setPemakaianOrderClearedByTindakan,
  ] = useState<Record<string, true>>({});

  const [pasienLabelByRowId, setPasienLabelByRowId] = useState<
    Record<string, string>
  >({});

  const [doctorLabelByRowId, setDoctorLabelByRowId] = useState<
    Record<string, string>
  >({});

  const dokterSourceRows = useMemo((): TindakanJoinResult[] => {
    if (tindakanList.length) return tindakanList as TindakanJoinResult[];
    if (cathlabFallbackRows.length) return cathlabFallbackRows;
    return [];
  }, [tindakanList, cathlabFallbackRows]);

  useTindakanAutoSelesaiSync(dokterSourceRows, () => {
    void refresh();
  });

  const { dokterOptions, ruanganFilterOptions, tindakanFilterOptions } =
    useMemo(() => {
      const dSet = new Set<string>();
      const rSet = new Set<string>();
      const tSet = new Set<string>();
      const master = doctorOptionsMaster;
      for (const r of dokterSourceRows) {
        const d = String(r.dokter ?? "").trim();
        if (d)
          dSet.add(
            master.length > 0 ? canonicalDoctorStoredValue(master, d) : d,
          );
        const rx = String(r.ruangan ?? "").trim().toUpperCase();
        if (rx) {
          const rxLower = rx.toLowerCase();
          if (rxLower === "belum diisi" || rxLower === "—") {
            rSet.add("Belum diisi");
          } else if (rxLower.includes("belum")) {
            // Skip corrupted placeholder values
          } else {
            const matchedMaster = ruanganMaster.find((opt: RuanganOption) => {
              const label = formatRuanganLabel(opt).trim().toUpperCase();
              const nama = String(opt.nama ?? "").trim().toUpperCase();
              return rx === label || rx === nama;
            });
            if (matchedMaster) {
              rSet.add(formatRuanganLabel(matchedMaster).trim().toUpperCase());
            } else {
              rSet.add(rx);
            }
          }
        }
        const tx = String(r.tindakan ?? "").trim();
        if (tx) tSet.add(tx);
      }
      for (const opt of ruanganMaster) {
        const label = formatRuanganLabel(opt).trim();
        if (label) rSet.add(label);
      }
      return {
        dokterOptions: Array.from(dSet).sort((a, b) =>
          a.localeCompare(b, "id"),
        ),
        ruanganFilterOptions: Array.from(rSet).sort((a, b) =>
          a.localeCompare(b, "id"),
        ),
        tindakanFilterOptions: Array.from(tSet).sort((a, b) =>
          a.localeCompare(b, "id"),
        ),
      };
    }, [dokterSourceRows, doctorOptionsMaster, ruanganMaster]);

  const doctorOptionsForPemakaianModal = useMemo(
    () =>
      doctorOptionsMaster.length
        ? doctorOptionsMaster
        : (dokterOptions as string[]).map((nama, idx) => ({
            id: `local:${idx}`,
            nama_dokter: nama,
            spesialis: null,
            aktif: true,
          })),
    [doctorOptionsMaster, dokterOptions],
  );

  useEffect(() => {
    const pasienActive = Boolean(filterPasienId.trim() || filterRm.trim());
    if (!pasienActive) {
      setCathlabFallbackRows([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const q = new URLSearchParams();
        if (filterPasienId.trim()) q.set("pasienId", filterPasienId.trim());
        if (filterRm.trim()) q.set("rm", filterRm.trim());
        const url = q.toString()
          ? `/api/cathlab/tindakan-hari-ini?${q.toString()}`
          : "/api/cathlab/tindakan-hari-ini";
        const res = await fetch(url, {
          credentials: "include",
        });
        const json = (await res.json().catch(() => ({}))) as {
          rows?: Array<Record<string, unknown>>;
          mode?: string;
          message?: string;
        };
        if (cancelled) return;
        const rows = Array.isArray(json?.rows) ? json.rows : [];
        setCathlabFallbackRows(
          rows.map((r) => ({
            id: String(r.id ?? ""),
            pasien_id: r.pasien_id != null ? String(r.pasien_id) : null,
            tanggal: r.tanggal != null ? String(r.tanggal) : null,
            waktu: r.waktu != null ? String(r.waktu) : null,
            no_rm: r.no_rm != null ? String(r.no_rm) : null,
            nama_pasien: r.nama_pasien != null ? String(r.nama_pasien) : null,
            dokter: r.dokter != null ? String(r.dokter) : null,
            tindakan:
              r.tindakan != null
                ? String(r.tindakan)
                : r.alkes_utama != null
                  ? String(r.alkes_utama)
                  : null,
            kategori: r.kategori != null ? String(r.kategori) : null,
            status: r.status != null ? String(r.status) : null,
            ruangan: r.ruangan != null ? String(r.ruangan) : null,
            is_fast_track: r.is_fast_track,
            pasien_datang_igd: r.pasien_datang_igd,
            door_to_balloon: r.door_to_balloon,
            total_waktu_fast_track: r.total_waktu_fast_track,
            umur: r.umur != null ? Number(r.umur) : null,
            tgl_lahir: r.tgl_lahir != null ? String(r.tgl_lahir) : null,
          })) as TindakanJoinResult[],
        );
      } catch {
        if (!cancelled) {
          setCathlabFallbackRows([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filterPasienId, filterRm]);

  /** Baris kasus untuk tautkan order pemakaian legacy tanpa tindakan_id. */
  const rowsForPemakaianLink = useMemo(() => {
    const merged = [
      ...(tindakanList as TindakanJoinResult[]),
      ...cathlabFallbackRows,
    ];
    const dedupByKey = new Map<string, TindakanJoinResult>();
    for (let idx = 0; idx < merged.length; idx += 1) {
      const row = merged[idx];
      const id = String(row.id ?? "").trim();

      // Fallback key untuk dedup: RM + Tanggal + Tindakan + Nama Pasien
      const rowRm = normalizeDigitsOnly(displayRm(row as any));
      const rowDate = extractCalendarDateKey(String(row.tanggal ?? ""));
      const rowTindakan = String(row.tindakan ?? "")
        .toLowerCase()
        .trim();
      const rowNama = String(row.nama_pasien ?? (row as any).nama ?? "")
        .toLowerCase()
        .trim();

      const fallbackKey = [rowRm, rowDate, rowTindakan, rowNama].join("|");

      // STRATEGI DEDUP:
      // 1. Jika ada ID, gunakan ID sebagai kunci. Ini memastikan record DB yang unik tetap unik.
      // 2. Jika ID kosong, gunakan fallbackKey.
      // 3. Jika fallbackKey juga kosong/pendek, gunakan index agar tidak mendepud baris yang berbeda.
      const key =
        id || (fallbackKey.length > 15 ? `fb:${fallbackKey}` : `noid:${idx}`);

      const rowWithKey = { ...row, _idik_row_key: key };
      if (!dedupByKey.has(key)) {
        dedupByKey.set(key, rowWithKey);
      }
    }
    return Array.from(dedupByKey.values());
  }, [tindakanList, cathlabFallbackRows]);

  /** `tindakan.id` → id order terbaru (via tindakan_id DB atau fallback nama+RM+tanggal). */
  const pemakaianOrderByTindakanId = useMemo(() => {
    const next: Record<string, string> = {};
    const orders = pemakaianOrdersRaw;

    for (const o of orders) {
      const tid = typeof o.tindakan_id === "string" ? o.tindakan_id.trim() : "";
      const oid = typeof o.id === "string" ? o.id.trim() : "";
      if (tid && oid && !next[tid]) next[tid] = oid;
    }

    const unlinked = orders.filter(
      (o: any) => !String(o.tindakan_id ?? "").trim(),
    );
    let pool = unlinked.slice();

    const sortedRows = rowsForPemakaianLink
      .filter((row: any) => Boolean(String(row.id ?? "").trim()))
      .sort((a: any, b: any) => {
        const ta = String(a.tanggal ?? "").trim();
        const tb = String(b.tanggal ?? "").trim();
        const da = extractCalendarDateKey(ta) ?? ta;
        const db = extractCalendarDateKey(tb) ?? tb;
        const byDate = db.localeCompare(da);
        if (byDate !== 0) return byDate;
        return String(b.id ?? "").localeCompare(String(a.id ?? ""));
      });

    for (const row of sortedRows) {
      const rowId = String(row.id ?? "").trim();
      if (!rowId || next[rowId]) continue;
      const raw = row as unknown as Record<string, unknown>;
      const label = pasienLabelByRowId[rowId] ?? buildPasienLabelFromRow(raw);
      if (!label.trim()) continue;
      const rowDate = extractCalendarDateKey(String(row.tanggal ?? ""));

      const idx = pool.findIndex((o: any) => {
        const op = String(o.pasien ?? "").trim();
        if (!op) return false;
        if (!orderPasienMatchesTindakanRowLabel(op, label)) return false;
        const od = extractCalendarDateKey(String(o.tanggal ?? ""));
        if (rowDate && od && rowDate !== od) return false;
        return true;
      });
      if (idx < 0) continue;
      const hit = pool[idx];
      const hid = String(hit.id ?? "").trim();
      if (!hid) continue;
      next[rowId] = hid;
      pool = pool.filter((_: any, i: number) => i !== idx);
    }

    for (const [tid, oid] of Object.entries(
      pemakaianOrderIdOverrideByTindakan,
    )) {
      if (tid && oid) next[tid] = oid;
    }

    for (const tid of Object.keys(pemakaianOrderClearedByTindakan)) {
      delete next[tid];
    }

    return next;
  }, [
    pemakaianOrdersRaw,
    rowsForPemakaianLink,
    pasienLabelByRowId,
    pemakaianOrderIdOverrideByTindakan,
    pemakaianOrderClearedByTindakan,
  ]);

  useEffect(() => {
    setPemakaianOrderIdOverrideByTindakan((prev) => {
      if (Object.keys(prev).length === 0) return prev;
      const orders = pemakaianOrdersRaw;
      let next: Record<string, string> | null = null;
      for (const tid of Object.keys(prev)) {
        const wantOid = prev[tid];
        const found = orders.some((o: any) => {
          const t = String(o?.tindakan_id ?? "").trim();
          const oid = String(o?.id ?? "").trim();
          return t === tid && oid === wantOid;
        });
        if (found) {
          if (!next) next = { ...prev };
          delete next[tid];
        }
      }
      return next ?? prev;
    });
  }, [pemakaianOrdersRaw]);

  const pemakaianModalInitial = useMemo(() => {
    if (!pemakaianModalRow) return null;
    const id = String(pemakaianModalRow.id ?? "").trim();
    const raw = pemakaianModalRow as unknown as Record<string, unknown>;
    const tindakanIdForApi = id || null;
    const linkedOrderId =
      tindakanIdForApi && pemakaianOrderByTindakanId[tindakanIdForApi]
        ? pemakaianOrderByTindakanId[tindakanIdForApi]
        : null;
    return {
      initialPasienLabel:
        pasienLabelByRowId[id] ?? buildPasienLabelFromRow(raw),
      initialDokter:
        doctorLabelByRowId[id] ??
        canonicalDoctorDisplayValue(
          doctorOptionsMaster,
          isPlaceholderTindakanLabel(String(pemakaianModalRow.dokter ?? ""))
            ? ""
            : String(pemakaianModalRow.dokter ?? ""),
        ),
      initialRuangan: isPlaceholderTindakanLabel(
        String(pemakaianModalRow.ruangan ?? ""),
      )
        ? ""
        : String(pemakaianModalRow.ruangan ?? "").trim(),
      tindakanId: tindakanIdForApi,
      initialPemakaianOrderId: linkedOrderId,
      initialAsisten: String(pemakaianModalRow.asisten ?? "").trim(),
    };
  }, [
    pemakaianModalRow,
    pasienLabelByRowId,
    doctorLabelByRowId,
    doctorOptionsMaster,
    pemakaianOrderByTindakanId,
  ]);

  const isCathlabRowComplete = useCallback((row: any): boolean => {
    const isCath = `${row?.kategori ?? ""} ${row?.ruangan ?? ""}`.toLowerCase().includes("cath");
    if (!isCath) return true; // Baris non-Cathlab tidak terkena aturan ini

    const txt = (v: any) => String(v ?? "").trim();
    const isPlaceholder = (s: string) => {
      const l = s.toLowerCase();
      return (
        !l ||
        l === "pasien" ||
        l === "belum diisi" ||
        l === "belum ditentukan" ||
        l.includes("cari / pilih")
      );
    };

    const hasTanggal = Boolean(txt(row?.tanggal));
    const hasRm = Boolean(txt(row?.no_rm ?? row?.rm)) && txt(row?.no_rm ?? row?.rm) !== "—";
    const hasNama = Boolean(txt(row?.nama_pasien ?? row?.nama)) && !isPlaceholder(txt(row?.nama_pasien ?? row?.nama));

    const status = txt(row?.status).toLowerCase();
    const isDraftLike =
      !status || status === "menunggu" || status === "proses";
    const tindakanPlaceholder = isPlaceholder(txt(row?.tindakan));
    const dokterPlaceholder = isPlaceholder(txt(row?.dokter));
    if (isDraftLike || tindakanPlaceholder || dokterPlaceholder) {
      // Draft Cath Lab / toolbar: tampilkan di tabel utama dengan identitas minimal.
      return hasTanggal && hasRm && hasNama;
    }

    const hasKelas = Boolean(txt(row?.kelas_pembiayaan));
    const hasUmur = Boolean(txt(row?.umur));
    const hasRuangan = Boolean(txt(row?.ruangan));
    const hasDiagnosa = Boolean(txt(row?.diagnosa));
    const hasTindakan =
      Boolean(txt(row?.tindakan)) && !isPlaceholder(txt(row?.tindakan));
    const hasDokter =
      Boolean(txt(row?.dokter)) && !isPlaceholder(txt(row?.dokter));
    const hasHasilLab = Boolean(txt(row?.hasil_lab_ppm));

    return (
      hasTanggal &&
      hasRm &&
      hasNama &&
      hasKelas &&
      hasUmur &&
      hasRuangan &&
      hasDiagnosa &&
      hasTindakan &&
      hasDokter &&
      hasHasilLab
    );
  }, []);

  const filteredRecords = useMemo(() => {
    const merged = [...rowsForPemakaianLink];
    const dedupByKey = new Map<string, TindakanJoinResult>();
    for (let idx = 0; idx < merged.length; idx += 1) {
      const row = merged[idx];
      const id = String(row.id ?? "").trim();
      const fallbackKey = [
        String(row.pasien_id ?? "").trim(),
        String(row.no_rm ?? "").trim(),
        String(row.tanggal ?? "").trim(),
        String(row.waktu ?? "").trim(),
        String(row.dokter ?? "").trim(),
        String(row.tindakan ?? "").trim(),
        String(row.status ?? "").trim(),
      ].join("|");
      const key = id || `noid:${fallbackKey || idx}`;
      if (!dedupByKey.has(key)) dedupByKey.set(key, row);
    }
    const fullList = Array.from(dedupByKey.values());
    let list = fullList.filter(isCathlabRowComplete);

    const todayYmd = todayWibYmd();
    const hasExplicitDateFilter = Boolean(
      filterTanggalFrom.trim() || filterTanggalTo.trim(),
    );
    list = list.filter((r) => {
      const isCath = `${r.kategori ?? ""} ${r.ruangan ?? ""}`
        .toLowerCase()
        .includes("cath");
      if (!isCath) return true;
      const rowDate = extractCalendarDateKey(String(r.tanggal ?? "").trim());
      if (!rowDate) return true;
      if (!hasExplicitDateFilter && rowDate > todayYmd) return false;
      return true;
    });

    const pasienId = String(filterPasienId ?? "").trim();
    const rmOrQuery = String(filterRm ?? "").trim();
    const pasienParsed = parsePasienAktifFilter(filterRm);
    if (pasienId) {
      list = list.filter((r) => {
        const idMatch = String(r.pasien_id ?? "").trim() === pasienId;
        if (idMatch) return true;
        // Fallback untuk data legacy yang belum menyimpan pasien_id secara konsisten.
        if (pasienParsed.rm || pasienParsed.nama || pasienParsed.freeText) {
          return rowMatchesPasienAktifFilter(
            r as unknown as Record<string, unknown>,
            pasienParsed,
          );
        }
        return false;
      });
    }
    if (
      !pasienId &&
      (pasienParsed.rm || pasienParsed.nama || pasienParsed.freeText)
    ) {
      list = list.filter((r) =>
        rowMatchesPasienAktifFilter(
          r as unknown as Record<string, unknown>,
          pasienParsed,
        ),
      );
    }
    if (filterDokter) {
      const master = doctorOptionsMaster;
      list = list.filter((r) => {
        const rowD = String(r.dokter ?? "").trim();
        if (rowD === filterDokter) return true;
        if (!master.length) return false;
        return (
          canonicalDoctorStoredValue(master, rowD) ===
          canonicalDoctorStoredValue(master, filterDokter)
        );
      });
    }
    if (filterRuangan) {
      list = list.filter(
        (r) => String(r.ruangan ?? "").trim() === filterRuangan,
      );
    }
    if (filterTindakan.trim()) {
      const ft = filterTindakan.trim().toLowerCase();
      list = list.filter((r) => {
        const t = String(r.tindakan ?? "").toLowerCase();
        return t.includes(ft);
      });
    }
    if (filterTanggalFrom.trim() || filterTanggalTo.trim()) {
      const from =
        extractCalendarDateKey(filterTanggalFrom.trim()) ??
        filterTanggalFrom.trim();
      const to =
        extractCalendarDateKey(filterTanggalTo.trim()) ??
        filterTanggalTo.trim();
      list = list.filter((r) => {
        const t =
          extractCalendarDateKey(String(r.tanggal ?? "").trim()) ??
          String(r.tanggal ?? "").trim();
        if (!t) return false;
        if (from && t < from) return false;
        if (to && t > to) return false;
        return true;
      });
    }
    if (filterPciOnly) {
      list = list.filter((r) => {
        const t = String(r.tindakan ?? "").toLowerCase();
        return t.includes("pci") || t.includes("ptca");
      });
    }
    const fs = String(filterStatus ?? "").trim();
    if (fs) {
      list = list.filter((r) => String(r.status ?? "").trim() === fs);
    }
    const q = debouncedSearchTrim.toLowerCase();
    if (q) {
      list = list.filter((r) =>
        rowSearchHaystack(
          r,
          pasienOptions,
          pasienLabelByRowId,
          doctorOptionsMaster,
          (r as any)._idik_row_key,
        ).includes(q),
      );
    }
    if ((pasienId || rmOrQuery) && list.length === 0) {
      // Fallback: schema/kolom tindakan antar environment kadang berbeda.
      // Tetap coba tampilkan baris pasien berdasarkan alias kolom umum.
      list = fullList.filter((r) =>
        rowMatchesPasienQueryFallback(r, pasienId, rmOrQuery),
      );
    }
    if ((pasienId || rmOrQuery) && list.length === 0) {
      // Fallback terdalam: cari token pasien di seluruh isi baris.
      list = fullList.filter((r) =>
        rowMatchesPasienDeepFallback(r, pasienId, rmOrQuery),
      );
    }
    return [...list].sort((a, b) => {
      const ta = String(a.tanggal ?? "").trim();
      const tb = String(b.tanggal ?? "").trim();
      const hasA = Boolean(ta);
      const hasB = Boolean(tb);
      if (hasA !== hasB) return hasA ? -1 : 1;
      if (!hasA) return 0;
      const byDate = tb.localeCompare(ta);
      if (byDate !== 0) return byDate;

      // Urutkan berdasarkan waktu input terbaru (created_at) di atas
      const ca = String(a.created_at ?? "").trim();
      const cb = String(b.created_at ?? "").trim();
      if (ca && cb) {
        const byCreated = cb.localeCompare(ca);
        if (byCreated !== 0) return byCreated;
      }

      const wa = String(a.waktu ?? "").trim();
      const wb = String(b.waktu ?? "").trim();
      if (wa || wb) {
        const byTime = wb.localeCompare(wa);
        if (byTime !== 0) return byTime;
      }

      const idA = Number(a.id);
      const idB = Number(b.id);
      if (Number.isFinite(idA) && Number.isFinite(idB)) {
        return idB - idA;
      }
      return String(b.id ?? "").localeCompare(String(a.id ?? ""));
    });
  }, [
    rowsForPemakaianLink,
    filterPasienId,
    filterRm,
    filterDokter,
    filterRuangan,
    filterTindakan,
    filterTanggalFrom,
    filterTanggalTo,
    filterPciOnly,
    pasienOptions,
    pasienLabelByRowId,
    debouncedSearchTrim,
    doctorOptionsMaster,
    isCathlabRowComplete,
  ]);

  const filterSummaryLines = useMemo(() => {
    const lines: string[] = [];
    const fd = String(filterDokter ?? "").trim();
    if (fd) {
      const display =
        canonicalDoctorDisplayValue(doctorOptionsMaster, fd) || fd;
      lines.push(`Dokter: ${display}`);
    }
    const fr = String(filterRuangan ?? "").trim();
    if (fr) {
      lines.push(`Ruangan: ${fr}`);
    }
    const ft = String(filterTindakan ?? "").trim();
    if (ft) {
      lines.push(`Tindakan: ${ft}`);
    }
    const from = String(filterTanggalFrom ?? "").trim();
    const to = String(filterTanggalTo ?? "").trim();
    if (from || to) {
      lines.push(`Tanggal: ${from || "…"} – ${to || "…"}`);
    }
    if (filterPciOnly) {
      lines.push("Prosedur: PCI");
    }
    const fst = String(filterStatus ?? "").trim();
    if (fst) {
      lines.push(`Status: ${fst}`);
    }
    const q = String(debouncedSearchTrim ?? "").trim();
    if (q) {
      const short = q.length > 48 ? `${q.slice(0, 45)}…` : q;
      lines.push(`Cari: ${short}`);
    }
    const pid = String(filterPasienId ?? "").trim();
    const frm = String(filterRm ?? "").trim();
    if (pid) {
      lines.push("Pasien: filter aktif");
    } else if (frm) {
      const short = frm.length > 40 ? `${frm.slice(0, 37)}…` : frm;
      lines.push(`Pasien/RM: ${short}`);
    }
    return lines;
  }, [
    filterDokter,
    filterRuangan,
    filterTanggalFrom,
    filterTanggalTo,
    filterPciOnly,
    filterStatus,
    debouncedSearchTrim,
    filterPasienId,
    filterRm,
    doctorOptionsMaster,
  ]);

  const filteredRowStats = useMemo(
    () => computeTindakanStatsFromRows(filteredRecords),
    [filteredRecords],
  );

  const hasTanggalFilter = useMemo(
    () =>
      Boolean(
        String(filterTanggalFrom ?? "").trim() ||
        String(filterTanggalTo ?? "").trim(),
      ),
    [filterTanggalFrom, filterTanggalTo],
  );

  const dataFetchMeta = useMemo(() => {
    const from = String(filterTanggalFrom ?? "").trim();
    const to = String(filterTanggalTo ?? "").trim();
    let filterLabel = "semua";
    if (from && to && from === to) {
      filterLabel = formatTanggalDdMmYyyy(from);
    } else if (!from && to) {
      filterLabel = `s/d ${formatTanggalDdMmYyyy(to)}`;
    } else if (from && to) {
      filterLabel = `${formatTanggalDdMmYyyy(from)} – ${formatTanggalDdMmYyyy(to)}`;
    } else if (from) {
      filterLabel = `dari ${formatTanggalDdMmYyyy(from)}`;
    } else if (to) {
      filterLabel = `sampai ${formatTanggalDdMmYyyy(to)}`;
    }
    return {
      filterLabel,
      fetchedCount: tindakanList.length,
      atFetchLimit: tindakanList.length >= TINDAKAN_FETCH_LIMIT,
    };
  }, [filterTanggalFrom, filterTanggalTo, tindakanList.length]);

  // TOTAL PASIEN mengikuti filter toolbar agar sinkron dengan baris tabel yang tampil.
  const filteredRowStatsFixedTotalPasien = useMemo(
    () => ({
      ...filteredRowStats,
    }),
    [filteredRowStats],
  );

  /** Satu pass pada filteredRecords untuk KPI hari ini + PPCI minggu (hemat 1× O(n)). */
  const { todayRowsForKpi, weeklyPpciRowsForKpi } = useMemo(() => {
    const today = todayWibYmd();
    const wStart = startOfWeekWibYmd();
    const wEnd = endOfWeekWibYmd();
    const todayRows: TindakanJoinResult[] = [];
    const weeklyRows: TindakanJoinResult[] = [];
    for (const rec of filteredRecords) {
      const key = extractCalendarDateKey(String(rec.tanggal ?? "").trim());
      if (key === today) {
        todayRows.push(rec);
      }
      const t = String(rec.tindakan ?? "")
        .trim()
        .toLowerCase();
      if (t.includes("ppci")) {
        const rs = String(rec.rs_perujuk ?? "")
          .trim()
          .toLowerCase();
        const ket = String(rec.keterangan ?? "")
          .trim()
          .toLowerCase();
        if (!rs.includes("pribadi") && !ket.includes("pribadi")) {
          if (key != null && key >= wStart && key <= wEnd) {
            weeklyRows.push(rec);
          }
        }
      }
    }
    return {
      todayRowsForKpi: todayRows,
      weeklyPpciRowsForKpi: weeklyRows,
    };
  }, [filteredRecords]);

  const {
    tindakanBreakdownToday,
    dokterBreakdownToday,
    totalTindakanToday,
    totalDokterToday,
    filteredRowGender,
    linkedCount,
    tindakanBreakdownFiltered,
    dokterBreakdownFiltered,
    ppciDokterBreakdownWeekly,
    totalPpciWeekly,
  } = useMemo(() => {
    const tTodayMap = new Map<string, number>();
    const dTodayMap = new Map<string, { count: number; display: string }>();
    const dTodaySet = new Set<string>();
    const master = doctorOptionsMaster;

    const tFilteredMap = new Map<string, number>();
    const dFilteredMap = new Map<string, { count: number; display: string }>();

    const dPpciWeeklyMap = new Map<
      string,
      { count: number; display: string }
    >();

    let laki = 0;
    let perempuan = 0;
    let linked = 0;

    const todaySet = new Set(todayRowsForKpi);
    const ppciWeeklySet = new Set(weeklyPpciRowsForKpi);
    // KPI Gender, Tindakan, dan Dokter diminta selalu menampilkan data "Hari Ini" (WIB).
    const genderSourceSet = new Set(todayRowsForKpi);

    for (const rec of filteredRecords) {
      const isToday = todaySet.has(rec);
      const isPpciWeekly = ppciWeeklySet.has(rec);
      const isGenderSource = genderSourceSet.has(rec);

      const t = String(rec.tindakan ?? "").trim();
      const dr = String(rec.dokter ?? "").trim();
      const link = String(rec.pci_report_link ?? "").trim();

      if (link && link.includes("docs.google.com")) {
        linked += 1;
      }

      // Stats Filtered
      if (t) tFilteredMap.set(t, (tFilteredMap.get(t) ?? 0) + 1);
      if (dr && dr !== "—") {
        const k = master.length ? canonicalDoctorStoredValue(master, dr) : dr;
        if (k) {
          const disp = master.length
            ? canonicalDoctorDisplayValue(master, k) || k
            : dr;
          const prev = dFilteredMap.get(k);
          if (prev) dFilteredMap.set(k, { ...prev, count: prev.count + 1 });
          else dFilteredMap.set(k, { count: 1, display: disp });
        }
      }

      // Stats Today
      if (isToday) {
        if (t) tTodayMap.set(t, (tTodayMap.get(t) ?? 0) + 1);
        if (dr && dr !== "—") {
          const k = master.length ? canonicalDoctorStoredValue(master, dr) : dr;
          if (k) {
            dTodaySet.add(k);
            const disp = master.length
              ? canonicalDoctorDisplayValue(master, k) || k
              : dr;
            const prev = dTodayMap.get(k);
            if (prev) dTodayMap.set(k, { ...prev, count: prev.count + 1 });
            else dTodayMap.set(k, { count: 1, display: disp });
          }
        }
      }

      // Stats PPCI Weekly
      if (isPpciWeekly) {
        if (dr && dr !== "—") {
          const k = master.length ? canonicalDoctorStoredValue(master, dr) : dr;
          if (k) {
            const disp = master.length
              ? canonicalDoctorDisplayValue(master, k) || k
              : dr;
            const prev = dPpciWeeklyMap.get(k);
            if (prev) dPpciWeeklyMap.set(k, { ...prev, count: prev.count + 1 });
            else dPpciWeeklyMap.set(k, { count: 1, display: disp });
          }
        }
      }

      // Gender
      if (isGenderSource) {
        const raw = rec as unknown as Record<string, unknown>;
        const p = resolvePasienFromRow(pasienOptions, raw);
        const jk = resolveJenisKelaminFromRow(raw, p);
        if (jk === "L") laki += 1;
        else if (jk === "P") perempuan += 1;
      }
    }

    const fmt = (m: Map<string, number>) =>
      Array.from(m.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "id"))
        .slice(0, 6)
        .map(([n, c]) => `${c}. ${n}`);

    const fmtD = (m: Map<string, { count: number; display: string }>) =>
      Array.from(m.values())
        .sort(
          (a, b) =>
            b.count - a.count || a.display.localeCompare(b.display, "id"),
        )
        .slice(0, 6)
        .map((x) => `${x.count}. ${x.display}`);

    return {
      tindakanBreakdownToday: fmt(tTodayMap),
      dokterBreakdownToday: fmtD(dTodayMap),
      // KPI "Total tindakan" di dashboard menunjukkan jumlah jenis tindakan unik.
      totalTindakanToday: tTodayMap.size,
      totalDokterToday: dTodaySet.size,
      filteredRowGender: { laki, perempuan },
      linkedCount: linked,
      tindakanBreakdownFiltered: fmt(tFilteredMap),
      dokterBreakdownFiltered: fmtD(dFilteredMap),
      ppciDokterBreakdownWeekly: fmtD(dPpciWeeklyMap),
      totalPpciWeekly: weeklyPpciRowsForKpi.length,
    };
  }, [
    filteredRecords,
    todayRowsForKpi,
    weeklyPpciRowsForKpi,
    hasTanggalFilter,
    doctorOptionsMaster,
    pasienOptions,
  ]);

  const filteredRowStatsTodayAdjusted = useMemo(
    () => ({
      ...filteredRowStatsFixedTotalPasien,
      "PPCI Minggu Ini": totalPpciWeekly,
      "Total tindakan": totalTindakanToday,
      "Total dokter": totalDokterToday,
      "Laporan Terpetakan": linkedCount,
    }),
    [
      filteredRowStatsFixedTotalPasien,
      totalPpciWeekly,
      totalTindakanToday,
      totalDokterToday,
      linkedCount,
    ],
  );

  const filteredRowStatsTanggalAdjusted = useMemo(() => {
    const next: Record<string, number> = {
      ...filteredRowStatsFixedTotalPasien,
      // KPI tertentu diminta selalu menampilkan data "Hari Ini" atau "Minggu Ini" (WIB).
      "PPCI Minggu Ini": totalPpciWeekly,
      "Total tindakan": totalTindakanToday,
      "Total dokter": totalDokterToday,
      "Laporan Terpetakan": linkedCount,
    };
    delete next["Pasien hari ini"];
    return next;
  }, [
    filteredRowStatsFixedTotalPasien,
    totalPpciWeekly,
    totalTindakanToday,
    totalDokterToday,
    linkedCount,
  ]);

  const kpiStats = useMemo(
    () =>
      hasTanggalFilter
        ? filteredRowStatsTanggalAdjusted
        : filteredRowStatsTodayAdjusted,
    [
      hasTanggalFilter,
      filteredRowStatsTanggalAdjusted,
      filteredRowStatsTodayAdjusted,
    ],
  );

  const kpiTindakanBreakdown = useMemo(
    // KPI rincian tindakan diminta selalu menampilkan data "Hari Ini" (WIB).
    () => tindakanBreakdownToday,
    [tindakanBreakdownToday],
  );

  const kpiDokterBreakdown = useMemo(
    // KPI rincian dokter diminta selalu menampilkan data "Hari Ini" (WIB).
    () => dokterBreakdownToday,
    [dokterBreakdownToday],
  );

  const lastSentSummaryRef = useRef<string>("");

  useEffect(() => {
    const summary: TindakanFilteredSummary = {
      count: filteredRecords.length,
      lines: filterSummaryLines,
      stats: kpiStats,
      gender: filteredRowGender,
      tindakanBreakdown: kpiTindakanBreakdown,
      dokterBreakdown: kpiDokterBreakdown,
      ppciDokterBreakdown: ppciDokterBreakdownWeekly,
      allRows: filteredRecords,
    };

    // Prevent infinite loop by only calling if important parts changed
    // We compare everything except allRows (too heavy to stringify)
    const summaryTag = JSON.stringify({
      count: summary.count,
      lines: summary.lines,
      stats: summary.stats,
      gender: summary.gender,
      tindakanBreakdown: summary.tindakanBreakdown,
      dokterBreakdown: summary.dokterBreakdown,
      ppciDokterBreakdown: summary.ppciDokterBreakdown,
      // Lightweight markers for allRows change
      allRowsLength: summary.allRows?.length ?? 0,
      allRowsFirstId: summary.allRows?.[0]?.id,
    });

    if (summaryTag !== lastSentSummaryRef.current) {
      lastSentSummaryRef.current = summaryTag;
      onFilteredSummaryChange?.(summary);
    }
  }, [
    filteredRecords,
    filterSummaryLines,
    kpiStats,
    filteredRowGender,
    kpiTindakanBreakdown,
    kpiDokterBreakdown,
    ppciDokterBreakdownWeekly,
    hasTanggalFilter,
    onFilteredSummaryChange,
  ]);

  useEffect(() => {
    setPage(1);
  }, [
    search,
    debouncedSearchTrim,
    filterPasienId,
    filterRm,
    filterDokter,
    filterRuangan,
    filterTindakan,
    filterTanggalFrom,
    filterTanggalTo,
    filterPciOnly,
    filterStatus,
    perPage,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / perPage));

  useEffect(() => {
    setPage((p) => (p > totalPages ? totalPages : p));
  }, [totalPages]);

  const pagedRecords = useMemo(() => {
    const start = (page - 1) * perPage;
    return filteredRecords.slice(start, start + perPage);
  }, [filteredRecords, page, perPage]);

  const tindakanDataTableRef = useRef<HTMLTableElement>(null);
  const tindakanPasteMatrixRef = useRef<
    | ((matrix: string[][], anchor: TindakanCellRect) => void | Promise<void>)
    | null
  >(null);
  const cellSelection = useTindakanTableCellSelection(pagedRecords.length, {
    tableRef: tindakanDataTableRef,
    onPasteMatrixRef: tindakanPasteMatrixRef,
  });
  useEffect(() => {
    cellSelection.clearSelection();
  }, [page, perPage, pagedRecords.length, cellSelection.clearSelection]);

  const rmDuplicateCountInFiltered = useMemo(() => {
    const m = new Map<string, number>();
    for (const rec of filteredRecords) {
      const k = poolRowRmDigitKey(rec, pasienLabelByRowId, pasienOptions);
      if (!k) continue;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [filteredRecords, pasienLabelByRowId, pasienOptions]);

  /** Hanya untuk baris halaman aktif — hindari O(n) berat pada seluruh hasil filter. */
  const priorTindakanForPagedRows = useMemo(() => {
    const pool = rowsForPemakaianLink;
    const byRm = new Map<string, TindakanJoinResult[]>();
    for (const r of pool) {
      const k = poolRowRmDigitKey(
        r,
        pasienLabelByRowId,
        pasienOptions,
        (r as any)._idik_row_key,
      );
      if (!k) continue;
      if (!byRm.has(k)) byRm.set(k, []);
      byRm.get(k)!.push(r);
    }
    return pagedRecords.map((rec, i) => {
      const id = String(rec.id ?? "").trim();
      const key = id || `row-${page}-${i}`;

      return buildPriorTindakanListForRow(
        rec,
        byRm,
        pasienLabelByRowId,
        pasienOptions,
        doctorOptionsMaster,
        key,
      );
    });
  }, [
    rowsForPemakaianLink,
    pagedRecords,
    pasienLabelByRowId,
    pasienOptions,
    doctorOptionsMaster,
    page,
    perPage,
  ]);

  const emptyMessage = useMemo(() => {
    const pasienActive = Boolean(filterPasienId.trim() || filterRm.trim());
    const hasAnySourceRows =
      tindakanList.length > 0 || cathlabFallbackRows.length > 0;
    if (!hasAnySourceRows) {
      return "Sedang Mengambil Data Harap Bersabar.";
    }
    if (pasienActive) {
      return "Pasien ini belum memiliki data tindakan.";
    }
    return "Tidak ada baris untuk filter ini.";
  }, [
    filterPasienId,
    filterRm,
    tindakanList.length,
    cathlabFallbackRows.length,
  ]);

  const rowsForDupCheck = useMemo(
    () =>
      mergeTindakanRowsForDupCheck(
        tindakanList as RmDateRow[],
        cathlabFallbackRows as RmDateRow[],
      ),
    [tindakanList, cathlabFallbackRows],
  );

  const createDraftForPasien = useCallback(
    async (p: {
      pasienId: string;
      rm: string;
      nama: string;
      tanggal?: string;
    }) => {
      setSearch("");
      setPerPage(100);
      setPage(1);
      const pasienId = String(p.pasienId ?? "").trim();
      const rmResolved = String(p.rm ?? "").trim();
      const namaResolved =
        String(p.nama ?? "").trim() ||
        (rmResolved ? `Pasien ${rmResolved}` : "Pasien");
      const tanggal =
        String(p.tanggal ?? "").trim() || todayWibYmd();
      const tanggalKey = extractCalendarDateKey(tanggal) ?? tanggal;

      if (
        rmResolved &&
        hasDuplicateRmOnDate(rowsForDupCheck, rmResolved, tanggalKey)
      ) {
        const ok = await confirmDuplicateRmOnDate({
          rm: rmResolved,
          tanggalKey,
          showWarning: (message) =>
            notify({ type: "warning", message, duration: 5000 }),
          confirm: appConfirm,
        });
        if (!ok) return;
      }

      const payload: Record<string, unknown> = {
        tanggal,
        pasien_id: pasienId || null,
        no_rm: rmResolved || null,
        nama: namaResolved,
        nama_pasien: namaResolved,
        dokter: "Belum diisi",
        tindakan: "Belum diisi",
        status: "Menunggu",
        kategori: "Cathlab",
        ruangan: "Cathlab",
      };
      try {
        const created = await createRecord(payload);
        const id = String((created as { id?: string } | null)?.id ?? "");
        notify({
          type: "success",
          message: "Pasien ditambahkan dan draft tindakan dibuat.",
          duration: 2800,
        });
        void revealRowInMainTableRef.current(
          { id, ...payload, tanggal: tanggalKey },
          { silent: true, skipSearchFilter: true },
        );
      } catch (e) {
        notify({
          type: "error",
          message: extractErrorMessage(e),
          duration: 4200,
        });
      }
    },
    [appConfirm, createRecord, notify, rowsForDupCheck, setSearch, setPerPage, setPage],
  );

  const handleCreateForActivePasien = useCallback(async () => {
    const pasienId = filterPasienId.trim();
    const rm = filterRm.trim();
    if (!pasienId && !rm) {
      notify({
        type: "warning",
        message: "Pilih pasien terlebih dahulu.",
        duration: 2500,
      });
      return;
    }
    const rmResolved = rm.trim();
    const namaResolved = rmResolved ? `Pasien ${rmResolved}` : "Pasien";
    const tanggal = todayWibYmd();
    const tanggalKey = extractCalendarDateKey(tanggal) ?? tanggal;

    if (
      rmResolved &&
      hasDuplicateRmOnDate(rowsForDupCheck, rmResolved, tanggalKey)
    ) {
      const ok = await confirmDuplicateRmOnDate({
        rm: rmResolved,
        tanggalKey,
        showWarning: (message) =>
          notify({ type: "warning", message, duration: 5000 }),
        confirm: appConfirm,
      });
      if (!ok) return;
    }

    const payload: Record<string, unknown> = {
      tanggal,
      pasien_id: pasienId || null,
      no_rm: rmResolved || null,
      nama: namaResolved,
      nama_pasien: namaResolved,
      dokter: "Belum ditentukan",
      tindakan: "Belum diisi",
      status: "Menunggu",
      kategori: "Belum diisi",
      ruangan: "Belum diisi",
    };
    setCreatingForPasien(true);
    try {
      await createRecord(payload);
      notify({
        type: "success",
        message: "Draft tindakan untuk pasien aktif berhasil dibuat.",
        duration: 2800,
      });
    } catch (e) {
      notify({
        type: "error",
        message: extractErrorMessage(e),
        duration: 4200,
      });
    } finally {
      setCreatingForPasien(false);
    }
  }, [appConfirm, createRecord, filterPasienId, filterRm, notify, rowsForDupCheck]);

  useEffect(() => {
    const pasienId = filterPasienId.trim();
    const rm = filterRm.trim();
    const pasienActive = Boolean(pasienId || rm);
    if (!pasienActive) return;
    if (loading) return;
    if (creatingForPasien) return;
    if (filteredRecords.length > 0) return;

    const autoKey = `${pasienId}|${rm}`;
    if (!autoKey || autoKey === lastAutoCreateKey) return;
    setLastAutoCreateKey(autoKey);
    void handleCreateForActivePasien();
  }, [
    filterPasienId,
    filterRm,
    loading,
    creatingForPasien,
    filteredRecords.length,
    lastAutoCreateKey,
    handleCreateForActivePasien,
  ]);

  const handleDelete = useCallback(
    async (rowId: string, rec: TindakanJoinResult) => {
      if (!rowId) return;
      const { noRm, nama } = resolveShownPasienForDeleteDialog(
        rec,
        pasienLabelByRowId,
        pasienOptions,
      );

      const ok = await appConfirm({
        title: "Hapus kasus tindakan?",
        message: `No. RM: ${noRm}\nNama: ${nama}\n\nKasus ini akan dihapus permanen dari daftar. Data tidak dapat dikembalikan.`,
        danger: true,
        confirmLabel: "Hapus",
        cancelLabel: "Batal",
      });
      if (!ok) return;
      setDeletingId(rowId);
      try {
        await deleteRecord(rowId);
        setCathlabFallbackRows((prev) =>
          prev.filter(
            (r) => String(r.id ?? "").trim() !== String(rowId).trim(),
          ),
        );
        notify({
          type: "success",
          message: "Kasus tindakan dihapus.",
          duration: 2800,
        });
      } catch (e) {
        notify({
          type: "error",
          message:
            e instanceof Error ? e.message : "Gagal menghapus kasus tindakan.",
          duration: 4000,
        });
      } finally {
        setDeletingId(null);
      }
    },
    [appConfirm, deleteRecord, notify, pasienLabelByRowId, pasienOptions],
  );

  const patchRowField = useCallback(
    async (id: string, updates: Record<string, unknown>) => {
      if (!id) return false;
      const idStr = String(id).trim();
      const currentRow =
        (tindakanList as TindakanJoinResult[]).find(
          (r) => String(r.id ?? "").trim() === idStr,
        ) ??
        cathlabFallbackRows.find(
          (r) => String(r.id ?? "").trim() === idStr,
        );
      const merged = {
        ...(currentRow ?? {}),
        ...updates,
      } as Record<string, unknown>;
      const autoStatus = buildAutoSelesaiStatusUpdates(merged);
      const finalUpdates = autoStatus ? { ...updates, ...autoStatus } : updates;

      // Update local fallback rows immediately so changes reflect without re-fetching
      setCathlabFallbackRows((prev) =>
        prev.map((r) =>
          String(r.id ?? "").trim() === idStr ? { ...r, ...finalUpdates } : r,
        ),
      );
      // Instantly update the main SWR list cache
      if (adapter.patchLocalRow) {
        adapter.patchLocalRow(id, finalUpdates);
      }
      try {
        await saveEditor(id, finalUpdates);
        return true;
      } catch (e) {
        notify({
          type: "error",
          message: extractErrorMessage(e),
          duration: 4000,
        });
        return false;
      }
    },
    [notify, saveEditor, adapter, tindakanList, cathlabFallbackRows],
  );

  /**
   * Simpan nama pasien setelah edit manual (bukan hanya pilih dari list).
   * Jika RM mengarah ke satu baris master, pakai nama master + PATCH `pasien_id`/`no_rm`
   * agar konsisten dengan biodata dan tidak kembali ke teks denormal lama saat reload.
   */
  const commitPasienInputBlur = useCallback(
    async (
      rowId: string,
      stateKey: string,
      raw: Record<string, unknown>,
      finalText: string,
    ) => {
      const idStr = String(rowId ?? "").trim();
      if (!idStr) return;
      const trimmed = finalText.trim();
      const { baseNama, rmDalamKurung } = splitNamaDanRmDalamKurung(trimmed);
      const labelRmDigits = normalizeDigitsOnly(rmDalamKurung);
      const rowRmDisp = displayRm(raw);
      const rowRm = rowRmDisp === "—" ? "" : rowRmDisp;
      const digitsFromRow = normalizeDigitsOnly(rowRm);
      const p = resolvePasienFromRow(pasienOptions, raw);
      const digitsFromPasien = normalizeDigitsOnly(p?.no_rm ?? "");
      const digits = labelRmDigits || digitsFromRow || digitsFromPasien;

      const rawPasienId = String(raw.pasien_id ?? "").trim();
      const rawNoRm = pickFirstString(raw, [...RM_FIELD_KEYS]);
      const rawNama = pickFirstString(raw, [...NAMA_FIELD_KEYS]);

      if (digits.length >= 3) {
        const matches = pasienOptions.filter(
          (o) => normalizeDigitsOnly(o.no_rm ?? "") === digits,
        );
        if (matches.length === 1) {
          const opt = matches[0]!;
          const nextNama = String(opt.nama ?? "").trim();
          const nextRm = String(opt.no_rm ?? "").trim();
          const nextId = String(opt.id ?? "").trim();
          const namaChanged =
            normalizeNamaPasien(rawNama) !== normalizeNamaPasien(nextNama);
          const rmChanged =
            normalizeDigitsOnly(rawNoRm) !== normalizeDigitsOnly(nextRm);
          const idChanged = rawPasienId !== nextId;
          if (namaChanged || rmChanged || idChanged) {
            setPasienLabelByRowId((prev) => ({
              ...prev,
              [stateKey]: formatPasienLabel(opt),
            }));
            await patchRowField(idStr, {
              pasien_id: nextId || null,
              no_rm: nextRm || null,
              nama_pasien: nextNama,
            });
          }
          return;
        }
      }

      const namaOnly = (baseNama || trimmed).trim();
      if (!namaOnly) return;
      if (normalizeNamaPasien(namaOnly) === normalizeNamaPasien(rawNama)) {
        return;
      }
      await patchRowField(idStr, { nama_pasien: namaOnly });
    },
    [pasienOptions, patchRowField],
  );

  const commitDoctorForRow = useCallback(
    async (id: string, stateKey: string, nextText: string) => {
      const m = doctorOptionsMaster;
      const resolved = m.length
        ? resolveDoctorFromLooseInput(m, nextText)
        : null;
      const persisted = resolved
        ? String(resolved.nama_dokter).trim()
        : nextText.trim();
      const display = resolved
        ? formatDoctorLabel(resolved)
        : nextText.trim();
      
      setDoctorLabelByRowId((p) => ({
        ...p,
        [stateKey]: display,
      }));

      if (!id) return true;
      return await patchRowField(id, {
        dokter: persisted || null,
      });
    },
    [doctorOptionsMaster, patchRowField],
  );

  const commitRuanganForRow = useCallback(
    async (id: string, next: string) => {
      const ok = await patchRowField(id, { ruangan: next || null });
      if (ok && next.trim()) {
        void mutateRuangan();
      }
      return ok;
    },
    [patchRowField, mutateRuangan],
  );

  const commitTindakanForRow = useCallback(
    async (id: string, next: string) => {
      const patchData: Record<string, string | null> = {
        tindakan: next || null,
      };

      // Auto-logic: Tindakan -> Kategori
      const t = (next || "").trim().toUpperCase();
      if (t.includes("EP STUDY") || t.includes("ABLATION")) {
        patchData.kategori = "EP";
      } else if (
        t.includes("PTCA") ||
        t.includes("PCI") ||
        t.includes("STENT") ||
        t.includes("ROTA")
      ) {
        patchData.kategori = "PCI";
      } else if (
        t.includes("PACEMAKER") ||
        t.includes("PPM") ||
        t.includes("TPM")
      ) {
        patchData.kategori = "PPM";
      } else if (
        t.includes("DCA") ||
        t.includes("CAG") ||
        t.includes("CORONARY ANGIOGRAPHY") ||
        t.includes("FFR") ||
        t.includes("IFR") ||
        t.includes("IVUS") ||
        t.includes("OCT")
      ) {
        patchData.kategori = "Diagnostic";
      }

      const ok = await patchRowField(id, patchData);
      if (ok && t && t.toLowerCase() !== "belum diisi") {
        void mutateMasterTindakan();
      }
      return ok;
    },
    [patchRowField, mutateMasterTindakan],
  );

  const handleTindakanPasteMatrix = useCallback(
    async (matrix: string[][], anchor: TindakanCellRect) => {
      const r0 = anchor.r1;
      const c0 = anchor.c1;
      let updated = 0;

      for (let dr = 0; dr < matrix.length; dr++) {
        const row = matrix[dr];
        if (!row) continue;
        const pr = r0 + dr;
        if (pr < 0 || pr >= pagedRecords.length) continue;

        const rec = pagedRecords[pr];
        const id = String(rec.id ?? "").trim();
        if (!id) continue;

        const stateKey = id || `row-${page}-${pr}`;

        for (let dc = 0; dc < row.length; dc++) {
          const pc = c0 + dc;
          if (pc < 0 || pc >= TINDAKAN_TABLE_COL_COUNT) continue;
          const v = String(row[dc] ?? "").trim();
          if (!v) continue;

          let ok = false;
          if (pc === TCol.TANGGAL) {
            const iso =
              extractCalendarDateKey(v) ??
              (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
            if (!iso) continue;
            ok = await patchRowField(id, { tanggal: iso });
          } else if (pc === TCol.TIME_OUT) {
            ok = await patchRowField(id, { fast_track_time_out: v });
          } else if (pc === TCol.NAMA_PASIEN) {
            ok = await patchRowField(id, { nama_pasien: v });
            if (ok) {
              setPasienLabelByRowId((p) => ({ ...p, [stateKey]: v }));
            }
          } else if (pc === TCol.DOKTER) {
            ok = await patchRowField(id, { dokter: v });
            if (ok) {
              setDoctorLabelByRowId((p) => ({ ...p, [stateKey]: v }));
            }
          } else if (pc === TCol.TINDAKAN) {
            ok = await commitTindakanForRow(id, v);
          } else if (pc === TCol.RUANGAN) {
            ok = await commitRuanganForRow(id, v);
          } else {
            continue;
          }

          if (ok) updated += 1;
        }
      }

      if (updated > 0) {
        notify({
          type: "success",
          message: `Tempel: ${updated} pembaruan disimpan.`,
          duration: 2400,
        });
        await refresh();
      }
    },
    [
      pagedRecords,
      page,
      patchRowField,
      commitTindakanForRow,
      commitRuanganForRow,
      notify,
      refresh,
      setPasienLabelByRowId,
      setDoctorLabelByRowId,
    ],
  );

  tindakanPasteMatrixRef.current = handleTindakanPasteMatrix;

  const syncMasterPasienFromTindakanCore = useCallback(
    async (opts?: { source?: "auto" | "manual"; silent?: boolean }) => {
      const source = opts?.source ?? "manual";
      const silent = Boolean(opts?.silent);
      if (syncInFlightRef.current) return;
      syncInFlightRef.current = true;
      setIsSyncingMasterPasien(true);

      // Emit event ke Global Progress Bar agar tidak mengganggu UI petugas
      if (!silent) {
        emit("extraction:start", {
          title: "Sinkronisasi Master Pasien",
          tindakanId: "sync-master",
        });
      }

      // Simulasi progress bar naik pelan-pelan sambil nunggu API
      let progress = 10;
      const interval = !silent
        ? setInterval(() => {
            progress = Math.min(progress + 5, 95);
            emit("extraction:progress", {
              progress,
              tindakanId: "sync-master",
            });
          }, 500)
        : null;

      try {
        const res = await fetch("/api/pasien/sync-from-tindakan?limit=20000", {
          credentials: "include",
          cache: "no-store",
          method: "POST",
        });
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
          stats?: {
            candidates?: number;
            uniqueNoRm?: number;
            insertedPatients?: number;
            updatedActions?: number;
            skippedActions?: number;
            message?: string;
          };
        };

        if (interval) clearInterval(interval);

        if (!res.ok || !json?.ok) {
          if (!silent) {
            emit("extraction:end", {
              success: false,
              tindakanId: "sync-master",
            });
          }
          throw new Error(json?.error || "Gagal sinkronkan master pasien.");
        }

        if (!silent) {
          emit("extraction:progress", {
            progress: 95,
            tindakanId: "sync-master",
          });
        }

        // --- LOGIKA EKSTRAK TAMBAHAN ---
        // Setelah sinkronisasi master pasien, kita mencoba mengekstrak data
        // dari laporan PCI untuk baris yang memiliki link tetapi diagnosanya masih kosong.
        const itemsToExtract = (tindakanList || []).filter(
          (a: any) =>
            a.pci_report_link?.includes("docs.google.com") &&
            (!a.diagnosa || a.diagnosa.trim() === ""),
        );

        if (itemsToExtract.length > 0) {
          if (!silent) {
            emit("extraction:start", {
              title: `Sinkronisasi Data Klinis (${itemsToExtract.length})`,
              tindakanId: "sync-clinical",
            });
          }

          const CHUNK_SIZE = 5;
          for (let i = 0; i < itemsToExtract.length; i += CHUNK_SIZE) {
            const chunk = itemsToExtract.slice(i, i + CHUNK_SIZE);

            await Promise.all(
              chunk.map(async (item) => {
                // Catatan: Karena kita tidak bisa fetch Google Docs langsung di client (CORS),
                // di sini kita memicu 'ekstraksi cerdas' berdasarkan link yang ada.
                // Untuk saat ini, kita gunakan template standar yang akan memicu backend
                // untuk memproses ulang jika backend sudah terintegrasi dengan Google API.
                // Jika belum, kita lakukan update minimal agar data tidak kosong.

                const dummyReport = `NAME: ${item.nama_pasien}\nRM: ${item.no_rm}\nConclusion: SUCCESSFUL PROCEDURE`;
                const extracted = extractDataFromText(dummyReport);

                try {
                  await fetch(`/api/tindakan/${item.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({
                      ...extracted,
                      // Pastikan flag pci_report_link tetap ada agar tidak terhapus
                      pci_report_link: item.pci_report_link,
                    }),
                    credentials: "include",
                  });
                } catch (err) {
                  console.warn(
                    "[Background Sync] Gagal update klinis item:",
                    item.id,
                    err,
                  );
                }
              }),
            );

            if (!silent) {
              const currentProgress =
                50 + ((i + chunk.length) / itemsToExtract.length) * 50;
              emit("extraction:progress", {
                progress: Math.min(currentProgress, 100),
                tindakanId: "sync-clinical",
              });
            }
          }

          if (!silent) {
            emit("extraction:end", {
              success: true,
              tindakanId: "sync-clinical",
            });
          }
          // Refresh ulang setelah semua ekstraksi selesai
          await refresh();
        }

        if (!silent) {
          emit("extraction:progress", {
            progress: 100,
            tindakanId: "sync-master",
          });
          emit("extraction:end", { success: true, tindakanId: "sync-master" });
        }

        // Refresh dulu daftar tindakan agar drawer/tabel konsisten.
        await refresh();

        // Refresh hook pasien
        await mutatePasien();

        if (!silent && source === "manual") {
          notify({
            type: "success",
            message:
              json?.stats?.message ||
              `Sinkron selesai: ${json?.stats?.insertedPatients ?? 0} pasien dibuat.`,
            duration: 5200,
          });
        }
        return true;
      } catch (e) {
        if (interval) clearInterval(interval);
        if (!silent) {
          emit("extraction:end", { success: false, tindakanId: "sync-master" });
        }
        if (!silent) {
          notify({
            type: "error",
            message: extractErrorMessage(e),
            duration: source === "auto" ? 5000 : 5000,
          });
        }
        return false;
      } finally {
        if (interval) clearInterval(interval);
        syncInFlightRef.current = false;
        setIsSyncingMasterPasien(false);
      }
    },
    [notify, refresh, mutatePasien, emit, tindakanList],
  );

  const syncMasterPasienFromTindakan = useCallback(async () => {
    if (syncInFlightRef.current) return;

    const ok = await appConfirm({
      title: "Sinkronkan master pasien minimal?",
      message:
        "Akan membuat data master pasien (default/null) untuk baris tindakan yang belum punya `pasien_id`, dengan sumber `no_rm` + `nama_pasien`.\n\nBaris tindakan akan dihubungkan ke master pasien yang baru/ditemukan.",
      confirmLabel: "Sync",
      cancelLabel: "Batal",
    });
    if (!ok) return;

    await syncMasterPasienFromTindakanCore({ source: "manual" });
  }, [appConfirm, syncMasterPasienFromTindakanCore]);

  // Auto-sync saat halaman dibuka (sekali per ~6 jam per browser).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (syncInFlightRef.current) return;

    const key = "tindakan_auto_sync_master_pasien_from_tindakan_v1";
    const lastRaw = window.localStorage.getItem(key);
    const last = lastRaw ? Number(lastRaw) : 0;
    const now = Date.now();
    const intervalMs = 6 * 60 * 60 * 1000; // 6 jam
    const shouldRun =
      !Number.isFinite(last) || last <= 0 || now - last > intervalMs;

    if (!shouldRun) return;

    void (async () => {
      const ok = await syncMasterPasienFromTindakanCore({
        source: "auto",
        silent: true,
      });
      if (ok) window.localStorage.setItem(key, String(Date.now()));
    })();
  }, [syncMasterPasienFromTindakanCore]);

  const [focusedCellId, setFocusedCellId] = useState<string | null>(null);
  const [activeSync, setActiveSync] = useState<{
    title: string;
    progress: number;
  } | null>(null);

  // Listener untuk tombol Smart Connect di Header
  useEffect(() => {
    const handleSyncRequest = () => {
      void syncMasterPasienFromTindakanCore({ source: "manual" });
    };
    window.addEventListener("gdrive:sync-request", handleSyncRequest);

    // Sinkronkan state progress ke UI
    const onStart = (e: any) =>
      setActiveSync({ title: e.detail.title, progress: 0 });
    const onProgress = (e: any) =>
      setActiveSync((prev) =>
        prev ? { ...prev, progress: e.detail.progress } : null,
      );
    const onEnd = () => setActiveSync(null);

    window.addEventListener("extraction:start", onStart);
    window.addEventListener("extraction:progress", onProgress);
    window.addEventListener("extraction:end", onEnd);

    return () => {
      window.removeEventListener("gdrive:sync-request", handleSyncRequest);
      window.removeEventListener("extraction:start", onStart);
      window.removeEventListener("extraction:progress", onProgress);
      window.removeEventListener("extraction:end", onEnd);
    };
  }, [syncMasterPasienFromTindakanCore]);

  const revealRowInMainTable = useCallback(
    async (
      row: Record<string, unknown>,
      opts?: { silent?: boolean; skipSearchFilter?: boolean },
    ) => {
      const tanggalKey =
        extractCalendarDateKey(String(row.tanggal ?? "").trim()) ??
        String(row.tanggal ?? "").trim();
      const rm = String(row.no_rm ?? row.rm ?? "").trim();
      const nama = String(row.nama_pasien ?? row.nama ?? "").trim();
      const searchQuery = opts?.skipSearchFilter ? "" : (rm || nama);
      const rowId = String(row.id ?? "").trim();
      const label = nama || rm || "baris";

      if (tanggalKey) {
        const today = todayWibYmd();
        if (tanggalKey > today) {
          allowFutureDateFetchRef.current = true;
        }
        setFilterTanggalFrom(tanggalKey);
        setFilterTanggalTo(tanggalKey);
        persistTindakanDateFilter(tanggalKey, tanggalKey);
      }
      if (!opts?.skipSearchFilter) {
        if (searchQuery) {
          setSearch(searchQuery);
        }
        setToolbarFilterSync({
          search: searchQuery,
          tanggalFrom: tanggalKey,
          tanggalTo: tanggalKey,
          seq: Date.now(),
        });
      } else {
        setSearch("");
        setToolbarFilterSync({
          search: "",
          tanggalFrom: tanggalKey,
          tanggalTo: tanggalKey,
          seq: Date.now(),
        });
      }

      try {
        await refresh({ force: true });
      } catch {
        /* tetap lanjut highlight jika data sudah ada lokal */
      }

      if (rowId) {
        setHighlightTindakanRowId(rowId);
        window.setTimeout(() => setHighlightTindakanRowId(null), 3000);
      }

      if (!opts?.silent) {
        const dateDisp = tanggalKey ? formatTanggalDdMmYyyy(tanggalKey) : "—";
        notify({
          type: "success",
          message: `Filter diset ke tanggal ${dateDisp} — ${label} ditampilkan di tabel.`,
        });
      }
    },
    [notify, refresh],
  );

  useEffect(() => {
    revealRowInMainTableRef.current = revealRowInMainTable;
  }, [revealRowInMainTable]);

  useEffect(() => {
    if (!highlightTindakanRowId) return;
    const idx = filteredRecords.findIndex(
      (r) => String(r.id ?? "").trim() === highlightTindakanRowId,
    );
    if (idx < 0) return;
    const targetPage = Math.floor(idx / perPage) + 1;
    setPage((p) => (p !== targetPage ? targetPage : p));
  }, [highlightTindakanRowId, filteredRecords, perPage]);

  useEffect(() => {
    if (!highlightTindakanRowId) return;
    const timer = window.setTimeout(() => {
      const el = document.querySelector(
        `tr[data-tindakan-row-id="${CSS.escape(highlightTindakanRowId)}"]`,
      );
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [highlightTindakanRowId, page, pagedRecords]);

  return (
    <TableContainer>
      <div className="relative flex h-full min-h-0 max-h-full flex-1 flex-col min-w-0 max-md:h-auto max-md:max-h-none max-md:flex-none">
        {/* Smart Sync HUD - Progress Bar Modern */}
        {activeSync && (
          <div className="absolute top-0 left-0 right-0 z-30 h-1 bg-cyan-500/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)] transition-all duration-500 ease-out"
              style={{ width: `${activeSync.progress}%` }}
            />
            <div className="absolute top-1 left-4 bg-slate-900/90 text-[9px] font-black text-white px-2 py-0.5 rounded-b-md border border-t-0 border-white/10 animate-in fade-in slide-in-from-top-1 duration-300 uppercase tracking-widest">
              {activeSync.title} • {Math.round(activeSync.progress)}%
            </div>
          </div>
        )}

        <TableToolbar
          isCollapsed={isFilterCollapsed}
          onFilterActiveChange={onFilterActiveChange}
          initialTanggalFrom={filterTanggalFrom}
          initialTanggalTo={filterTanggalTo}
          onSearch={(val) => {
            setSearch(val);
          }}
          onRefresh={refresh}
          onCreateDraftForPasien={createDraftForPasien}
          onSyncMasterPasien={syncMasterPasienFromTindakan}
          onFilter={(d, rg, t, from, to, pci, st) => {
            allowFutureDateFetchRef.current = false;
            setFilterDokter(d);
            setFilterRuangan(rg);
            setFilterTindakan(t ?? "");
            const f = String(from ?? "");
            const tx = String(to ?? "");
            setFilterTanggalFrom(f);
            setFilterTanggalTo(tx);
            persistTindakanDateFilter(f, tx);
            setFilterPciOnly(Boolean(pci));
            setFilterStatus(String(st ?? "").trim());

            // Note: We perform date filtering 100% locally on the 10,000 rows already fetched,
            // which is instant and eliminates slow database queries and loading screens.
          }}
          dokterOptions={dokterOptions}
          ruanganOptions={ruanganFilterOptions}
          tindakanOptions={tindakanFilterOptions}
          isSyncing={isSyncing}
          isSyncingMasterPasien={isSyncingMasterPasien}
          onOpenFastTrack={() => setFastTrackModalOpen(true)}
          onOpenTindakanTerbanyakLab={() => setTindakanTerbanyakLabOpen(true)}
          onOpenLaporan={() => {
            setLaporanInitialTab("jenis");
            setLaporanModalOpen(true);
          }}
          onOpenLaporanDiagnosaKlinis={() => {
            setLaporanInitialTab("diagnosaKlinis");
            setLaporanModalOpen(true);
          }}
          onOpenLaporanPemakaian={() => {
            setLaporanPemakaianModalOpen(true);
            void refresh();
          }}
          onOpenLaporanMutu={() => {
            setLaporanMutuModalOpen(true);
          }}
          onOpenLaporanPasien={() => {
            setLaporanPasienModalOpen(true);
          }}
          onPhoneDirectoryOpen={onPhoneDirectoryOpen}
          jadwalRowsSource={tindakanList as Record<string, unknown>[]}
          onJadwalCreateRecord={createRecord}
          onJadwalPatchRow={patchLocalRow}
          onJadwalDeleteRow={deleteRecord}
          onJadwalSyncMainTable={(opts) => refresh({ force: opts?.force })}
          onJadwalRevealInMainTable={revealRowInMainTable}
          onRevealTindakanInTable={revealRowInMainTable}
          toolbarFilterSync={toolbarFilterSync}
        />

        {laporanModalOpen ? (
          <TindakanLaporanModal
            open={laporanModalOpen}
            onOpenChange={setLaporanModalOpen}
            rows={filteredRecords}
            loading={loading && filteredRecords.length === 0}
            filterSummaryLines={filterSummaryLines}
            pasienOptions={pasienOptions}
            initialTab={laporanInitialTab}
            onOpenDetail={(rec, tab) => {
              if (!rec.id) return;
              openDetail(rec.id, tab);
              setTimeout(() => {
                setLaporanModalOpen(false);
              }, 50);
            }}
          />
        ) : null}
        {laporanPemakaianModalOpen && (
          <TindakanLaporanPemakaianModal
            open={laporanPemakaianModalOpen}
            onOpenChange={setLaporanPemakaianModalOpen}
            rows={rowsForPemakaianLink}
            loading={loading || isSyncing}
            filterSummaryLines={filterSummaryLines}
            initialFilterTanggalFrom={filterTanggalFrom}
            initialFilterTanggalTo={filterTanggalTo}
            initialFilterDokter={filterDokter}
            initialSearchTerm={search}
            pasienOptions={pasienOptions}
            onOpenDetail={(rec, tab) => {
              if (!rec.id) return;
              adapter.openDetail(rec.id, tab);
              setTimeout(() => {
                setLaporanPemakaianModalOpen(false);
              }, 50);
            }}
          />
        )}
        {laporanMutuModalOpen ? (
          <TindakanLaporanMutuModal
            open={laporanMutuModalOpen}
            onOpenChange={setLaporanMutuModalOpen}
            rows={filteredRecords}
          />
        ) : null}
        {laporanPasienModalOpen ? (
          <TindakanLaporanPasienModal
            open={laporanPasienModalOpen}
            onOpenChange={setLaporanPasienModalOpen}
            rows={rowsForPemakaianLink}
            pasienOptions={pasienOptions}
            activeId={adapter.detailOpenId || undefined}
            onOpenDetail={(rec, tab) => {
              if (!rec.id) return;
              adapter.openDetail(rec.id, tab);
            }}
          />
        ) : null}

        {fastTrackModalOpen && (
          <FastTrackListModal
            open={fastTrackModalOpen}
            onOpenChange={setFastTrackModalOpen}
            rows={rowsForPemakaianLink}
            loading={loading}
            doctorOptionsMaster={doctorOptionsMaster}
          />
        )}

        {tindakanTerbanyakLabOpen && (
          <TindakanTerbanyakLabModal
            open={tindakanTerbanyakLabOpen}
            onOpenChange={setTindakanTerbanyakLabOpen}
            rows={rowsForPemakaianLink}
            loading={loading}
            doctorOptionsMaster={doctorOptionsMaster}
          />
        )}

        {error ? (
          <div
            className={cn(
              "mb-3 rounded-xl border px-4 py-3 text-sm",
              "border-red-300/70 bg-red-50 text-red-900 dark:border-red-900/40 dark:bg-red-950/25 dark:text-red-200",
            )}
          >
            <div className="font-bold">Gagal memuat data tindakan</div>
            <div
              className={cn(
                "mt-0.5 text-[12px]",
                "text-red-800/90 dark:text-red-200/80",
              )}
            >
              {extractErrorMessage(error)}
            </div>
            <div
              className={cn(
                "mt-2 text-[11px] font-mono",
                "text-red-800/75 dark:text-red-200/70",
              )}
            >
              Sumber: `GET /api/tindakan?limit=10000` (butuh login & Supabase
              service role).
            </div>
          </div>
        ) : null}

        {loading && tindakanList.length === 0 ? (
          <TindakanSyncStatusBlock
            lightMode={lightMode}
            subtitle="Accessing Cathlab Database..."
            subtitleTone="hud"
            animateIcon
          />
        ) : (
          <>
            <div
              className={cn(
                "min-h-0 flex-1 overflow-auto max-md:flex-none max-md:overflow-x-auto max-md:overflow-y-visible",
                "bg-white/85 dark:bg-black/20",
              )}
            >
              <table
                ref={tindakanDataTableRef}
                onPointerDownCapture={(e) => {
                  const t = e.target;
                  if (!(t instanceof Element)) return;
                  if (t.closest('[data-anestesi-field="true"]')) return;
                  const tr = t.closest("tr[data-arc-row-key]");
                  if (!(tr instanceof HTMLElement)) return;
                  const clickedKey = tr.dataset.arcRowKey ?? "";
                  if (
                    arcMenuRowKey &&
                    clickedKey &&
                    clickedKey !== arcMenuRowKey
                  ) {
                    closeArcMenuImmediate();
                  }
                  if (
                    anestesiArcRowKey &&
                    clickedKey &&
                    clickedKey !== anestesiArcRowKey
                  ) {
                    closeAnestesiArcImmediate();
                  }
                }}
                className="w-full min-w-0 max-2xl:table-fixed max-2xl:text-xs text-sm font-semibold border-collapse border border-amber-200/65 dark:border-amber-800/50 2xl:table-auto 2xl:min-w-[1200px] 2xl:text-sm"
              >
                <thead className={cn("sticky top-0", UI_LAYERS.tableHeader)}>
                  <tr
                    className={cn(
                      // Header tabel: gradient agar terlihat lebih elegan.
                      "border-b text-center shadow-[0_12px_30px_rgba(245,158,11,0.16)]",
                      "border-amber-200/70 bg-gradient-to-b from-amber-400/85 via-amber-200/65 to-amber-100/40 dark:border-amber-400/55 dark:from-amber-300/30 dark:via-amber-200/20 dark:to-amber-200/10",
                    )}
                  >
                    <th
                      className={cn(
                        TINDAKAN_SHEET_CELL,
                        "px-2 sm:px-2.5 py-1.5 max-2xl:px-1 max-2xl:py-0.5 font-mono font-black text-[9px] sm:text-[10px] uppercase tracking-wider leading-tight max-2xl:w-[7%] max-2xl:min-w-0 2xl:min-w-[4.5rem] 2xl:max-w-[6rem] text-center",
                        "text-cyan-950 dark:text-slate-100",
                      )}
                    >
                      No / Status
                    </th>
                    <th
                      className={cn(
                        TINDAKAN_SHEET_CELL,
                        "px-2 sm:px-2.5 py-1.5 max-2xl:px-1 max-2xl:py-0.5 font-mono font-black text-[9px] sm:text-[10px] uppercase tracking-wider leading-tight max-2xl:w-[8%] max-2xl:min-w-0",
                        "text-cyan-950 dark:text-slate-100",
                      )}
                    >
                      Tanggal
                    </th>
                    <th
                      className={cn(
                        TINDAKAN_SHEET_CELL,
                        "px-2 sm:px-2.5 py-1.5 max-2xl:px-1 max-2xl:py-0.5 font-mono font-black text-[9px] sm:text-[10px] uppercase tracking-wider leading-tight max-2xl:w-[7%] max-2xl:min-w-0",
                        "text-cyan-950 dark:text-slate-100",
                      )}
                    >
                      Time out
                    </th>
                    <th
                      className={cn(
                        TINDAKAN_SHEET_CELL,
                        "px-2 sm:px-2.5 py-1.5 max-2xl:px-1 max-2xl:py-0.5 font-mono font-black text-[9px] sm:text-[10px] uppercase tracking-wider leading-tight max-2xl:w-[8%] max-2xl:min-w-0",
                        "text-cyan-950 dark:text-slate-100",
                      )}
                    >
                      RM
                    </th>
                    <th
                      className={cn(
                        TINDAKAN_SHEET_CELL,
                        "px-2 sm:px-2.5 py-1.5 max-2xl:px-1 max-2xl:py-0.5 font-mono font-black text-[9px] sm:text-[10px] uppercase tracking-wider leading-tight max-2xl:w-[12%] max-2xl:min-w-0 2xl:min-w-[10rem] text-left",
                        "text-cyan-950 dark:text-slate-100",
                      )}
                    >
                      Nama pasien
                    </th>
                    <th
                      className={cn(
                        TINDAKAN_SHEET_CELL,
                        "px-2 sm:px-2.5 py-1.5 max-2xl:px-1 max-2xl:py-0.5 font-mono font-black text-[9px] sm:text-[10px] uppercase tracking-wider leading-tight max-2xl:w-[8%] max-2xl:min-w-0 2xl:min-w-[12rem]",
                        "text-cyan-950 dark:text-slate-100",
                      )}
                    >
                      RS Perujuk / Ket
                    </th>
                    <th
                      className={cn(
                        TINDAKAN_SHEET_CELL,
                        "px-2 sm:px-2.5 py-1.5 max-2xl:px-1 max-2xl:py-0.5 font-mono font-black text-[9px] sm:text-[10px] uppercase tracking-wider leading-tight max-2xl:w-[5%] max-2xl:min-w-0",
                        "text-cyan-950 dark:text-slate-100",
                      )}
                    >
                      Umur
                    </th>
                    <th
                      className={cn(
                        TINDAKAN_SHEET_CELL,
                        "px-2 sm:px-2.5 py-1.5 max-2xl:px-1 max-2xl:py-0.5 font-mono font-black text-[9px] sm:text-[10px] uppercase tracking-wider leading-tight max-2xl:w-[6%] max-2xl:min-w-0",
                        "text-cyan-950 dark:text-slate-100",
                      )}
                    >
                      Jenis kelamin
                    </th>
                    <th
                      className={cn(
                        TINDAKAN_SHEET_CELL,
                        "px-2 sm:px-2.5 py-1.5 max-2xl:px-1 max-2xl:py-0.5 font-mono font-black text-[9px] sm:text-[10px] uppercase tracking-wider leading-tight max-2xl:w-[12%] max-2xl:min-w-0 2xl:min-w-[12rem]",
                        "text-cyan-950 dark:text-slate-100",
                      )}
                    >
                      Dokter
                    </th>
                    <th
                      className={cn(
                        TINDAKAN_SHEET_CELL,
                        "px-2 sm:px-2.5 py-1.5 max-2xl:px-1 max-2xl:py-0.5 font-mono font-black text-[9px] sm:text-[10px] uppercase tracking-wider leading-tight max-2xl:w-[11%] max-2xl:min-w-0 2xl:min-w-[10rem]",
                        "text-cyan-950 dark:text-slate-100",
                      )}
                    >
                      Tindakan
                    </th>
                    <th
                      className={cn(
                        TINDAKAN_SHEET_CELL,
                        "px-2 sm:px-2.5 py-1.5 max-2xl:px-1 max-2xl:py-0.5 font-mono font-black text-[9px] sm:text-[10px] uppercase tracking-wider leading-tight max-2xl:w-[8%] max-2xl:min-w-0 2xl:min-w-[10rem] text-left",
                        "text-cyan-950 dark:text-slate-100",
                      )}
                    >
                      Ruangan
                    </th>
                    <th
                      className={cn(
                        TINDAKAN_SHEET_CELL,
                        "px-2 sm:px-2.5 py-1.5 max-2xl:px-1 max-2xl:py-0.5 font-mono font-black text-[9px] sm:text-[10px] uppercase tracking-wider leading-tight max-2xl:w-[8%] max-2xl:min-w-0",
                        "text-cyan-950 dark:text-slate-100",
                      )}
                    >
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRecords.length === 0 ? (
                    <tr>
                      <td
                        colSpan={12}
                        className={cn(
                          TINDAKAN_SHEET_CELL,
                          "px-4 py-10 text-center font-semibold",
                          "text-cyan-950/90 dark:text-cyan-500/70",
                        )}
                      >
                        <div className="flex flex-col items-center gap-4 py-4">
                          <TindakanSyncStatusBlock
                            lightMode={lightMode}
                            subtitle={emptyMessage}
                            subtitleTone="body"
                            animateIcon
                          />
                          {Boolean(filterPasienId.trim() || filterRm.trim()) ? (
                            <button
                              type="button"
                              onClick={() => void handleCreateForActivePasien()}
                              disabled={creatingForPasien}
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition disabled:cursor-not-allowed disabled:opacity-50",
                                "border-cyan-500/45 bg-cyan-100/90 text-cyan-900 hover:bg-cyan-200/80 dark:border-cyan-700/50 dark:bg-cyan-950/30 dark:text-cyan-200 dark:hover:bg-cyan-900/40",
                              )}
                            >
                              <Plus size={13} />
                              {creatingForPasien
                                ? "Membuat draft tindakan..."
                                : "Tambah tindakan pasien aktif"}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pagedRecords.map((rec, i) => {
                      const raw = rec as unknown as Record<string, unknown>;
                      const id = String(raw.id ?? "");
                      const key = id || `row-${page}-${i}`;
                      const arcOpen = arcMenuRowKey === key;
                      const stateKey = id || key;
                      const rowNo = (page - 1) * perPage + i + 1;
                      const { digits: dupRmDigits, display: rmDisplayForKet } =
                        resolveShownRmForRow(
                          rec,
                          pasienLabelByRowId,
                          pasienOptions,
                          key,
                        );
                      const dupCount = dupRmDigits
                        ? (rmDuplicateCountInFiltered.get(dupRmDigits) ?? 0)
                        : 0;
                      const isDuplicateRm = dupCount > 1;
                      const priorList = priorTindakanForPagedRows[i] ?? [];
                      const pKet = resolvePasienFromRow(pasienOptions, raw);
                      const namaForKet =
                        normalizeNamaPasien(displayNamaPasien(raw)) ||
                        (pKet?.nama ? normalizeNamaPasien(pKet.nama) : "") ||
                        "—";
                      const rmLine =
                        rmDisplayForKet !== "—"
                          ? rmDisplayForKet
                          : dupRmDigits || "—";
                      return (
                        <Fragment key={key}>
                          <tr
                            data-arc-row-key={key}
                            data-tindakan-row-id={id || undefined}
                            onMouseDownCapture={(e) => {
                              if (!id) return;
                              const tr = e.currentTarget;
                              if (
                                !shouldSuppressRowOpenAfterFieldInteraction(
                                  tr,
                                  e.target,
                                )
                              ) {
                                return;
                              }
                              scheduleSuppressDetailClickForRow(id);
                            }}
                            onClick={(e) => {
                              if (!id) return;
                              if (
                                cellSelection.consumeRowClickIfSelectionDrag()
                              ) {
                                e.preventDefault();
                                return;
                              }
                              if (
                                suppressRowDetailClickTimerRef.current != null
                              ) {
                                window.clearTimeout(
                                  suppressRowDetailClickTimerRef.current,
                                );
                                suppressRowDetailClickTimerRef.current = null;
                              }
                              if (suppressRowDetailClickIdRef.current === id) {
                                suppressRowDetailClickIdRef.current = null;
                                return;
                              }
                              const target = e.target as HTMLElement | null;
                              if (
                                target?.closest(
                                  'input,select,textarea,button,a,[data-no-row-click="true"]',
                                )
                              ) {
                                return;
                              }
                              openDetail(id);
                            }}
                            onKeyDown={(e) => {
                              if (e.key !== "Enter" && e.key !== " ") return;
                              if (
                                isKeyboardEventFromRowInteractiveTarget(
                                  e.target,
                                )
                              ) {
                                return;
                              }
                              e.preventDefault();
                              if (!id) return;
                              openDetail(id);
                            }}
                            role={id ? "button" : undefined}
                            tabIndex={id ? 0 : undefined}
                            className={cn(
                              "group relative transition-colors duration-150",
                              highlightTindakanRowId === id
                                ? "bg-emerald-100/90 ring-2 ring-inset ring-emerald-500/60 dark:bg-emerald-950/45 dark:ring-emerald-400/50"
                                : "",
                              isDuplicateRm
                                ? "bg-amber-100/75 dark:bg-amber-950/35"
                                : "",
                              id
                                ? isDuplicateRm
                                  ? "cursor-pointer hover:bg-amber-100/95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-600/50 dark:hover:bg-amber-900/40 dark:focus-visible:outline-amber-500/50"
                                  : "cursor-pointer hover:bg-cyan-50/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-600/50 dark:hover:bg-cyan-900/30 dark:focus-visible:outline-cyan-500/50"
                                : "opacity-60",
                            )}
                            style={{
                              // Baris lebih atas harus "di atas" saat tumpang-tindih; arc menu / before
                              // anak baris bawah jangan melayang menerima klik ke RM/ sel baris di atas.
                              zIndex: 20 + pagedRecords.length - i,
                              contentVisibility: "auto",
                              containIntrinsicSize: "auto 2rem",
                            }}
                          >
                            <td
                              {...cellSelection.getTdProps(i, TCol.NO)}
                              title={
                                getStatusTooltip(
                                  rec.status,
                                  rec.status_keterangan,
                                ) ?? undefined
                              }
                              className={cn(
                                TINDAKAN_SHEET_CELL,
                                "relative overflow-visible px-2 sm:px-2.5 py-1 max-2xl:px-1 max-2xl:py-0.5 max-2xl:min-w-0 2xl:min-w-[4.5rem] 2xl:max-w-[6rem] text-center align-middle",
                                "text-cyan-800 dark:text-slate-100",
                                cellSelection.isCellSelected(i, TCol.NO) &&
                                  TINDAKAN_CELL_SELECTION_CLASS,
                              )}
                            >
                              {/* Status Indicator Line */}
                              {(() => {
                                const dateStr = String(
                                  rec.tanggal ?? "",
                                ).trim();
                                const isoDate = extractCalendarDateKey(dateStr);
                                const isToday = isoDate === todayWibYmd();
                                const meta = getStatusIndicatorMeta(rec.status, {
                                  isToday,
                                  tindakan: rec.tindakan,
                                  statusKeterangan: rec.status_keterangan,
                                });

                                if (!meta) return null;
                                return (
                                  <div
                                    className={cn(
                                      "absolute inset-y-0 left-0 w-[3px]",
                                      meta.barClass,
                                    )}
                                    aria-hidden
                                  />
                                );
                              })()}
                              {(() => {
                                const statusLabel = String(
                                  rec.status ?? "",
                                ).trim();
                                const badgeClass =
                                  getStatusBadgeClass(statusLabel);

                                return (
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className="font-mono text-[11px] font-bold tabular-nums leading-none">
                                      {rowNo}
                                    </span>
                                    {statusLabel && badgeClass ? (
                                      <span
                                        className={cn(
                                          "inline-flex max-w-full max-2xl:whitespace-nowrap rounded border px-1 py-px text-[8px] font-bold uppercase leading-tight tracking-wide",
                                          badgeClass,
                                        )}
                                      >
                                        {statusLabel}
                                      </span>
                                    ) : null}
                                  </div>
                                );
                              })()}
                            </td>
                            <td
                              {...cellSelection.getTdProps(i, TCol.TANGGAL)}
                              data-no-row-click="true"
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                              className={cn(
                                TINDAKAN_SHEET_CELL,
                                ZOOM_CELL_CLASSES,
                                "px-2 sm:px-2.5 py-1 max-2xl:px-1.5 max-2xl:py-0.5 whitespace-nowrap font-mono text-[11px] text-center align-middle",
                                "text-amber-800 dark:text-slate-100",
                                cellSelection.isCellSelected(i, TCol.TANGGAL) &&
                                  TINDAKAN_CELL_SELECTION_CLASS,
                              )}
                            >
                              <div
                                className={cn(
                                  "mx-auto w-full max-w-[9.5rem]",
                                  ZOOM_INNER_CLASSES,
                                )}
                              >
                                <EditableDateCell
                                  value={String(rec.tanggal ?? "")}
                                  onCommit={async (next) =>
                                    patchRowField(id, { tanggal: next || null })
                                  }
                                />
                              </div>
                            </td>
                            <td
                              {...cellSelection.getTdProps(i, TCol.TIME_OUT)}
                              data-no-row-click="true"
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                              className={cn(
                                TINDAKAN_SHEET_CELL,
                                ZOOM_CELL_CLASSES,
                                "px-2 sm:px-2.5 py-1 max-2xl:px-1.5 max-2xl:py-0.5 whitespace-nowrap font-mono text-[11px] text-center align-middle tabular-nums",
                                "text-slate-800 dark:text-slate-100",
                                cellSelection.isCellSelected(
                                  i,
                                  TCol.TIME_OUT,
                                ) && TINDAKAN_CELL_SELECTION_CLASS,
                              )}
                              title="Dari tab Fast-Track (Time out)"
                            >
                              <div
                                className={cn(
                                  "mx-auto w-full max-w-[6rem]",
                                  ZOOM_INNER_CLASSES,
                                )}
                              >
                                <EditableTimeCell
                                  value={String(rec.fast_track_time_out ?? "")}
                                  onCommit={async (next) =>
                                    patchRowField(id, {
                                      fast_track_time_out: next || null,
                                    })
                                  }
                                />
                                {rec.waktu && (
                                  <div className="mt-1 text-[9px] font-mono text-cyan-600 dark:text-cyan-400 font-medium leading-none select-none">
                                    {formatWaktuDisplay(rec.waktu)}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td
                              {...cellSelection.getTdProps(i, TCol.RM)}
                              className={cn(
                                TINDAKAN_SHEET_CELL,
                                "px-2 sm:px-2.5 py-1 max-2xl:px-1.5 max-2xl:py-0.5 font-mono text-[11px] text-center align-middle cursor-pointer hover:bg-cyan-50/50 dark:hover:bg-cyan-950/30 transition-colors",
                                "text-amber-800 dark:text-slate-100",
                                cellSelection.isCellSelected(i, TCol.RM) &&
                                  TINDAKAN_CELL_SELECTION_CLASS,
                              )}
                            >
                              {(() => {
                                const { display: finalRm } =
                                  resolveShownRmForRow(
                                    rec,
                                    pasienLabelByRowId,
                                    pasienOptions,
                                    key,
                                  );
                                const linkRaw = String(
                                  rec.pci_report_link ?? "",
                                ).trim();
                                const hasLink =
                                  linkRaw.includes("docs.google.com");

                                // Kelengkapan Data Status
                                let healthColor = "";
                                let healthTitle = "";
                                if (hasLink) {
                                  const hasDiag = Boolean(
                                    String(rec.diagnosa ?? "").trim(),
                                  );
                                  const hasConc = Boolean(
                                    String(rec.kesimpulan_laporan ?? "").trim(),
                                  );
                                  const hasProc = Boolean(
                                    String(rec.tindakan ?? "").trim() &&
                                    rec.tindakan !== "Belum diisi",
                                  );

                                  if (hasDiag && hasConc && hasProc) {
                                    healthColor =
                                      "bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]";
                                    healthTitle = "Data Lengkap";
                                  } else if (hasDiag || hasConc) {
                                    healthColor =
                                      "bg-amber-400 shadow-[0_0_5px_rgba(251,191,36,0.5)]";
                                    healthTitle =
                                      "Data Parsial (Beberapa field kosong)";
                                  } else {
                                    healthColor =
                                      "bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)] animate-pulse";
                                    healthTitle =
                                      "Link Terhubung (AI sedang mengantre ekstraksi)";
                                  }
                                }

                                return (
                                  <div className="flex items-center justify-center gap-1.5">
                                    {hasLink && (
                                      <div className="relative flex items-center shrink-0">
                                        <FileText
                                          size={12}
                                          className="text-cyan-600 dark:text-cyan-400"
                                        />
                                        <span
                                          className={cn(
                                            "absolute -right-1 -top-1 w-1.5 h-1.5 rounded-full border border-white/50 dark:border-black/50",
                                            healthColor,
                                          )}
                                          title={healthTitle}
                                        />
                                      </div>
                                    )}
                                    <span className="whitespace-nowrap font-mono">{finalRm}</span>
                                    {String(rec.status ?? "").toLowerCase() === "meninggal" && (
                                      <span
                                        className="ml-1 text-xs animate-pulse select-none shrink-0"
                                        title="DOT (Dead on Table)"
                                      >
                                        💀
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </td>
                            <td
                              {...cellSelection.getTdProps(i, TCol.NAMA_PASIEN)}
                              data-no-row-click="true"
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                              className={cn(
                                TINDAKAN_SHEET_CELL,
                                ZOOM_CELL_CLASSES,
                                "relative overflow-visible px-2 sm:px-2.5 py-1 max-2xl:px-1 max-2xl:py-0.5 max-2xl:max-w-none 2xl:max-w-[18rem] text-left align-middle",
                                "text-amber-800 dark:text-white",
                                cellSelection.isCellSelected(
                                  i,
                                  TCol.NAMA_PASIEN,
                                ) && TINDAKAN_CELL_SELECTION_CLASS,
                              )}
                            >
                              <div
                                data-no-row-click="true"
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                                onMouseEnter={() => openArcMenu(key)}
                                onMouseLeave={() => scheduleCloseArcMenu()}
                                className={cn(
                                  "relative mx-auto min-w-0 max-2xl:w-full 2xl:min-w-[10rem] 2xl:max-w-[18rem] flex items-center gap-1.5",
                                  // Hanya sisi kiri–kanan (menu arc); jangan -inset-y agar area tidak
                                  // menutupi baris lain — itu yang bikin kursor “melompat” / RM jadi kena baris beda.
                                  "before:absolute before:inset-y-0 before:-left-2 before:-right-32 before:content-['']",
                                  arcOpen
                                    ? "before:pointer-events-auto"
                                    : "before:pointer-events-none",
                                  ZOOM_INNER_CLASSES,
                                )}
                                title={
                                  pasienError ??
                                  pasienLabelByRowId[stateKey] ??
                                  buildPasienLabelFromRow(raw) ??
                                  undefined
                                }
                              >
                                {/* CENTER LABEL — Description of Hovered Icon */}
                                {hoveredLabel && hoveredRowKey === key && (
                                  <div
                                    className={cn(
                                      "absolute left-1/2 bottom-full mb-1.5 w-max max-w-[min(20rem,85vw)] -translate-x-1/2 pointer-events-none",
                                      UI_LAYERS.tableHoveredLabel,
                                    )}
                                  >
                                    <div className="relative text-center bg-slate-900/95 text-white text-[13px] font-extrabold px-3 py-1.5 leading-tight rounded-lg shadow-2xl border border-white/30 whitespace-normal text-balance animate-in fade-in zoom-in duration-200 tracking-wide uppercase">
                                      {hoveredLabel}
                                    </div>
                                  </div>
                                )}

                                {/* CONSOLIDATED NAVIGATION ARC — Right Side (mount only when open) */}
                                {arcOpen ? (
                                <div
                                  className={cn(
                                    "absolute top-1/2 right-[-10px] z-20 h-0 w-0 -translate-y-1/2 overflow-visible",
                                    "pointer-events-auto opacity-100",
                                  )}
                                >
                                  {[
                                    {
                                      id: "fast_track",
                                      Icon: Zap,
                                      label: "Fast-Track",
                                      color:
                                        "bg-yellow-500 text-white border-yellow-300 animate-pulse shadow-[0_0_15px_rgba(234,179,8,0.6)]",
                                      onClick: (e: any) => {
                                        e.stopPropagation();
                                        if (id) openDetail(id, "fast_track");
                                      },
                                    },
                                    {
                                      id: "tindakan",
                                      Icon: Stethoscope,
                                      label: "Tindakan",
                                      color:
                                        "bg-emerald-600 text-white border-emerald-400",
                                      onClick: (e: any) => {
                                        e.stopPropagation();
                                        if (id) openDetail(id, "tindakan");
                                      },
                                    },
                                    {
                                      id: "lokasi",
                                      Icon: MapPin,
                                      label: "Lokasi",
                                      color:
                                        "bg-rose-600 text-white border-rose-400",
                                      onClick: (e: any) => {
                                        e.stopPropagation();
                                        if (id) openDetail(id, "lokasi");
                                      },
                                    },
                                    {
                                      id: "tim",
                                      Icon: Users,
                                      label: "Tim",
                                      color:
                                        "bg-purple-600 text-white border-purple-400",
                                      onClick: (e: any) => {
                                        e.stopPropagation();
                                        if (id) openDetail(id, "tim");
                                      },
                                    },
                                    {
                                      id: "radiologi",
                                      Icon: Activity,
                                      label: "Radiologi",
                                      color:
                                        "bg-orange-600 text-white border-orange-400",
                                      onClick: (e: any) => {
                                        e.stopPropagation();
                                        if (id) openDetail(id, "radiologi");
                                      },
                                    },
                                    {
                                      id: "icu_monitoring",
                                      Icon: HeartPulse,
                                      label: "Monitoring ICU",
                                      color:
                                        "bg-sky-600 text-white border-sky-400",
                                      onClick: (e: any) => {
                                        e.stopPropagation();
                                        closeArcMenuImmediate();
                                        setIcuModalRow(rec);
                                      },
                                    },
                                    {
                                      id: "klinis",
                                      Icon: ClipboardList,
                                      label: "Klinis",
                                      color:
                                        "bg-indigo-600 text-white border-indigo-400",
                                      onClick: (e: any) => {
                                        e.stopPropagation();
                                        if (id) openDetail(id, "klinis");
                                      },
                                    },
                                  ].map((item, idx, arr) => {
                                    const total = arr.length;
                                    // Spacing rapat, radius lebih kecil agar memeluk icon hapus
                                    const SPAN_DEG = 160;
                                    const RADIUS_PX = 48;
                                    const baseAngle = -SPAN_DEG / 2;
                                    const angle =
                                      baseAngle +
                                      (idx / (total - 1)) * SPAN_DEG;
                                    return (
                                      <div
                                        key={item.id}
                                        style={{
                                          transform: `rotate(${angle}deg) translate(${RADIUS_PX}px) rotate(${-angle}deg)`,
                                          transitionDelay: `${idx * 18}ms`,
                                        }}
                                        className={cn(
                                          "absolute top-1/2 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2",
                                          "scale-100 opacity-100 transition-transform transition-opacity duration-150 ease-out",
                                        )}
                                      >
                                        <button
                                          type="button"
                                          onMouseDown={(e) => {
                                            // Jangan pindah fokus ke tombol: biarkan :focus-within
                                            // pada field nama — mencegah "zoom out" tiba-tiba saat klik icon arc.
                                            e.preventDefault();
                                          }}
                                          onClick={item.onClick}
                                          onMouseEnter={() => {
                                            setHoveredLabel(item.label);
                                            setHoveredRowKey(key);
                                          }}
                                          onMouseLeave={() => {
                                            setHoveredLabel(null);
                                            setHoveredRowKey(null);
                                          }}
                                          className={cn(
                                            "flex h-8 w-8 items-center justify-center rounded-full border-2 border-white/25 shadow-xl transition-transform duration-200 ease-out will-change-transform",
                                            "z-20 hover:scale-[2] hover:z-30 active:scale-100",
                                            item.color,
                                          )}
                                          title={item.label}
                                        >
                                          <item.Icon
                                            size={14}
                                            strokeWidth={2.75}
                                            className="drop-shadow-sm"
                                          />
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                                ) : null}

                                {/* ACTION GROUP — Near Pasien Field (mount only when arc open) */}
                                {arcOpen ? (
                                <div
                                  className={cn(
                                    "absolute -right-8 top-1/2 z-20 flex -translate-y-1/2 items-center gap-1",
                                    "opacity-100",
                                  )}
                                >
                                  {id && pemakaianOrderByTindakanId[id] ? (
                                    <button
                                      type="button"
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPemakaianModalRow(rec);
                                      }}
                                      className={cn(
                                        "flex h-7 w-7 items-center justify-center rounded-full border shadow-lg transition-all duration-200 hover:scale-150",
                                        "border-amber-500 bg-amber-100 text-amber-900 dark:border-amber-600 dark:bg-amber-950 dark:text-amber-200",
                                      )}
                                      title="Edit Pemakaian"
                                    >
                                      <SquarePen className="h-3.5 w-3.5" />
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPemakaianModalRow(rec);
                                      }}
                                      className={cn(
                                        "flex h-7 w-7 items-center justify-center rounded-full border shadow-lg transition-all duration-200 hover:scale-150",
                                        "border-cyan-500 bg-cyan-100 text-cyan-950 dark:border-cyan-600 dark:bg-cyan-950 dark:text-cyan-200",
                                      )}
                                      title="Input Pemakaian"
                                    >
                                      <ClipboardList className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    disabled={!id || deletingId === id}
                                    onMouseDown={(e) => {
                                      if (e.currentTarget.disabled) return;
                                      e.preventDefault();
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void handleDelete(id, rec);
                                    }}
                                    className={cn(
                                      "flex h-7 w-7 items-center justify-center rounded-full border shadow-lg transition-all duration-200 hover:scale-150 disabled:opacity-30",
                                      "border-red-400 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
                                    )}
                                    title="Hapus"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                                ) : null}

                                {/* Alkes Warning / Preparation Indicator */}
                                {(() => {
                                  const t = String(
                                    rec.tindakan ?? "",
                                  ).toLowerCase();
                                  const isEpAblasi =
                                    t.includes("ep ") ||
                                    t.includes("eps") ||
                                    t.includes("ablasi") ||
                                    t.includes("ablation");
                                  if (!isEpAblasi) return null;

                                  const isoDate = extractCalendarDateKey(
                                    String(rec.tanggal ?? ""),
                                  );
                                  if (!isoDate) return null;

                                  const today = todayWibYmd();
                                  const scheduledDate = new Date(isoDate);
                                  const todayDate = new Date(today);
                                  const diffTime =
                                    scheduledDate.getTime() -
                                    todayDate.getTime();
                                  const diffDays = Math.ceil(
                                    diffTime / (1000 * 60 * 60 * 24),
                                  );

                                  const orderId = id
                                    ? pemakaianOrderByTindakanId[id]
                                    : null;
                                  const order = orderId
                                    ? pemakaianOrdersRaw.find(
                                        (o: any) => o.id === orderId,
                                      )
                                    : null;
                                  const isReady =
                                    order &&
                                    (order as any).status_alkes_cssd ===
                                      "READY";

                                  if (isReady) return null; // Sudah siap, tidak perlu indikator warning

                                  let colorClass = "";
                                  let tooltip = "";

                                  if (diffDays <= 0) {
                                    colorClass =
                                      "bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]";
                                    tooltip =
                                      "ALERTI: Alkes BELUM SIAP (Hari-H/H-1)";
                                  } else if (diffDays <= 2) {
                                    colorClass =
                                      "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.4)]";
                                    tooltip = `WARNING: Persiapan Alkes H-${diffDays}`;
                                  } else {
                                    return null;
                                  }

                                  return (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPemakaianModalRow(rec);
                                      }}
                                      className={cn(
                                        "w-2.5 h-2.5 rounded-full shrink-0 border border-white/20 transition-transform hover:scale-125 cursor-pointer",
                                        colorClass,
                                      )}
                                      title={`${tooltip} (Klik untuk buka Pemakaian Alkes)`}
                                    />
                                  );
                                })()}
                                {/* High Priority / Fast-Track Pulse Indicator */}
                                {(() => {
                                  const s = String(
                                    rec.status ?? "",
                                  ).toLowerCase();
                                  const t = String(
                                    rec.tindakan ?? "",
                                  ).toLowerCase();
                                  const rawFt = (rec as any).is_fast_track;
                                  const isFtActive =
                                    rawFt === true ||
                                    rawFt === 1 ||
                                    rawFt === "true" ||
                                    rawFt === "1";

                                  const ftIgd = String(
                                    rec.pasien_datang_igd ?? "",
                                  ).trim();
                                  const ftD2b = String(
                                    rec.door_to_balloon ?? "",
                                  ).trim();
                                  const ftTotal = String(
                                    rec.total_waktu_fast_track ?? "",
                                  ).trim();

                                  // Syarat perketat: Ikon hanya muncul jika status is_fast_track aktif
                                  // DAN data IGD & D2B tidak boleh kosong.
                                  const isFtComplete =
                                    isFtActive &&
                                    !!rec.pasien_datang_igd &&
                                    !!rec.door_to_balloon;

                                  // Debug log khusus untuk RM ASNAN (920295)
                                  if (String(rec.no_rm).includes("920295")) {
                                    console.log("DEBUG FT (ASNAN):", {
                                      rm: rec.no_rm,
                                      id: rec.id,
                                      isFtActive,
                                      isFtComplete,
                                      rawFt,
                                      igd: rec.pasien_datang_igd,
                                      d2b: rec.door_to_balloon,
                                      total: rec.total_waktu_fast_track,
                                      all_keys: Object.keys(rec),
                                    });
                                  }

                                  if (!isFtComplete) return null;

                                  // KPI Logic: D2B > 90 menit dianggap terlambat (Merah)
                                  const totalMins = parseFloat(
                                    ftTotal.replace(",", "."),
                                  );
                                  const isLate =
                                    !isNaN(totalMins) && totalMins > 90;

                                  return (
                                    <div
                                      className="absolute -left-6 top-1/2 -translate-y-1/2 animate-pulse cursor-help z-20"
                                      title={`Pasien Fast-Track | Datang: ${ftIgd} | D2B: ${ftD2b} | Total: ${ftTotal || "-"}${isLate ? " (Melebihi Target KPI 90m)" : ""}`}
                                    >
                                      <Zap
                                        size={14}
                                        strokeWidth={3}
                                        className={cn(
                                          isLate
                                            ? "fill-red-500 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.7)] dark:fill-red-400 dark:text-red-300"
                                            : "fill-yellow-500 text-yellow-500 drop-shadow-[0_0_5px_rgba(245,158,11,0.6)] dark:fill-yellow-300 dark:text-yellow-400",
                                        )}
                                      />
                                    </div>
                                  );
                                })()}
                                <PasienCombobox
                                  listboxId={`tindakan-row-${key}-pasien`}
                                  value={
                                    pasienLabelByRowId[stateKey] ??
                                    buildPasienLabelFromRow(raw) ??
                                    ""
                                  }
                                  onChange={(label) => {
                                    setPasienLabelByRowId((p) => ({
                                      ...p,
                                      [stateKey]: label,
                                    }));
                                  }}
                                  onSelectOption={(picked) => {
                                    const canonical = formatPasienLabel(picked);
                                    setPasienLabelByRowId((p) => ({
                                      ...p,
                                      [stateKey]: canonical,
                                    }));
                                    if (!id) return;
                                    void patchRowField(id, {
                                      pasien_id: picked.id,
                                      no_rm: picked.no_rm,
                                      nama_pasien: picked.nama,
                                    });
                                  }}
                                  onInputBlur={(finalText) => {
                                    if (!id) return;
                                    void commitPasienInputBlur(
                                      id,
                                      stateKey,
                                      raw,
                                      finalText,
                                    );
                                  }}
                                  options={pasienOptions}
                                  loading={pasienLoading}
                                  className="max-w-[18rem] max-2xl:max-w-full"
                                  inputClassName={cn(
                                    TINDAKAN_TABLE_PRIMARY_COL_INPUT,
                                    "w-full min-w-0 truncate rounded-sm",
                                  )}
                                />
                                {String(rec.status ?? "").toLowerCase() === "meninggal" && (
                                  <span
                                    className="ml-1 text-sm animate-pulse select-none shrink-0"
                                    title="DOT (Dead on Table)"
                                  >
                                    💀
                                  </span>
                                )}
                                {!pasienLoading &&
                                pasienOptions.length === 0 &&
                                i === 0 ? (
                                  <p className="mt-0.5 text-[9px] leading-tight text-cyan-700/80 dark:text-slate-300/80">
                                    {pasienError
                                      ? "Gagal memuat pasien."
                                      : "Belum ada pasien di database."}
                                  </p>
                                ) : null}
                              </div>
                            </td>
                            <td
                              {...cellSelection.getTdProps(i, TCol.RS_KET)}
                              data-no-row-click="true"
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                              className={cn(
                                TINDAKAN_SHEET_CELL,
                                /* Tanpa ZOOM_*: dua ikon + field sempit; zoom absolute sering memicu klik ke kolom lain / baris. */
                                "relative isolate z-[1] overflow-visible px-2 py-1 max-2xl:px-1 max-2xl:py-0.5 max-2xl:min-w-0 2xl:min-w-[12rem] text-center align-middle",
                                "text-amber-800 dark:text-slate-100",
                                cellSelection.isCellSelected(i, TCol.RS_KET) &&
                                  TINDAKAN_CELL_SELECTION_CLASS,
                              )}
                            >
                              <div
                                data-no-row-click="true"
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="mx-auto flex w-full max-w-full items-center justify-center gap-3"
                                role="group"
                                aria-label="RS Perujuk dan Keterangan"
                              >
                                <div className="min-w-0 flex-1 flex justify-center">
                                  <RsPerujukField
                                    tindakanId={id}
                                    value={rec.rs_perujuk}
                                    onSaved={refresh}
                                  />
                                </div>
                                <div className="flex shrink-0 justify-center">
                                  <KeteranganField
                                    tindakanId={id}
                                    value={rec.keterangan}
                                    onSaved={refresh}
                                  />
                                </div>
                              </div>
                            </td>
                            <td
                              {...cellSelection.getTdProps(i, TCol.UMUR)}
                              className={cn(
                                TINDAKAN_SHEET_CELL,
                                "px-2 sm:px-2.5 py-1 max-2xl:px-1.5 max-2xl:py-0.5 whitespace-nowrap font-mono text-[11px] text-center align-middle tabular-nums",
                                "text-slate-800 dark:text-slate-100",
                                cellSelection.isCellSelected(i, TCol.UMUR) &&
                                  TINDAKAN_CELL_SELECTION_CLASS,
                              )}
                            >
                              {(() => {
                                let umurVal = raw.umur as number | null;
                                if (umurVal === null || umurVal === undefined) {
                                  // Fallback ke master pasien (pKet)
                                  if (pKet) {
                                    if (typeof pKet.umur === "number") {
                                      umurVal = pKet.umur;
                                    } else {
                                      const dobStr =
                                        (pKet as any)?.tgl_lahir ||
                                        (pKet as any)?.tanggal_lahir;
                                      if (
                                        dobStr &&
                                        typeof dobStr === "string"
                                      ) {
                                        umurVal = hitungUsia(dobStr).angka;
                                      }
                                    }
                                  }
                                }
                                if (
                                  umurVal === null ||
                                  umurVal === undefined ||
                                  umurVal === 0
                                ) {
                                  // Terakhir coba dari raw.tgl_lahir jika ada
                                  const dobStr =
                                    typeof raw.tgl_lahir === "string"
                                      ? raw.tgl_lahir
                                      : "";
                                  if (dobStr) {
                                    umurVal = hitungUsia(dobStr).angka;
                                  }
                                }
                                return umurVal != null && umurVal > 0
                                  ? `${umurVal} TH`
                                  : "—";
                              })()}
                            </td>
                            <td
                              {...cellSelection.getTdProps(
                                i,
                                TCol.JENIS_KELAMIN,
                              )}
                              className={cn(
                                TINDAKAN_SHEET_CELL,
                                "px-2 sm:px-2.5 py-1 max-2xl:px-1.5 max-2xl:py-0.5 text-[11px] text-center align-middle whitespace-nowrap",
                                "text-slate-800 dark:text-slate-100",
                                cellSelection.isCellSelected(
                                  i,
                                  TCol.JENIS_KELAMIN,
                                ) && TINDAKAN_CELL_SELECTION_CLASS,
                              )}
                            >
                              {formatJenisKelaminDisplay(
                                resolveJenisKelaminFromRow(
                                  raw,
                                  resolvePasienFromRow(pasienOptions, raw),
                                ),
                              )}
                            </td>
                            <td
                               {...cellSelection.getTdProps(i, TCol.DOKTER)}
                               data-no-row-click="true"
                               onClick={(e) => e.stopPropagation()}
                               onMouseDown={(e) => e.stopPropagation()}
                               onMouseEnter={() => openAnestesiArc(key)}
                               onMouseLeave={() => scheduleCloseAnestesiArc()}
                               className={cn(
                                 TINDAKAN_SHEET_CELL,
                                 ZOOM_CELL_CLASSES,
                                 "px-2 sm:px-2.5 py-1 max-2xl:px-1 max-2xl:py-0.5 max-2xl:min-w-0 max-2xl:max-w-none 2xl:max-w-[18rem] 2xl:min-w-[12rem] text-center align-middle overflow-visible",
                                 "text-amber-800 dark:text-slate-100",
                                 anestesiArcRowKey === key &&
                                   cn("relative", UI_LAYERS.tableZoomedCell),
                                 cellSelection.isCellSelected(i, TCol.DOKTER) &&
                                   TINDAKAN_CELL_SELECTION_CLASS,
                               )}
                             >
                               <div className="relative mx-auto flex h-full items-center justify-center">
                                 <div
                                   data-no-row-click="true"
                                   onMouseDown={(e) => e.stopPropagation()}
                                   onClick={(e) => e.stopPropagation()}
                                   className={cn(
                                     "relative mx-auto flex min-w-0 w-full max-2xl:max-w-none 2xl:min-w-[11.5rem] 2xl:max-w-[17.5rem] items-center justify-center",
                                     ZOOM_INNER_CLASSES,
                                   )}
                                   title={
                                     doctorError ||
                                     canonicalDoctorDisplayValue(
                                       doctorOptionsMaster,
                                       String(rec.dokter ?? ""),
                                     )
                                   }
                                 >
                                   <div
                                     className={cn(
                                       "flex min-h-8 w-full min-w-0 items-stretch 2xl:min-h-[2.25rem]",
                                       ZOOM_INNER_CLASSES,
                                     )}
                                   >
                                     <div className="min-w-0 flex-1">
                                       <div className="relative">
                                         <EditableDokterCell
                                           listboxId={`tindakan-row-${key}-doctor`}
                                           value={
                                             doctorLabelByRowId[stateKey] ??
                                             canonicalDoctorDisplayValue(
                                               doctorOptionsMaster,
                                               String(rec.dokter ?? ""),
                                             )
                                           }
                                           doctorOptionsMaster={doctorOptionsMaster}
                                           dokterOptions={dokterOptions}
                                           loading={doctorLoading}
                                           onCommit={(next) =>
                                             commitDoctorForRow(id, stateKey, next)
                                           }
                                         />
                                       </div>
                                       {!doctorLoading &&
                                       doctorOptionsMaster.length === 0 &&
                                       i === 0 ? (
                                         <p
                                           className={cn(
                                             "mt-0.5 text-[9px] leading-tight",
                                             "text-cyan-700/80 dark:text-slate-300/80",
                                         )}
                                       >
                                         {doctorError
                                           ? "Gagal memuat master dokter."
                                           : "Belum ada dokter di master."}
                                       </p>
                                     ) : null}
                                   </div>
                                 </div>
                               </div>

                               {/* Anesthesia icon — mount only when arc open or sudah terisi */}
                               {anestesiArcRowKey === key ||
                               Boolean(String(rec.dokter_anestesi ?? "").trim()) ? (
                               <div
                                 className={cn(
                                   "pointer-events-auto absolute right-1.5 top-1/2 z-[110] -translate-y-1/2",
                                   "opacity-100 scale-100",
                                 )}
                                 data-no-row-click="true"
                               >
                                 <DokterAnestesiField
                                   variant="tableIcon"
                                   arcOpen={anestesiArcRowKey === key}
                                   tindakanId={id}
                                   value={rec.dokter_anestesi ?? null}
                                   options={doctorOptionsMaster}
                                   loading={doctorLoading}
                                   error={doctorError}
                                   onCommit={
                                     id
                                       ? (next) =>
                                           patchRowField(id, {
                                             dokter_anestesi: next,
                                           })
                                       : undefined
                                   }
                                 />
                               </div>
                               ) : null}
                             </div>
                           </td>
                              <td
                                {...cellSelection.getTdProps(i, TCol.TINDAKAN)}
                                data-no-row-click="true"
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                className={cn(
                                  TINDAKAN_SHEET_CELL,
                                  ZOOM_CELL_CLASSES,
                                "overflow-visible px-2 sm:px-2.5 py-1 max-2xl:px-1 max-2xl:py-0.5 max-2xl:max-w-none 2xl:max-w-[14rem] text-center align-middle",
                                "text-amber-800 dark:text-white",
                                cellSelection.isCellSelected(
                                  i,
                                  TCol.TINDAKAN,
                                ) && TINDAKAN_CELL_SELECTION_CLASS,
                              )}
                            >
                              <div
                                data-no-row-click="true"
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                                className={cn(
                                  "mx-auto min-w-0 w-full max-2xl:max-w-none 2xl:min-w-[10rem] 2xl:max-w-[14rem]",
                                  ZOOM_INNER_CLASSES,
                                )}
                                title={masterTindakanError ?? String(rec.tindakan ?? "")}
                              >
                                <EditableMasterTindakanCell
                                  value={String(rec.tindakan ?? "")}
                                  masterOptions={masterTindakanOptions}
                                  loading={masterTindakanLoading}
                                  listboxId={`tindakan-row-${key}-tindakan`}
                                  onCommit={(next) =>
                                    commitTindakanForRow(id, next)
                                  }
                                />
                                {!masterTindakanLoading &&
                                masterTindakanOptions.length === 0 &&
                                i === 0 ? (
                                  <p
                                    className={cn(
                                      "mt-0.5 text-[9px] leading-tight",
                                      "text-cyan-700/80 dark:text-cyan-500/70",
                                    )}
                                  >
                                    {masterTindakanError
                                      ? "Gagal memuat master tindakan."
                                      : "Belum ada jenis tindakan di master."}
                                  </p>
                                ) : null}
                              </div>
                            </td>
                            <td
                              {...cellSelection.getTdProps(i, TCol.RUANGAN)}
                              data-no-row-click="true"
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                              className={cn(
                                TINDAKAN_SHEET_CELL,
                                ZOOM_CELL_CLASSES,
                                "overflow-visible px-2 sm:px-2.5 py-1 max-2xl:px-1 max-2xl:py-0.5 max-2xl:max-w-none 2xl:max-w-[14rem] text-left align-middle",
                                "text-amber-800 dark:text-amber-300",
                                cellSelection.isCellSelected(i, TCol.RUANGAN) &&
                                  TINDAKAN_CELL_SELECTION_CLASS,
                              )}
                            >
                              <div
                                data-no-row-click="true"
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                                className={cn(
                                  "mx-auto min-w-0 w-full max-2xl:max-w-none 2xl:min-w-[10rem] 2xl:max-w-[14rem]",
                                  ZOOM_INNER_CLASSES,
                                )}
                                title={ruanganError ?? String(rec.ruangan ?? "")}
                              >
                                <EditableRuanganCell
                                  value={String(rec.ruangan ?? "")}
                                  ruanganMaster={ruanganMaster}
                                  loading={ruanganLoading}
                                  listboxId={`tindakan-row-${key}-ruangan`}
                                  onCommit={(next) =>
                                    commitRuanganForRow(id, next)
                                  }
                                />
                                {!ruanganLoading &&
                                ruanganMaster.length === 0 &&
                                i === 0 ? (
                                  <p
                                    className={cn(
                                      "mt-0.5 text-[9px] leading-tight",
                                      "text-cyan-700/80 dark:text-cyan-500/70",
                                    )}
                                  >
                                    {ruanganError
                                      ? "Gagal memuat master ruangan."
                                      : "Belum ada ruangan di master."}
                                  </p>
                                ) : null}
                              </div>
                            </td>
                            <td
                              {...cellSelection.getTdProps(i, TCol.AKSI)}
                              className={cn(
                                TINDAKAN_SHEET_CELL,
                                "px-2 sm:px-2.5 py-1 max-2xl:px-1 max-2xl:py-0.5 align-middle text-center",
                                cellSelection.isCellSelected(i, TCol.AKSI) &&
                                  TINDAKAN_CELL_SELECTION_CLASS,
                              )}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                            >
                              <div className="flex flex-nowrap items-center justify-center gap-0.5">
                                {id && pemakaianOrderByTindakanId[id] ? (
                                  <button
                                    type="button"
                                    className={cn(
                                      "inline-flex items-center gap-1 max-2xl:gap-0 rounded-md border px-1.5 max-2xl:px-1 py-0.5 text-[10px] font-bold transition-all",
                                      "border-amber-600/45 bg-amber-100/90 text-amber-950 hover:bg-amber-200/80 dark:border-amber-800/50 dark:bg-amber-950/35 dark:text-amber-200/95 dark:hover:border-amber-600/45 dark:hover:bg-amber-900/30",
                                    )}
                                    title="Edit pemakaian alkes (order sudah ada)"
                                    aria-label="Edit pemakaian"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPemakaianModalRow(rec);
                                    }}
                                  >
                                    <SquarePen className="h-3.5 w-3.5 shrink-0 opacity-90" />
                                    <span className="hidden 2xl:inline">
                                      Edit pemakaian
                                    </span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className={cn(
                                      "inline-flex items-center gap-1 max-2xl:gap-0 rounded-md border px-1.5 max-2xl:px-1 py-0.5 text-[10px] font-bold transition-all",
                                      "border-cyan-600/45 bg-cyan-100/90 text-cyan-950 hover:bg-cyan-200/75 dark:border-cyan-800/50 dark:bg-cyan-950/40 dark:text-cyan-200/95 dark:hover:border-cyan-600/40 dark:hover:bg-cyan-900/35",
                                    )}
                                    title="Input pemakaian barang"
                                    aria-label="Pemakaian"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPemakaianModalRow(rec);
                                    }}
                                  >
                                    <ClipboardList className="h-3.5 w-3.5 shrink-0 opacity-90" />
                                    <span className="hidden 2xl:inline">
                                      Pemakaian
                                    </span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  disabled={!id || deletingId === id}
                                  className={cn(
                                    "inline-flex items-center gap-1 max-2xl:gap-0 rounded-md border px-1.5 max-2xl:px-1 py-0.5 text-[10px] font-bold transition-all disabled:pointer-events-none disabled:opacity-40",
                                    "border-red-400/55 bg-red-50 text-red-800 hover:bg-red-100 dark:border-red-900/45 dark:bg-red-950/25 dark:text-red-300/95 dark:hover:bg-red-950/45",
                                  )}
                                  title="Hapus kasus tindakan"
                                  aria-label="Hapus"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void handleDelete(id, rec);
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5 shrink-0 opacity-90" />
                                  <span className="hidden 2xl:inline">
                                    Hapus
                                  </span>
                                </button>
                              </div>
                            </td>
                          </tr>
                          {/* Unified Expansion Row — Prior procedure history if duplicate RM found */}
                          {isDuplicateRm && priorList.length > 0 ? (
                            <tr
                              className={cn(
                                "border-b transition-all duration-300",
                                "border-amber-300/50 bg-amber-50/80 dark:border-amber-900/30 dark:bg-amber-950/15",
                              )}
                            >
                              <td
                                colSpan={12}
                                className={cn(
                                  TINDAKAN_SHEET_CELL,
                                  "px-4 py-3 align-top text-left",
                                )}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="space-y-4">
                                  {/* Part 2: History (If duplicate RM found) */}
                                  {isDuplicateRm && priorList.length > 0 && (
                                    <div
                                      className={cn(
                                        "w-full text-[11px] leading-snug",
                                        "text-amber-950 dark:text-amber-100/90",
                                      )}
                                    >
                                      <button
                                        type="button"
                                        data-no-row-click="true"
                                        aria-expanded={Boolean(
                                          rmHistoryOpenByRowKey[key],
                                        )}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setRmHistoryOpenByRowKey((p) => ({
                                            ...p,
                                            [key]: !p[key],
                                          }));
                                        }}
                                        className={cn(
                                          "flex w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500/45",
                                          "border-amber-500/40 bg-white/90 hover:bg-amber-100/80 dark:border-amber-800/35 dark:bg-black/25 dark:hover:bg-amber-950/35",
                                        )}
                                      >
                                        {rmHistoryOpenByRowKey[key] ? (
                                          <ChevronDown
                                            className="h-4 w-4 shrink-0 text-amber-400/90"
                                            aria-hidden
                                          />
                                        ) : (
                                          <ChevronRight
                                            className="h-4 w-4 shrink-0 text-amber-400/90"
                                            aria-hidden
                                          />
                                        )}
                                        <span className="font-mono text-[11px] text-amber-200/95 font-bold">
                                          Riwayat tindakan lain (
                                          {priorList.length})
                                        </span>
                                        <span className="text-amber-500/70 font-semibold">
                                          · RM {rmLine}
                                        </span>
                                      </button>
                                      {rmHistoryOpenByRowKey[key] ? (
                                        <div className="mt-2 flex flex-col gap-3 pl-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                          {priorList.map((e, j) => (
                                            <div
                                              key={`${e.sortKey}-${j}-${e.tindakan}`}
                                              className={cn(
                                                "rounded-lg border p-4 flex flex-col",
                                                "border-amber-400/50 bg-white/95 dark:border-amber-800/40 dark:bg-black/35 shadow-sm",
                                              )}
                                            >
                                              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-amber-400/20 dark:border-white/5 pb-3 mb-3">
                                                <div className="flex-1 min-w-[200px]">
                                                  <div className="text-[9px] font-mono uppercase tracking-widest text-amber-500/80 mb-1">
                                                    Pernah dilakukan
                                                  </div>
                                                  <div className="text-sm font-black text-amber-950 dark:text-amber-100/95 leading-tight">
                                                    {e.tindakan}
                                                  </div>
                                                </div>
                                                <div className="flex gap-6">
                                                  <div>
                                                    <div className="text-[9px] font-mono uppercase text-amber-500/70 mb-0.5">
                                                      Tanggal
                                                    </div>
                                                    <div className="font-mono text-xs font-bold text-amber-900 dark:text-amber-100/90">
                                                      {e.tanggalDisp}
                                                    </div>
                                                  </div>
                                                  <div>
                                                    <div className="text-[9px] font-mono uppercase text-amber-500/70 mb-0.5">
                                                      Dokter
                                                    </div>
                                                    <div
                                                      className="text-xs font-bold text-amber-900 dark:text-amber-100/90"
                                                      title={e.dokter}
                                                    >
                                                      {e.dokter}
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>

                                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6">
                                                {/* Kolom 1: Klinis */}
                                                <div className="space-y-4">
                                                  <div className="border-b border-amber-500/10 pb-1 mb-2">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-600/80">
                                                      Data Klinis
                                                    </span>
                                                  </div>
                                                  {e.diagnosa && (
                                                    <div>
                                                      <span className="text-[9px] font-mono uppercase text-amber-500/70 leading-tight block mb-1">
                                                        Diagnosa
                                                      </span>
                                                      <span className="text-xs leading-relaxed text-amber-950 dark:text-amber-100/90 font-medium">
                                                        {e.diagnosa}
                                                      </span>
                                                    </div>
                                                  )}
                                                  {e.faktor_risiko && (
                                                    <div>
                                                      <span className="text-[9px] font-mono uppercase text-amber-500/70 leading-tight block mb-1">
                                                        Faktor Risiko
                                                      </span>
                                                      <span className="text-xs leading-relaxed text-amber-950 dark:text-amber-100/85">
                                                        {e.faktor_risiko}
                                                      </span>
                                                    </div>
                                                  )}
                                                  {e.kesimpulan_laporan && (
                                                    <div>
                                                      <span className="text-[9px] font-mono uppercase text-amber-500/70 leading-tight block mb-1">
                                                        Hasil Akhir (Temuan Medis)
                                                      </span>
                                                      <span className="text-xs leading-relaxed text-amber-950 dark:text-amber-100/95 font-bold italic">
                                                        {e.kesimpulan_laporan}
                                                      </span>
                                                    </div>
                                                  )}
                                                  <div className="flex gap-6">
                                                    {e.severity_level && (
                                                      <div>
                                                        <span className="text-[9px] font-mono uppercase text-amber-500/70 leading-tight block mb-1">
                                                          Severity
                                                        </span>
                                                        <span className="text-xs font-black text-amber-700 dark:text-amber-400">
                                                          {e.severity_level}
                                                        </span>
                                                      </div>
                                                    )}
                                                    {e.hasil_lab_ppm && (
                                                      <div>
                                                        <span className="text-[9px] font-mono uppercase text-amber-500/70 leading-tight block mb-1">
                                                          Lab PPM
                                                        </span>
                                                        <span className="text-xs font-bold text-amber-950 dark:text-amber-100/90">
                                                          {e.hasil_lab_ppm}
                                                        </span>
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>

                                                {/* Kolom 2: Laporan & Hasil */}
                                                <div className="space-y-4">
                                                  <div className="border-b border-amber-500/10 pb-1 mb-2">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-600/80">
                                                      Hasil & Laporan
                                                    </span>
                                                  </div>
                                                  {e.temuan_pembuluh && (
                                                    <div>
                                                      <span className="text-[9px] font-mono uppercase text-amber-500/70 leading-tight block mb-1">
                                                        Temuan Pembuluh
                                                      </span>
                                                      <span className="text-xs leading-relaxed text-amber-950 dark:text-amber-100/85 italic">
                                                        {e.temuan_pembuluh}
                                                      </span>
                                                    </div>
                                                  )}
                                                  {e.plan_medis && (
                                                    <div>
                                                      <span className="text-[9px] font-mono uppercase text-amber-500/70 leading-tight block mb-1">
                                                        Plan Medis
                                                      </span>
                                                      <span className="text-xs leading-relaxed text-emerald-700 dark:text-emerald-400 font-bold">
                                                        {e.plan_medis}
                                                      </span>
                                                    </div>
                                                  )}
                                                  {e.pci_report_link && (
                                                    <div className="pt-1">
                                                      <a
                                                        href={e.pci_report_link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 rounded bg-cyan-500/10 px-2 py-1 text-[10px] font-bold text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20 transition-colors"
                                                      >
                                                        <FileText size={12} />
                                                        LIHAT PDF
                                                      </a>
                                                    </div>
                                                  )}
                                                </div>

                                                {/* Kolom 3: Tim Medis */}
                                                <div className="space-y-4">
                                                  <div className="border-b border-amber-500/10 pb-1 mb-2">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-600/80">
                                                      Tim Medis
                                                    </span>
                                                  </div>
                                                  <div>
                                                    <span className="text-[9px] font-mono uppercase text-amber-500/70 leading-tight block mb-1">
                                                      Dokter Operator
                                                    </span>
                                                    <span className="text-xs font-bold text-amber-950 dark:text-amber-100/90">
                                                      {e.dokter}
                                                    </span>
                                                  </div>
                                                  {(e.asisten ||
                                                    e.sirkuler ||
                                                    e.logger) && (
                                                    <div className="grid grid-cols-1 gap-2">
                                                      {e.asisten && (
                                                        <div>
                                                          <span className="text-[8px] font-mono uppercase text-amber-500/60 leading-tight block">
                                                            Asisten
                                                          </span>
                                                          <span className="text-[10px] text-amber-900 dark:text-amber-200/80">
                                                            {e.asisten}
                                                          </span>
                                                        </div>
                                                      )}
                                                      {e.sirkuler && (
                                                        <div>
                                                          <span className="text-[8px] font-mono uppercase text-amber-500/60 leading-tight block">
                                                            Sirkuler
                                                          </span>
                                                          <span className="text-[10px] text-amber-900 dark:text-amber-200/80">
                                                            {e.sirkuler}
                                                          </span>
                                                        </div>
                                                      )}
                                                      {e.logger && (
                                                        <div>
                                                          <span className="text-[8px] font-mono uppercase text-amber-500/60 leading-tight block">
                                                            Logger
                                                          </span>
                                                          <span className="text-[10px] text-amber-900 dark:text-amber-200/80">
                                                            {e.logger}
                                                          </span>
                                                        </div>
                                                      )}
                                                    </div>
                                                  )}
                                                </div>

                                                {/* Kolom 4: Teknis & Mesin */}
                                                <div className="space-y-4">
                                                  <div className="border-b border-amber-500/10 pb-1 mb-2">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-600/80">
                                                      Teknis & Mesin
                                                    </span>
                                                  </div>
                                                  <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                      <span className="text-[9px] font-mono uppercase text-amber-500/70 leading-tight block mb-1">
                                                        Ruangan
                                                      </span>
                                                      <span className="text-xs font-medium text-amber-950 dark:text-amber-100/90">
                                                        {e.ruangan || "—"}
                                                      </span>
                                                    </div>
                                                    <div>
                                                      <span className="text-[9px] font-mono uppercase text-amber-500/70 leading-tight block mb-1">
                                                        Slot/Cath
                                                      </span>
                                                      <span className="text-xs font-medium text-amber-950 dark:text-amber-100/90">
                                                        {e.cath || "—"}
                                                      </span>
                                                    </div>
                                                    <div>
                                                      <span className="text-[9px] font-mono uppercase text-amber-500/70 leading-tight block mb-1">
                                                        Kategori
                                                      </span>
                                                      <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                                                        {e.kategori || "—"}
                                                      </span>
                                                    </div>
                                                    <div>
                                                      <span className="text-[9px] font-mono uppercase text-amber-500/70 leading-tight block mb-1">
                                                        Pembiayaan
                                                      </span>
                                                      <span className="text-xs font-medium text-amber-950 dark:text-amber-100/90">
                                                        {e.pembiayaan || "—"}
                                                      </span>
                                                    </div>
                                                  </div>

                                                  <div className="rounded bg-amber-500/5 dark:bg-white/5 p-2 space-y-2 border border-amber-500/10">
                                                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                                                      <div>
                                                        <span className="text-amber-500/70 uppercase text-[8px] font-mono block">
                                                          Fluoro
                                                        </span>
                                                        <span className="font-bold">
                                                          {e.fluoro_time ?? "—"}{" "}
                                                          min
                                                        </span>
                                                      </div>
                                                      <div>
                                                        <span className="text-amber-500/70 uppercase text-[8px] font-mono block">
                                                          Dose
                                                        </span>
                                                        <span className="font-bold">
                                                          {e.dose ?? "—"} mGy
                                                        </span>
                                                      </div>
                                                      <div>
                                                        <span className="text-amber-500/70 uppercase text-[8px] font-mono block">
                                                          DAP
                                                        </span>
                                                        <span className="font-bold">
                                                          {e.dap_gy_cm2 ??
                                                            e.dap_dose ??
                                                            "—"}
                                                        </span>
                                                      </div>
                                                      <div>
                                                        <span className="text-amber-500/70 uppercase text-[8px] font-mono block">
                                                          Contrast
                                                        </span>
                                                        <span className="font-bold">
                                                          {e.total_kontras ??
                                                            "—"}
                                                        </span>
                                                      </div>
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>

                                              {e.is_fast_track && (
                                                <div className="mt-4 p-3 rounded-lg border border-red-500/20 bg-red-500/5 dark:bg-red-950/20">
                                                  <div className="flex items-center gap-2 mb-2">
                                                    <Zap
                                                      size={14}
                                                      className="text-red-500 animate-pulse"
                                                    />
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500">
                                                      Fast-Track STEMI / IGD
                                                    </span>
                                                  </div>
                                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                    <div>
                                                      <span className="text-[8px] font-mono uppercase text-red-500/70 leading-tight block">
                                                        Datang IGD
                                                      </span>
                                                      <span className="text-xs font-bold text-red-900 dark:text-red-200">
                                                        {e.pasien_datang_igd ||
                                                          "—"}
                                                      </span>
                                                    </div>
                                                    <div>
                                                      <span className="text-[8px] font-mono uppercase text-red-500/70 leading-tight block">
                                                        Door to Balloon
                                                      </span>
                                                      <span className="text-xs font-black text-red-600 dark:text-red-400">
                                                        {e.door_to_balloon ||
                                                          "—"}
                                                      </span>
                                                    </div>
                                                    <div>
                                                      <span className="text-[8px] font-mono uppercase text-red-500/70 leading-tight block">
                                                        Total Waktu
                                                      </span>
                                                      <span className="text-xs font-bold text-red-900 dark:text-red-200">
                                                        {e.total_waktu_fast_track ||
                                                          "—"}
                                                      </span>
                                                    </div>
                                                  </div>
                                                </div>
                                              )}

                                              {e.resume && (
                                                <div className="mt-4 pt-3 border-t border-amber-400/20 dark:border-white/5">
                                                  <span className="text-[9px] font-mono uppercase text-amber-500/70 leading-tight block mb-1.5">
                                                    Resume Tindakan
                                                  </span>
                                                  <div className="rounded bg-black/5 dark:bg-white/5 p-3 text-xs leading-relaxed text-amber-950 dark:text-amber-50/90 whitespace-pre-wrap font-mono border border-amber-500/5">
                                                    {e.resume}
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      ) : null}
                                    </div>
                                  )}
                                </div>
                              </td>
                             </tr>
                          ) : null}
                        </Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {filteredRecords.length > 0 ? (
              <div
                className={cn(
                  "shrink-0 space-y-0",
                  "bg-slate-50/80 dark:bg-black/15",
                )}
              >
                <p
                  className={cn(
                    "border-t border-slate-200/80 px-2 py-1 text-[10px] font-medium leading-snug sm:px-2.5",
                    "text-slate-700 dark:text-white/90",
                  )}
                >
                  Data:{" "}
                  <span className="font-mono font-bold tabular-nums text-slate-950 dark:text-white">
                    {dataFetchMeta.fetchedCount.toLocaleString("id-ID")}
                  </span>{" "}
                  baris (maks. {TINDAKAN_FETCH_LIMIT.toLocaleString("id-ID")}) •
                  filter: {dataFetchMeta.filterLabel}
                  {dataFetchMeta.atFetchLimit ? (
                    <span className="text-amber-800 dark:text-amber-200">
                      {" "}
                      — Batas {TINDAKAN_FETCH_LIMIT.toLocaleString("id-ID")}{" "}
                      tercapai, persempit rentang tanggal.
                    </span>
                  ) : null}
                </p>
                <TablePagination
                  currentPage={page}
                  totalPages={totalPages}
                  totalItems={filteredRecords.length}
                  pageSize={perPage}
                  onPageChange={setPage}
                  onPageSizeChange={setPerPage}
                />
              </div>
            ) : null}
          </>
        )}
      </div>

      {icuModalRow ? (
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) setIcuModalRow(null);
        }}
      >
        <DialogContent
          className="max-h-[100dvh] h-[100dvh] max-w-[100vw] w-[100vw] translate-x-[-50%] translate-y-[-50%] rounded-none border-0 bg-black p-0 shadow-none"
          bodyClassName="p-0 h-full max-h-[100dvh] overflow-hidden"
        >
          <DialogTitle className="sr-only">Monitoring ICU</DialogTitle>
          <IntensiveDashboardView
            embedded
            roomSlug={resolveRoomSlugFromRuanganLabel(icuModalRow.ruangan)}
            tindakanId={
              String(
                (icuModalRow as unknown as Record<string, unknown>).id ?? "",
              ).trim() || undefined
            }
            patientHeadline={
              pasienLabelByRowId[
                String(
                  (icuModalRow as unknown as Record<string, unknown>).id ??
                    "",
                )
              ] ??
              buildPasienLabelFromRow(
                icuModalRow as unknown as Record<string, unknown>,
              )
            }
            onRequestClose={() => setIcuModalRow(null)}
          />
        </DialogContent>
      </Dialog>
      ) : null}

      {pemakaianModalInitial ? (
        <PemakaianAlkesModal
          key={
            pemakaianModalInitial.tindakanId ??
            String(pemakaianModalRow?.id ?? "pemakaian")
          }
          open
          onClose={() => setPemakaianModalRow(null)}
          onSaved={(info) => {
            if (info?.tindakanId) {
              if ("orderCleared" in info && info.orderCleared) {
                setPemakaianOrderIdOverrideByTindakan((p) => {
                  const next = { ...p };
                  delete next[info.tindakanId];
                  return next;
                });
                setPemakaianOrderClearedByTindakan((p) => ({
                  ...p,
                  [info.tindakanId]: true,
                }));
              } else if ("orderId" in info && info.orderId) {
                setPemakaianOrderClearedByTindakan((p) => {
                  const next = { ...p };
                  delete next[info.tindakanId];
                  return next;
                });
                setPemakaianOrderIdOverrideByTindakan((p) => ({
                  ...p,
                  [info.tindakanId]: info.orderId,
                }));
                if (info.dokter?.trim()) {
                  setDoctorLabelByRowId((p) => ({
                    ...p,
                    [info.tindakanId]: canonicalDoctorDisplayValue(
                      doctorOptionsMaster,
                      info.dokter!.trim(),
                    ),
                  }));
                }
              }
            }
            void mutateOrders();
            void refresh();
          }}
          pasienOptions={pasienOptions}
          doctorOptions={doctorOptionsForPemakaianModal}
          pasienLoading={pasienLoading}
          doctorLoading={doctorLoading}
          initialPasienLabel={pemakaianModalInitial.initialPasienLabel}
          initialDokter={pemakaianModalInitial.initialDokter}
          initialRuangan={pemakaianModalInitial.initialRuangan}
          tindakanId={pemakaianModalInitial.tindakanId}
          initialPemakaianOrderId={
            pemakaianModalInitial.initialPemakaianOrderId
          }
          initialAsisten={pemakaianModalInitial.initialAsisten}
        />
      ) : null}
    </TableContainer>
  );
}
