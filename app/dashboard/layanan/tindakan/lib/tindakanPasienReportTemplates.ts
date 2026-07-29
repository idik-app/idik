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

export function buildPasienReportHtml(opts: {
  dateRange: string;
  rows: readonly TindakanJoinResult[];
}): string {
  const bodyRows = opts.rows
    .map((row, index) => {
      const nama = displayNamaPasien(row as any);
      const rm = displayRm(row as any);
      const pembiayaan = row.kelas_pembiayaan || row.pembiayaan || "—";
      return `<tr>
        <td class="num">${index + 1}</td>
        <td>${escapeHtml(row.tanggal || "—")}</td>
        <td>${escapeHtml(rm || "—")}</td>
        <td><strong>${escapeHtml(nama || "—")}</strong></td>
        <td>${escapeHtml(row.dokter || "—")}</td>
        <td>${escapeHtml(row.tindakan || "—")}</td>
        <td>${escapeHtml(pembiayaan)}</td>
        <td>${escapeHtml(row.status || "—")}</td>
      </tr>`;
    })
    .join("\n");

  const table = `<table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
    <thead>
      <tr style="background-color: #f1f5f9;">
        <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">NO</th>
        <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">TANGGAL</th>
        <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">NO RM</th>
        <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">NAMA PASIEN</th>
        <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">DOKTER OPERATOR</th>
        <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">TINDAKAN / PROSEDUR</th>
        <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">PEMBIAYAAN</th>
        <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">STATUS</th>
      </tr>
    </thead>
    <tbody>
      ${bodyRows || '<tr><td colspan="8" style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-style: italic; color: #64748b;">Tidak ada data.</td></tr>'}
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
}): string {
  const lines = [
    `*LAPORAN PASIEN CATHLAB*`,
    `Periode: ${opts.dateRange}`,
    `Total: ${opts.rows.length} Pasien`,
    `=============================`,
    "",
  ];

  opts.rows.forEach((row, index) => {
    const nama = displayNamaPasien(row as any);
    const rm = displayRm(row as any);
    const pembiayaan = row.kelas_pembiayaan || row.pembiayaan || "—";
    lines.push(
      `${index + 1}. *${nama}* (${rm})` +
      `\n   - Tgl: ${row.tanggal || "—"}` +
      `\n   - Dokter: ${row.dokter || "—"}` +
      `\n   - Tindakan: ${row.tindakan || "—"}` +
      `\n   - Pembiayaan: ${pembiayaan}` +
      `\n   - Status: ${row.status || "—"}` +
      `\n`
    );
  });

  return lines.join("\n");
}

export function downloadPasienReportExcel(opts: {
  dateRange: string;
  rows: readonly TindakanJoinResult[];
  filename: string;
}): void {
  const data = opts.rows.map((row, index) => ({
    "No": index + 1,
    "Tanggal": row.tanggal || "—",
    "No RM": displayRm(row as any) || "—",
    "Nama Pasien": displayNamaPasien(row as any) || "—",
    "Dokter Operator": row.dokter || "—",
    "Tindakan / Prosedur": row.tindakan || "—",
    "Pembiayaan": row.kelas_pembiayaan || row.pembiayaan || "—",
    "Status": row.status || "—",
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Laporan Pasien");
  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const finalBlob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(finalBlob, `${opts.filename}.xlsx`);
}
