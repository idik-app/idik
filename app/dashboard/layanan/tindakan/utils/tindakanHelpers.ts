import type { PasienOption } from "@/components/ui/pasien-combobox";
import type { DoctorOption } from "@/components/ui/doctor-combobox";
import type { TindakanJoinResult } from "../bridge/mapping.types";
import { canonicalDoctorDisplayValue } from "@/components/ui/doctor-combobox";
import { formatDoctorLabel } from "@/components/ui/doctor-combobox";

export const CAL_MONTH: Record<string, string> = {
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

export const RM_FIELD_KEYS = ["no_rm", "rm", "nomor_rm", "no_rm_pasien"] as const;
export const NAMA_FIELD_KEYS = ["nama_pasien", "nama", "pasien_nama"] as const;

export const haystackCacheMap = new WeakMap<object, {
  haystack: string;
  label: string;
  doctor: string;
}>();

export const rmCacheMap = new WeakMap<object, {
  digits: string;
  display: string;
  label: string;
}>();

export function shouldSuppressRowOpenAfterFieldInteraction(
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

export function isKeyboardEventFromRowInteractiveTarget(
  target: EventTarget | null,
): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      'input,select,textarea,button,a,[data-no-row-click="true"],[role="combobox"],[role="listbox"],[role="option"],[contenteditable="true"]',
    ),
  );
}

export function resolveTindakanFieldRootFromPointerTarget(
  target: EventTarget | null,
): Element | null {
  if (!(target instanceof Element)) return null;
  const narrow = target.closest("input,select,textarea,[contenteditable]");
  if (narrow) return narrow;
  return target.closest('[data-no-row-click="true"]');
}

export function recordSearchHaystack(r: TindakanJoinResult): string {
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

export function normalizeNamaPasien(raw: unknown): string {
  return String(raw ?? "").trim().toLowerCase();
}

export function normalizeDigitsOnly(raw: unknown): string {
  return String(raw ?? "").replace(/\D/g, "");
}

export function extractRmFromLabel(label: string): string {
  const match = label.match(/\(([^)]+)\)/);
  return match ? match[1].trim() : "";
}

export function splitNamaDanRmDalamKurung(label: string): {
  baseNama: string;
  rmDalamKurung: string;
} {
  const match = label.match(/^([^(]+)\(([^)]+)\)/);
  if (match) {
    return {
      baseNama: match[1].trim(),
      rmDalamKurung: match[2].trim(),
    };
  }
  return {
    baseNama: label.trim(),
    rmDalamKurung: "",
  };
}

export function displayNamaPasien(raw: Record<string, unknown>): string {
  for (const k of NAMA_FIELD_KEYS) {
    const val = String(raw[k] ?? "").trim();
    if (val) return val;
  }
  return "—";
}

export function displayRm(raw: Record<string, unknown>): string {
  for (const k of RM_FIELD_KEYS) {
    const val = String(raw[k] ?? "").trim();
    if (val) return val;
  }
  return "—";
}

export function resolvePasienFromRow(
  options: PasienOption[],
  raw: Record<string, unknown>,
): PasienOption | null {
  const pId = String(raw.pasien_id ?? "").trim();
  if (pId) {
    const match = options.find((o) => String(o.id ?? "").trim() === pId);
    if (match) return match;
  }
  const rm = displayRm(raw);
  const cleanRm = normalizeDigitsOnly(rm);
  if (cleanRm && cleanRm.length >= 3) {
    const match = options.find(
      (o) => normalizeDigitsOnly(o.no_rm ?? "") === cleanRm,
    );
    if (match) return match;
  }
  return null;
}

export function resolveJenisKelaminFromRow(
  raw: Record<string, unknown>,
  p?: PasienOption | null,
): string {
  const jk =
    String(raw.jenis_kelamin ?? "").trim() ||
    String(raw.jk ?? "").trim() ||
    String(raw.sex ?? "").trim();
  if (jk) return jk.toUpperCase().slice(0, 1);
  if (p) {
    const pJk = String(p.jenis_kelamin ?? "").trim();
    if (pJk) return pJk.toUpperCase().slice(0, 1);
  }
  return "";
}

export function formatJenisKelaminDisplay(jk: string): string {
  if (jk === "L") return "Laki-laki";
  if (jk === "P") return "Perempuan";
  return "—";
}

export function rowSearchHaystack(
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

export function normalizeIdikToken(v: unknown): string {
  return String(v ?? "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "")
    .replace(/^rm/, "");
}

export function rowMatchesPasienQueryFallback(
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

export function rowMatchesPasienDeepFallback(
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

export function extractCalendarDateKey(raw: string): string | null {
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

export function formatTanggalDdMmYyyy(raw: string): string {
  const iso = extractCalendarDateKey(raw);
  if (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, mo, d] = iso.split("-");
    return `${d}-${mo}-${y}`;
  }
  const t = String(raw ?? "").trim();
  return t || "—";
}

export function todayWibYmd(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function startOfWeekWibYmd(): string {
  const d = new Date();
  const jkt = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  const day = jkt.getDay();
  const diff = jkt.getDate() - day + (day === 0 ? -6 : 1);
  jkt.setDate(diff);
  return new Intl.DateTimeFormat("en-CA").format(jkt);
}

export function endOfWeekWibYmd(): string {
  const d = new Date();
  const jkt = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  const day = jkt.getDay();
  const diff = jkt.getDate() - day + (day === 0 ? 0 : 7);
  jkt.setDate(diff);
  return new Intl.DateTimeFormat("en-CA").format(jkt);
}

export function buildPasienLabelFromRow(raw: Record<string, unknown>): string {
  const namaFull = displayNamaPasien(raw);
  const rmCol = displayRm(raw);
  const namaVal = namaFull === "—" ? "" : namaFull;
  const rmColVal = rmCol === "—" ? "" : rmCol;
  
  const { baseNama, rmDalamKurung } = splitNamaDanRmDalamKurung(namaVal);
  const nama = (baseNama || namaVal).trim();
  const rm = rmDalamKurung || rmColVal;
  
  if (nama && rm) return `${nama} (${rm})`;
  return nama || rm || "";
}

export function resolveShownRmForRow(
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

export function resolveShownPasienForDeleteDialog(
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

export function poolRowRmDigitKey(
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

export function rowTindakanLabel(rec: TindakanJoinResult): string {
  const raw = rec as unknown as Record<string, unknown>;
  return (
    String(rec.tindakan ?? "").trim() ||
    (typeof raw.alkes_utama === "string" ? String(raw.alkes_utama).trim() : "")
  );
}

export function isPlaceholderTindakanLabel(t: string): boolean {
  const s = t.trim();
  return !s || s === "—" || /^belum diisi/i.test(s);
}

export function hitungUsia(dobStr: string): { angka: number; text: string } {
  const iso = extractCalendarDateKey(dobStr);
  if (!iso) return { angka: 0, text: "—" };
  const birth = new Date(iso);
  if (Number.isNaN(birth.getTime())) return { angka: 0, text: "—" };
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return { angka: age, text: `${age} TH` };
}
