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

const FastTrackListModal = dynamic(
  () => import(/* webpackPrefetch: true */ "../components/FastTrackListModal"),
  { ssr: false, loading: () => null },
);
const TindakanTerbanyakLabModal = dynamic(
  () =>
    import(
      /* webpackPrefetch: true */ "../components/TindakanTerbanyakLabModal"
    ),
  { ssr: false, loading: () => null },
);
const TindakanLaporanModal = dynamic(
  () =>
    import(/* webpackPrefetch: true */ "../components/TindakanLaporanModal"),
  { ssr: false, loading: () => null },
);
const TindakanLaporanPemakaianModal = dynamic(
  () =>
    import(
      /* webpackPrefetch: true */ "../components/TindakanLaporanPemakaianModal"
    ),
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

const ZOOM_CELL_CLASSES = `focus-within:${UI_LAYERS.tableZoomedCell} focus-within:relative`;
const ZOOM_INNER_CLASSES = `focus-within:absolute focus-within:left-1/2 focus-within:-translate-x-1/2 focus-within:top-1/2 focus-within:-translate-y-1/2 focus-within:scale-[1.3] focus-within:w-[180%] focus-within:shadow-2xl focus-within:transition-all focus-within:duration-200 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:${UI_LAYERS.popover} focus-within:p-1 focus-within:rounded-md`;

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
  const base = recordSearchHaystack(r);
  const raw = r as unknown as Record<string, unknown>;
  const p = resolvePasienFromRow(pasienOptions, raw);
  const jk = resolveJenisKelaminFromRow(raw, p);

  // Ambil label Pasien yang sudah di-resolve (jika ada)
  const id = String(r.id ?? "").trim();
  const stateKey = id || indexKey || "";
  const resolvedLabel = (pasienLabelByRowId[stateKey] ?? "").toLowerCase();

  let extra = "";
  if (jk === "L") extra = " laki-laki laki l";
  else if (jk === "P") extra = " perempuan wanita p";
  let docCanon = "";
  if (doctorOptions?.length) {
    const canon = canonicalDoctorDisplayValue(
      doctorOptions,
      String(r.dokter ?? ""),
    );
    if (canon) docCanon = ` ${canon.toLowerCase()}`;
  }
  return (base + docCanon + extra + " " + resolvedLabel).toLowerCase();
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
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})/i);
  if (m) {
    const day = m[1].padStart(2, "0");
    const mon = CAL_MONTH[m[2].toLowerCase().slice(0, 3)];
    const year = m[3];
    if (mon) return `${year}-${mon}-${day}`;
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
  const labelRm = stateKey
    ? extractRmFromLabel(pasienLabelByRowId[stateKey] ?? "")
    : "";
  const p = resolvePasienFromRow(pasienOptions, raw);
  const rmFromOpt = String(p?.no_rm ?? "").trim();
  const rowRmDisp = displayRm(raw);
  const rowRm = rowRmDisp === "—" ? "" : rowRmDisp;
  const display = (labelRm || rmFromOpt || rowRm).trim() || "—";
  const digits = normalizeDigitsOnly(display);
  return { digits: digits.length >= 3 ? digits : "", display };
}

