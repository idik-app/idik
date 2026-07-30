import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import type { TindakanJoinResult } from "../bridge/mapping.types";
import { wrapReportHtmlDocument } from "./tindakanReportTemplates";
import { displayNamaPasien, displayRm } from "./displayTindakanRow";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatRupiah(num: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num);
}

export function parseSubPemakaian(txt: string) {
  if (!txt) return { konsolidasi: "", nonKonsolidasi: "", stent: "", balloon: "", lainnya: "" };
  const lines = txt.split("\n").map(l => l.trim()).filter(Boolean);
  
  const stents: string[] = [];
  const balloons: string[] = [];
  const konsolidasi: string[] = [];
  const nonKonsolidasi: string[] = [];
  const lainnya: string[] = [];

  const KONSOLIDASI_KEYWORDS = [
    "argon", "tawada", "dipa", "xience", "onyx", "promus", "synergy", 
    "emerge", "revass", "supraflex", "promus premier", "resolute onyx"
  ];
  
  const NON_KONSOLIDASI_KEYWORDS = [
    "wikaton", "tripatria", "genoss", "supraflex", "sapphire", "simpass"
  ];

  lines.forEach(line => {
    const l = line.toLowerCase();
    
    // Check if stent
    if (l.includes("stent")) {
      stents.push(line);
    } 
    // Check if balloon
    else if (l.includes("balloon") || l.includes("ballon")) {
      balloons.push(line);
    }

    // Check distributor categories
    let isConsolidated = false;
    for (const kw of KONSOLIDASI_KEYWORDS) {
      if (l.includes(kw)) {
        konsolidasi.push(line);
        isConsolidated = true;
        break;
      }
    }

    if (!isConsolidated) {
      let isNonConsolidated = false;
      for (const kw of NON_KONSOLIDASI_KEYWORDS) {
        if (l.includes(kw)) {
          nonKonsolidasi.push(line);
          isNonConsolidated = true;
          break;
        }
      }
      if (!isNonConsolidated && !l.includes("stent") && !l.includes("balloon") && !l.includes("ballon")) {
        lainnya.push(line);
      }
    }
  });

  return {
    stent: stents.join(", "),
    balloon: balloons.join(", "),
    konsolidasi: konsolidasi.join(", "),
    nonKonsolidasi: nonKonsolidasi.join(", "),
    lainnya: lainnya.join(", ")
  };
}

