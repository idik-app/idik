/**
 * 9 tab ringkas — selaras docs/wireframe-dashboard-perawat.md (Fase 1).
 * Tab Biaya menyertakan jembatan ke modul Pemakaian (bukan embed penuh).
 */

import {
  formatJenisKelaminDisplay,
  normalizeJenisKelamin,
} from "../lib/displayTindakanRow";
import { formatFluoroSecondsToHms } from "@/lib/tindakan/fluoroTimeFormat";
import { formatWaktuDisplay } from "@/lib/tindakan/waktuRangeFormat";

export type WireframeTabId =
  | "pasien"
  | "fast_track"
  | "tindakan"
  | "lokasi"
  | "tim"
  | "radiologi"
  | "klinis"
  | "biaya"
  | "history";

export const WIREFRAME_DRAWER_TABS: {
  id: WireframeTabId;
  label: string;
  short: string;
  fields: string[];
}[] = [
  {
    id: "pasien",
    label: "Pasien",
    short: "Pas",
    fields: [
      "no_rm",
      "nama_pasien",
      "jenis_kelamin",
      "tgl_lahir",
      "umur",
      "alamat",
      "no_telp",
    ],
  },
  {
    id: "fast_track",
    label: "Fast-Track",
    short: "FT",
    /** Isi di-render di `FastTrackBlock` (dua input + total otomatis). */
    fields: [],
  },
  {
    id: "tindakan",
    label: "Tindakan",
    short: "Tin",
    fields: ["tanggal_tindakan", "tindakan", "kategori"],
  },
  {
    id: "lokasi",
    label: "Lokasi",
    short: "Lok",
    fields: ["ruangan", "cath"],
  },
  {
    id: "tim",
    label: "Dokter & tim",
    short: "Tim",
    fields: ["dokter", "asisten", "sirkuler", "logger"],
  },
  {
    id: "radiologi",
    label: "Radiologi",
    short: "Rad",
    fields: ["fluoro_time", "dose", "kv", "ma", "waktu"],
  },
  {
    id: "klinis",
    label: "Klinis",
    short: "Klin",
    fields: ["diagnosa", "severity_level", "hasil_lab_ppm"],
  },
  {
    id: "biaya",
    label: "Biaya",
    short: "Byr",
    fields: [
      "kelas_pembiayaan",
      "tarif_tindakan",
      "total",
      "krs",
      "selisih",
      "consumable",
      "pemakaian",
    ],
  },
  {
    id: "history",
    label: "Resume",
    short: "Res",
    /** Isi tab Resume di-render khusus di drawer (ringkasan + riwayat pasien). */
    fields: [],
  },
];

export const FIELD_LABELS: Record<string, string> = {
  no: "No. urut",
  tanggal: "Tanggal",
  waktu: "Waktu",
  fluoro_time: "Fluoro time",
  dose: "Dosis",
  kv: "kV",
  ma: "mA",
  status_duplikat: "Status duplikat",
  no_rm: "No. RM",
  nama_pasien: "Nama pasien",
  jenis_kelamin: "Jenis kelamin",
  tgl_lahir: "Tgl lahir",
  umur: "Umur",
  alamat: "Alamat",
  no_telp: "No. telp",
  pasien_datang_igd: "Pasien datang di IGD",
  door_to_balloon: "Door to balloon (cathlab)",
  total_waktu_fast_track: "Total waktu",
  ruangan: "Ruangan",
  cath: "Cathlab",
  dokter: "Dokter",
  tindakan: "Tindakan",
  tanggal_tindakan: "Tanggal tindakan",
  kategori: "Kategori",
  hasil_lab_ppm: "Hasil lab PPM",
  diagnosa: "Diagnosa",
  severity_level: "Severity",
  asisten: "Asisten",
  sirkuler: "Sirkuler",
  logger: "Logger",
  status: "Status tindakan",
  kelas: "Kelas",
  lama_perawatan: "Lama perawatan",
  level: "Level",
  perolehan: "Perolehan",
  kelas_pembiayaan: "Kelas pembiayaan",
  tarif_tindakan: "Tarif tindakan",
  consumable: "Consumable",
  total: "Perolehan BPJS",
  krs: "Total KRS",
  selisih: "Selisih (Perolehan BPJS − Total KRS)",
  resume: "Resume",
  pemakaian: "Pemakaian (teks)",
  id: "ID tindakan",
  created_at: "Dibuat",
  updated_at: "Diperbarui",
};

