import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import type { TindakanJoinResult } from "../bridge/mapping.types";
import { tanggalBarisKeYmdWib } from "./tanggalBarisWib";
import {
  displayNamaPasien,
  displayRm,
  formatJenisKelaminDisplay,
  resolveJenisKelaminFromRow,
  resolvePasienFromRow,
  type PasienOption,
} from "./displayTindakanRow";
import { normalizeNamaPasien } from "@/app/dashboard/pasien/utils/normalizeNamaPasien";
import { parseFastTrackFotosUrls } from "./fastTrackFotos";
import {
  LAB_TINDAKAN_ROW_LABELS,
  type LabTerbanyakMatrix,
  hasAnyLainnya,
} from "./tindakanTerbanyakLab";
import type { MonthlyMatrixAgg } from "./tindakanBulananMatrix";
import { weekdaySun0Wib } from "./tindakanBulananMatrix";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseEpochMs(raw: unknown): number | null {
  const t = String(raw ?? "").trim();
  if (!t) return null;
  const d = Date.parse(t);
  return Number.isFinite(d) ? d : null;
}

function formatWaktuReport(raw: string | null | undefined): string {
  const t = String(raw ?? "").trim();
  if (!t) return "—";
  const ms = parseEpochMs(t);
  if (ms == null) return escapeHtml(t);
  return escapeHtml(
    format(new Date(ms), "d MMM yyyy, HH:mm", { locale: idLocale }),
  );
}

function nowWibLabel(): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date());
}

const REPORT_CSS = `
  * { box-sizing: border-box; }
  body { font-family: system-ui, Segoe UI, Roboto, Arial, sans-serif; color: #111; margin: 0; padding: 16px; font-size: 11px; }
  h1 { font-size: 16px; margin: 0 0 4px; text-align: center; letter-spacing: 0.02em; }
  .sub { text-align: center; font-size: 11px; color: #333; margin: 0 0 8px; }
  .meta { font-size: 10px; color: #444; margin-bottom: 12px; text-align: center; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { border: 1px solid #222; padding: 4px 6px; vertical-align: top; }
  th { background: #f0f0f0; font-size: 9px; text-transform: uppercase; letter-spacing: 0.04em; }
  td { font-size: 10px; }
  .num { text-align: center; font-variant-numeric: tabular-nums; }
  .imgcell img { width: 48px; height: 48px; object-fit: cover; border: 1px solid #ccc; margin: 1px; }
  @media print {
    body { padding: 8px; }
    @page { size: A4 landscape; margin: 10mm; }
  }
`;

export function wrapReportHtmlDocument(opts: {
  title: string;
  subtitleLines: string[];
  bodyInnerHtml: string;
}): string {
  const sub = opts.subtitleLines.map((l) => escapeHtml(l)).join("<br/>");
  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(opts.title)}</title>
<style>${REPORT_CSS}</style>
</head>
<body>
  <h1>${escapeHtml(opts.title)}</h1>
  ${sub ? `<p class="sub">${sub}</p>` : ""}
  <p class="meta">Dicetak: ${escapeHtml(nowWibLabel())} · IDIK Cathlab</p>
  ${opts.bodyInnerHtml}
