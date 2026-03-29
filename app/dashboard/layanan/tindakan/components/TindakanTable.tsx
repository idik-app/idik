"use client";

import {
  Fragment,
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Plus,
  SquarePen,
  Trash2,
} from "lucide-react";

import { useNotification } from "@/app/contexts/NotificationContext";
import { useAppDialog } from "@/contexts/AppDialogContext";
import { cn } from "@/lib/utils";
import { useTindakanLightMode } from "../hooks/useTindakanLightMode";
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
import PemakaianAlkesModal from "./PemakaianAlkesModal";
import type { TindakanJoinResult } from "../bridge/mapping.types";
import {
  displayNamaPasien,
  displayRm,
  formatJenisKelaminDisplay,
  normalizeJenisKelamin,
  parsePasienAktifFilter,
  pickFirstString,
  resolveJenisKelaminFromRow,
  RM_FIELD_KEYS,
  rowMatchesPasienAktifFilter,
  splitNamaDanRmDalamKurung,
} from "../lib/displayTindakanRow";
import { normalizeNamaPasien } from "@/app/dashboard/pasien/utils/normalizeNamaPasien";

type Adapter = ReturnType<typeof useTindakanBridgeAdapter>;

function useDebouncedValue(value: string, ms: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

/** Cocokkan RM meski format beda (angka saja vs teks). */
function normalizeDigitsOnly(v: unknown): string {
  return String(v ?? "").replace(/\D/g, "");
}

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
  doctorOptions?: DoctorOption[],
): string {
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
      String(r.dokter ?? ""),
    );
    if (canon) docCanon = ` ${canon.toLowerCase()}`;
  }
  return (base + docCanon + extra).toLowerCase();
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

function mapApiPasienRow(r: Record<string, unknown>): PasienOption | null {
  const rawId = r.id;
  if (rawId == null || rawId === "") return null;
  const id = String(rawId);
  const nama = typeof r.nama === "string" ? r.nama : String(r.nama ?? "");
  const rmStr = pickFirstString(r, [...RM_FIELD_KEYS]);
  const no_rm = rmStr === "" ? null : rmStr;
  const ca = r.created_at;
  const created_at =
    typeof ca === "string"
      ? ca
      : ca instanceof Date
        ? ca.toISOString()
        : ca != null
          ? String(ca)
          : null;
  /** Selaras `mapFromSupabase` (pasien): null di DB → fallback "L", supaya daftar tindakan = drawer detail. */
  const jk = normalizeJenisKelamin(r.jenis_kelamin ?? r.jk ?? "L");
  return {
    id,
    nama,
    no_rm,
    created_at,
    ...(jk ? { jenis_kelamin: jk } : {}),
  };
}

function buildPasienLabelFromRow(raw: Record<string, unknown>): string {
  const namaFull = pickFirstString(raw, [
    "nama_pasien",
    "nama",
    "pasien_nama",
  ]);
  const rmCol = pickFirstString(raw, [...RM_FIELD_KEYS]);
  const { baseNama, rmDalamKurung } = splitNamaDanRmDalamKurung(namaFull);
  const nama = (baseNama || namaFull).trim();
  const rm = rmCol || rmDalamKurung;
  if (nama || rm) return formatPasienLabel({ nama, no_rm: rm || null });
  return "";
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

function resolveShownRmForRow(
  rec: TindakanJoinResult,
  pasienLabelByRowId: Record<string, string>,
  pasienOptions: PasienOption[],
): { digits: string; display: string } {
  const raw = rec as unknown as Record<string, unknown>;
  const id = String(raw.id ?? "").trim();
  const stateKey = id || "";
  const labelRm = extractRmFromLabel(pasienLabelByRowId[stateKey] ?? "");
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

function poolRowRmDigitKey(rec: TindakanJoinResult): string {
  const raw = rec as unknown as Record<string, unknown>;
  const d = normalizeDigitsOnly(displayRm(raw));
  return d.length >= 3 ? d : "";
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
};

function buildPriorTindakanListForRow(
  rec: TindakanJoinResult,
  byRm: Map<string, TindakanJoinResult[]>,
  pasienLabelByRowId: Record<string, string>,
  pasienOptions: PasienOption[],
  doctorMaster: DoctorOption[],
): PriorTindakanEntry[] {
  const id = String(rec.id ?? "").trim();
  const { digits } = resolveShownRmForRow(
    rec,
    pasienLabelByRowId,
    pasienOptions,
  );
  if (!digits) return [];
  const candidates = byRm.get(digits) ?? [];
  const others = candidates.filter((row) => String(row.id ?? "").trim() !== id);
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
    };
  });
  enriched.sort((a, b) => {
    const pa = isPlaceholderTindakanLabel(a.tindakan) ? 1 : 0;
    const pb = isPlaceholderTindakanLabel(b.tindakan) ? 1 : 0;
    if (pa !== pb) return pa - pb;
    return b.sortKey.localeCompare(a.sortKey);
  });
  return enriched
    .filter((e) => !isPlaceholderTindakanLabel(e.tindakan))
    .slice(0, 12);
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

  const oName = normalizeNamaPasien((oSplit.baseNama || oStr).trim())
    .toLowerCase();
  const rName = normalizeNamaPasien((rSplit.baseNama || rStr).trim())
    .toLowerCase();
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

