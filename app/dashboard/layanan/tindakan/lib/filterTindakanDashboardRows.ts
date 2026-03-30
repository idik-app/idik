import type { TindakanJoinResult } from "../bridge/mapping.types";

export type AlkesTriFilter = "any" | "yes" | "no";

export type TindakanDashboardFilterState = {
  dateFrom: string;
  dateTo: string;
  dokter: string;
  tindakan: string;
  noRm: string;
  kategori: string;
  stent: AlkesTriFilter;
  ballon: AlkesTriFilter;
};

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

/** Normalisasi ke `yyyy-mm-dd` untuk perbandingan rentang. */
export function rowTanggalToYmd(raw: unknown): string | null {
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
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) {
    const day = m[1].padStart(2, "0");
    const month = m[2].padStart(2, "0");
    const year = m[3];
    return `${year}-${month}-${day}`;
  }
  return null;
}

function rowInDateRange(row: TindakanJoinResult, from: string, to: string): boolean {
  const ymd = rowTanggalToYmd(row.tanggal);
  if (!ymd) return !from && !to;
  if (from && ymd < from) return false;
  if (to && ymd > to) return false;
  return true;
}

function includesFold(hay: string, needle: string): boolean {
  const n = needle.trim().toLowerCase();
  if (!n) return true;
  return hay.toLowerCase().includes(n);
}

function rowHaystackForAlkes(row: TindakanJoinResult): string {
  const pemakaian = String(row.pemakaian ?? "").trim();
  const resume = String(row.resume ?? "").trim();
  const tindakan = String(row.tindakan ?? "").trim();
  const diagnosa = String(row.diagnosa ?? "").trim();
  return `${tindakan} ${diagnosa} ${pemakaian} ${resume}`;
}

function matchesAlkesTri(
  hay: string,
  patterns: RegExp[],
  mode: AlkesTriFilter,
): boolean {
  if (mode === "any") return true;
  const hit = patterns.some((re) => re.test(hay));
  return mode === "yes" ? hit : !hit;
}

export function filterTindakanDashboardRows(
  rows: readonly TindakanJoinResult[],
  f: TindakanDashboardFilterState,
): TindakanJoinResult[] {
  const stentRes = [/\bstent\b/i];
  const ballonRes = [/\bballoon\b/i, /\bballon\b/i];

  return rows.filter((row) => {
    if (!rowInDateRange(row, f.dateFrom, f.dateTo)) return false;
    const dokter = String(row.dokter ?? "").trim();
    const tindakan = String(row.tindakan ?? "").trim();
    const kategori = String(row.kategori ?? "").trim();
    const raw = row as unknown as Record<string, unknown>;
    const rm =
      String(row.no_rm ?? raw.no_rm ?? raw.rm ?? "").trim() ||
      String(raw.nomor_rm ?? "").trim();

    if (!includesFold(dokter, f.dokter)) return false;
    if (!includesFold(tindakan, f.tindakan)) return false;
    if (!includesFold(kategori, f.kategori)) return false;
    if (f.noRm.trim()) {
      const q = f.noRm.trim().toLowerCase().replace(/\s+/g, "");
      const r = rm.toLowerCase().replace(/\s+/g, "");
      if (!r.includes(q) && !q.includes(r)) return false;
    }

    const hay = rowHaystackForAlkes(row);
    if (!matchesAlkesTri(hay, stentRes, f.stent)) return false;
    if (!matchesAlkesTri(hay, ballonRes, f.ballon)) return false;

    return true;
  });
}

export const defaultTindakanDashboardFilters = (): TindakanDashboardFilterState => ({
  dateFrom: "",
  dateTo: "",
  dokter: "",
  tindakan: "",
  noRm: "",
  kategori: "",
  stent: "any",
  ballon: "any",
});