</body>
</html>`;
}

export type FastTrackReportFilters = {
  monthYyyyMm: string;
  filterDokter: string;
  filterTindakan: string;
  igdFrom: string;
  igdTo: string;
  d2bFrom: string;
  d2bTo: string;
};

export function buildFastTrackReportHtml(
  rows: readonly TindakanJoinResult[],
  filters: FastTrackReportFilters,
): string {
  const filterLines: string[] = [];
  if (filters.monthYyyyMm.trim())
    filterLines.push(`Bulan: ${filters.monthYyyyMm}`);
  if (filters.filterDokter.trim())
    filterLines.push(`Dokter: ${filters.filterDokter}`);
  if (filters.filterTindakan.trim())
    filterLines.push(`Tindakan: ${filters.filterTindakan}`);
  if (filters.igdFrom.trim())
    filterLines.push(`IGD dari: ${filters.igdFrom}`);
  if (filters.igdTo.trim())
    filterLines.push(`IGD sampai: ${filters.igdTo}`);
  if (filters.d2bFrom.trim())
    filterLines.push(`D2B dari: ${filters.d2bFrom}`);
  if (filters.d2bTo.trim())
    filterLines.push(`D2B sampai: ${filters.d2bTo}`);
  filterLines.push(`Total baris: ${rows.length}`);

  const bodyRows = rows
    .map((rec, i) => {
      const raw = rec as unknown as Record<string, unknown>;
      const jk = resolveJenisKelaminFromRow(raw, null);
      const fotos = parseFastTrackFotosUrls(rec.fast_track_fotos);
      const imgs =
        fotos.length === 0
          ? "—"
          : fotos
              .map(
                (u) =>
                  `<img src="${escapeHtml(u)}" alt="" crossorigin="anonymous"/>`,
              )
              .join(" ");
      return `<tr>
  <td class="num">${i + 1}</td>
  <td class="imgcell">${imgs}</td>
  <td class="num">${escapeHtml(String(rec.tanggal ?? "").slice(0, 10) || "—")}</td>
  <td class="num">${escapeHtml(displayRm(raw))}</td>
  <td>${escapeHtml(normalizeNamaPasien(displayNamaPasien(raw)))}</td>
  <td class="num">${escapeHtml(formatJenisKelaminDisplay(jk))}</td>
  <td class="num">${escapeHtml(String(rec.tgl_lahir ?? "").trim().slice(0, 10) || "—")}</td>
  <td class="num">${rec.umur != null ? escapeHtml(String(rec.umur)) : "—"}</td>
  <td>${escapeHtml(String(rec.alamat ?? "").trim() || "—")}</td>
  <td>${escapeHtml(String(rec.no_telp ?? "").trim() || "—")}</td>
  <td>${escapeHtml(String(rec.dokter ?? "").trim() || "—")}</td>
  <td>${escapeHtml(String(rec.tindakan ?? "").trim() || "—")}</td>
  <td>${formatWaktuReport(rec.pasien_datang_igd)}</td>
  <td>${formatWaktuReport(rec.door_to_balloon)}</td>
  <td class="num">${escapeHtml(String(rec.total_waktu_fast_track ?? "").trim() || "—")}</td>
</tr>`;
    })
    .join("\n");

  const table = `<table>
<thead><tr>
  <th>No</th><th>Foto</th><th>Tanggal</th><th>RM</th><th>Nama</th><th>JK</th><th>Lahir</th><th>Umur</th>
  <th>Alamat</th><th>Telp</th><th>Dokter</th><th>Tindakan</th>
  <th>Pasien tiba IGD</th><th>Door-to-balloon</th><th>Total waktu</th>