/** Kunci field UI → nama kolom di baris API (bila berbeda). */
const WIREFRAME_FIELD_SOURCE: Partial<Record<string, string>> = {
  tanggal_tindakan: "tanggal",
};

export function getWireframeFieldValue(
  record: Record<string, unknown>,
  fieldKey: string,
): unknown {
  const sourceKey = WIREFRAME_FIELD_SOURCE[fieldKey] ?? fieldKey;
  return record[sourceKey];
}

function formatTanggalDdMmYyyy(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  const raw =
    typeof value === "string"
      ? value.trim()
      : value instanceof Date
        ? value.toISOString().slice(0, 10)
        : String(value).trim();
  if (!raw) return "—";

  const ymd = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) {
    return `${ymd[3]}-${ymd[2]}-${ymd[1]}`;
  }

  const d = Date.parse(raw);
  if (Number.isFinite(d)) {
    const dt = new Date(d);
    const dd = String(dt.getDate()).padStart(2, "0");
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const yyyy = String(dt.getFullYear());
    return `${dd}-${mm}-${yyyy}`;
  }

  const dmy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmy) {
    return `${dmy[1].padStart(2, "0")}-${dmy[2].padStart(2, "0")}-${dmy[3]}`;
  }

  return raw;
}

function formatAuditTimestamp(value: unknown): string | null {
  const raw =
    typeof value === "string"
      ? value
      : value instanceof Date
        ? value.toISOString()
        : value != null
          ? String(value)
          : "";
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const d = Date.parse(trimmed);
  if (!Number.isFinite(d)) return trimmed;
  return new Date(d).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Kolom rupiah di drawer (tab Biaya, ringkasan) — tampil dengan prefiks Rp */
const WIREFRAME_MONEY_KEYS = new Set([
  "total",
  "krs",
  "tarif_tindakan",
  "selisih",
  "consumable",
]);

function parseWireframeNumeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const t = value
      .trim()
      .replace(/^rp\.?\s*/i, "")
      .trim()
      .replace(/\s/g, "")
      .replace(/\./g, "")
      .replace(/,/g, ".");
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function formatFieldValue(key: string, value: unknown): string {
  if (key === "jenis_kelamin") {
    return formatJenisKelaminDisplay(normalizeJenisKelamin(value));
  }
  if (key === "tanggal_tindakan") {
    return formatTanggalDdMmYyyy(value);
  }
  if (["created_at", "updated_at", "inserted_at"].includes(key)) {
    const formatted = formatAuditTimestamp(value);
    return formatted ?? "—";
  }
  if (key === "fluoro_time") {
    if (value === null || value === undefined || value === "") return "—";
    const n =
      typeof value === "number"
        ? value
        : Number(String(value).trim().replace(",", "."));
    if (!Number.isFinite(n)) return "—";
    return formatFluoroSecondsToHms(n);
  }
  if (key === "waktu") {
    if (value === null || value === undefined || value === "") return "—";
    const s = formatWaktuDisplay(value);
    return s || "—";
  }
  if (value === null || value === undefined || value === "") return "—";

  if (WIREFRAME_MONEY_KEYS.has(key)) {
    const n = parseWireframeNumeric(value);
    if (n != null) return `Rp ${n.toLocaleString("id-ID")}`;
    if (
      key === "krs" &&
      value != null &&
      String(value).trim() !== ""
    ) {
      return String(value).trim();
    }
    return "—";
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    if (key === "dose") {
      return value.toLocaleString("id-ID");
    }
    return String(value);
  }
  return String(value);
}