function resolvePasienFromLabel(
  options: PasienOption[],
  label: string,
): PasienOption | null {
  const t = label.trim();
  if (!t) return null;
  for (const p of options) {
    if (formatPasienLabel(p) === t) return p;
  }
  return null;
}

function resolvePasienFromRow(
  options: PasienOption[],
  raw: Record<string, unknown>,
): PasienOption | null {
  const pid = String(raw.pasien_id ?? "").trim();
  if (pid) {
    const hit = options.find((p) => String(p.id) === pid);
    if (hit) return hit;
  }
  const label = buildPasienLabelFromRow(raw);
  if (label) {
    const byLabel = resolvePasienFromLabel(options, label);
    if (byLabel) return byLabel;
  }
  const namaFull = pickFirstString(raw, [
    "nama_pasien",
    "nama",
    "pasien_nama",
  ]);
  const { baseNama, rmDalamKurung } = splitNamaDanRmDalamKurung(namaFull);
  const namaForMatch = normalizeNamaPasien((baseNama || namaFull).trim());
  const rowRmDigits =
    normalizeDigitsOnly(pickFirstString(raw, [...RM_FIELD_KEYS])) ||
    normalizeDigitsOnly(rmDalamKurung);
  if (namaForMatch) {
    const hits = options.filter(
      (p) => normalizeNamaPasien(p.nama ?? "") === namaForMatch,
    );
    if (hits.length === 1) return hits[0]!;
    if (hits.length > 1 && rowRmDigits.length >= 3) {
      const byRm = hits.filter(
        (p) => normalizeDigitsOnly(p.no_rm ?? "") === rowRmDigits,
      );
      if (byRm.length === 1) return byRm[0]!;
    }
  }
  return null;
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
  const isLight = useTindakanLightMode();
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
        isLight
          ? "border-cyan-400/55 bg-white text-slate-950 [color-scheme:light]"
          : "border-cyan-700/50 bg-black/40 text-cyan-100 [color-scheme:dark]",
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
  const isLight = useTindakanLightMode();
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
        isLight
          ? "border-cyan-400/55 bg-white text-slate-950 [color-scheme:light]"
          : "border-cyan-700/50 bg-black/40 text-cyan-100",
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
}: {
  adapter: Adapter;
  filterPasienId?: string;
  filterRm?: string;
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
  const { show: notify } = useNotification();
  const { confirm: appConfirm } = useAppDialog();
  const isLight = useTindakanLightMode();

  const [search, setSearch] = useState("");
  const debouncedSearchTrim = useDebouncedValue(search.trim(), 280);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [cathlabFallbackRows, setCathlabFallbackRows] = useState<
    TindakanJoinResult[]
  >([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [filterDokter, setFilterDokter] = useState("");
  const [filterRuangan, setFilterRuangan] = useState("");
  const [filterTanggalFrom, setFilterTanggalFrom] = useState("");
  const [filterTanggalTo, setFilterTanggalTo] = useState("");
  const [creatingForPasien, setCreatingForPasien] = useState(false);
  const [lastAutoCreateKey, setLastAutoCreateKey] = useState("");
  /** Riwayat tindakan (RM duplikat): default tertutup; kunci = id baris / fallback key. */
  const [rmHistoryOpenByRowKey, setRmHistoryOpenByRowKey] = useState<
    Record<string, boolean>
  >({});
  const [pemakaianModalRow, setPemakaianModalRow] =
    useState<TindakanJoinResult | null>(null);
  /** Cache GET /api/pemakaian-orders (urutan API: created_at desc). */
  const [pemakaianOrdersRaw, setPemakaianOrdersRaw] = useState<
    Record<string, unknown>[]
  >([]);

  const refreshPemakaianOrderIndex = useCallback(async () => {
    try {
      const res = await fetch("/api/pemakaian-orders", {
        credentials: "include",
        cache: "no-store",
      });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        orders?: Array<Record<string, unknown>>;
      };
      if (!res.ok || !j?.ok || !Array.isArray(j.orders)) {
        setPemakaianOrdersRaw([]);
        return;
      }
      setPemakaianOrdersRaw(j.orders);
    } catch {
      setPemakaianOrdersRaw([]);
    }
  }, []);

  useEffect(() => {
    void refreshPemakaianOrderIndex();
  }, [refreshPemakaianOrderIndex]);

  const [pasienOptions, setPasienOptions] = useState<PasienOption[]>([]);
  const [pasienLoading, setPasienLoading] = useState(false);
  const [pasienError, setPasienError] = useState<string | null>(null);
  const [pasienLabelByRowId, setPasienLabelByRowId] = useState<
    Record<string, string>
  >({});

  const [ruanganMaster, setRuanganMaster] = useState<RuanganOption[]>([]);
  const [ruanganLoading, setRuanganLoading] = useState(false);
  const [ruanganError, setRuanganError] = useState<string | null>(null);

  const refreshRuanganMaster = useCallback(async () => {
    setRuanganLoading(true);
    setRuanganError(null);
    try {
      const res = await fetch("/api/ruangan", {
        credentials: "include",
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        ruangan?: RuanganOption[];
        message?: string;
      };
      if (!res.ok || !json?.ok) {
        throw new Error(json?.message || "Gagal mengambil master ruangan.");
      }
      const rows = Array.isArray(json.ruangan) ? json.ruangan : [];
      setRuanganMaster(rows);
    } catch (e) {
      setRuanganMaster([]);
      setRuanganError(extractErrorMessage(e));
    } finally {
      setRuanganLoading(false);
    }
  }, []);

  const [doctorOptionsMaster, setDoctorOptionsMaster] = useState<
    DoctorOption[]
  >([]);
  const [doctorLoading, setDoctorLoading] = useState(false);
  const [doctorError, setDoctorError] = useState<string | null>(null);
  const [doctorLabelByRowId, setDoctorLabelByRowId] = useState<
    Record<string, string>
  >({});

  const [masterTindakanOptions, setMasterTindakanOptions] = useState<
    MasterTindakanOption[]
  >([]);
  const [masterTindakanLoading, setMasterTindakanLoading] = useState(false);
  const [masterTindakanError, setMasterTindakanError] = useState<string | null>(
    null,
  );

  const refreshMasterTindakan = useCallback(async () => {
    setMasterTindakanLoading(true);
    setMasterTindakanError(null);
    try {
      const res = await fetch("/api/master-tindakan", {
        credentials: "include",
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        masterTindakan?: MasterTindakanOption[];
        message?: string;
      };
      if (!res.ok || !json?.ok) {
        throw new Error(
          json?.message || "Gagal mengambil master jenis tindakan.",
        );
      }
      const rows = Array.isArray(json.masterTindakan)
        ? json.masterTindakan
        : [];
      const mapped = rows
        .map((r) =>
          r && typeof r === "object" && "id" in r && "nama" in r
            ? {
                id: String((r as MasterTindakanOption).id),
                nama: String((r as MasterTindakanOption).nama ?? "").trim(),
                aktif: (r as MasterTindakanOption).aktif !== false,
              }
            : null,
        )
        .filter(Boolean) as MasterTindakanOption[];
      setMasterTindakanOptions(mapped);
    } catch (e) {
      setMasterTindakanOptions([]);
      setMasterTindakanError(extractErrorMessage(e));
    } finally {
      setMasterTindakanLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setPasienLoading(true);
    setPasienError(null);
    (async () => {
      try {
        const res = await fetch("/api/pasien?compact=1", {
          credentials: "include",
          cache: "no-store",
        });
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          data?: unknown;
          error?: string;
        };
        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || "Gagal mengambil data pasien.");
        }
        const rows = Array.isArray(json.data) ? json.data : [];
        const mapped = rows
          .map((r) =>
            r && typeof r === "object" ? mapApiPasienRow(r as any) : null,
          )
          .filter(Boolean) as PasienOption[];
        if (!cancelled) setPasienOptions(mapped);
      } catch (e) {
        if (!cancelled) {
          setPasienOptions([]);
          setPasienError(extractErrorMessage(e));
        }
      } finally {
        if (!cancelled) setPasienLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void refreshRuanganMaster();
  }, [refreshRuanganMaster]);

  useEffect(() => {
    let cancelled = false;
    setDoctorLoading(true);
    setDoctorError(null);
    (async () => {
      try {
        const res = await fetch("/api/doctors", {
          credentials: "include",
          cache: "no-store",
        });
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          doctors?: unknown;
          message?: string;
        };
        if (!res.ok || !json?.ok) {
          throw new Error(json?.message || "Gagal mengambil data dokter.");
        }
        const rows = Array.isArray(json.doctors) ? json.doctors : [];
        const mapped = rows
          .map((r) =>
            r && typeof r === "object" ? mapApiDoctorRow(r as any) : null,
          )
          .filter((d): d is DoctorOption => Boolean(d && d.nama_dokter));
        if (!cancelled) setDoctorOptionsMaster(mapped);
      } catch (e) {
        if (!cancelled) {
          setDoctorOptionsMaster([]);
          setDoctorError(extractErrorMessage(e));
        }
      } finally {
        if (!cancelled) setDoctorLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void refreshMasterTindakan();
  }, [refreshMasterTindakan]);

  const dokterSourceRows = useMemo((): TindakanJoinResult[] => {
    if (tindakanList.length) return tindakanList as TindakanJoinResult[];
    if (cathlabFallbackRows.length) return cathlabFallbackRows;
    return [];
  }, [tindakanList, cathlabFallbackRows]);

  const dokterOptions = useMemo(() => {
    const set = new Set<string>();
    const master = doctorOptionsMaster;
    for (const r of dokterSourceRows) {
      const d = String(r.dokter ?? "").trim();
      if (!d) continue;
      const canon =
        master.length > 0 ? canonicalDoctorStoredValue(master, d) : d;
      set.add(canon);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "id"));
  }, [dokterSourceRows, doctorOptionsMaster]);

  const doctorOptionsForPemakaianModal = useMemo(
    () =>
      doctorOptionsMaster.length
        ? doctorOptionsMaster
        : dokterOptions.map((nama, idx) => ({
            id: `local:${idx}`,
            nama_dokter: nama,
            spesialis: null,
            aktif: true,
          })),
    [doctorOptionsMaster, dokterOptions],
  );

  const ruanganFilterOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of dokterSourceRows) {
      const x = String(r.ruangan ?? "").trim();
      if (x) set.add(x);
    }
    for (const opt of ruanganMaster) {
      const label = formatRuanganLabel(opt).trim();
      if (label) set.add(label);
      const nama = String(opt.nama ?? "").trim();
      if (nama) set.add(nama);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "id"));
  }, [dokterSourceRows, ruanganMaster]);

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
      (o) => !String(o.tindakan_id ?? "").trim(),
    );
    let pool = unlinked.slice();

    const sortedRows = rowsForPemakaianLink
      .filter((row) => Boolean(String(row.id ?? "").trim()))
      .sort((a, b) => {
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
      const label =
        pasienLabelByRowId[rowId] ?? buildPasienLabelFromRow(raw);
      if (!label.trim()) continue;
      const rowDate = extractCalendarDateKey(String(row.tanggal ?? ""));

      const idx = pool.findIndex((o) => {
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
      pool = pool.filter((_, i) => i !== idx);
    }

    return next;
  }, [
    pemakaianOrdersRaw,
    rowsForPemakaianLink,
    pasienLabelByRowId,
  ]);

  const pemakaianModalInitial = useMemo(() => {
    if (!pemakaianModalRow) return null;
    const id = String(pemakaianModalRow.id ?? "").trim();
    const raw = pemakaianModalRow as unknown as Record<string, unknown>;
    const tindakan = String(pemakaianModalRow.tindakan ?? "").trim();
    const tanggal = String(pemakaianModalRow.tanggal ?? "").trim();
    const catatan =
      tindakan && tanggal
        ? `Kasus tindakan: ${tindakan} (${tanggal}).`
        : tindakan
          ? `Kasus tindakan: ${tindakan}.`
          : "";
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
      initialCatatan: catatan,
      tindakanId: tindakanIdForApi,
      initialPemakaianOrderId: linkedOrderId,
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
    const q = debouncedSearchTrim.toLowerCase();
    if (q) {
      list = list.filter((r) =>
        rowSearchHaystack(r, pasienOptions, doctorOptionsMaster).includes(q),
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
      const wa = String(a.waktu ?? "").trim();
      const wb = String(b.waktu ?? "").trim();
      if (wa || wb) return wb.localeCompare(wa);
      return String(b.id ?? "").localeCompare(String(a.id ?? ""));
    });
  }, [
    rowsForPemakaianLink,
    filterPasienId,
    filterRm,
    filterDokter,
    filterRuangan,
    filterTanggalFrom,
    filterTanggalTo,
    pasienOptions,
    debouncedSearchTrim,
    doctorOptionsMaster,
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
    filterTanggalFrom,
    filterTanggalTo,
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

  const rmDuplicateCountInFiltered = useMemo(() => {
    const m = new Map<string, number>();
    for (const rec of filteredRecords) {
      const { digits } = resolveShownRmForRow(
        rec,
        pasienLabelByRowId,
        pasienOptions,
      );
      if (!digits) continue;
      m.set(digits, (m.get(digits) ?? 0) + 1);
    }
    return m;
  }, [filteredRecords, pasienLabelByRowId, pasienOptions]);

  /** Hanya untuk baris halaman aktif — hindari O(n) berat pada seluruh hasil filter. */
  const priorTindakanForPagedRows = useMemo(() => {
    const pool = rowsForPemakaianLink;
    const byRm = new Map<string, TindakanJoinResult[]>();
    for (const r of pool) {
      const k = poolRowRmDigitKey(r);
      if (!k) continue;
      if (!byRm.has(k)) byRm.set(k, []);
      byRm.get(k)!.push(r);
    }
    return pagedRecords.map((rec) =>
      buildPriorTindakanListForRow(
        rec,
        byRm,
        pasienLabelByRowId,
        pasienOptions,
        doctorOptionsMaster,
      ),
    );
  }, [
    rowsForPemakaianLink,
    pagedRecords,
    pasienLabelByRowId,
    pasienOptions,
    doctorOptionsMaster,
  ]);

  const emptyMessage = useMemo(() => {
    const pasienActive = Boolean(filterPasienId.trim() || filterRm.trim());
    const hasAnySourceRows =
      tindakanList.length > 0 || cathlabFallbackRows.length > 0;
    if (!hasAnySourceRows) {
      return "Belum ada data tindakan di database.";
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
        tanggal: new Date().toISOString().slice(0, 10),
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
      tanggal: new Date().toISOString().slice(0, 10),
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
          prev.filter((r) => String(r.id ?? "").trim() !== String(rowId).trim()),
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

  const commitRuanganForRow = useCallback(
    async (id: string, next: string) => {
      const ok = await patchRowField(id, { ruangan: next || null });
      if (ok && next.trim()) {
        void refreshRuanganMaster();
      }
      return ok;
    },
    [patchRowField, refreshRuanganMaster],
  );

  const commitTindakanForRow = useCallback(
    async (id: string, next: string) => {
      const ok = await patchRowField(id, { tindakan: next || null });
      const t = next.trim();
      if (
        ok &&
        t &&
        t.toLowerCase() !== "belum diisi"
      ) {
        void refreshMasterTindakan();
      }
      return ok;
    },
    [patchRowField, refreshMasterTindakan],
  );

  return (
    <TableContainer>
      <div className="relative z-10 flex h-full min-h-0 max-h-full flex-1 flex-col min-w-0">
        <TableToolbar
          onSearch={setSearch}
          onRefresh={refresh}
          onCreateDraftForPasien={createDraftForPasien}
          onFilter={(d, rg, from, to) => {
            setFilterDokter(d);
            setFilterRuangan(rg);
            setFilterTanggalFrom(String(from ?? ""));
            setFilterTanggalTo(String(to ?? ""));
          }}
          dokterOptions={dokterOptions}
          ruanganOptions={ruanganFilterOptions}
          isSyncing={isSyncing}
        />

        {error ? (
          <div
            className={cn(
              "mb-3 rounded-xl border px-4 py-3 text-sm",
              isLight
                ? "border-red-300/70 bg-red-50 text-red-900"
                : "border-red-900/40 bg-red-950/25 text-red-200",
            )}
          >
            <div className="font-bold">Gagal memuat data tindakan</div>
            <div
              className={cn(
                "mt-0.5 text-[12px]",
                isLight ? "text-red-800/90" : "text-red-200/80",
              )}
            >
              {extractErrorMessage(error)}
            </div>
            <div
              className={cn(
                "mt-2 text-[11px] font-mono",
                isLight ? "text-red-800/75" : "text-red-200/70",
              )}
            >
              Sumber: `GET /api/tindakan?limit=8000` (butuh login & Supabase
              service role).
            </div>
          </div>
        ) : null}

        {loading ? (
          <div
            className={cn(
              "flex min-h-0 flex-1 items-center justify-center py-6 text-sm font-semibold",
              isLight ? "text-cyan-950" : "text-cyan-300",
            )}
          >
            Memuat tindakan…
          </div>
        ) : (
          <>
            <div
              className={cn(
                "min-h-0 flex-1 overflow-auto",
                isLight ? "bg-white/85" : "bg-black/20",
              )}
            >
              <table className="w-full min-w-[1120px] text-sm font-semibold border-separate border-spacing-0">
                <thead className="sticky top-0 z-10">
                  <tr
                    className={cn(
                      "border-b text-center",
                      isLight
                        ? "border-cyan-200/70 bg-slate-100/95"
                        : "border-cyan-800/40 bg-black/80",
                    )}
                  >
                    <th
                      className={cn(
                        "px-2 sm:px-2.5 py-1.5 font-mono font-extrabold text-[9px] sm:text-[10px] uppercase tracking-wider whitespace-nowrap w-10",
                        isLight ? "text-slate-950" : "text-cyan-400/95",
                      )}
                    >
                      No
                    </th>
                    <th
                      className={cn(
                        "px-2 sm:px-2.5 py-1.5 font-mono font-extrabold text-[9px] sm:text-[10px] uppercase tracking-wider whitespace-nowrap",
                        isLight ? "text-slate-950" : "text-cyan-400/95",
                      )}
                    >
                      Tanggal
                    </th>
                    <th
                      className={cn(
                        "px-2 sm:px-2.5 py-1.5 font-mono font-extrabold text-[9px] sm:text-[10px] uppercase tracking-wider whitespace-nowrap",
                        isLight ? "text-slate-950" : "text-cyan-400/95",
                      )}
                    >
                      RM
                    </th>
                    <th
                      className={cn(
                        "px-2 sm:px-2.5 py-1.5 font-mono font-extrabold text-[9px] sm:text-[10px] uppercase tracking-wider min-w-[10rem]",
                        isLight ? "text-slate-950" : "text-cyan-400/95",
                      )}
                    >
                      Nama pasien
                    </th>
                    <th
                      className={cn(
                        "px-2 sm:px-2.5 py-1.5 font-mono font-extrabold text-[9px] sm:text-[10px] uppercase tracking-wider whitespace-nowrap",
                        isLight ? "text-slate-950" : "text-cyan-400/95",
                      )}
                    >
                      Jenis kelamin
                    </th>
                    <th
                      className={cn(
                        "px-2 sm:px-2.5 py-1.5 font-mono font-extrabold text-[9px] sm:text-[10px] uppercase tracking-wider min-w-[10rem]",
                        isLight ? "text-slate-950" : "text-cyan-400/95",
                      )}
                    >
                      Dokter
                    </th>
                    <th
                      className={cn(
                        "px-2 sm:px-2.5 py-1.5 font-mono font-extrabold text-[9px] sm:text-[10px] uppercase tracking-wider min-w-[10rem]",
                        isLight ? "text-slate-950" : "text-cyan-400/95",
                      )}
                    >
                      Tindakan
                    </th>
                    <th
                      className={cn(
                        "px-2 sm:px-2.5 py-1.5 font-mono font-extrabold text-[9px] sm:text-[10px] uppercase tracking-wider min-w-[10rem]",
                        isLight ? "text-slate-950" : "text-cyan-400/95",
                      )}
                    >
                      Ruangan
                    </th>
                    <th
                      className={cn(
                        "px-2 sm:px-2.5 py-1.5 font-mono font-extrabold text-[9px] sm:text-[10px] uppercase tracking-wider whitespace-nowrap",
                        isLight ? "text-slate-950" : "text-cyan-400/95",
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
                        colSpan={9}
                        className={cn(
                          "px-4 py-10 text-center font-semibold",
                          isLight ? "text-cyan-950/90" : "text-cyan-500/70",
                        )}
                      >
                        <div className="flex flex-col items-center gap-3">
                          <span>{emptyMessage}</span>
                          {Boolean(filterPasienId.trim() || filterRm.trim()) ? (
                            <button
                              type="button"
                              onClick={() => void handleCreateForActivePasien()}
                              disabled={creatingForPasien}
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition disabled:cursor-not-allowed disabled:opacity-50",
                                isLight
                                  ? "border-cyan-500/45 bg-cyan-100/90 text-cyan-900 hover:bg-cyan-200/80"
                                  : "border-cyan-700/50 bg-cyan-950/30 text-cyan-200 hover:bg-cyan-900/40",
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
                      const stateKey = id || key;
                      const rowNoDesc =
                        filteredRecords.length - ((page - 1) * perPage + i);
                      const { digits: dupRmDigits, display: rmDisplayForKet } =
                        resolveShownRmForRow(
                          rec,
                          pasienLabelByRowId,
                          pasienOptions,
                        );
                      const dupCount = dupRmDigits
                        ? (rmDuplicateCountInFiltered.get(dupRmDigits) ?? 0)
                        : 0;
                      const isDuplicateRm = dupCount > 1;
                      const priorList = priorTindakanForPagedRows[i] ?? [];
                      const pKet = resolvePasienFromRow(pasienOptions, raw);
                      const namaForKet =
                        normalizeNamaPasien(displayNamaPasien(raw)) ||
                        (pKet?.nama
                          ? normalizeNamaPasien(pKet.nama)
                          : "") ||
                        "—";
                      const rmLine =
                        rmDisplayForKet !== "—"
                          ? rmDisplayForKet
                          : dupRmDigits || "—";
                      return (
                        <Fragment key={key}>
                        <tr
                          onClick={(e) => {
                            if (!id) return;
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
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              if (!id) return;
                              openDetail(id);
                            }
                          }}
                          role={id ? "button" : undefined}
                          tabIndex={id ? 0 : undefined}
                          className={cn(
                            "group border-b transition-all duration-200",
                            isLight
                              ? "border-cyan-200/70"
                              : "border-cyan-900/25",
                            isDuplicateRm &&
                              (isLight
                                ? "bg-amber-100/75 border-l-[3px] border-l-amber-500 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.2)]"
                                : "bg-amber-950/35 border-l-[3px] border-l-amber-500/65 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.14)]"),
                            id
                              ? isDuplicateRm
                                ? isLight
                                  ? "cursor-pointer hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-600/50"
                                  : "cursor-pointer hover:bg-amber-950/45 hover:shadow-[inset_2px_0_0_rgba(245,158,11,0.5)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500/50"
                                : isLight
                                  ? "cursor-pointer hover:bg-cyan-50/90 hover:shadow-[inset_2px_0_0_rgba(6,182,212,0.45)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-600/50"
                                  : "cursor-pointer hover:bg-cyan-950/30 hover:shadow-[inset_2px_0_0_rgba(34,211,238,0.45)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500/50"
                              : "opacity-60",
                          )}
                        >
                          <td
                            className={cn(
                              "px-2 sm:px-2.5 py-1 whitespace-nowrap font-mono text-[11px] text-center tabular-nums",
                              isLight ? "text-cyan-800" : "text-cyan-400/90",
                            )}
                          >
                            {rowNoDesc}
                          </td>
                          <td
                            className={cn(
                              "px-2 sm:px-2.5 py-1 whitespace-nowrap font-mono text-[11px] text-center align-middle",
                              isLight ? "text-slate-900" : "text-cyan-200/95",
                            )}
                          >
                            <div className="mx-auto w-full max-w-[9.5rem]">
                              <EditableDateCell
                                value={String(rec.tanggal ?? "")}
                                onCommit={async (next) =>
                                  patchRowField(id, { tanggal: next || null })
                                }
                              />
                            </div>
                          </td>
                          <td
                            className={cn(
                              "px-2 sm:px-2.5 py-1 font-mono text-[11px] text-center align-middle",
                              isLight ? "text-slate-950" : "text-cyan-100",
                            )}
                          >
                            {(() => {
                              const labelRm = extractRmFromLabel(
                                pasienLabelByRowId[stateKey] ?? "",
                              );
                              const p = resolvePasienFromRow(
                                pasienOptions,
                                raw,
                              );
                              const rmFromOpt = String(p?.no_rm ?? "").trim();
                              const rowRmDisp = displayRm(raw);
                              const rowRm = rowRmDisp === "—" ? "" : rowRmDisp;
                              return labelRm || rmFromOpt || rowRm || "—";
                            })()}
                          </td>
                          <td
                            className={cn(
                              "px-2 sm:px-2.5 py-1 max-w-[18rem] text-center align-middle",
                              isLight ? "text-slate-950" : "text-cyan-100",
                            )}
                          >
                            <div
                              data-no-row-click="true"
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                              className="mx-auto min-w-[10rem] sm:min-w-[14rem] max-w-[18rem]"
                              title={pasienError ?? undefined}
                            >
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
                                options={pasienOptions}
                                loading={pasienLoading}
                                className="max-w-[18rem]"
                              />
                              {!pasienLoading &&
                              pasienOptions.length === 0 &&
                              i === 0 ? (
                                <p
                                  className={cn(
                                    "mt-0.5 text-[9px] leading-tight",
                                    isLight ? "text-cyan-700/80" : "text-cyan-500/70",
                                  )}
                                >
                                  {pasienError
                                    ? "Gagal memuat pasien."
                                    : "Belum ada pasien di database."}
                                </p>
                              ) : null}
                            </div>
                          </td>
                          <td
                            className={cn(
                              "px-2 sm:px-2.5 py-1 text-[11px] text-center align-middle whitespace-nowrap",
                              isLight ? "text-slate-800" : "text-cyan-100/95",
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
                            className={cn(
                              "px-2 sm:px-2.5 py-1 max-w-[14rem] text-center align-middle",
                              isLight ? "text-slate-950" : "text-cyan-300/90",
                            )}
                          >
                            <div
                              data-no-row-click="true"
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                              className="mx-auto min-w-[10rem] sm:min-w-[12rem] max-w-[14rem]"
                              title={doctorError ?? undefined}
                            >
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
                                    ? resolveDoctorFromLooseInput(m, finalText)
                                    : null;
                                  const persisted = resolved
                                    ? String(resolved.nama_dokter).trim()
                                    : finalText.trim();
                                  const display = resolved
                                    ? formatDoctorLabel(resolved)
                                    : finalText.trim();
                                  const cur = String(rec.dokter ?? "").trim();
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
                                  const canonical = formatDoctorLabel(picked);
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
                                    : dokterOptions.map((nama, idx) => ({
                                        id: `local:${idx}`,
                                        nama_dokter: nama,
                                        spesialis: null,
                                        aktif: true,
                                      }))
                                }
                                loading={doctorLoading}
                                className="max-w-[14rem]"
                              />
                              {!doctorLoading &&
                              doctorOptionsMaster.length === 0 &&
                              i === 0 ? (
                                <p
                                  className={cn(
                                    "mt-0.5 text-[9px] leading-tight",
                                    isLight ? "text-cyan-700/80" : "text-cyan-500/70",
                                  )}
                                >
                                  {doctorError
                                    ? "Gagal memuat master dokter."
                                    : "Belum ada dokter di master."}
                                </p>
                              ) : null}
                            </div>
                          </td>
                          <td
                            className={cn(
                              "px-2 sm:px-2.5 py-1 max-w-[14rem] text-center align-middle",
                              isLight ? "text-slate-950" : "text-cyan-200/95",
                            )}
                          >
                            <div
                              data-no-row-click="true"
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                              className="mx-auto min-w-[10rem] sm:min-w-[12rem] max-w-[14rem]"
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
                                    isLight ? "text-cyan-700/80" : "text-cyan-500/70",
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
                            className={cn(
                              "px-2 sm:px-2.5 py-1 max-w-[14rem] text-center align-middle",
                              isLight ? "text-slate-950" : "text-cyan-300/90",
                            )}
                          >
                            <div
                              data-no-row-click="true"
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                              className="mx-auto min-w-[10rem] sm:min-w-[12rem] max-w-[14rem]"
                              title={ruanganError ?? undefined}
                            >
                              <EditableRuanganCell
                                value={String(rec.ruangan ?? "")}
                                ruanganMaster={ruanganMaster}
                                loading={ruanganLoading}
                                listboxId={`tindakan-row-${key}-ruangan`}
                                onCommit={(next) => commitRuanganForRow(id, next)}
                              />
                              {!ruanganLoading &&
                              ruanganMaster.length === 0 &&
                              i === 0 ? (
                                <p
                                  className={cn(
                                    "mt-0.5 text-[9px] leading-tight",
                                    isLight ? "text-cyan-700/80" : "text-cyan-500/70",
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
                            className="px-2 sm:px-2.5 py-1 align-middle text-center"
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                          >
                            <div className="flex flex-wrap items-center justify-center gap-1">
                              {id && pemakaianOrderByTindakanId[id] ? (
                                <button
                                  type="button"
                                  className={cn(
                                    "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold transition-all",
                                    isLight
                                      ? "border-amber-600/45 bg-amber-100/90 text-amber-950 hover:bg-amber-200/80"
                                      : "border-amber-800/50 bg-amber-950/35 text-amber-200/95 hover:border-amber-600/45 hover:bg-amber-900/30",
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
                                    isLight
                                      ? "border-cyan-600/45 bg-cyan-100/90 text-cyan-950 hover:bg-cyan-200/75"
                                      : "border-cyan-800/50 bg-cyan-950/40 text-cyan-200/95 hover:border-cyan-600/40 hover:bg-cyan-900/35",
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
                                  isLight
                                    ? "border-red-400/55 bg-red-50 text-red-800 hover:bg-red-100"
                                    : "border-red-900/45 bg-red-950/25 text-red-300/95 hover:bg-red-950/45",
                                )}
                                title="Hapus kasus tindakan"
                                aria-label="Hapus"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleDelete(id, rec);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5 shrink-0 opacity-90" />
                                <span className="hidden sm:inline">Hapus</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isDuplicateRm && priorList.length > 0 ? (
                          <tr
                            className={cn(
                              "border-b",
                              isLight
                                ? "border-amber-300/50 bg-amber-50/80"
                                : "border-amber-900/30 bg-amber-950/15",
                            )}
                          >
                            <td
                              colSpan={9}
                              className="px-3 py-1.5 align-top text-left"
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                            >
                              <div
                                className={cn(
                                  "max-w-3xl text-[11px] leading-snug",
                                  isLight ? "text-amber-950" : "text-amber-100/90",
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
                                    isLight
                                      ? "border-amber-500/40 bg-white/90 hover:bg-amber-100/80"
                                      : "border-amber-800/35 bg-black/25 hover:bg-amber-950/35",
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
                                  <span className="font-mono text-[11px] text-amber-200/95">
                                    Riwayat tindakan lain ({priorList.length})
                                  </span>
                                  <span className="text-amber-500/70 font-semibold">
                                    · RM {rmLine}
                                  </span>
                                </button>
                                {rmHistoryOpenByRowKey[key] ? (
                                  <div className="mt-2 space-y-2 pl-1">
                                    <div>
                                      <div className="font-mono text-amber-200/95">
                                        RM {rmLine}
                                      </div>
                                      <div
                                        className={cn(
                                          "mt-0.5",
                                          isLight ? "text-amber-900/90" : "text-amber-50/88",
                                        )}
                                      >
                                        · {namaForKet}
                                      </div>
                                    </div>
                                    {priorList.map((e, j) => (
                                      <div
                                        key={`${e.sortKey}-${j}-${e.tindakan}`}
                                        className={cn(
                                          "rounded-md border px-3 py-2",
                                          isLight
                                            ? "border-amber-400/50 bg-white/95"
                                            : "border-amber-800/40 bg-black/35",
                                        )}
                                      >
                                        <div className="text-[10px] font-mono uppercase tracking-wide text-amber-500/80">
                                          Pernah dilakukan
                                        </div>
                                        <div
                                          className={cn(
                                            "mt-0.5",
                                            isLight ? "text-amber-950" : "text-amber-100/95",
                                          )}
                                        >
                                          · {e.tindakan}
                                        </div>
                                        <div className="mt-2 text-[10px] font-mono uppercase tracking-wide text-amber-500/80">
                                          Tanggal tindakan
                                        </div>
                                        <div>{e.tanggalDisp}</div>
                                        <div className="mt-2 text-[10px] font-mono uppercase tracking-wide text-amber-500/80">
                                          Dokter
                                        </div>
                                        <div
                                          className={cn(
                                            isLight ? "text-amber-950" : "text-amber-100/95",
                                          )}
                                        >
                                          · {e.dokter}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
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
            <div
              className={cn(
                "shrink-0 space-y-0",
                isLight ? "bg-slate-50/80" : "bg-black/15",
              )}
            >
              {filteredRecords.length > 0 ? (
                <TablePagination
                  currentPage={page}
                  totalPages={totalPages}
                  totalItems={filteredRecords.length}
                  pageSize={perPage}
                  onPageChange={setPage}
                  onPageSizeChange={setPerPage}
                />
              ) : null}
              <p
                className={cn(
                  "px-2 pb-1.5 pt-0 text-[10px] font-semibold leading-snug font-mono",
                  isLight ? "text-cyan-950/90" : "text-cyan-600/75",
                )}
              >
                Klik baris: drawer detail. Pemakaian / Edit: form alkes di
                halaman ini. Pasien aktif lewat toolbar.
              </p>
            </div>
          </>
        )}
      </div>

      {pemakaianModalInitial ? (
        <PemakaianAlkesModal
          key={
            pemakaianModalInitial.tindakanId ??
            String(pemakaianModalRow?.id ?? "pemakaian")
          }
          open
          onClose={() => setPemakaianModalRow(null)}
          onSaved={() => void refreshPemakaianOrderIndex()}
          pasienOptions={pasienOptions}
          doctorOptions={doctorOptionsForPemakaianModal}
          pasienLoading={pasienLoading}
          doctorLoading={doctorLoading}
          initialPasienLabel={pemakaianModalInitial.initialPasienLabel}
          initialDokter={pemakaianModalInitial.initialDokter}
          initialRuangan={pemakaianModalInitial.initialRuangan}
          initialCatatan={pemakaianModalInitial.initialCatatan}
          tindakanId={pemakaianModalInitial.tindakanId}
          initialPemakaianOrderId={
            pemakaianModalInitial.initialPemakaianOrderId
          }
        />
      ) : null}
    </TableContainer>
  );
}
