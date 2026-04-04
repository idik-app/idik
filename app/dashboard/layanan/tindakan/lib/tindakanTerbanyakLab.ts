import type { TindakanJoinResult } from "../bridge/mapping.types";

/** Urutan baris mengikuti contoh laporan Lab Kateterisasi. */
const ROW_DEFS: readonly {
  label: string;
  test: (tindakan: string, kategori: string) => boolean;
}[] = [
  {
    label: "PPCI",
    test: (t) =>
      /\bppci\b/i.test(t) ||
      /primary\s*pci/i.test(t) ||
      t.includes("primary pci") ||
      /(?:^|\s)primary\s+ptca\b/i.test(t),
  },
  {
    label: "PTCA",
    test: (t) => {
      const hit =
        /\bptca\b/i.test(t) ||
        (/elektif|elective/i.test(t) && /\bpci\b|kateter/i.test(t)) ||
        /pci\s*elektif|elektif\s*pci/i.test(t);
      const isPrimaryLike =
        /\bppci\b/i.test(t) || /(?:^|\s)primary\s+(?:pci|ptca)\b/i.test(t);
      return hit && !isPrimaryLike;
    },
  },
  {
    label: "ANGIOPLASTY",
    test: (t) =>
      /angioplast/i.test(t) &&
      !/\bppci\b|primary(\s*pci)?/i.test(t) &&
      !/elektif|elective/i.test(t),
  },
  {
    label: "DCA",
    test: (t) => /\bdca\b/i.test(t),
  },
  {
    label: "ROTA",
    test: (t) => /\brota\b/i.test(t),
  },
  {
    label: "FFR",
    test: (t) => /\bffr\b/i.test(t),
  },
  {
    label: "CTO",
    test: (t, k) =>
      /cto/i.test(k) || /(?:^|\s)cto(?:\s|$)|chronic\s+total/i.test(t),
  },
  {
    label: "BIFURKASI",
    test: (t, k) => /bifurc|bifurkas/i.test(k) || /bifurcat|bifurkasi/i.test(t),
  },
  {
    label: "TPM",
    test: (t) =>
      /\btpm\b|temporary\s*pacemaker|pacemaker\s*sementara|pace\s*maker\s*temp/i.test(
        t,
      ),
  },
  {
    label: "PPM",
    test: (t) =>
      /\bppm\b|permanent\s*pacemaker|pacemaker\s*permanen/i.test(t) &&
      !/\btpm\b/i.test(t),
  },
  {
    label: "EP STUDY",
    test: (t) => /ep\s*study|estudi\s*ep/i.test(t),
  },
  {
    label: "ABLASI",
    test: (t) => /ablasi|ablation/i.test(t),
  },
  {
    label: "EVLA",
    test: (t) => /evla|endovenous|laser\s*ven/i.test(t),
  },
  {
    label: "ARTERIOGRAPHY",
    test: (t) =>
      /arteriograf|arteriography|arterio\s*graph/i.test(t) && !/veno/i.test(t),
  },
  {
    label: "VENOGRAPHY",
    test: (t) => /venoplast|venograph|veno\s*graph|venografi/i.test(t),
  },
  {
    label: "DSA",
    test: (t) =>
      /\bdsa\b|digital\s*subtraction|angiografi\s*serebral|cerebral\s*angio/i.test(
        t,
      ),
  },
  {
    label: "CHEMOPORT",
    test: (t) => /chemoport/i.test(t),
  },
  {
    label: "DOUBLE LUMEN",
    test: (t) => /double\s*lumen|dl/i.test(t),
  },
  {
    label: "PE",
    test: (t) => /\bpe\b/i.test(t) && !/pericardio/i.test(t),
  },
  {
    label: "PTE",
    test: (t) => /\bpte\b/i.test(t),
  },
];

export const LAB_TINDAKAN_ROW_LABELS: readonly string[] = ROW_DEFS.map(
  (r) => r.label,
);

function normalizeString(raw: unknown): string {
  return String(raw ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Kategori pertama yang cocok, atau null → masuk "Lainnya". */
export function categorizeTindakanLab(row: TindakanJoinResult): string | null {
  const t = normalizeString(row.tindakan);
  const k = normalizeString(row.kategori);
  if (!t && !k) return null;
  for (const def of ROW_DEFS) {
    if (def.test(t, k)) return def.label;
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

    const cat = categorizeTindakanLab(row);
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