export const ALL_COLUMNS_MAP: Record<string, string> = {
  tanggal: "Tanggal & Waktu",
  no_rm: "No. RM",
  nama_pasien: "Nama Pasien",
  jenis_kelamin: "Jenis Kelamin",
  tgl_lahir: "Tgl Lahir",
  umur: "Umur",
  alamat: "Alamat",
  no_telp: "No. Telp",
  rs_perujuk: "RS Perujuk",
  ruangan: "Ruangan",
  cath: "Cathlab Slot",
  dokter: "Dokter Operator",
  dokter_anestesi: "Dokter Anestesi",
  ppds: "PPDS",
  asisten: "Asisten",
  sirkuler: "Sirkuler",
  logger: "Logger",
  tindakan: "Tindakan / Prosedur",
  kategori: "Kategori Tindakan",
  temuan_pembuluh: "Temuan Pembuluh",
  kesimpulan_laporan: "Kesimpulan Laporan",
  plan_medis: "Plan Medis",
  diagnosa: "Diagnosa Klinis",
  faktor_risiko: "Faktor Risiko",
  severity_level: "Severity Level",
  hasil_lab_ppm: "Hasil Lab PPM",
  total_kontras: "Total Kontras",
  pci_report_link: "PCI Report Link",
  is_fast_track: "Status Fast-Track",
  pasien_datang_igd: "Waktu Pasien Tiba IGD",
  door_to_balloon: "Waktu Door-to-Balloon",
  total_waktu_fast_track: "Total Waktu Fast-Track",
  fast_track_sign_in: "Sign In Fast-Track",
  fast_track_time_out: "Time Out Fast-Track",
  fast_track_sign_out: "Sign Out Fast-Track",
  fluoro_time: "Fluoro Time",
  dose: "Dose (Air Kerma)",
  dap_dose: "DAP Dose",
  kv: "kV",
  ma: "mA",
  accession_no: "Accession No",
  pembiayaan: "Pembiayaan",
  kelas_pembiayaan: "Kelas Pembiayaan",
  tarif_tindakan: "Tarif Tindakan",
  consumable: "Consumable",
  total: "Perolehan BPJS",
  krs: "Total KRS",
  selisih: "Selisih Biaya",
  pemakaian: "Pemakaian Alkes (Semua)",
  pemakaian_konsolidasi: "Alkes Konsolidasi",
  pemakaian_non_konsolidasi: "Alkes Non-Konsolidasi",
  pemakaian_stent: "Alkes Stent",
  pemakaian_balloon: "Alkes Balloon",
  pemakaian_lainnya: "Alkes Lainnya",
  asmed: "Asmed",
  resume_erm: "Resume e-RM",
  sjp: "SJP",
  berkas_laporan: "Berkas Laporan",
  consumable_kelengkapan: "Kelengkapan Consumable",
  billing_simrs: "Billing SIMRS",
  pj_laporan: "PJ Laporan",
  operan_ranap: "Operan Ranap",
  status: "Status",
  status_keterangan: "Keterangan Status / Batal",
  status_duplikat: "Status Duplikat",
  kelas: "Kelas Perawatan",
  lama_perawatan: "Lama Perawatan",
  level: "Level",
  perolehan: "Perolehan",
  resume: "Resume Medis",
  created_at: "Tanggal Dibuat",
  updated_at: "Tanggal Diperbarui",
  inserted_at: "Waktu Input Sistem",
  id: "ID Tindakan (DB)",
  pasien_id: "ID Pasien (DB)",
  sheet_id: "ID Upload Sheet",
  waktu: "Detail Jam Tindakan",
  no: "No. Urutan Dokumen",
  keterangan: "Keterangan",
};