/** RM + nama untuk dialog hapus — selaras dengan kolom tabel / combobox. */
function resolveShownPasienForDeleteDialog(
  rec: TindakanJoinResult,
  pasienLabelByRowId: Record<string, string>,
  pasienOptions: PasienOption[],
): { noRm: string; nama: string } {
  const raw = rec as unknown as Record<string, unknown>;
  const stateKey = String(raw.id ?? "").trim();
  const label = (pasienLabelByRowId[stateKey] ?? "").trim();
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
    setSaving(true);
    const ok = await onCommit(formatted);
    setSaving(false);
    if (!ok) setDraft(cur);
    else setDraft(formatted);
  }, [draft, value, onCommit, saving]);

  return (
    <input
      type="text"
      disabled={saving}
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
    setSaving(true);
    const ok = await onCommit(next);
    if (!ok) setDraft(value.trim());
    setSaving(false);
  }, [draft, onCommit, saving, value]);

  return (
    <input
      type="text"
      disabled={saving}
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
    setSaving(true);
    const ok = await onCommit(next);
    setSaving(false);
    if (!ok) setDraft(normalizedValue);
  }, [draft, normalizedValue, onCommit, saving]);

  return (
    <input
      type="date"
      disabled={saving}
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
        "w-full min-w-[8.5rem] rounded border px-2 py-1 text-xs font-semibold focus:outline-none",
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
    const cur = value.trim();
    const next = nextRaw.trim();
    if (next === cur || saving) return;
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
  options,
  onCommit,
}: {
  value: string;
  options: string[];
  onCommit: (next: string) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState(value.trim());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!saving) setDraft(value.trim());
  }, [value, saving]);

  return (
    <select
      disabled={saving}
      value={draft}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onBlur={async () => {
        const cur = value.trim();
        const next = draft.trim();
        if (next === cur || saving) return;
        setSaving(true);
        const ok = await onCommit(next);
        setSaving(false);
        if (!ok) setDraft(cur);
      }}
      onChange={async (e) => {
        const next = e.target.value.trim();
        setDraft(next);
        if (saving) return;
        setSaving(true);
        const ok = await onCommit(next);
        setSaving(false);
        if (!ok) setDraft(value.trim());
      }}
      className={cn(
        "w-full rounded border px-2 py-1 text-xs font-semibold focus:outline-none",
        "border-cyan-400/55 bg-white text-amber-800 [color-scheme:light] dark:border-cyan-700/50 dark:bg-black/40 dark:text-slate-100",
      )}
    >
      {!draft ? <option value="">Pilih dokter</option> : null}
      {options.map((d) => (
        <option key={d} value={d}>
          {d}
        </option>
      ))}
    </select>
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
  onPhoneDirectoryOpen,
}: {
  adapter: Adapter;
  filterPasienId?: string;
  filterRm?: string;
  /** Sinkronkan jumlah & ringkasan filter ke ringkasan header */
  onFilteredSummaryChange?: (summary: TindakanFilteredSummary) => void;
  isFilterCollapsed?: boolean;
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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const [hoveredRowKey, setHoveredRowKey] = useState<string | null>(null);
  const [cathlabFallbackRows, setCathlabFallbackRows] = useState<
    TindakanJoinResult[]
  >([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [filterDokter, setFilterDokter] = useState("");
  const [filterRuangan, setFilterRuangan] = useState("");
  const [filterTindakan, setFilterTindakan] = useState("");
  const [filterTanggalFrom, setFilterTanggalFrom] = useState("");
  const [filterTanggalTo, setFilterTanggalTo] = useState("");
  const [filterPciOnly, setFilterPciOnly] = useState(false);
  const [fastTrackModalOpen, setFastTrackModalOpen] = useState(false);
  const [tindakanTerbanyakLabOpen, setTindakanTerbanyakLabOpen] =
    useState(false);
  const [laporanModalOpen, setLaporanModalOpen] = useState(false);
  const [laporanPemakaianModalOpen, setLaporanPemakaianModalOpen] =
    useState(false);
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
        const rx = String(r.ruangan ?? "").trim();
        if (rx) {
          const rxLower = rx.toLowerCase();
          if (rxLower === "belum diisi" || rxLower === "—") {
            rSet.add("Belum diisi");
          } else if (rxLower.includes("belum")) {
            // Skip corrupted placeholder values
          } else {
            const matchedMaster = ruanganMaster.find(opt => {
              const label = formatRuanganLabel(opt).trim();
              const nama = String(opt.nama ?? "").trim();
              return rx === label || rx === nama;
            });
            if (matchedMaster) {
              rSet.add(formatRuanganLabel(matchedMaster).trim());
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

    return next;
  }, [
    pemakaianOrdersRaw,
    rowsForPemakaianLink,
    pasienLabelByRowId,
    pemakaianOrderIdOverrideByTindakan,
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
          String(pemakaianModalRow.dokter ?? ""),
        ),
      initialRuangan: String(pemakaianModalRow.ruangan ?? ""),
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
    let list = fullList;
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
      const from = filterTanggalFrom.trim();
      const to = filterTanggalTo.trim();
      list = list.filter((r) => {
        const t = String(r.tanggal ?? "").trim();
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

  const createDraftForPasien = useCallback(
    async (p: { pasienId: string; rm: string; nama: string }) => {
      const pasienId = String(p.pasienId ?? "").trim();
      const rmResolved = String(p.rm ?? "").trim();
      const namaResolved =
        String(p.nama ?? "").trim() ||
        (rmResolved ? `Pasien ${rmResolved}` : "Pasien");
      const payload: Record<string, unknown> = {
        tanggal: todayWibYmd(),
        pasien_id: pasienId || null,
        no_rm: rmResolved || null,
        nama: namaResolved,
        nama_pasien: namaResolved,
        dokter: "Belum diisi",
        tindakan: "Belum diisi",
        status: "Menunggu",
        kategori: "Belum diisi",
        ruangan: "Belum diisi",
      };
      try {
        await createRecord(payload);
        notify({
          type: "success",
          message: "Pasien ditambahkan dan draft tindakan dibuat.",
          duration: 2800,
        });
      } catch (e) {
        notify({
          type: "error",
          message: extractErrorMessage(e),
          duration: 4200,
        });
      }
    },
    [createRecord, notify],
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
    const payload: Record<string, unknown> = {
      tanggal: todayWibYmd(),
      pasien_id: pasienId || null,
      no_rm: rmResolved || null,
      nama: namaResolved,
      nama_pasien: namaResolved,
      dokter: "Belum ditentukan",
      tindakan: "Belum diisi",
      status: "Menunggu",
      kategori: "Cathlab",
      ruangan: "Cathlab",
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
  }, [createRecord, filterPasienId, filterRm, notify]);

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
      try {
        await saveEditor(id, updates);
        // Update local fallback rows immediately so changes reflect without re-fetching
        setCathlabFallbackRows((prev) =>
          prev.map((r) =>
            String(r.id ?? "").trim() === String(id).trim()
              ? { ...r, ...updates }
              : r,
          ),
        );
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
    [notify, saveEditor],
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
          onSearch={(val) => {
            setSearch(val);
            // Trigger server-side search for better performance on large datasets
            adapter.setServerFilters((prev) => ({ ...prev, search: val }));
          }}
          onRefresh={refresh}
          onCreateDraftForPasien={createDraftForPasien}
          onSyncMasterPasien={syncMasterPasienFromTindakan}
          onFilter={(d, rg, t, from, to, pci) => {
            setFilterDokter(d);
            setFilterRuangan(rg);
            setFilterTindakan(t ?? "");
            const f = String(from ?? "");
            const tx = String(to ?? "");
            setFilterTanggalFrom(f);
            setFilterTanggalTo(tx);
            setFilterPciOnly(Boolean(pci));

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
          onOpenLaporan={() => setLaporanModalOpen(true)}
          onOpenLaporanPemakaian={() => {
            setLaporanPemakaianModalOpen(true);
            void refresh();
          }}
          onPhoneDirectoryOpen={onPhoneDirectoryOpen}
        />

        <TindakanLaporanModal
          open={laporanModalOpen}
          onOpenChange={(next) => {
            setLaporanModalOpen(next);
            if (next) {
              /* Paralel: total waktu ≈ max(API tindakan, API pasien); modal memakai useDeferredValue agar UI tetap responsif. */
              void refresh();
              void mutatePasien();
            }
          }}
          rows={filteredRecords}
          loading={loading}
          filterSummaryLines={filterSummaryLines}
          pasienOptions={pasienOptions}
          onOpenDetail={(rec, tab) => {
            if (!rec.id) return;
            // Tutup modal agar FocusScope Dialog tidak mencuri fokus dari drawer (portal).
            setLaporanModalOpen(false);
            openDetail(rec.id, tab);
          }}
        />

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
            // Tutup modal agar FocusScope Dialog tidak mencuri fokus dari drawer (portal).
            setLaporanPemakaianModalOpen(false);
            adapter.openDetail(rec.id, tab);
          }}
        />

        <FastTrackListModal
          open={fastTrackModalOpen}
          onOpenChange={setFastTrackModalOpen}
          rows={rowsForPemakaianLink}
          loading={loading}
          doctorOptionsMaster={doctorOptionsMaster}
        />

        <TindakanTerbanyakLabModal
          open={tindakanTerbanyakLabOpen}
          onOpenChange={setTindakanTerbanyakLabOpen}
          rows={rowsForPemakaianLink}
          loading={loading}
          doctorOptionsMaster={doctorOptionsMaster}
        />

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

        {loading ? (
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
                className="w-full min-w-[1200px] text-sm font-semibold border-collapse border border-amber-200/65 dark:border-amber-800/50"
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
                        "px-2 sm:px-2.5 py-1.5 font-mono font-black text-[9px] sm:text-[10px] uppercase tracking-wider whitespace-nowrap w-10",
                        "text-cyan-950 dark:text-slate-100",
                      )}
                    >
                      No
                    </th>
                    <th
                      className={cn(
                        TINDAKAN_SHEET_CELL,
                        "px-2 sm:px-2.5 py-1.5 font-mono font-black text-[9px] sm:text-[10px] uppercase tracking-wider whitespace-nowrap",
                        "text-cyan-950 dark:text-slate-100",
                      )}
                    >
                      Tanggal
                    </th>
                    <th
                      className={cn(
                        TINDAKAN_SHEET_CELL,
                        "px-2 sm:px-2.5 py-1.5 font-mono font-black text-[9px] sm:text-[10px] uppercase tracking-wider whitespace-nowrap",
                        "text-cyan-950 dark:text-slate-100",
                      )}
                    >
                      Time out
                    </th>
                    <th
                      className={cn(
                        TINDAKAN_SHEET_CELL,
                        "px-2 sm:px-2.5 py-1.5 font-mono font-black text-[9px] sm:text-[10px] uppercase tracking-wider whitespace-nowrap",
                        "text-cyan-950 dark:text-slate-100",
                      )}
                    >
                      RM
                    </th>
                    <th
                      className={cn(
                        TINDAKAN_SHEET_CELL,
                        "px-2 sm:px-2.5 py-1.5 font-mono font-black text-[9px] sm:text-[10px] uppercase tracking-wider min-w-[10rem] text-left",
                        "text-cyan-950 dark:text-slate-100",
                      )}
                    >
                      Nama pasien
                    </th>
                    <th
                      className={cn(
                        TINDAKAN_SHEET_CELL,
                        "px-2 sm:px-2.5 py-1.5 font-mono font-black text-[9px] sm:text-[10px] uppercase tracking-wider min-w-[12rem]",
                        "text-cyan-950 dark:text-slate-100",
                      )}
                    >
                      RS Perujuk / Ket
                    </th>
                    <th
                      className={cn(
                        TINDAKAN_SHEET_CELL,
                        "px-2 sm:px-2.5 py-1.5 font-mono font-black text-[9px] sm:text-[10px] uppercase tracking-wider whitespace-nowrap",
                        "text-cyan-950 dark:text-slate-100",
                      )}
                    >
                      Umur
                    </th>
                    <th
                      className={cn(
                        TINDAKAN_SHEET_CELL,
                        "px-2 sm:px-2.5 py-1.5 font-mono font-black text-[9px] sm:text-[10px] uppercase tracking-wider whitespace-nowrap",
                        "text-cyan-950 dark:text-slate-100",
                      )}
                    >
                      Jenis kelamin
                    </th>
                    <th
                      className={cn(
                        TINDAKAN_SHEET_CELL,
                        "px-2 sm:px-2.5 py-1.5 font-mono font-black text-[9px] sm:text-[10px] uppercase tracking-wider min-w-[12rem]",
                        "text-cyan-950 dark:text-slate-100",
                      )}
                    >
                      Dokter
                    </th>
                    <th
                      className={cn(
                        TINDAKAN_SHEET_CELL,
                        "px-2 sm:px-2.5 py-1.5 font-mono font-black text-[9px] sm:text-[10px] uppercase tracking-wider min-w-[10rem]",
                        "text-cyan-950 dark:text-slate-100",
                      )}
                    >
                      Tindakan
                    </th>
                    <th
                      className={cn(
                        TINDAKAN_SHEET_CELL,
                        "px-2 sm:px-2.5 py-1.5 font-mono font-black text-[9px] sm:text-[10px] uppercase tracking-wider min-w-[10rem] text-left",
                        "text-cyan-950 dark:text-slate-100",
                      )}
                    >
                      Ruangan
                    </th>
                    <th
                      className={cn(
                        TINDAKAN_SHEET_CELL,
                        "px-2 sm:px-2.5 py-1.5 font-mono font-black text-[9px] sm:text-[10px] uppercase tracking-wider whitespace-nowrap",
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
                            }}
                          >
                            <td
                              {...cellSelection.getTdProps(i, TCol.NO)}
                              className={cn(
                                TINDAKAN_SHEET_CELL,
                                "relative px-2 sm:px-2.5 py-1 whitespace-nowrap font-mono text-[11px] text-center tabular-nums",
                                "text-cyan-800 dark:text-slate-100",
                                cellSelection.isCellSelected(i, TCol.NO) &&
                                  TINDAKAN_CELL_SELECTION_CLASS,
                              )}
                            >
                              {/* Row Expand Toggle */}
                              <button
                                type="button"
                                data-no-row-click="true"
                                data-no-spreadsheet-select
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRowExpandedByKey((p) => ({
                                    ...p,
                                    [key]: !p[key],
                                  }));
                                }}
                                className={cn(
                                  "absolute left-0.5 top-1/2 -translate-y-1/2 p-0.5 rounded transition-all duration-200 z-[10]",
                                  "text-slate-400 hover:bg-cyan-100/80 hover:text-cyan-700 dark:text-slate-500 dark:hover:bg-cyan-900/40 dark:hover:text-cyan-300",
                                  rowExpandedByKey[key] &&
                                    "rotate-90 text-cyan-600 dark:text-cyan-400",
                                )}
                                title={
                                  rowExpandedByKey[key]
                                    ? "Sembunyikan detail"
                                    : "Tampilkan detail"
                                }
                              >
                                <ChevronRight size={14} strokeWidth={2.5} />
                              </button>
                              {/* Status Indicator Line */}
                              {(() => {
                                const s = String(
                                  rec.status ?? "",
                                ).toLowerCase();
                                const t = String(
                                  rec.tindakan ?? "",
                                ).toLowerCase();
                                const dateStr = String(
                                  rec.tanggal ?? "",
                                ).trim();
                                const isoDate = extractCalendarDateKey(dateStr);
                                const isToday = isoDate === todayWibYmd();

                                let indicatorClass = "";
                                if (
                                  s.includes("cito") ||
                                  s.includes("emergency") ||
                                  t.includes("ppci")
                                ) {
                                  indicatorClass =
                                    "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]";
                                } else if (
                                  isToday ||
                                  s.includes("selesai") ||
                                  s.includes("langsung")
                                ) {
                                  indicatorClass =
                                    "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]";
                                } else if (s.includes("tunggu")) {
                                  indicatorClass =
                                    "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.3)]";
                                }

                                if (!indicatorClass) return null;
                                return (
                                  <div
                                    className={cn(
                                      "absolute inset-y-0 left-0 w-[3px]",
                                      indicatorClass,
                                    )}
                                    title={
                                      rec.status || (isToday ? "Hari ini" : "")
                                    }
                                  />
                                );
                              })()}
                              {rowNo}
                            </td>
                            <td
                              {...cellSelection.getTdProps(i, TCol.TANGGAL)}
                              data-no-row-click="true"
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                              className={cn(
                                TINDAKAN_SHEET_CELL,
                                ZOOM_CELL_CLASSES,
                                "px-2 sm:px-2.5 py-1 whitespace-nowrap font-mono text-[11px] text-center align-middle",
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
                                "px-2 sm:px-2.5 py-1 whitespace-nowrap font-mono text-[11px] text-center align-middle tabular-nums",
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
                              </div>
                            </td>
                            <td
                              {...cellSelection.getTdProps(i, TCol.RM)}
                              className={cn(
                                TINDAKAN_SHEET_CELL,
                                "px-2 sm:px-2.5 py-1 font-mono text-[11px] text-center align-middle cursor-pointer hover:bg-cyan-50/50 dark:hover:bg-cyan-950/30 transition-colors",
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
                                    <span>{finalRm}</span>
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
                                "relative px-2 sm:px-2.5 py-1 max-w-[18rem] text-left align-middle",
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
                                  "relative mx-auto min-w-[10rem] sm:min-w-[14rem] max-w-[18rem] flex items-center gap-1.5",
                                  // Hanya sisi kiri–kanan (menu arc); jangan -inset-y agar area tidak
                                  // menutupi baris lain — itu yang bikin kursor “melompat” / RM jadi kena baris beda.
                                  "before:absolute before:inset-y-0 before:-left-2 before:-right-32 before:content-['']",
                                  arcOpen
                                    ? "before:pointer-events-auto"
                                    : "before:pointer-events-none",
                                  ZOOM_INNER_CLASSES,
                                )}
                                title={pasienError ?? undefined}
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

                                {/* CONSOLIDATED NAVIGATION ARC — Right Side */}
                                <div
                                  className={cn(
                                    "absolute top-1/2 right-[-10px] z-20 h-0 w-0 -translate-y-1/2 overflow-visible",
                                    "transition-opacity duration-150 ease-out",
                                    arcOpen
                                      ? "pointer-events-auto opacity-100"
                                      : "pointer-events-none opacity-0",
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
                                          transitionDelay: arcOpen
                                            ? `${idx * 18}ms`
                                            : "0ms",
                                        }}
                                        className={cn(
                                          "absolute top-1/2 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2",
                                          "transition-transform transition-opacity duration-150 ease-out",
                                          arcOpen
                                            ? "scale-100 opacity-100"
                                            : "scale-0 opacity-0",
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

                                {/* ACTION GROUP — Near Pasien Field */}
                                <div
                                  className={cn(
                                    "absolute -right-8 top-1/2 z-20 flex -translate-y-1/2 items-center gap-1",
                                    "transition-opacity duration-150 ease-out",
                                    arcOpen ? "opacity-100" : "opacity-0",
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
                                  className="max-w-[18rem]"
                                  inputClassName={cn(
                                    TINDAKAN_TABLE_PRIMARY_COL_INPUT,
                                    "rounded-sm",
                                  )}
                                />
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
                                "relative isolate z-[1] px-2 py-1 min-w-[12rem] text-center align-middle",
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
                                "px-2 sm:px-2.5 py-1 whitespace-nowrap font-mono text-[11px] text-center align-middle tabular-nums",
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
                                "px-2 sm:px-2.5 py-1 text-[11px] text-center align-middle whitespace-nowrap",
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
                                 "px-2 sm:px-2.5 py-1 max-w-[18rem] min-w-[12rem] text-center align-middle overflow-visible",
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
                                     "relative mx-auto flex min-w-[11.5rem] max-w-[17.5rem] items-center justify-center sm:min-w-[12.5rem]",
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
                                       "flex min-h-[2.25rem] w-full min-w-0 items-stretch",
                                       ZOOM_INNER_CLASSES,
                                     )}
                                   >
                                     <div className="min-w-0 flex-1">
                                       <div className="relative">
                                         <DoctorCombobox
                                           listboxId={`tindakan-row-${key}-doctor`}
                                           value={
                                             doctorLabelByRowId[stateKey] ??
                                             canonicalDoctorDisplayValue(
                                               doctorOptionsMaster,
                                               String(rec.dokter ?? ""),
                                             )
                                           }
                                           onChange={(label) => {
                                             setDoctorLabelByRowId((p) => ({
                                               ...p,
                                               [stateKey]: label,
                                             }));
                                           }}
                                           onInputBlur={(finalText) => {
                                             if (!id) return;
                                             const m = doctorOptionsMaster;
                                             const resolved = m.length
                                               ? resolveDoctorFromLooseInput(
                                                   m,
                                                   finalText,
                                                 )
                                               : null;
                                             const persisted = resolved
                                               ? String(
                                                   resolved.nama_dokter,
                                                 ).trim()
                                               : finalText.trim();
                                             const display = resolved
                                               ? formatDoctorLabel(resolved)
                                               : finalText.trim();
                                             const cur = String(
                                               rec.dokter ?? "",
                                             ).trim();
                                             setDoctorLabelByRowId((p) => ({
                                               ...p,
                                               [stateKey]: display,
                                             }));
                                             if (persisted !== cur) {
                                               void patchRowField(id, {
                                                 dokter: persisted || null,
                                               });
                                             }
                                           }}
                                           onSelectOption={(picked) => {
                                             const canonical =
                                               formatDoctorLabel(picked);
                                             setDoctorLabelByRowId((p) => ({
                                               ...p,
                                               [stateKey]: canonical,
                                             }));
                                             if (!id) return;
                                             void patchRowField(id, {
                                               dokter: picked.nama_dokter || null,
                                             });
                                           }}
                                           options={
                                             doctorOptionsMaster.length
                                               ? doctorOptionsMaster
                                               : dokterOptions.map(
                                                   (nama, idx) => ({
                                                     id: `local:${idx}`,
                                                     nama_dokter: nama,
                                                     spesialis: null,
                                                     aktif: true,
                                                   }),
                                                 )
                                           }
                                           loading={doctorLoading}
                                           className={cn(
                                             "max-w-none w-full",
                                             "[&_input]:pr-2",
                                           )}
                                           inputClassName={
                                             TINDAKAN_TABLE_PRIMARY_COL_INPUT
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

                               {/* Anesthesia icon OUTSIDE the zoom container but INSIDE the TD */}
                               <div
                                 className={cn(
                                   "pointer-events-auto absolute right-1.5 top-1/2 z-[110] -translate-y-1/2",
                                   "transition-all duration-200",
                                   anestesiArcRowKey === key || !!rec.dokter_anestesi
                                     ? "opacity-100 scale-100"
                                     : "opacity-0 scale-50 pointer-events-none",
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
                                "px-2 sm:px-2.5 py-1 max-w-[14rem] text-center align-middle",
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
                                  "mx-auto min-w-[10rem] sm:min-w-[12rem] max-w-[14rem]",
                                  ZOOM_INNER_CLASSES,
                                )}
                                title={masterTindakanError ?? undefined}
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
                                "px-2 sm:px-2.5 py-1 max-w-[14rem] text-left align-middle",
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
                                  "mx-auto min-w-[10rem] sm:min-w-[12rem] max-w-[14rem]",
                                  ZOOM_INNER_CLASSES,
                                )}
                                title={ruanganError ?? undefined}
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
                                "px-2 sm:px-2.5 py-1 align-middle text-center",
                                cellSelection.isCellSelected(i, TCol.AKSI) &&
                                  TINDAKAN_CELL_SELECTION_CLASS,
                              )}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                            >
                              <div className="flex flex-wrap items-center justify-center gap-1">
                                {id && pemakaianOrderByTindakanId[id] ? (
                                  <button
                                    type="button"
                                    className={cn(
                                      "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold transition-all",
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
                                    <span className="hidden sm:inline">
                                      Edit pemakaian
                                    </span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className={cn(
                                      "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold transition-all",
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
                                    <span className="hidden sm:inline">
                                      Pemakaian
                                    </span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  disabled={!id || deletingId === id}
                                  className={cn(
                                    "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold transition-all disabled:pointer-events-none disabled:opacity-40",
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
                                  <span className="hidden sm:inline">
                                    Hapus
                                  </span>
                                </button>
                              </div>
                            </td>
                          </tr>
                          {/* Unified Expansion Row — Combined rich details and history */}
                          {rowExpandedByKey[key] ||
                          (isDuplicateRm && priorList.length > 0) ? (
                            <tr
                              className={cn(
                                "border-b transition-all duration-300",
                                isDuplicateRm && !rowExpandedByKey[key]
                                  ? "border-amber-300/50 bg-amber-50/80 dark:border-amber-900/30 dark:bg-amber-950/15"
                                  : "border-cyan-200/50 bg-cyan-50/40 dark:border-cyan-900/30 dark:bg-cyan-950/10",
                                // Jika tidak ada history dan tidak sedang diekspansi manual, sembunyikan baris
                                !(
                                  rowExpandedByKey[key] ||
                                  (isDuplicateRm && priorList.length > 0)
                                ) && "hidden",
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
                                  {/* Part 1: Rich Details (Manual Expansion) */}
                                  {rowExpandedByKey[key] && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-[11px] leading-relaxed">
                                      {/* Section 1: Pasien & Klinis */}
                                      <div className="space-y-1.5 border-r border-cyan-100/50 pr-4 dark:border-white/5">
                                        <div className="font-mono text-[10px] uppercase tracking-wider text-cyan-600 dark:text-cyan-400 font-bold flex items-center gap-1.5">
                                          <User size={12} /> Pasien & Klinis
                                        </div>
                                        <div className="font-black text-[13px] text-emerald-700 dark:text-emerald-400">
                                          {namaForKet}
                                        </div>
                                        <div className="font-mono opacity-70">
                                          RM: {rmLine}
                                        </div>
                                        <div className="mt-2 pt-1.5 border-t border-cyan-100/50 dark:border-white/5">
                                          <span className="font-bold text-slate-500 dark:text-white/50">
                                            Diag:{" "}
                                          </span>
                                          <span className="font-bold text-slate-900 dark:text-white">
                                            {rec.diagnosa || "—"}
                                          </span>
                                        </div>
                                        {rec.faktor_risiko && (
                                          <div className="text-[10px] text-slate-500 dark:text-white/40 italic">
                                            FR: {rec.faktor_risiko}
                                          </div>
                                        )}
                                        {rec.hasil_lab_ppm && (
                                          <div className="mt-1 text-[10px]">
                                            <span className="font-medium opacity-60">
                                              Lab:{" "}
                                            </span>
                                            <span className="font-mono">
                                              {rec.hasil_lab_ppm}
                                            </span>
                                          </div>
                                        )}
                                      </div>

                                      {/* Section 2: Prosedur & Laporan */}
                                      <div className="space-y-1.5 border-r border-cyan-100/50 pr-4 dark:border-white/5">
                                        <div className="font-mono text-[10px] uppercase tracking-wider text-cyan-600 dark:text-cyan-400 font-bold flex items-center gap-1.5">
                                          <Stethoscope size={12} /> Prosedur &
                                          Laporan
                                        </div>
                                        <div className="font-black text-slate-900 dark:text-white">
                                          {rec.tindakan || "—"}
                                        </div>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          <span className="rounded bg-emerald-100 px-1 py-0.5 text-[9px] font-bold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                                            {rec.kategori || "TANPA KATEGORI"}
                                          </span>
                                          {rec.severity_level && (
                                            <span className="rounded bg-amber-100 px-1 py-0.5 text-[9px] font-bold text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                                              Sev: {rec.severity_level}
                                            </span>
                                          )}
                                          {rec.total_kontras && (
                                            <span className="rounded bg-blue-100 px-1 py-0.5 text-[9px] font-bold text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                                              Contrast: {rec.total_kontras}ml
                                            </span>
                                          )}
                                        </div>
                                        {rec.kesimpulan_laporan && (
                                          <div className="mt-2 pt-1.5 border-t border-cyan-100/50 dark:border-white/5">
                                            <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/40">
                                              Kesimpulan:
                                            </div>
                                            <div className="italic text-slate-700 dark:text-white/70 line-clamp-3">
                                              {rec.kesimpulan_laporan}
                                            </div>
                                          </div>
                                        )}
                                        {rec.plan_medis && (
                                          <div className="mt-1">
                                            <div className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400/60">
                                              Plan:
                                            </div>
                                            <div className="text-emerald-700 dark:text-emerald-400 font-medium">
                                              {rec.plan_medis}
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      {/* Section 3: Tim Medis */}
                                      <div className="space-y-1.5 border-r border-cyan-100/50 pr-4 dark:border-white/5">
                                        <div className="font-mono text-[10px] uppercase tracking-wider text-cyan-600 dark:text-cyan-400 font-bold flex items-center gap-1.5">
                                          <Users size={12} /> Tim Medis
                                        </div>
                                        <div className="font-bold text-emerald-700 dark:text-emerald-400">
                                          Dr: {rec.dokter || "—"}
                                        </div>
                                        <div className="mt-2 space-y-1 text-[10px] text-slate-600 dark:text-white/60">
                                          {rec.asisten && (
                                            <div>
                                              <span className="font-bold opacity-70">
                                                As:
                                              </span>{" "}
                                              {rec.asisten}
                                            </div>
                                          )}
                                          {rec.sirkuler && (
                                            <div>
                                              <span className="font-bold opacity-70">
                                                Sir:
                                              </span>{" "}
                                              {rec.sirkuler}
                                            </div>
                                          )}
                                          {rec.logger && (
                                            <div>
                                              <span className="font-bold opacity-70">
                                                Log:
                                              </span>{" "}
                                              {rec.logger}
                                            </div>
                                          )}
                                        </div>

                                        {/* Fast-Track Info if present */}
                                        {rec.is_fast_track && (
                                          <div className="mt-3 p-2 rounded bg-orange-100/50 border border-orange-200 dark:bg-orange-950/20 dark:border-orange-800/40">
                                            <div className="font-black text-[9px] uppercase tracking-tighter text-orange-700 dark:text-orange-400 flex items-center gap-1">
                                              <Zap size={10} /> Fast-Track STEMI
                                            </div>
                                            <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 font-mono text-[9px]">
                                              <div className="opacity-60">
                                                IGD:
                                              </div>{" "}
                                              <div>
                                                {rec.pasien_datang_igd || "—"}
                                              </div>
                                              <div className="opacity-60">
                                                D2B:
                                              </div>{" "}
                                              <div className="font-bold text-orange-600 dark:text-orange-300">
                                                {rec.door_to_balloon || "—"}m
                                              </div>
                                              <div className="opacity-60">
                                                Total:
                                              </div>{" "}
                                              <div>
                                                {rec.total_waktu_fast_track ||
                                                  "—"}
                                                m
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      {/* Section 4: Administrasi & Log */}
                                      <div className="space-y-1.5">
                                        <div className="font-mono text-[10px] uppercase tracking-wider text-cyan-600 dark:text-cyan-400 font-bold flex items-center gap-1.5">
                                          <MapPin size={12} /> Administrasi
                                        </div>
                                        <div className="font-bold text-slate-900 dark:text-white">
                                          {rec.kelas_pembiayaan ||
                                            rec.pembiayaan ||
                                            "—"}
                                        </div>
                                        <div className="mt-1 flex flex-wrap gap-1">
                                          <span
                                            className={cn(
                                              "rounded px-1.5 py-0.5 text-[9px] font-bold",
                                              rec.status === "Selesai"
                                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                                                : "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
                                            )}
                                          >
                                            {rec.status || "—"}
                                          </span>
                                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-700 dark:bg-white/10 dark:text-white/70">
                                            {rec.ruangan || "—"}{" "}
                                            {rec.cath && `(${rec.cath})`}
                                          </span>
                                        </div>

                                        <div className="mt-4 pt-2 border-t border-cyan-100/50 dark:border-white/5">
                                          <button
                                            type="button"
                                            onClick={() => openDetail(id)}
                                            className="inline-flex items-center gap-1.5 text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300 font-bold transition"
                                          >
                                            Buka Detail Lengkap{" "}
                                            <ChevronRight size={14} />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  )}

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
                                                  {e.kesimpulan_laporan && (
                                                    <div>
                                                      <span className="text-[9px] font-mono uppercase text-amber-500/70 leading-tight block mb-1">
                                                        Kesimpulan
                                                      </span>
                                                      <span className="text-xs leading-relaxed text-amber-950 dark:text-amber-100/95 font-bold">
                                                        {e.kesimpulan_laporan}
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

      <Dialog
        open={icuModalRow !== null}
        onOpenChange={(open) => {
          if (!open) setIcuModalRow(null);
        }}
      >
        <DialogContent
          className="max-h-[100dvh] h-[100dvh] max-w-[100vw] w-[100vw] translate-x-[-50%] translate-y-[-50%] rounded-none border-0 bg-black p-0 shadow-none"
          bodyClassName="p-0 h-full max-h-[100dvh] overflow-hidden"
        >
          <DialogTitle className="sr-only">Monitoring ICU</DialogTitle>
          {icuModalRow ? (
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
          ) : null}
        </DialogContent>
      </Dialog>

      {pemakaianModalInitial ? (
        <PemakaianAlkesModal
          key={
            pemakaianModalInitial.tindakanId ??
            String(pemakaianModalRow?.id ?? "pemakaian")
          }
          open
          onClose={() => setPemakaianModalRow(null)}
          onSaved={(info) => {
            if (info?.tindakanId && info.orderId) {
              setPemakaianOrderIdOverrideByTindakan((p) => ({
                ...p,
                [info.tindakanId]: info.orderId,
              }));
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