</tr></thead>
<tbody>
${bodyRows || `<tr><td colspan="15" class="num">Tidak ada data.</td></tr>`}
</tbody>
</table>`;

  return wrapReportHtmlDocument({
    title: "LAPORAN FAST-TRACK (IGD → CATHLAB)",
    subtitleLines: filterLines,
    bodyInnerHtml: table,
  });
}

export function buildFastTrackWhatsAppText(
  rows: readonly TindakanJoinResult[],
  filters: FastTrackReportFilters,
): string {
  const lines: string[] = [
    "*LAPORAN FAST-TRACK (IGD → CATHLAB)*",
    "",
    `Bulan: ${filters.monthYyyyMm || "—"}`,
  ];
  if (filters.filterDokter.trim()) {
    lines.push(`Dokter: ${filters.filterDokter}`);
  }
  if (filters.filterTindakan.trim()) {
    lines.push(`Tindakan: ${filters.filterTindakan}`);
  }
  lines.push(`Total: ${rows.length} baris`, "");

  const maxRows = 25;
  rows.slice(0, maxRows).forEach((rec, i) => {
    const raw = rec as unknown as Record<string, unknown>;
    const nama = normalizeNamaPasien(displayNamaPasien(raw));
    const rm = displayRm(raw);
    const igd = String(rec.pasien_datang_igd ?? "").trim() || "—";
    const d2b = String(rec.door_to_balloon ?? "").trim() || "—";
    lines.push(
      `${i + 1}. RM ${rm} · ${nama}`,
      `   IGD: ${igd} | D2B: ${d2b}`,
    );
  });
  if (rows.length > maxRows) {
    lines.push("", `… +${rows.length - maxRows} baris lainnya (buka aplikasi / unduh HTML).`);
  }
  return lines.join("\n");
}

/**
 * Ekspor data Fast-Track ke format Excel (.xlsx)
 */
export function downloadFastTrackExcel(
  rows: readonly TindakanJoinResult[],
  filename: string,
): void {
  const data = rows.map((rec, i) => {
    const raw = rec as unknown as Record<string, unknown>;
    const jk = resolveJenisKelaminFromRow(raw, null);
    return {
      No: i + 1,
      Tanggal: String(rec.tanggal ?? "").slice(0, 10) || "—",
      RM: displayRm(raw),
      Nama: normalizeNamaPasien(displayNamaPasien(raw)),
      JK: formatJenisKelaminDisplay(jk),
      Lahir: String(rec.tgl_lahir ?? "").trim().slice(0, 10) || "—",
      Umur: rec.umur ?? "—",
      Alamat: String(rec.alamat ?? "").trim() || "—",
      Telp: String(rec.no_telp ?? "").trim() || "—",
      Dokter: String(rec.dokter ?? "").trim() || "—",
      Tindakan: String(rec.tindakan ?? "").trim() || "—",
      "Pasien Tiba IGD": rec.pasien_datang_igd || "—",
      "Door to Balloon": rec.door_to_balloon || "—",
      "Total Waktu": rec.total_waktu_fast_track || "—",
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "FastTrack");

  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const finalBlob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(finalBlob, `${filename.replace(".html", "")}.xlsx`);
}

/**
 * Ekspor data Pemakaian Alkes ke format Excel (.xlsx)
 */
export function downloadPemakaianAlkesExcel(opts: {
  rows: readonly TindakanJoinResult[];
  filename: string;
  parsePemakaian: (txt: string) => {
    STENT: string[];
    BALLOON: string[];
    ALKES_LAINNYA: string[];
  };
}): void {
  const data = opts.rows.map((rec, i) => {
    const raw = rec as unknown as Record<string, unknown>;
    const parsed = opts.parsePemakaian(String(rec.pemakaian ?? ""));
    return {
      No: i + 1,
      Tanggal: tanggalBarisKeYmdWib(rec.tanggal) || "—",
      RM: displayRm(raw),
      Nama: normalizeNamaPasien(displayNamaPasien(raw)),
      Dokter: rec.dokter || "—",
      STENT: parsed.STENT.join("\n"),
      BALLOON: parsed.BALLOON.join("\n"),
      "ALKES LAINNYA": parsed.ALKES_LAINNYA.join("\n"),
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "PemakaianAlkes");

  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const finalBlob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(finalBlob, `${opts.filename.replace(".html", "")}.xlsx`);
}

export function buildPemakaianAlkesReportHtml(opts: {
  rows: readonly TindakanJoinResult[];
  subtitleLines: string[];
  parsePemakaian: (txt: string) => {
    STENT: string[];
    BALLOON: string[];
    ALKES_LAINNYA: string[];
  };
}): string {
  const bodyRows = opts.rows
    .map((rec, i) => {
      const raw = rec as unknown as Record<string, unknown>;
      const nama = normalizeNamaPasien(displayNamaPasien(raw));
      const rm = displayRm(raw);
      const rawPemakaian = String(rec.pemakaian ?? "");
      const parsed = opts.parsePemakaian(rawPemakaian);

      const formatBlock = (blocks: string[]) =>
        blocks
          .join("\n\n")
          .replace(/\n/g, "<br/>")
          .replace(
            /\[KONSOLIDASI\]/gi,
            '<strong style="color:#10b981; font-size: 0.8em;">[KONSOLIDASI]</strong>',
          )
          .replace(
            /\bNON KONSOLIDASI\b/gi,
            '<strong style="color:#3b82f6; font-size: 0.8em;">NON KONSOLIDASI</strong>',
          );

      return `<tr>
        <td class="num">${i + 1}</td>
        <td class="num">${tanggalBarisKeYmdWib(rec.tanggal) || "—"}</td>
        <td><strong>${escapeHtml(nama)}</strong><br/><small>${escapeHtml(rm)}</small></td>
        <td>${escapeHtml(rec.dokter || "—")}</td>
        <td style="white-space: pre-wrap;">${formatBlock(parsed.STENT) || "—"}</td>
        <td style="white-space: pre-wrap;">${formatBlock(parsed.BALLOON) || "—"}</td>
        <td style="white-space: pre-wrap;">${formatBlock(parsed.ALKES_LAINNYA) || "—"}</td>
      </tr>`;
    })
    .join("\n");

  const table = `<table>
    <thead>
      <tr>
        <th style="width:40px">No</th>
        <th style="width:100px">Tanggal</th>
        <th style="width:180px">Pasien / RM</th>
        <th style="width:150px">Dokter</th>
        <th style="width:200px">STENT</th>
        <th style="width:200px">BALLOON</th>
        <th>ALKES LAINNYA</th>
      </tr>
    </thead>
    <tbody>
      ${bodyRows || '<tr><td colspan="7" class="num">Tidak ada data pemakaian.</td></tr>'}
    </tbody>
  </table>`;

  return wrapReportHtmlDocument({
    title: "LAPORAN PEMAKAIAN ALKES (CATHLAB)",
    subtitleLines: opts.subtitleLines,
    bodyInnerHtml: table,
  });
}

export function buildPemakaianAlkesWhatsAppText(opts: {
  rows: readonly TindakanJoinResult[];
  subtitleLines: string[];
  parsePemakaian: (txt: string) => {
    STENT: string[];
    BALLOON: string[];
    ALKES_LAINNYA: string[];
  };
}): string {
  const lines = [
    "*LAPORAN PEMAKAIAN ALKES (CATHLAB)*",
    "",
    ...opts.subtitleLines,
    "",
  ];

  opts.rows.slice(0, 20).forEach((r, i) => {
    const raw = r as unknown as Record<string, unknown>;
    const nama = normalizeNamaPasien(displayNamaPasien(raw));
    const ymd = tanggalBarisKeYmdWib(r.tanggal);
    const tgl = ymd.length >= 10 ? ymd.slice(5, 10) : "—"; // MM-DD
    const parsed = opts.parsePemakaian(String(r.pemakaian ?? ""));
    const allItems = [
      ...parsed.STENT,
      ...parsed.BALLOON,
      ...parsed.ALKES_LAINNYA,
    ];
    const pemakaian = allItems
      .join(", ")
      .replace(/\n/g, " ")
      .replace(/\s+/g, " ");
    lines.push(`${i + 1}. [${tgl}] ${nama}: ${pemakaian}`);
  });

  if (opts.rows.length > 20) {
    lines.push("", `... +${opts.rows.length - 20} lainnya.`);
  }

  return lines.join("\n");
}

export function buildTindakanHariIniReportHtml(opts: {
  tanggalIso: string;
  tanggalLabel: string;
  rows: readonly TindakanJoinResult[];
  pasienOptions?: PasienOption[];
}): string {
  const bodyRows = opts.rows
    .map((rec, i) => {
      const raw = rec as unknown as Record<string, unknown>;
      const p = opts.pasienOptions ? resolvePasienFromRow(opts.pasienOptions, raw) : null;
      const jk = resolveJenisKelaminFromRow(raw, p);
      const dokter = String(rec.dokter ?? "").trim() || "—";
      const tindakan = String(rec.tindakan ?? "").trim() || "—";
      const rs_perujuk = String(rec.rs_perujuk ?? "").trim() || "—";
      const keterangan = String(rec.keterangan ?? "").trim() || "—";
      const ruangan = String(rec.ruangan ?? "").trim() || "—";
      return `<tr>
  <td class="num">${i + 1}</td>
  <td class="num">${escapeHtml(String(rec.tanggal ?? "").slice(0, 10) || "—")}</td>
  <td class="num">${escapeHtml(String(rec.fast_track_time_out ?? "").trim() || "—")}</td>
  <td class="num">${escapeHtml(displayRm(raw))}</td>
  <td>${escapeHtml(normalizeNamaPasien(displayNamaPasien(raw)))}</td>
  <td class="num">${escapeHtml(formatJenisKelaminDisplay(jk))}</td>
  <td>${escapeHtml(rs_perujuk)}</td>
  <td>${escapeHtml(keterangan)}</td>
  <td>${escapeHtml(dokter)}</td>
  <td>${escapeHtml(tindakan)}</td>
  <td>${escapeHtml(ruangan)}</td>