export function formatPasienReportCell(row: TindakanJoinResult, key: string): string {
  switch (key) {
    case "tanggal":
      return row.tanggal || "—";
    case "waktu":
      return row.waktu || "—";
    case "no_rm":
      return displayRm(row as any) || "—";
    case "nama_pasien":
      return displayNamaPasien(row as any) || "—";
    case "jenis_kelamin":
      return row.jenis_kelamin || "—";
    case "tgl_lahir":
      return row.tgl_lahir || "—";
    case "umur":
      return row.umur != null ? `${row.umur} Thn` : "—";
    case "alamat":
      return row.alamat || "—";
    case "no_telp":
      return row.no_telp || "—";
    case "rs_perujuk":
      return row.rs_perujuk || "—";
    case "ruangan":
      return row.ruangan || "—";
    case "cath":
      return row.cath || "—";
    case "dokter":
      return row.dokter || "—";
    case "dokter_anestesi":
      return row.dokter_anestesi || "—";
    case "ppds":
      return row.ppds || "—";
    case "asisten":
      return row.asisten || "—";
    case "sirkuler":
      return row.sirkuler || "—";
    case "logger":
      return row.logger || "—";
    case "tindakan":
      return row.tindakan || "—";
    case "kategori":
      return row.kategori || "—";
    case "temuan_pembuluh":
      return row.temuan_pembuluh || "—";
    case "kesimpulan_laporan":
      return row.kesimpulan_laporan || "—";
    case "plan_medis":
      return row.plan_medis || "—";
    case "diagnosa":
      return row.diagnosa || "—";
    case "faktor_risiko":
      return row.faktor_risiko || "—";
    case "severity_level":
      return row.severity_level || "—";
    case "hasil_lab_ppm":
      return row.hasil_lab_ppm || "—";
    case "total_kontras":
      return row.total_kontras || "—";
    case "pci_report_link":
      return row.pci_report_link || "—";
    case "is_fast_track":
      return row.is_fast_track ? "Ya" : "Tidak";
    case "pasien_datang_igd":
      return row.pasien_datang_igd || "—";
    case "door_to_balloon":
      return row.door_to_balloon || "—";
    case "total_waktu_fast_track":
      return row.total_waktu_fast_track || "—";
    case "fast_track_sign_in":
      return row.fast_track_sign_in || "—";
    case "fast_track_time_out":
      return row.fast_track_time_out || "—";
    case "fast_track_sign_out":
      return row.fast_track_sign_out || "—";
    case "fluoro_time":
      return row.fluoro_time != null ? `${row.fluoro_time} m` : "—";
    case "dose":
      return row.dose != null ? `${row.dose} mGy` : "—";
    case "dap_dose":
      return row.dap_dose != null ? `${row.dap_dose} mGy·cm²` : "—";
    case "dap_gy_cm2":
      return row.dap_gy_cm2 != null ? `${row.dap_gy_cm2} Gy·cm²` : "—";
    case "kv":
      return row.kv != null ? `${row.kv} kV` : "—";
    case "ma":
      return row.ma != null ? `${row.ma} mA` : "—";
    case "accession_no":
      return row.accession_no || "—";
    case "pembiayaan":
      return row.pembiayaan || "—";
    case "kelas_pembiayaan":
      return row.kelas_pembiayaan || "—";
    case "tarif_tindakan":
      return row.tarif_tindakan != null ? formatRupiah(row.tarif_tindakan) : "—";
    case "consumable":
      return row.consumable != null ? formatRupiah(row.consumable) : "—";
    case "total":
      return row.total != null ? formatRupiah(row.total) : "—";
    case "krs":
      return row.krs || "—";
    case "selisih":
      return row.selisih != null ? formatRupiah(row.selisih) : "—";
    case "pemakaian":
      return row.pemakaian || "—";
    case "pemakaian_konsolidasi":
      return parseSubPemakaian(row.pemakaian || "").konsolidasi || "—";
    case "pemakaian_non_konsolidasi":
      return parseSubPemakaian(row.pemakaian || "").nonKonsolidasi || "—";
    case "pemakaian_stent":
      return parseSubPemakaian(row.pemakaian || "").stent || "—";
    case "pemakaian_balloon":
      return parseSubPemakaian(row.pemakaian || "").balloon || "—";
    case "pemakaian_lainnya":
      return parseSubPemakaian(row.pemakaian || "").lainnya || "—";
    case "asmed":
      return row.asmed || "—";
    case "resume_erm":
      return row.resume_erm || "—";
    case "sjp":
      return row.sjp || "—";
    case "berkas_laporan":
      return row.berkas_laporan || "—";
    case "consumable_kelengkapan":
      return row.consumable_kelengkapan || "—";
    case "billing_simrs":
      return row.billing_simrs || "—";
    case "pj_laporan":
      return row.pj_laporan || "—";
    case "operan_ranap":
      return row.operan_ranap || "—";
    case "status":
      return row.status || "—";
    case "status_keterangan":
      return row.status_keterangan || "—";
    case "status_duplikat":
      return row.status_duplikat || "—";
    case "kelas":
      return row.kelas || "—";
    case "lama_perawatan":
      return row.lama_perawatan != null ? `${row.lama_perawatan} Hari` : "—";
    case "level":
      return row.level || "—";
    case "perolehan":
      return row.perolehan || "—";
    case "resume":
      return row.resume || "—";
    case "created_at":
      return row.created_at ? new Date(row.created_at).toLocaleDateString("id-ID") : "—";
    case "updated_at":
      return row.updated_at ? new Date(row.updated_at).toLocaleDateString("id-ID") : "—";
    case "inserted_at":
      return row.inserted_at ? new Date(row.inserted_at).toLocaleDateString("id-ID") : "—";
    case "keterangan":
      return row.keterangan || "—";
    default:
      return (row as any)[key] != null ? String((row as any)[key]) : "—";
  }
}

