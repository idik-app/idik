import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import type { TindakanJoinResult } from "../bridge/mapping.types";
import {
  displayNamaPasien,
  displayRm,
  formatJenisKelaminDisplay,
  resolveJenisKelaminFromRow,
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

export function buildTindakanHariIniReportHtml(opts: {
  tanggalIso: string;
  tanggalLabel: string;
  rows: readonly TindakanJoinResult[];
}): string {
  const bodyRows = opts.rows
    .map((rec, i) => {
      const raw = rec as unknown as Record<string, unknown>;
      const jk = resolveJenisKelaminFromRow(raw, null);
      const dokter = String(rec.dokter ?? "").trim() || "—";
      const tindakan = String(rec.tindakan ?? "").trim() || "—";
      const ruangan = String(rec.ruangan ?? "").trim() || "—";
      return `<tr>
  <td class="num">${i + 1}</td>
  <td class="num">${escapeHtml(String(rec.tanggal ?? "").slice(0, 10) || "—")}</td>
  <td class="num">${escapeHtml(String(rec.fast_track_time_out ?? "").trim() || "—")}</td>
  <td class="num">${escapeHtml(displayRm(raw))}</td>
  <td>${escapeHtml(normalizeNamaPasien(displayNamaPasien(raw)))}</td>
  <td class="num">${escapeHtml(formatJenisKelaminDisplay(jk))}</td>
  <td>${escapeHtml(dokter)}</td>
  <td>${escapeHtml(tindakan)}</td>
  <td>${escapeHtml(ruangan)}</td>
</tr>`;
    })
    .join("\n");

  const table = `<table>
<thead><tr>
  <th>No</th><th>Tanggal</th><th>Time out</th><th>RM</th><th>Nama</th><th>JK</th><th>Dokter</th><th>Tindakan</th><th>Ruangan</th>
</tr></thead>
<tbody>
${bodyRows || `<tr><td colspan="9" class="num">Tidak ada data.</td></tr>`}
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