</tr>`;
    })
    .join("\n");

  const table = `<table>
<thead><tr>
  <th>No</th><th>Tanggal</th><th>Time out</th><th>RM</th><th>Nama</th><th>JK</th><th>RS Perujuk</th><th>Keterangan</th><th>Dokter</th><th>Tindakan</th><th>Ruangan</th>
</tr></thead>
<tbody>
${bodyRows || `<tr><td colspan="10" class="num">Tidak ada data.</td></tr>`}
</tbody>
</table>`;

  return wrapReportHtmlDocument({
    title: "LAPORAN TINDAKAN HARI INI",
    subtitleLines: [`Tanggal: ${opts.tanggalLabel}`, `Total: ${opts.rows.length} baris`],
    bodyInnerHtml: table,
  });
}

export function buildTindakanHariIniWhatsAppText(
  tanggalLabel: string,
  rows: readonly TindakanJoinResult[],
): string {
  const lines: string[] = [
    "*LAPORAN TINDAKAN HARI INI*",
    "",
    `Tanggal: ${tanggalLabel}`,
    `Total: ${rows.length} baris`,
    "",
  ];
  const maxRows = 30;
  rows.slice(0, maxRows).forEach((rec, i) => {
    const raw = rec as unknown as Record<string, unknown>;
    const nama = normalizeNamaPasien(displayNamaPasien(raw));
    const rm = displayRm(raw);
    const dokter = String(rec.dokter ?? "").trim() || "—";
    const tind = String(rec.tindakan ?? "").trim() || "—";
    lines.push(`${i + 1}. ${nama} (RM ${rm}) — ${tind} — ${dokter}`);
  });
  if (rows.length > maxRows) {
    lines.push("", `… +${rows.length - maxRows} baris lainnya.`);
  }
  return lines.join("\n");
}

function formatMatrixCellCount(n: number): string {
  return n === 0 ? "—" : String(n);
}

export function buildTindakanTerbanyakLabHtml(
  matrix: LabTerbanyakMatrix,
  subtitleLines: string[],
): string {
  const yearTh = matrix.years
    .map((y) => `<th class="num">${escapeHtml(String(y))}</th>`)
    .join("");

  const rowsHtml: string[] = [];
  for (const label of LAB_TINDAKAN_ROW_LABELS) {
    const arr = matrix.countsByLabel[label] ?? matrix.years.map(() => 0);
    const cells = arr
      .map((c) => `<td class="num">${formatMatrixCellCount(c)}</td>`)
      .join("");
    rowsHtml.push(
      `<tr><th scope="row" style="text-align:left">${escapeHtml(label)}</th>${cells}</tr>`,
    );
  }
  if (hasAnyLainnya(matrix.lainnyaPerYear)) {
    const cells = matrix.lainnyaPerYear
      .map((c) => `<td class="num">${formatMatrixCellCount(c)}</td>`)
      .join("");
    rowsHtml.push(
      `<tr><th scope="row" style="text-align:left">${escapeHtml("Lainnya")}</th>${cells}</tr>`,
    );
  }
  const totalCells = matrix.totalsPerYear
    .map(
      (c) =>
        `<td class="num"><strong>${formatMatrixCellCount(c)}</strong></td>`,
    )
    .join("");
  rowsHtml.push(
    `<tr><th scope="row" style="text-align:left">${escapeHtml("JUMLAH")}</th>${totalCells}</tr>`,
  );

  const ny = matrix.years.length;
  const table =
    ny === 0
      ? `<p class="num">Tidak ada rentang tahun.</p>`
      : `<table>