export function buildPasienReportHtml(opts: {
  dateRange: string;
  rows: readonly TindakanJoinResult[];
  visibleColumns: string[];
}): string {
  const activeCols = opts.visibleColumns.length > 0 ? opts.visibleColumns : ["tanggal", "no_rm", "nama_pasien", "dokter", "tindakan", "pembiayaan", "status"];
  
  const headersHtml = activeCols
    .map(key => `<th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 11px;">${escapeHtml(ALL_COLUMNS_MAP[key] || key.toUpperCase())}</th>`)
    .join("\n");

  const bodyRows = opts.rows
    .map((row, index) => {
      const cellsHtml = activeCols
        .map(key => {
          const val = formatPasienReportCell(row, key);
          const isBold = key === "nama_pasien" || key === "no_rm";
          return `<td style="border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px; ${isBold ? "font-weight: bold;" : ""}">
            ${escapeHtml(val)}
          </td>`;
        })
        .join("\n");

      return `<tr>
        <td class="num" style="border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px; text-align: center; color: #64748b;">${index + 1}</td>
        ${cellsHtml}
      </tr>`;
    })
    .join("\n");

  const table = `<table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-family: sans-serif;">
    <thead>
      <tr style="background-color: #f1f5f9; color: #1e293b;">
        <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-size: 11px; width: 40px;">NO</th>
        ${headersHtml}
      </tr>
    </thead>
    <tbody>
      ${bodyRows || `<tr><td colspan="${activeCols.length + 1}" style="border: 1px solid #cbd5e1; padding: 12px; text-align: center; font-style: italic; color: #64748b;">Tidak ada data.</td></tr>`}
    </tbody>
  </table>`;

  return wrapReportHtmlDocument({
    title: "LAPORAN PASIEN CATHLAB",
    subtitleLines: [`Periode: ${opts.dateRange}`],
    bodyInnerHtml: table,
  });
}

export function buildPasienReportWhatsAppText(opts: {
  dateRange: string;
  rows: readonly TindakanJoinResult[];
  activeFilters?: string[];
}): string {
  const lines = [
    `*LAPORAN PASIEN CATHLAB*`,
    `Periode: ${opts.dateRange}`,
  ];

  if (opts.activeFilters && opts.activeFilters.length > 0) {
    lines.push(...opts.activeFilters);
  }

  lines.push(
    "",
    `Total: ${opts.rows.length} Pasien`
  );

  return lines.join("\n");
}

export function downloadPasienReportExcel(opts: {
  dateRange: string;
  rows: readonly TindakanJoinResult[];
  filename: string;
  visibleColumns: string[];
}): void {
  const activeCols = opts.visibleColumns.length > 0 ? opts.visibleColumns : ["tanggal", "no_rm", "nama_pasien", "dokter", "tindakan", "pembiayaan", "status"];

  const data = opts.rows.map((row, index) => {
    const rowObj: Record<string, any> = {
      "No": index + 1,
    };
    activeCols.forEach(key => {
      const label = ALL_COLUMNS_MAP[key] || key;
      rowObj[label] = formatPasienReportCell(row, key);
    });
    return rowObj;
  });

  const ws = XLSX.utils.json_to_sheet(data);
  
  // Auto-fit column widths
  const colWidths = Object.keys(data[0] || {}).map(key => {
    let maxLen = key.length;
    data.forEach(r => {
      const valStr = String(r[key] || "");
      if (valStr.length > maxLen) maxLen = valStr.length;
    });
    return { wch: Math.min(maxLen + 3, 50) };
  });
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Laporan Pasien");
  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const finalBlob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(finalBlob, `${opts.filename}.xlsx`);
}
