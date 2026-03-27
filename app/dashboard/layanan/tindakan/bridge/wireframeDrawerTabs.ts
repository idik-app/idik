/**
 * 6 tab ringkas — selaras docs/wireframe-dashboard-perawat.md (Fase 1).
 * Tab 6 menyertakan jembatan ke modul Pemakaian (bukan embed penuh).
 */

export type WireframeTabId =
  | "pasien"
  | "lokasi"
  | "tim"
  | "radiologi"
  | "klinis"
  | "admin_ringkas";

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
    fields: ["no_rm", "nama_pasien", "tgl_lahir", "umur", "alamat", "no_telp"],
  },
  {
    id: "lokasi",
    label: "Tindakan & lokasi",
    short: "Tin",
    fields: ["tindakan", "kategori", "ruangan", "cath"],
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
    fields: ["fluoro_time", "dose", "kv", "ma"],
  },
  {
    id: "klinis",
    label: "Klinis",
    short: "Klin",
    fields: ["diagnosa", "severity_level", "hasil_lab_ppm"],
  },
  {
    id: "admin_ringkas",
    label: "Sesi & biaya",
    short: "Sesi",
    fields: [
      "no",
      "tanggal",
      "waktu",
      "status_duplikat",
      "status",
      "kelas",
      "lama_perawatan",
      "level",
      "perolehan",
      "kelas_pembiayaan",
      "pembiayaan",
      "tarif_tindakan",
      "total",
      "krs",
      "selisih",
      "consumable",
      "resume",
      "pemakaian",
    ],
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
  tgl_lahir: "Tgl lahir",
  umur: "Umur",
  alamat: "Alamat",
  no_telp: "No. telp",
  ruangan: "Ruangan",
  cath: "Cath",
  dokter: "Dokter",
  tindakan: "Tindakan",
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
  pembiayaan: "Pembiayaan",
  tarif_tindakan: "Tarif tindakan",
  consumable: "Consumable",
  total: "Total",
  krs: "KRS",
  selisih: "Selisih",
  resume: "Resume",
  pemakaian: "Pemakaian (teks)",
};

export function formatFieldValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number" && Number.isFinite(value)) {
    if (["dose", "total", "tarif_tindakan", "selisih", "consumable"].includes(key)) {
      return value.toLocaleString("id-ID");
    }
    return String(value);
  }
  return String(value);
}