<thead>
<tr>
  <th rowspan="2">TINDAKAN</th>
  <th class="num" colspan="${ny}">TAHUN</th>
</tr>
<tr>
${yearTh}
</tr>
</thead>
<tbody>
${rowsHtml.join("\n")}
</tbody>
</table>`;

  return wrapReportHtmlDocument({
    title: "TINDAKAN TERBANYAK DI LABORATORIUM KATETERISASI",
    subtitleLines,
    bodyInnerHtml: table,
  });
}

export function buildTindakanTerbanyakLabWhatsAppText(
  matrix: LabTerbanyakMatrix,
  subtitleLines: string[],
): string {
  const lines = [
    "*TINDAKAN TERBANYAK — LAB KATETER*",
    "",
    ...subtitleLines,
    "",
  ];
  const yh = matrix.years.join("\t");
  lines.push(`TINDAKAN\t${yh}`);
  for (const label of LAB_TINDAKAN_ROW_LABELS) {
    const arr = matrix.countsByLabel[label] ?? matrix.years.map(() => 0);
    lines.push(
      `${label}\t${arr.map((c) => (c === 0 ? "-" : String(c))).join("\t")}`,
    );
  }
  if (hasAnyLainnya(matrix.lainnyaPerYear)) {
    lines.push(
      `Lainnya\t${matrix.lainnyaPerYear.map((c) => (c === 0 ? "-" : String(c))).join("\t")}`,
    );
  }
  lines.push(
    `JUMLAH\t${matrix.totalsPerYear.map((c) => (c === 0 ? "-" : String(c))).join("\t")}`,
  );
  return lines.join("\n");
}

function formatBulanTahunId(year: number, month1to12: number): string {
  const d = new Date(year, month1to12 - 1, 1);
  return format(d, "MMMM yyyy", { locale: idLocale });
}

function formatMatrixDayCell(n: number): string {
  return n === 0 ? "—" : String(n);
}

function buildMonthlyMatrixTableHtml(
  matrix: MonthlyMatrixAgg,
  yAxisHeader: string,
): string {
  const { year, month1to12, daysInMonth, rowLabels, data, rowTotals, colTotals } =
    matrix;
  const dayTh: string[] = [];
  for (let d = 1; d <= daysInMonth; d += 1) {
    const wd = weekdaySun0Wib(year, month1to12, d);
    const wk = wd === 0 || wd === 6 ? " weekend" : "";
    dayTh.push(
      `<th class="num${wk}" scope="col">${escapeHtml(String(d))}</th>`,
    );
  }

  const bodyRows: string[] = [];
  for (let r = 0; r < rowLabels.length; r += 1) {
    const label = rowLabels[r]!;
    const cells = data[r] ?? [];
    const tds = cells
      .map((c) => `<td class="num">${formatMatrixDayCell(c)}</td>`)
      .join("");
    const rt = rowTotals[r] ?? 0;
    bodyRows.push(
      `<tr><th scope="row" style="text-align:left">${escapeHtml(label)}</th>${tds}<td class="num"><strong>${formatMatrixDayCell(rt)}</strong></td></tr>`,
    );
  }

  const jumlahTds = colTotals
    .map((c) => `<td class="num"><strong>${formatMatrixDayCell(c)}</strong></td>`)
    .join("");
  bodyRows.push(
    `<tr><th scope="row" style="text-align:left">${escapeHtml("JUMLAH")}</th>${jumlahTds}<td class="num"><strong>${formatMatrixDayCell(matrix.grandTotal)}</strong></td></tr>`,
  );

  const extraCss = `
  th.weekend, td.weekend { background: #f3f4f6; }
  @media print { th.weekend, td.weekend { background: #e5e7eb !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
`;

  const table = `<table>
<thead>
<tr>
  <th rowspan="2" scope="col">${escapeHtml(yAxisHeader)}</th>
  <th class="num" colspan="${daysInMonth}">TANGGAL (BULAN)</th>
  <th rowspan="2" class="num" scope="col">${escapeHtml("JUMLAH")}</th>
</tr>
<tr>
${dayTh.join("\n")}
</tr>
</thead>
<tbody>
${bodyRows.join("\n")}
</tbody>
</table>`;

  return `<style>${extraCss}</style>${table}`;
}

export function buildBulananJenisOperasiHtml(
  matrix: MonthlyMatrixAgg,
  subtitleLines: string[],
): string {
  const bulan = formatBulanTahunId(matrix.year, matrix.month1to12);
  const sub = [`BULAN : ${bulan}`, ...subtitleLines];
  return wrapReportHtmlDocument({
    title: "LAPORAN JENIS OPERASI / TINDAKAN CATHLAB",
    subtitleLines: sub,
    bodyInnerHtml: buildMonthlyMatrixTableHtml(matrix, "TINDAKAN"),
  });
}

export function buildBulananCaraBayarHtml(
  matrix: MonthlyMatrixAgg,
  subtitleLines: string[],
): string {
  const bulan = formatBulanTahunId(matrix.year, matrix.month1to12);
  const sub = [`BULAN : ${bulan}`, ...subtitleLines];
  return wrapReportHtmlDocument({
    title: "LAPORAN CARA BAYAR CATHLAB",
    subtitleLines: sub,
    bodyInnerHtml: buildMonthlyMatrixTableHtml(matrix, "CARA BAYAR"),
  });
}

export function buildBulananMatrixWhatsAppText(
  reportTitle: string,
  matrix: MonthlyMatrixAgg,
  subtitleLines: string[],
): string {
  const bulan = formatBulanTahunId(matrix.year, matrix.month1to12);
  const lines = [
    `*${reportTitle}*`,
    "",
    `BULAN : ${bulan}`,
    ...subtitleLines,
    "",
  ];
  const dayHdr = Array.from({ length: matrix.daysInMonth }, (_, i) =>
    String(i + 1),
  ).join("\t");
  lines.push(`\t${dayHdr}\tJUMLAH`);
  for (let r = 0; r < matrix.rowLabels.length; r += 1) {
    const row = matrix.data[r] ?? [];
    const cells = row.map((c) => (c === 0 ? "-" : String(c))).join("\t");
    lines.push(
      `${matrix.rowLabels[r]}\t${cells}\t${matrix.rowTotals[r] ?? 0}`,
    );
  }
  const jum = matrix.colTotals
    .map((c) => (c === 0 ? "-" : String(c)))
    .join("\t");
  lines.push(`JUMLAH\t${jum}\t${matrix.grandTotal}`);
  return lines.join("\n");
}

export function buildAnalisisGabunganHtml(
  rows: readonly TindakanJoinResult[],
  subtitleLines: string[],
): string {
  const bodyRows = rows
    .map((r, i) => {
      const raw = r as unknown as Record<string, unknown>;
      const nama = normalizeNamaPasien(displayNamaPasien(raw));
      const rm = displayRm(raw);
      return `<tr>
        <td class="num">${i + 1}</td>
        <td class="num">${escapeHtml(String(r.tanggal ?? "").slice(0, 10) || "—")}</td>
        <td><strong>${escapeHtml(nama)}</strong><br/><small>RM: ${escapeHtml(rm)}</small></td>
        <td>${escapeHtml(r.tindakan || "—")}</td>
        <td>${escapeHtml(r.kategori || "—")}</td>
        <td>${escapeHtml(r.dokter || "—")}</td>
        <td>${escapeHtml(r.diagnosa || "—")}</td>
        <td>${escapeHtml(r.status || "—")}</td>
      </tr>`;
    })
    .join("\n");

  const table = `<table>
    <thead>
      <tr>
        <th>No</th>
        <th>Tanggal</th>
        <th>Pasien / RM</th>
        <th>Tindakan</th>
        <th>Kategori</th>
        <th>Dokter</th>
        <th>Diagnosa</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${bodyRows || '<tr><td colspan="8" class="num">Tidak ada data.</td></tr>'}
    </tbody>
  </table>`;

  return wrapReportHtmlDocument({
    title: "LAPORAN ANALISIS GABUNGAN TINDAKAN CATHLAB",
    subtitleLines,
    bodyInnerHtml: table,
  });
}

export function buildAnalisisGabunganWhatsAppText(
  rows: readonly TindakanJoinResult[],
  subtitleLines: string[],
): string {
  const lines = [
    "*LAPORAN ANALISIS GABUNGAN TINDAKAN CATHLAB*",
    "",
    ...subtitleLines,
    "",
  ];

  const maxRows = 20;
  rows.slice(0, maxRows).forEach((r, i) => {
    const raw = r as unknown as Record<string, unknown>;
    const nama = normalizeNamaPasien(displayNamaPasien(raw));
    const tgl = String(r.tanggal ?? "").slice(8, 10);
    lines.push(`${i + 1}. [Tgl ${tgl}] ${nama} — ${r.tindakan || "—"} (${r.kategori || "—"})`);
  });

  if (rows.length > maxRows) {
    lines.push("", `... +${rows.length - maxRows} lainnya (buka aplikasi untuk detail).`);
  }

  return lines.join("\n");
}

export function downloadAnalisisGabunganExcel(
  rows: readonly TindakanJoinResult[],
  filename: string,
): void {
  const data = rows.map((r, i) => {
    const raw = r as unknown as Record<string, unknown>;
    return {
      No: i + 1,
      Tanggal: String(r.tanggal ?? "").slice(0, 10) || "—",
      RM: displayRm(raw),
      Nama: normalizeNamaPasien(displayNamaPasien(raw)),
      Tindakan: r.tindakan || "—",
      "RS Perujuk": r.rs_perujuk || "—",
      Keterangan: r.keterangan || "—",
      Kategori: r.kategori || "—",
      Dokter: r.dokter || "—",
      Diagnosa: r.diagnosa || "—",
      Status: r.status || "—",
      Ruangan: r.ruangan || "—",
      Cathlab: r.cath || "—",
      Severity: r.severity_level || "—",
      Asisten: r.asisten || "—",
      Sirkuler: r.sirkuler || "—",
      Logger: r.logger || "—",
      Pembiayaan: r.kelas_pembiayaan || r.pembiayaan || "—",
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "AnalisisGabungan");

  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const finalBlob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(finalBlob, `${filename}.xlsx`);
}

export function downloadMonthlyMatrixExcel(
  matrix: MonthlyMatrixAgg,
  title: string,
  filename: string,
): void {
  const { rowLabels, data, rowTotals, colTotals, grandTotal, daysInMonth } = matrix;

  // Header: Kategori, 1, 2, ..., 31, Total
  const header = [title.split(" ").slice(-1)[0] || "KATEGORI"];
  for (let d = 1; d <= daysInMonth; d++) header.push(String(d));
  header.push("TOTAL");

  const rows = rowLabels.map((label, ri) => {
    const rowData: (string | number)[] = [label];
    for (let di = 0; di < daysInMonth; di++) {
      rowData.push(data[ri][di] || 0);
    }
    rowData.push(rowTotals[ri] || 0);
    return rowData;
  });

  // Baris JUMLAH (Footer)
  const footer = ["JUMLAH"];
  for (let di = 0; di < daysInMonth; di++) {
    footer.push(colTotals[di] || 0);
  }
  footer.push(grandTotal);
  rows.push(footer);

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "LaporanBulanan");

  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const finalBlob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(finalBlob, `${filename}.xlsx`);
}
