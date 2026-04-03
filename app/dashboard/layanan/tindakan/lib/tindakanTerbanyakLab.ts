import type { TindakanJoinResult } from "../bridge/mapping.types";

/** Urutan baris mengikuti contoh laporan Lab Kateterisasi. */
const ROW_DEFS: readonly { label: string; test: (n: string) => boolean }[] = [
  {
    label: "Primary PCI",
    test: (n) =>
      /\bppci\b/i.test(n) ||
      /primary\s*pci/i.test(n) ||
      n.includes("primary pci") ||
      /(?:^|\s)primary\s+ptca\b/i.test(n),
  },
  {
    label: "Elektif PCI",
    test: (n) => {
      const hit =
        /\bptca\b/i.test(n) ||
        (/elektif|elective/i.test(n) && /\bpci\b|kateter/i.test(n)) ||
        /pci\s*elektif|elektif\s*pci/i.test(n);
      const isPrimaryLike =
        /\bppci\b/i.test(n) ||
        /(?:^|\s)primary\s+(?:pci|ptca)\b/i.test(n);
      return hit && !isPrimaryLike;
    },
  },
  {
    label: "Angioplasty",
    test: (n) =>
      /angioplast/i.test(n) &&
      !/\bppci\b|primary(\s*pci)?/i.test(n) &&
      !/elektif|elective/i.test(n),
  },
  {
    label: "CTO",
    test: (n) => /(?:^|\s)cto(?:\s|$)|chronic\s+total/i.test(n),
  },
  {
    label: "Bifurcation",
    test: (n) => /bifurcat|bifurkasi/i.test(n),
  },
  {
    label: "TPM",
    test: (n) =>
      /\btpm\b|temporary\s*pacemaker|pacemaker\s*sementara|pace\s*maker\s*temp/i.test(
        n,
      ),
  },
  {
    label: "PPM",
    test: (n) =>
      /\bppm\b|permanent\s*pacemaker|pacemaker\s*permanen/i.test(n) &&
      !/\btpm\b/i.test(n),
  },
  {
    label: "EP Study",
    test: (n) => /ep\s*study|estudi\s*ep/i.test(n),
  },
  {
    label: "Ablasi",
    test: (n) => /ablasi|ablation/i.test(n),
  },
  {
    label: "EVLA",
    test: (n) => /evla|endovenous|laser\s*ven/i.test(n),
  },
  {
    label: "Arteriografi",
    test: (n) =>
      /arteriograf|arteriography|arterio\s*graph/i.test(n) &&
      !/veno/i.test(n),
  },
  {
    label: "Pericardiosintesis",
    test: (n) => /pericardio/i.test(n),
  },
  {
    label: "Venoplasty",
    test: (n) => /venoplast|venograph|veno\s*graph|venografi/i.test(n),
  },
  {
    label: "DSA",
    test: (n) =>
      /\bdsa\b|digital\s*subtraction|angiografi\s*serebral|cerebral\s*angio/i.test(
        n,
      ),
  },
];

export const LAB_TINDAKAN_ROW_LABELS: readonly string[] = ROW_DEFS.map(
  (r) => r.label,
);

function normalizeTindakan(raw: unknown): string {
  return String(raw ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Kategori pertama yang cocok, atau null → masuk "Lainnya". */
export function categorizeTindakanLab(rawTindakan: unknown): string | null {
  const n = normalizeTindakan(rawTindakan);
  if (!n) return null;
  for (const def of ROW_DEFS) {
    if (def.test(n)) return def.label;
  }
  return null;
}

export function yearFromTanggal(raw: unknown): number | null {
  const s = String(raw ?? "").trim();
  if (s.length < 4) return null;
  const y = Number.parseInt(s.slice(0, 4), 10);
  if (!Number.isFinite(y) || y < 1990 || y > 2100) return null;
  return y;
}

export function monthFromTanggal(raw: unknown): number | null {
  const s = String(raw ?? "").trim();
  if (s.length < 7 || s[4] !== "-") return null;
  const m = Number.parseInt(s.slice(5, 7), 10);
  if (!Number.isFinite(m) || m < 1 || m > 12) return null;
  return m;
}

export type LabTerbanyakMatrix = {
  years: number[];
  /** Satu entri per baris (urutan LAB), nilai per kolom tahun. */
  countsByLabel: Record<string, number[]>;
  /** Baris akhir: jumlah per tahun. */
  totalsPerYear: number[];
  /** Tindakan yang tidak cocok kategori (per tahun). */
  lainnyaPerYear: number[];
};

/**
 * Agregasi frekuensi tindakan per tahun (opsional: hanya bulan tertentu dalam tahun itu).
 */
export function aggregateLabTerbanyakMatrix(
  rows: readonly TindakanJoinResult[],
  opts: {
    yearFrom: number;
    yearTo: number;
    /** 1–12 atau null = semua bulan */
    monthOnly: number | null;
  },
): LabTerbanyakMatrix {
  const y0 = Math.min(opts.yearFrom, opts.yearTo);
  const y1 = Math.max(opts.yearFrom, opts.yearTo);
  const years: number[] = [];
  for (let y = y0; y <= y1; y += 1) years.push(y);

  const idx = (y: number) => years.indexOf(y);
  const countsByLabel: Record<string, number[]> = {};
  for (const def of ROW_DEFS) {
    countsByLabel[def.label] = years.map(() => 0);
  }
  const lainnyaPerYear = years.map(() => 0);

  for (const row of rows) {
    const y = yearFromTanggal(row.tanggal);
    if (y == null || y < y0 || y > y1) continue;
    if (opts.monthOnly != null) {
      const m = monthFromTanggal(row.tanggal);
      if (m !== opts.monthOnly) continue;
    }
    const ii = idx(y);
    if (ii < 0) continue;

    const cat = categorizeTindakanLab(row.tindakan);
    if (cat && countsByLabel[cat]) {
      countsByLabel[cat][ii] += 1;
    } else {
      lainnyaPerYear[ii] += 1;
    }
  }

  const totalsPerYear = years.map((_, col) => {
    let s = lainnyaPerYear[col];
    for (const def of ROW_DEFS) {
      s += countsByLabel[def.label][col];
    }
    return s;
  });

  return { years, countsByLabel, totalsPerYear, lainnyaPerYear };
}

export function hasAnyLainnya(lainnyaPerYear: readonly number[]): boolean {
  return lainnyaPerYear.some((n) => n > 0);
}
