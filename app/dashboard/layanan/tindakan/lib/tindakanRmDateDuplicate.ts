export type RuanganLike = {
  nama: string;
  kode: string | null;
  kategori: string | null;
  aktif?: boolean;
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

function formatRuanganLabel(r: Pick<RuanganLike, "nama" | "kode">): string {
  const nama = (r.nama ?? "").trim().toUpperCase();
  const kode = (r.kode ?? "").trim().toUpperCase();
  if (nama && kode) return `${nama} (${kode})`;
  return nama || kode;
}

export type RmDateRow = {
  id?: string | null;
  tanggal?: string | null;
  no_rm?: string | null;
  rm?: string | null;
};

export type DuplicateConfirmFn = (opts: {
  message: string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}) => Promise<boolean>;

/** Bandingkan RM: digit-only, tanpa leading zero (01234 = 1234). */
export function normalizeRmForCompare(rm: string): string {
  const digits = String(rm ?? "").replace(/\D/g, "");
  if (!digits) return String(rm ?? "").trim();
  const stripped = digits.replace(/^0+/, "");
  return stripped || "0";
}

function isCathlabRuanganOption(r: RuanganLike): boolean {
  const blob = `${r.nama ?? ""} ${r.kategori ?? ""}`.toLowerCase();
  return blob.includes("cath");
}

/** Semua label ruangan Cathlab aktif (urut nama). */
export function listCathlabRuanganLabels(options: RuanganLike[]): string[] {
  return options
    .filter((r) => r.aktif !== false)
    .filter(isCathlabRuanganOption)
    .sort((a, b) =>
      String(a.nama ?? "").localeCompare(String(b.nama ?? ""), "id"),
    )
    .map((r) => formatRuanganLabel(r));
}

/** Ruangan aktif pertama yang nama/kategorinya mengandung "cath". */
export function pickDefaultCathlabRuangan(options: RuanganLike[]): string | null {
  const labels = listCathlabRuanganLabels(options);
  return labels[0] ?? null;
}

export function hasDuplicateRmOnDate(
  rows: RmDateRow[],
  rm: string,
  tanggalKey: string,
  excludeId?: string,
): boolean {
  const rmNorm = normalizeRmForCompare(rm);
  if (!rmNorm) return false;
  const tKey =
    extractCalendarDateKey(String(tanggalKey ?? "").trim()) ??
    String(tanggalKey ?? "").trim();
  if (!tKey) return false;

  return rows.some((r) => {
    const id = String(r.id ?? "").trim();
    if (excludeId && id === excludeId) return false;
    const rowRm = normalizeRmForCompare(
      String(r.no_rm ?? r.rm ?? "").trim(),
    );
    const rowDate =
      extractCalendarDateKey(String(r.tanggal ?? "").trim()) ??
      String(r.tanggal ?? "").trim();
    return rowRm === rmNorm && rowDate === tKey;
  });
}

export function duplicateRmOnDateMessage(rm: string, tanggalKey: string): string {
  const tKey =
    extractCalendarDateKey(String(tanggalKey ?? "").trim()) ??
    String(tanggalKey ?? "").trim();
  return `RM ${rm} sudah ada di tanggal ${tKey}. Tetap tambah sebagai kasus ulang?`;
}

export async function confirmDuplicateRmOnDate(params: {
  rm: string;
  tanggalKey: string;
  showWarning?: (message: string) => void;
  confirm?: DuplicateConfirmFn;
}): Promise<boolean> {
  const msg = duplicateRmOnDateMessage(params.rm, params.tanggalKey);
  params.showWarning?.(msg);
  if (params.confirm) {
    return params.confirm({
      message: msg,
      title: "RM sudah ada di tanggal ini",
      confirmLabel: "Tetap tambah",
      cancelLabel: "Batal",
    });
  }
  return window.confirm(msg);
}

/** Gabungkan list tindakan utama + fallback, dedupe by id. */
export function mergeTindakanRowsForDupCheck(
  primary: RmDateRow[],
  fallback: RmDateRow[],
): RmDateRow[] {
  const byId = new Map<string, RmDateRow>();
  let anon = 0;
  for (const r of [...primary, ...fallback]) {
    const id = String(r?.id ?? "").trim();
    if (id) byId.set(id, r);
    else byId.set(`__anon_${anon++}`, r);
  }
  return Array.from(byId.values());
}
