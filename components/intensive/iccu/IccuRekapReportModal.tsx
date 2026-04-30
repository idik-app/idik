"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UI_LAYERS, Z_INDEX_VALUES } from "@/lib/ui/layers";
import { roomDisplayLabelFromSlug } from "@/lib/ruangan/slug";
import { Button } from "@/components/ui/button";
import type {
  IccuRekapMonthPayload,
  IccuRekapYearPayload,
} from "@/lib/iccu-register/rekapTypes";
import { REKAP_MONTH_LABELS } from "@/lib/iccu-register/rekapTypes";

export type IccuRekapReportModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Slug dari URL/dashboard — dipakai untuk label judul konteks. */
  roomSlug: string;
  roomDisplayName?: string;
  /**
   * Slug ruangan DB untuk RPC agregasi. Default: sama dengan `roomSlug` — harus identik dengan
   * penyimpanan `IccuRegisterModal` (`effectiveUnitSlug`). Set manual hanya bila laporan harus
   * mengambil unit lain dari jalur dashboard Anda.
   */
  registerDataRoomSlug?: string;
};

/** Fallback selaras `docs/wireframe-rekapitulasi-pasien-iccu.md` bila RPC kosong / gagal. */
const FALLBACK_PAYMENT = [
  { month: "Jan", UMUM: 18, BPJS: 45, NPBI: 25, RJKS: 14, LAIN: 3 },
  { month: "Feb", UMUM: 22, BPJS: 48, NPBI: 26, RJKS: 15, LAIN: 4 },
  { month: "Mar", UMUM: 19, BPJS: 52, NPBI: 25, RJKS: 13, LAIN: 2 },
  { month: "Apr", UMUM: 21, BPJS: 46, NPBI: 26, RJKS: 14, LAIN: 3 },
];

const FALLBACK_SURVEY = [
  { month: "Jan", meninggal: 2, dirujuk: 5, vent: 12 },
  { month: "Feb", meninggal: 3, dirujuk: 6, vent: 14 },
  { month: "Mar", meninggal: 2, dirujuk: 5, vent: 11 },
  { month: "Apr", meninggal: 4, dirujuk: 7, vent: 13 },
];

const FALLBACK_MUTU_DEMO = [
  { month: "Jan", BOR: 85, TOI: 15, BTO: 42 },
  { month: "Feb", BOR: 82, TOI: 14, BTO: 38 },
  { month: "Mar", BOR: 79, TOI: 16, BTO: 41 },
  { month: "Apr", BOR: 88, TOI: 13, BTO: 40 },
];

const FALLBACK_DIAG: { name: string; total: number }[] = [
  { name: "NON CARDIO", total: 90 },
  { name: "HT", total: 74 },
  { name: "STEMI", total: 58 },
  { name: "AF", total: 46 },
  { name: "NSTEMI", total: 42 },
  { name: "UAP", total: 30 },
  { name: "DC", total: 27 },
  { name: "DCA/PTCA", total: 27 },
  { name: "SVT", total: 19 },
];

/** Header kolom bulan — selaras wireframe (JAN … DES). */
const MONTH_HEADERS_SHORT = REKAP_MONTH_LABELS.map((s) =>
  s.length <= 3 ? s.toUpperCase() : s.slice(0, 3).toUpperCase(),
);

const SECTION_C_EMPTY_MONTHS = Array.from({ length: 12 }, () => "—");

/** Urutan baris Section D — sama dengan RPC + wireframe. */
const DIAG_KEYS_ORDER = [
  "STEMI",
  "NSTEMI",
  "UAP",
  "SVT",
  "DC",
  "HT",
  "AV BLOCK",
  "AF",
  "NON CARDIO",
] as const;

/** Nilai per bulan (Jan–Apr) untuk demo tabel — sisanya 0; selaras §2 wireframe. */
const DEMO_DIAG_MONTHLY: Record<string, readonly number[]> = {
  STEMI: [14, 16, 13, 15, 0, 0, 0, 0, 0, 0, 0, 0],
  NSTEMI: [9, 11, 10, 12, 0, 0, 0, 0, 0, 0, 0, 0],
  UAP: [7, 8, 6, 9, 0, 0, 0, 0, 0, 0, 0, 0],
  SVT: [4, 5, 4, 6, 0, 0, 0, 0, 0, 0, 0, 0],
  DC: [6, 7, 6, 8, 0, 0, 0, 0, 0, 0, 0, 0],
  HT: [18, 19, 17, 20, 0, 0, 0, 0, 0, 0, 0, 0],
  "AV BLOCK": [3, 4, 3, 5, 0, 0, 0, 0, 0, 0, 0, 0],
  AF: [11, 12, 10, 13, 0, 0, 0, 0, 0, 0, 0, 0],
  "NON CARDIO": [22, 21, 23, 24, 0, 0, 0, 0, 0, 0, 0, 0],
};

/** Label baris NPBI di bawah BPJS; angka per bulan = pembagian proporsional dari total `npbi` RPC. */
const NPBI_SPLIT_ROWS: { label: string; janApr: readonly number[] }[] = [
  { label: "NPBI 1", janApr: [12, 11, 13, 12] },
  { label: "NPBI 2", janApr: [8, 9, 7, 8] },
  { label: "NPBI 3", janApr: [5, 6, 5, 6] },
];

/** Bobot pembagian NPBI per bulan (Jan–Apr = dok §2; Mei–Des = rata-rata bobot Jan–Apr). */
function npbiWeightsForMonth(month: number): readonly [number, number, number] {
  if (month >= 1 && month <= 4) {
    return [
      NPBI_SPLIT_ROWS[0]!.janApr[month - 1] ?? 0,
      NPBI_SPLIT_ROWS[1]!.janApr[month - 1] ?? 0,
      NPBI_SPLIT_ROWS[2]!.janApr[month - 1] ?? 0,
    ];
  }
  const avg = (rowIdx: number) =>
    NPBI_SPLIT_ROWS[rowIdx]!.janApr.reduce((s, v) => s + v, 0) / 4;
  return [avg(0), avg(1), avg(2)];
}

/** Membagi integer `total` proporsional ke tiga bucket (sisa terbesar mendapat +1). */
function splitTotalByWeights(
  total: number,
  w: readonly [number, number, number],
): [number, number, number] {
  const sum = w[0] + w[1] + w[2];
  if (total <= 0 || sum <= 0) return [0, 0, 0];
  const raw = [(total * w[0]) / sum, (total * w[1]) / sum, (total * w[2]) / sum];
  const base = raw.map((x) => Math.floor(x));
  let rem = total - base.reduce((a, b) => a + b, 0);
  const order = [0, 1, 2].sort(
    (i, j) => raw[j]! - Math.floor(raw[j]!) - (raw[i]! - Math.floor(raw[i]!)),
  );
  const out: [number, number, number] = [base[0]!, base[1]!, base[2]!];
  for (let k = 0; k < rem; k++) {
    const i = order[k]!;
    out[i] = (out[i] ?? 0) + 1;
  }
  return out;
}

function emptyMonth(month: number): IccuRekapMonthPayload {
  return {
    month,
    section_a: { umum: 0, bpjs_pbi: 0, npbi: 0, rjks: 0, lain: 0 },
    section_b: {
      meninggal: 0,
      meninggal_lt48: 0,
      meninggal_gt48: 0,
      dirujuk: 0,
      pulang_paksa: 0,
      pindah_ruangan: 0,
      krs: 0,
      ventilator: 0,
      cvc: 0,
      pdt: 0,
      dca_ptca: 0,
      trombolitik: 0,
      tpm: 0,
      ppm: 0,
      perikardiosintesis: 0,
      ablasi: 0,
      sum_los_hari: 0,
      los_rows: 0,
    },
    section_c: { note: "", avg_los_hari: null },
    section_d: {},
  };
}

/** Demo tahun penuh untuk tabel bila RPC kosong / error — angka Jan–Apr mengikuti wireframe / grafik fallback. */
function buildDemoMonthsForTables(): IccuRekapMonthPayload[] {
  const MENINGGAL = [2, 3, 2, 4] as const;
  const LT48 = [1, 2, 1, 2] as const;
  const DIRUJUK = [5, 6, 5, 7] as const;
  const PP = [1, 0, 1, 1] as const;
  const VENT = [12, 14, 11, 13] as const;
  const CVC = [18, 19, 17, 20] as const;
  const PDT = [4, 5, 4, 5] as const;
  const KRS = [9, 10, 8, 11] as const;
  const PINDAH = [3, 2, 4, 3] as const;
  const DCA = [6, 7, 6, 8] as const;
  const TROMBO = [4, 3, 5, 4] as const;
  const TPM = [2, 2, 3, 2] as const;
  const PPM = [1, 1, 2, 1] as const;
  const PERIK = [0, 1, 0, 1] as const;
  const ABLASI = [5, 6, 5, 7] as const;
  const SUM_LOS = [142, 156, 148, 162] as const;
  const pick = <T extends readonly number[]>(arr: T, mo: number) =>
    mo >= 1 && mo <= 4 ? arr[mo - 1]! : 0;

  const out: IccuRekapMonthPayload[] = [];
  for (let mo = 1; mo <= 12; mo++) {
    const pm = FALLBACK_PAYMENT[mo - 1];
    const sv = FALLBACK_SURVEY[mo - 1];
    const mut = FALLBACK_MUTU_DEMO[mo - 1];
    const base = emptyMonth(mo);
    if (pm) {
      base.section_a = {
        umum: pm.UMUM,
        bpjs_pbi: pm.BPJS,
        npbi: pm.NPBI,
        rjks: pm.RJKS,
        lain: pm.LAIN,
      };
    }
    const mg = pick(MENINGGAL, mo);
    const lt = pick(LT48, mo);
    base.section_b = {
      meninggal: mg,
      meninggal_lt48: lt,
      meninggal_gt48: Math.max(0, mg - lt),
      dirujuk: pick(DIRUJUK, mo),
      pulang_paksa: pick(PP, mo),
      pindah_ruangan: pick(PINDAH, mo),
      krs: pick(KRS, mo),
      ventilator: sv?.vent ?? pick(VENT, mo),
      cvc: pick(CVC, mo),
      pdt: pick(PDT, mo),
      dca_ptca: pick(DCA, mo),
      trombolitik: pick(TROMBO, mo),
      tpm: pick(TPM, mo),
      ppm: pick(PPM, mo),
      perikardiosintesis: pick(PERIK, mo),
      ablasi: pick(ABLASI, mo),
      sum_los_hari: pick(SUM_LOS, mo),
      los_rows: Math.max(1, Math.round(pick(SUM_LOS, mo) / 4.5)),
    };
    if (mut) {
      base.section_c = {
        note: "",
        avg_los_hari:
          base.section_b.los_rows > 0
            ? Math.round((base.section_b.sum_los_hari / base.section_b.los_rows) * 10) / 10
            : null,
      };
    }
    const sd: Record<string, number> = {};
    for (const k of DIAG_KEYS_ORDER) {
      const series = DEMO_DIAG_MONTHLY[k];
      sd[k] = series?.[mo - 1] ?? 0;
    }
    base.section_d = sd;
    out.push(base);
  }
  return out;
}

function normalizeMonthsTwelve(
  months: IccuRekapMonthPayload[] | undefined | null,
  emptyAsDemo: boolean,
): IccuRekapMonthPayload[] {
  if (!months?.length) {
    if (emptyAsDemo) return buildDemoMonthsForTables();
    return Array.from({ length: 12 }, (_, i) => emptyMonth(i + 1));
  }
  const sorted = [...months].sort((a, b) => a.month - b.month);
  const byMo = new Map(sorted.map((m) => [m.month, m]));
  const filled: IccuRekapMonthPayload[] = [];
  for (let mo = 1; mo <= 12; mo++) {
    filled.push(byMo.get(mo) ?? emptyMonth(mo));
  }
  return filled;
}

/** Grafik Section A/B — netral saat belum ada payload (bukan demo wireframe). */
const EMPTY_PAYMENT_CHART = REKAP_MONTH_LABELS.map((label) => ({
  month: label,
  UMUM: 0,
  BPJS: 0,
  NPBI: 0,
  RJKS: 0,
  LAIN: 0,
}));

const EMPTY_SURVEY_CHART = REKAP_MONTH_LABELS.map((label) => ({
  month: label,
  meninggal: 0,
  dirujuk: 0,
  vent: 0,
}));

const EMPTY_DIAG_CHART: { name: string; total: number }[] = [];

/** BOR/TOI/BTO — 12 bulan nol (bukan demo wireframe). */
const EMPTY_MUTU_LINE = REKAP_MONTH_LABELS.map((m) => ({
  month: m,
  BOR: 0,
  TOI: 0,
  BTO: 0,
}));

function fmtInt(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return String(Math.round(n));
}

function fmtDec(n: number | null | undefined, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toFixed(digits);
}

function diagKeysFromMonths(months: IccuRekapMonthPayload[]): string[] {
  const present = new Set<string>();
  for (const m of months) {
    const d = m.section_d;
    if (!d || typeof d !== "object") continue;
    for (const k of Object.keys(d)) present.add(k);
  }
  const ordered = DIAG_KEYS_ORDER.filter((k) => present.has(k));
  const rest = [...present]
    .filter((k) => !DIAG_KEYS_ORDER.includes(k as (typeof DIAG_KEYS_ORDER)[number]))
    .sort((a, b) => a.localeCompare(b));
  return [...ordered, ...rest];
}

const PAY_COLORS = ["#22d3ee", "#38bdf8", "#6366f1", "#a855f7", "#f472b6"];

const tableShell =
  "border-collapse text-[10px] tabular-nums text-white dark:text-white";

const thBase =
  "border border-white/15 bg-amber-950/45 px-1 py-1.5 text-[9px] font-semibold uppercase tracking-wide text-white/95 dark:text-white";

const tdBase = "border border-white/10 px-1 py-0.5";

function StickyTh({
  children,
  className,
  stickyClass,
}: {
  children: React.ReactNode;
  className?: string;
  stickyClass: string;
}) {
  return (
    <th
      scope="col"
      className={cn(thBase, stickyClass, "z-[2] shadow-[2px_0_8px_rgba(0,0,0,0.35)]", className)}
    >
      {children}
    </th>
  );
}

function YearGridHead() {
  return (
    <thead className="sticky top-0 z-[4]">
      <tr>
        <StickyTh stickyClass="sticky left-0 min-w-[2rem] bg-zinc-950/98 text-center">
          NO
        </StickyTh>
        <StickyTh stickyClass="sticky left-8 z-[3] min-w-[min(52vw,14rem)] max-w-[20rem] bg-zinc-950/98 text-left">
          VARIABEL
        </StickyTh>
        {MONTH_HEADERS_SHORT.map((h) => (
          <th key={h} className={cn(thBase, "min-w-[2.35rem] text-center")}>
            {h}
          </th>
        ))}
        <th className={cn(thBase, "min-w-[3rem] bg-orange-950/50 text-center text-orange-100 dark:text-white")}>
          TOTAL
        </th>
      </tr>
    </thead>
  );
}

/** Baris numerik — angka per bulan + total (jumlah). */
function DataRowInt({
  no,
  label,
  indent,
  values,
  highlight,
}: {
  no: string;
  label: string;
  indent?: boolean;
  values: readonly number[];
  highlight?: "non-cardio" | "total-a";
}) {
  const total = values.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
  return (
    <tr
      className={cn(
        highlight === "non-cardio" && "bg-emerald-950/35 dark:bg-emerald-950/45",
        highlight === "total-a" && "bg-amber-950/40 dark:bg-amber-950/45",
      )}
    >
      <td
        className={cn(
          tdBase,
          "sticky left-0 z-[1] bg-zinc-950/98 text-center font-mono text-[9px] text-white/90 shadow-[2px_0_8px_rgba(0,0,0,0.35)] dark:text-white",
        )}
      >
        {no}
      </td>
      <td
        className={cn(
          tdBase,
          "sticky left-8 z-[1] max-w-[20rem] bg-zinc-950/98 text-left text-[9px] uppercase leading-tight text-white shadow-[2px_0_8px_rgba(0,0,0,0.35)] dark:text-white",
          indent && "pl-6 text-white/90 dark:text-white/90",
        )}
      >
        {label}
      </td>
      {values.map((v, i) => (
        <td key={i} className={cn(tdBase, "text-right text-white dark:text-white")}>
          {fmtInt(v)}
        </td>
      ))}
      <td
        className={cn(
          tdBase,
          "bg-orange-950/25 text-right font-semibold text-orange-50 dark:text-white",
        )}
      >
        {fmtInt(total)}
      </td>
    </tr>
  );
}

function DataRowText({
  no,
  label,
  cells,
  totalCell,
  indent,
}: {
  no: string;
  label: string;
  cells: readonly string[];
  totalCell: string;
  indent?: boolean;
}) {
  return (
    <tr>
      <td
        className={cn(
          tdBase,
          "sticky left-0 z-[1] bg-zinc-950/98 text-center font-mono text-[9px] text-white/90 shadow-[2px_0_8px_rgba(0,0,0,0.35)] dark:text-white",
        )}
      >
        {no}
      </td>
      <td
        className={cn(
          tdBase,
          "sticky left-8 z-[1] max-w-[20rem] bg-zinc-950/98 text-left text-[9px] uppercase leading-tight text-white shadow-[2px_0_8px_rgba(0,0,0,0.35)] dark:text-white",
          indent && "pl-6 text-white/90 dark:text-white/90",
        )}
      >
        {label}
      </td>
      {cells.map((c, i) => (
        <td key={i} className={cn(tdBase, "text-right text-white dark:text-white")}>
          {c}
        </td>
      ))}
      <td
        className={cn(
          tdBase,
          "bg-orange-950/25 text-right font-semibold text-orange-50 dark:text-white",
        )}
      >
        {totalCell}
      </td>
    </tr>
  );
}

function RekapTableScroll({ children }: { children: React.ReactNode }) {
  return (
    <div className="scrollbar-thin max-h-[min(52vh,26rem)] min-h-0 w-full min-w-0 overflow-auto rounded-xl border border-white/10 bg-black/25 lg:max-h-[min(70vh,36rem)] dark:border-white/10">
      {children}
    </div>
  );
}

function ChartPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full min-w-0 flex-col rounded-xl border border-white/10 bg-black/20 p-3 dark:border-white/10">
      {children}
    </div>
  );
}

const SECTION_B_ROWS: {
  key: keyof IccuRekapMonthPayload["section_b"];
  label: string;
  indent?: boolean;
}[] = [
  { key: "meninggal", label: "JUMLAH PASIEN MENINGGAL" },
  { key: "meninggal_lt48", label: "< 48 JAM", indent: true },
  { key: "meninggal_gt48", label: "> 48 JAM", indent: true },
  { key: "dirujuk", label: "JUMLAH PASIEN DIRUJUK" },
  { key: "pulang_paksa", label: "JUMLAH PASIEN PULANG PAKSA" },
  { key: "ventilator", label: "JUMLAH PASIEN DENGAN VENTILATOR" },
  { key: "cvc", label: "JUMLAH PASIEN CVC" },
  { key: "pdt", label: "JUMLAH PASIEN PDT" },
  { key: "krs", label: "JUMLAH PASIEN KRS" },
  { key: "pindah_ruangan", label: "JUMLAH PASIEN PINDAH RUANGAN" },
  { key: "dca_ptca", label: "JUMLAH PASIEN DCA / PTCA" },
  { key: "trombolitik", label: "JUMLAH PASIEN TROMBOLITIK" },
  { key: "tpm", label: "JUMLAH PASIEN TPM" },
  { key: "ppm", label: "JUMLAH PASIEN PPM" },
  { key: "perikardiosintesis", label: "JUMLAH PASIEN PERIKARDIOSENTESIS" },
  { key: "ablasi", label: "JUMLAH PASIEN ABLASI" },
  { key: "sum_los_hari", label: "JUMLAH HARI PERAWATAN" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.06 },
  },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] as const },
  },
};

function parsePayload(raw: unknown): IccuRekapYearPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const months = o.months;
  if (!Array.isArray(months)) return null;
  return raw as IccuRekapYearPayload;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className={cn(
        "rounded-lg border border-cyan-500/30 bg-zinc-950/95 px-3 py-2 text-[11px] shadow-xl backdrop-blur-md",
        "dark:border-cyan-400/25 dark:text-white",
      )}
    >
      <p className="mb-1 font-semibold uppercase tracking-wide text-cyan-300 dark:text-white">
        {label}
      </p>
      <ul className="space-y-0.5">
        {payload.map((p) => (
          <li key={String(p.name)} className="flex justify-between gap-6">
            <span className="text-white/85">{p.name}</span>
            <span className="font-mono tabular-nums text-white dark:text-white">
              {p.value ?? "—"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function IccuRekapReportModal({
  open,
  onOpenChange,
  roomSlug,
  roomDisplayName,
  registerDataRoomSlug,
}: IccuRekapReportModalProps) {
  const rekapSlug = (registerDataRoomSlug ?? roomSlug).trim().toLowerCase();
  const dashboardSlug = roomSlug.trim().toLowerCase();
  const [mounted, setMounted] = useState(false);
  const [sectionsOpen, setSectionsOpen] = useState({
    a: true,
    b: true,
    c: true,
    d: true,
  });
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [payload, setPayload] = useState<IccuRekapYearPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  /** Menahan race: hanya respons fetch terakhir (tahun/slug/open) yang boleh mengisi state. */
  const rekapFetchSeqRef = useRef(0);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open || !rekapSlug) return;

    const seq = ++rekapFetchSeqRef.current;
    const ac = new AbortController();

    setPayload(null);
    setLoading(true);
    setFetchError(null);

    const q = new URLSearchParams({
      roomSlug: rekapSlug,
      year: String(year),
    });

    void fetch(`/api/iccu-register/rekap?${q.toString()}`, {
      credentials: "same-origin",
      cache: "no-store",
      signal: ac.signal,
    })
      .then(async (res) => {
        if (seq !== rekapFetchSeqRef.current) return;
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          data?: unknown;
          error?: string;
        };
        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || `HTTP ${res.status}`);
        }
        const p = parsePayload(json.data);
        if (seq !== rekapFetchSeqRef.current) return;
        setPayload(p);
        if (!p) setFetchError("Format data rekapitulasi tidak dikenali.");
        else setFetchError(null);
      })
      .catch((e: unknown) => {
        if (ac.signal.aborted) return;
        if (e instanceof DOMException && e.name === "AbortError") return;
        if (seq !== rekapFetchSeqRef.current) return;
        setPayload(null);
        setFetchError(e instanceof Error ? e.message : "Gagal memuat rekapitulasi.");
      })
      .finally(() => {
        if (seq === rekapFetchSeqRef.current) setLoading(false);
      });

    return () => {
      ac.abort();
    };
  }, [open, rekapSlug, year]);

  const unitTitle = useMemo(() => {
    const n = roomDisplayName?.trim();
    if (n) return n.toUpperCase();
    return roomDisplayLabelFromSlug(roomSlug).toUpperCase();
  }, [roomDisplayName, roomSlug]);

  const paymentChartData = useMemo(() => {
    if (!payload?.months?.length) {
      if (fetchError) return FALLBACK_PAYMENT;
      return EMPTY_PAYMENT_CHART;
    }
    return payload.months.map((m) => ({
      month: REKAP_MONTH_LABELS[m.month - 1] ?? String(m.month),
      UMUM: Number(m.section_a?.umum ?? 0),
      BPJS: Number(m.section_a?.bpjs_pbi ?? 0),
      NPBI: Number(m.section_a?.npbi ?? 0),
      RJKS: Number(m.section_a?.rjks ?? 0),
      LAIN: Number(m.section_a?.lain ?? 0),
    }));
  }, [payload, fetchError]);

  const surveyChartData = useMemo(() => {
    if (!payload?.months?.length) {
      if (fetchError) return FALLBACK_SURVEY;
      return EMPTY_SURVEY_CHART;
    }
    return payload.months.map((m) => ({
      month: REKAP_MONTH_LABELS[m.month - 1] ?? String(m.month),
      meninggal: Number(m.section_b?.meninggal ?? 0),
      dirujuk: Number(m.section_b?.dirujuk ?? 0),
      vent: Number(m.section_b?.ventilator ?? 0),
    }));
  }, [payload, fetchError]);

  const mutuMode = useMemo(() => {
    if (!payload?.months?.length) {
      if (fetchError) return { kind: "fallbackDemo" as const };
      return { kind: "placeholder" as const };
    }
    const avgRows = payload.months.map((m) => ({
      month: REKAP_MONTH_LABELS[m.month - 1] ?? String(m.month),
      avgLos:
        m.section_c?.avg_los_hari != null && Number.isFinite(m.section_c.avg_los_hari)
          ? Number(m.section_c.avg_los_hari)
          : null,
    }));
    const hasAvg = avgRows.some((r) => r.avgLos != null && r.avgLos > 0);
    if (hasAvg) return { kind: "avg" as const, avgRows };
    return { kind: "zeroMutu" as const };
  }, [payload, fetchError]);

  const diagChartData = useMemo(() => {
    if (!payload?.months?.length) {
      if (fetchError) return FALLBACK_DIAG;
      return EMPTY_DIAG_CHART;
    }
    const acc: Record<string, number> = {};
    for (const m of payload.months) {
      const d = m.section_d;
      if (!d || typeof d !== "object") continue;
      for (const [k, v] of Object.entries(d)) {
        acc[k] = (acc[k] ?? 0) + Number(v);
      }
    }
    const arr = Object.entries(acc).map(([name, total]) => ({ name, total }));
    arr.sort((a, b) => b.total - a.total);
    return arr.length ? arr : EMPTY_DIAG_CHART;
  }, [payload, fetchError]);

  const tableMonths = useMemo(
    () => normalizeMonthsTwelve(payload?.months, Boolean(fetchError)),
    [payload, fetchError],
  );

  const tablesUseFallback = Boolean(fetchError) && !payload?.months?.length;

  /** Tiga baris NPBI di tabel — jumlah per bulan selalu berjumlah sama dengan `section_a.npbi`. */
  const npbiSplitByRowMonth = useMemo(
    () =>
      NPBI_SPLIT_ROWS.map((_, rowIdx) =>
        tableMonths.map((m) => {
          const total = Number(m.section_a?.npbi ?? 0);
          const w = npbiWeightsForMonth(m.month);
          const parts = splitTotalByWeights(total, w);
          return parts[rowIdx] ?? 0;
        }),
      ),
    [tableMonths],
  );

  const diagKeysOrdered = useMemo(
    () => diagKeysFromMonths(tableMonths),
    [tableMonths],
  );

  const sectionATotalByMonth = useMemo(
    () =>
      tableMonths.map(
        (m) =>
          m.section_a.umum +
          m.section_a.bpjs_pbi +
          m.section_a.npbi +
          m.section_a.rjks +
          m.section_a.lain,
      ),
    [tableMonths],
  );

  const sectionATotalYear = useMemo(
    () => sectionATotalByMonth.reduce((a, n) => a + n, 0),
    [sectionATotalByMonth],
  );

  const sectionCBorToiBtoCells = useMemo(() => {
    const bor = tableMonths.map((_, idx) => {
      const demo = FALLBACK_MUTU_DEMO[idx];
      return tablesUseFallback && demo ? fmtInt(demo.BOR) : "—";
    });
    const toi = tableMonths.map((_, idx) => {
      const demo = FALLBACK_MUTU_DEMO[idx];
      return tablesUseFallback && demo ? fmtInt(demo.TOI) : "—";
    });
    const bto = tableMonths.map((_, idx) => {
      const demo = FALLBACK_MUTU_DEMO[idx];
      return tablesUseFallback && demo ? fmtInt(demo.BTO) : "—";
    });
    const nDemo = FALLBACK_MUTU_DEMO.length || 1;
    const borTotal = tablesUseFallback
      ? fmtInt(
          Math.round(
            FALLBACK_MUTU_DEMO.reduce((s, r) => s + r.BOR, 0) / nDemo,
          ),
        )
      : "—";
    const toiTotal = tablesUseFallback
      ? fmtInt(
          Math.round(
            FALLBACK_MUTU_DEMO.reduce((s, r) => s + r.TOI, 0) / nDemo,
          ),
        )
      : "—";
    const btoTotal = tablesUseFallback
      ? fmtInt(
          Math.round(
            FALLBACK_MUTU_DEMO.reduce((s, r) => s + r.BTO, 0) / nDemo,
          ),
        )
      : "—";
    return {
      bor,
      toi,
      bto,
      borTotal,
      toiTotal,
      btoTotal,
    };
  }, [tableMonths, tablesUseFallback]);

  const sectionCAlosCells = useMemo(() => {
    const cells = tableMonths.map((m) => fmtDec(m.section_c?.avg_los_hari ?? null, 1));
    const vals = tableMonths
      .map((m) => m.section_c?.avg_los_hari)
      .filter((v): v is number => v != null && Number.isFinite(v));
    const total =
      vals.length > 0
        ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
        : "—";
    return { cells, total };
  }, [tableMonths]);

  const dataSourceLive = Boolean(payload && !fetchError);

  const entryCountFromRpc = useMemo(() => {
    const n = payload?.entry_count_year;
    return typeof n === "number" && Number.isFinite(n) ? n : null;
  }, [payload]);

  /** RPC sukses: tidak ada kasus bila counter eksplisit 0 atau payload lama tanpa field itu tetapi total Section A nol. */
  const reportHasNoCases =
    dataSourceLive &&
    (entryCountFromRpc === 0 ||
      (entryCountFromRpc === null && sectionATotalYear === 0));

  /**
   * Selama fetch, payload dikosongkan — grafik tidak boleh memakai deret nol palsu
   * (tampak sama dengan “benar-benar tidak ada kasus”).
   */
  const suppressChartsPendingFetch = loading && !fetchError;

  const toggle = (k: keyof typeof sectionsOpen) =>
    setSectionsOpen((s) => ({ ...s, [k]: !s[k] }));

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            key="rekap-backdrop"
            type="button"
            aria-label="Tutup laporan"
            style={{ zIndex: Z_INDEX_VALUES.intensiveIccuModalBackdrop }}
            className={cn(
              "fixed inset-0 bg-black/75 backdrop-blur-[2px]",
              UI_LAYERS.intensiveIccuModalBackdrop,
            )}
            onClick={() => onOpenChange(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          />

          <div
            className={cn(
              "fixed inset-0 flex items-center justify-center p-3 sm:p-4",
              "pointer-events-none",
              UI_LAYERS.intensiveIccuModal,
            )}
            style={{ zIndex: Z_INDEX_VALUES.intensiveIccuModal }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="iccu-rekap-title"
              className={cn(
                "pointer-events-auto flex max-h-[min(92dvh,100%)] w-[min(98vw,85rem)] flex-col overflow-hidden",
                "rounded-2xl border border-cyan-500/35 bg-gradient-to-b from-zinc-900/95 to-black/90 shadow-[0_24px_80px_rgba(8,145,178,0.25)]",
                "dark:border-cyan-400/25 dark:text-white",
              )}
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            >
              <header className="flex shrink-0 flex-col gap-2 border-b border-cyan-500/25 bg-black/30 px-4 py-4 sm:px-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/40 bg-cyan-500/10 shadow-[0_0_24px_rgba(34,211,238,0.35)]">
                      <BarChart3 className="h-5 w-5 text-cyan-300" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <h2
                        id="iccu-rekap-title"
                        className="text-base font-bold uppercase tracking-[0.14em] text-white dark:text-white"
                      >
                        Rekapitulasi — {unitTitle}
                      </h2>
                      <p className="mt-1 text-[11px] leading-snug text-white/85 dark:text-white/85">
                        Agregasi dari registrasi ICCU (tanggal acuan: arsip / masuk ICCU / keluar / dibuat). Ruangan
                        data:{" "}
                        <span className="font-mono text-cyan-200 dark:text-white">{rekapSlug}</span>
                        {dashboardSlug !== rekapSlug ? (
                          <>
                            {" "}
                            <span className="text-white/75 dark:text-white/80">
                              (dashboard Anda: {dashboardSlug})
                            </span>
                          </>
                        ) : null}
                        .
                        {entryCountFromRpc != null && dataSourceLive ? (
                          <>
                            {" "}
                            <span className="text-white dark:text-white">
                              Baris registrasi pada tahun {year} (filter RPC):{" "}
                              <span className="font-mono tabular-nums">{entryCountFromRpc}</span>.
                            </span>
                          </>
                        ) : null}
                        {dataSourceLive ? (
                          " Data dari database."
                        ) : fetchError ? (
                          ` Fallback demo (${fetchError}).`
                        ) : (
                          " Memuat…"
                        )}
                      </p>
                      {dataSourceLive &&
                      !loading &&
                      sectionATotalYear === 0 &&
                      (entryCountFromRpc !== 0 || dashboardSlug !== rekapSlug) ? (
                        <p className="mt-2 rounded-lg border border-amber-500/35 bg-amber-950/25 px-3 py-2 text-[10px] leading-snug text-amber-50 dark:text-white">
                          {entryCountFromRpc !== 0 ? (
                            <>
                              Belum ada pasien yang masuk agregasi untuk tahun {year}. Coba tahun lain, atau pastikan
                              registrasi ICCU dan tanggal acuan mengisi tahun tersebut.
                            </>
                          ) : null}
                          {dashboardSlug !== rekapSlug ? (
                            <>
                              {entryCountFromRpc !== 0 ? " " : null}
                              Query memakai slug <span className="font-mono">{rekapSlug}</span> (bukan{" "}
                              <span className="font-mono">{dashboardSlug}</span>) — harus sama dengan tempat data
                              registrasi disimpan.
                            </>
                          ) : null}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 rounded-full text-white hover:bg-white/10 dark:text-white"
                    onClick={() => onOpenChange(false)}
                    aria-label="Tutup"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wide text-white/70 dark:text-white/80">
                    Tahun
                  </span>
                  <div className="flex items-center gap-1 rounded-lg border border-white/15 bg-black/30 px-1 py-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-white hover:bg-white/10"
                      onClick={() => setYear((y) => y - 1)}
                      aria-label="Tahun sebelumnya"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="min-w-[3rem] text-center font-mono text-sm tabular-nums text-white dark:text-white">
                      {year}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-white hover:bg-white/10"
                      onClick={() => setYear((y) => y + 1)}
                      aria-label="Tahun berikutnya"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  {loading ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-cyan-300 dark:text-white">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      Memuat…
                    </span>
                  ) : null}
                </div>
              </header>

              <motion.div
                className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6"
                variants={containerVariants}
                initial="hidden"
                animate="show"
              >
                {/* SECTION A — tabel kiri, grafik kanan (scroll) */}
                <motion.section variants={sectionVariants} className="mb-5">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 rounded-lg border border-cyan-500/25 bg-cyan-500/5 px-3 py-2 text-left transition hover:bg-cyan-500/10"
                    onClick={() => toggle("a")}
                    aria-expanded={sectionsOpen.a}
                  >
                    <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-200 dark:text-white">
                      SECTION A — JUMLAH PASIEN BERDASARKAN CARA PEMBAYARAN
                    </span>
                    {sectionsOpen.a ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-cyan-300" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-cyan-300" />
                    )}
                  </button>
                  <AnimatePresence initial={false}>
                    {sectionsOpen.a && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 flex flex-col gap-4">
                          <RekapTableScroll>
                            <table className={cn(tableShell, "min-w-max")}>
                              <YearGridHead />
                              <tbody>
                                <DataRowInt
                                  no="1"
                                  label="UMUM / BAYAR"
                                  values={tableMonths.map((m) => m.section_a.umum)}
                                />
                                <DataRowInt
                                  no="2"
                                  label="BPJS PBI"
                                  values={tableMonths.map((m) => m.section_a.bpjs_pbi)}
                                />
                                {NPBI_SPLIT_ROWS.map((row, idx) => (
                                  <DataRowInt
                                    key={row.label}
                                    no=""
                                    label={row.label}
                                    indent
                                    values={npbiSplitByRowMonth[idx] ?? []}
                                  />
                                ))}
                                <DataRowInt
                                  no="3"
                                  label="R / JKS"
                                  values={tableMonths.map((m) => m.section_a.rjks)}
                                />
                                <DataRowInt
                                  no="4"
                                  label="LAIN-LAIN / ASURANSI"
                                  values={tableMonths.map((m) => m.section_a.lain)}
                                />
                                <DataRowInt
                                  no=""
                                  label="JUMLAH TOTAL"
                                  values={sectionATotalByMonth}
                                  highlight="total-a"
                                />
                              </tbody>
                            </table>
                          </RekapTableScroll>
                          <ChartPanel>
                            <div className="h-[min(280px,40vh)] w-full min-h-[220px]">
                              {suppressChartsPendingFetch ? (
                                <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 bg-black/25 px-4 text-center text-[11px] text-white/85 dark:text-white">
                                  <Loader2
                                    className="h-5 w-5 shrink-0 animate-spin text-cyan-300"
                                    aria-hidden
                                  />
                                  Memuat grafik…
                                </div>
                              ) : reportHasNoCases ? (
                                <div className="flex h-full min-h-[180px] items-center justify-center rounded-lg border border-dashed border-white/15 bg-black/30 px-4 text-center text-[11px] leading-relaxed text-white/90 dark:text-white">
                                  Tidak ada pasien tercatat pada tahun {year} untuk ruangan ini —
                                  grafik tidak ditampilkan (semua nilai nol).
                                </div>
                              ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart
                                    data={paymentChartData}
                                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                                  >
                                    <CartesianGrid
                                      strokeDasharray="3 3"
                                      stroke="rgba(148,163,184,0.15)"
                                    />
                                    <XAxis
                                      dataKey="month"
                                      tick={{
                                        fill: "rgba(255,255,255,0.85)",
                                        fontSize: 11,
                                      }}
                                      stroke="rgba(148,163,184,0.35)"
                                    />
                                    <YAxis
                                      tick={{
                                        fill: "rgba(255,255,255,0.75)",
                                        fontSize: 10,
                                      }}
                                      stroke="rgba(148,163,184,0.35)"
                                    />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Legend
                                      wrapperStyle={{ fontSize: 11 }}
                                      formatter={(v) => (
                                        <span className="text-white/90">{v}</span>
                                      )}
                                    />
                                    <Bar
                                      dataKey="UMUM"
                                      stackId="a"
                                      fill={PAY_COLORS[0]}
                                      animationDuration={900}
                                      animationBegin={0}
                                    />
                                    <Bar
                                      dataKey="BPJS"
                                      stackId="a"
                                      fill={PAY_COLORS[1]}
                                      animationDuration={900}
                                      animationBegin={80}
                                    />
                                    <Bar
                                      dataKey="NPBI"
                                      stackId="a"
                                      fill={PAY_COLORS[2]}
                                      animationDuration={900}
                                      animationBegin={160}
                                    />
                                    <Bar
                                      dataKey="RJKS"
                                      stackId="a"
                                      fill={PAY_COLORS[3]}
                                      animationDuration={900}
                                      animationBegin={240}
                                    />
                                    <Bar
                                      dataKey="LAIN"
                                      stackId="a"
                                      fill={PAY_COLORS[4]}
                                      animationDuration={900}
                                      animationBegin={320}
                                      radius={[4, 4, 0, 0]}
                                    />
                                  </BarChart>
                                </ResponsiveContainer>
                              )}
                            </div>
                          </ChartPanel>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.section>

                {/* SECTION B — tabel kiri, grafik kanan */}
                <motion.section variants={sectionVariants} className="mb-5">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 rounded-lg border border-cyan-500/25 bg-cyan-500/5 px-3 py-2 text-left transition hover:bg-cyan-500/10"
                    onClick={() => toggle("b")}
                    aria-expanded={sectionsOpen.b}
                  >
                    <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-200 dark:text-white">
                      SECTION B — SURVEY MUTU PELAYANAN
                    </span>
                    {sectionsOpen.b ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-cyan-300" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-cyan-300" />
                    )}
                  </button>
                  <AnimatePresence initial={false}>
                    {sectionsOpen.b && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 flex flex-col gap-4">
                          <RekapTableScroll>
                            <table className={cn(tableShell, "min-w-max")}>
                              <YearGridHead />
                              <tbody>
                                {(() => {
                                  let seq = 0;
                                  return SECTION_B_ROWS.map((row) => {
                                    const no = row.indent ? "" : String(++seq);
                                    const values = tableMonths.map((m) =>
                                      Number(m.section_b[row.key] ?? 0),
                                    );
                                    return (
                                      <DataRowInt
                                        key={row.key}
                                        no={no}
                                        label={row.label}
                                        indent={row.indent}
                                        values={values}
                                      />
                                    );
                                  });
                                })()}
                              </tbody>
                            </table>
                          </RekapTableScroll>
                          <ChartPanel>
                            <div className="h-[min(260px,38vh)] w-full min-h-[200px]">
                              {suppressChartsPendingFetch ? (
                                <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 bg-black/25 px-4 text-center text-[11px] text-white/85 dark:text-white">
                                  <Loader2
                                    className="h-5 w-5 shrink-0 animate-spin text-cyan-300"
                                    aria-hidden
                                  />
                                  Memuat grafik…
                                </div>
                              ) : reportHasNoCases ? (
                                <div className="flex h-full min-h-[160px] items-center justify-center rounded-lg border border-dashed border-white/15 bg-black/30 px-4 text-center text-[11px] leading-relaxed text-white/90 dark:text-white">
                                  Tidak ada pasien tercatat pada tahun {year} — grafik survey tidak
                                  ditampilkan.
                                </div>
                              ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart
                                    data={surveyChartData}
                                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                                  >
                                    <CartesianGrid
                                      strokeDasharray="3 3"
                                      stroke="rgba(148,163,184,0.15)"
                                    />
                                    <XAxis
                                      dataKey="month"
                                      tick={{
                                        fill: "rgba(255,255,255,0.85)",
                                        fontSize: 11,
                                      }}
                                      stroke="rgba(148,163,184,0.35)"
                                    />
                                    <YAxis
                                      tick={{
                                        fill: "rgba(255,255,255,0.75)",
                                        fontSize: 10,
                                      }}
                                      stroke="rgba(148,163,184,0.35)"
                                    />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Legend
                                      wrapperStyle={{ fontSize: 11 }}
                                      formatter={(v) => (
                                        <span className="text-white/90">{v}</span>
                                      )}
                                    />
                                    <Line
                                      type="monotone"
                                      dataKey="meninggal"
                                      name="Meninggal"
                                      stroke="#f472b6"
                                      strokeWidth={2}
                                      dot={{ r: 3 }}
                                      animationDuration={1100}
                                      animationBegin={100}
                                    />
                                    <Line
                                      type="monotone"
                                      dataKey="dirujuk"
                                      name="Dirujuk"
                                      stroke="#22d3ee"
                                      strokeWidth={2}
                                      dot={{ r: 3 }}
                                      animationDuration={1100}
                                      animationBegin={220}
                                    />
                                    <Line
                                      type="monotone"
                                      dataKey="vent"
                                      name="Ventilator"
                                      stroke="#a855f7"
                                      strokeWidth={2}
                                      dot={{ r: 3 }}
                                      animationDuration={1100}
                                      animationBegin={340}
                                    />
                                  </LineChart>
                                </ResponsiveContainer>
                              )}
                            </div>
                          </ChartPanel>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.section>

                {/* SECTION C — tabel kiri, grafik kanan */}
                <motion.section variants={sectionVariants} className="mb-5">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 rounded-lg border border-cyan-500/25 bg-cyan-500/5 px-3 py-2 text-left transition hover:bg-cyan-500/10"
                    onClick={() => toggle("c")}
                    aria-expanded={sectionsOpen.c}
                  >
                    <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-200 dark:text-white">
                      SECTION C — INDIKATOR MUTU PELAYANAN
                    </span>
                    {sectionsOpen.c ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-cyan-300" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-cyan-300" />
                    )}
                  </button>
                  <AnimatePresence initial={false}>
                    {sectionsOpen.c && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 flex flex-col gap-4">
                          <RekapTableScroll>
                            <table className={cn(tableShell, "min-w-max")}>
                              <YearGridHead />
                              <tbody>
                                <DataRowText
                                  no="1"
                                  label="BOR (%)"
                                  cells={sectionCBorToiBtoCells.bor}
                                  totalCell={sectionCBorToiBtoCells.borTotal}
                                />
                                <DataRowText
                                  no="2"
                                  label="ALOS"
                                  cells={sectionCAlosCells.cells}
                                  totalCell={sectionCAlosCells.total}
                                />
                                <DataRowText
                                  no="3"
                                  label="TOI"
                                  cells={sectionCBorToiBtoCells.toi}
                                  totalCell={sectionCBorToiBtoCells.toiTotal}
                                />
                                <DataRowText
                                  no="4"
                                  label="BTO"
                                  cells={sectionCBorToiBtoCells.bto}
                                  totalCell={sectionCBorToiBtoCells.btoTotal}
                                />
                                <DataRowText
                                  no="5"
                                  label="NDR"
                                  cells={SECTION_C_EMPTY_MONTHS}
                                  totalCell="—"
                                />
                                <DataRowText
                                  no="6"
                                  label="GDR"
                                  cells={SECTION_C_EMPTY_MONTHS}
                                  totalCell="—"
                                />
                              </tbody>
                            </table>
                          </RekapTableScroll>
                          <ChartPanel>
                            <div className="h-[min(260px,38vh)] w-full min-h-[200px]">
                              {mutuMode.kind === "avg" ? (
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart
                                    data={mutuMode.avgRows}
                                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                                  >
                                    <CartesianGrid
                                      strokeDasharray="3 3"
                                      stroke="rgba(148,163,184,0.15)"
                                    />
                                    <XAxis
                                      dataKey="month"
                                      tick={{
                                        fill: "rgba(255,255,255,0.85)",
                                        fontSize: 11,
                                      }}
                                      stroke="rgba(148,163,184,0.35)"
                                    />
                                    <YAxis
                                      tick={{
                                        fill: "rgba(255,255,255,0.75)",
                                        fontSize: 10,
                                      }}
                                      stroke="rgba(148,163,184,0.35)"
                                    />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Legend
                                      wrapperStyle={{ fontSize: 11 }}
                                      formatter={(v) => (
                                        <span className="text-white/90">{v}</span>
                                      )}
                                    />
                                    <Line
                                      type="monotone"
                                      dataKey="avgLos"
                                      name="Rata-rata LOS (hari)"
                                      stroke="#22d3ee"
                                      strokeWidth={2.5}
                                      dot={{ r: 3 }}
                                      animationDuration={1200}
                                      animationBegin={120}
                                    />
                                  </LineChart>
                                </ResponsiveContainer>
                              ) : mutuMode.kind === "placeholder" ? (
                                <div className="flex h-full min-h-[160px] items-center justify-center rounded-lg border border-dashed border-white/15 bg-black/25 px-4 text-center text-[11px] text-white/85 dark:text-white">
                                  Memuat rekapitulasi…
                                </div>
                              ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart
                                    data={
                                      mutuMode.kind === "fallbackDemo"
                                        ? FALLBACK_MUTU_DEMO
                                        : EMPTY_MUTU_LINE
                                    }
                                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                                  >
                                    <CartesianGrid
                                      strokeDasharray="3 3"
                                      stroke="rgba(148,163,184,0.15)"
                                    />
                                    <XAxis
                                      dataKey="month"
                                      tick={{
                                        fill: "rgba(255,255,255,0.85)",
                                        fontSize: 11,
                                      }}
                                      stroke="rgba(148,163,184,0.35)"
                                    />
                                    <YAxis
                                      tick={{
                                        fill: "rgba(255,255,255,0.75)",
                                        fontSize: 10,
                                      }}
                                      stroke="rgba(148,163,184,0.35)"
                                    />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Legend
                                      wrapperStyle={{ fontSize: 11 }}
                                      formatter={(v) => (
                                        <span className="text-white/90">{v}</span>
                                      )}
                                    />
                                    <Line
                                      type="monotone"
                                      dataKey="BOR"
                                      name={
                                        mutuMode.kind === "fallbackDemo"
                                          ? "BOR (%) demo"
                                          : "BOR (%)"
                                      }
                                      stroke="#22d3ee"
                                      strokeWidth={2.5}
                                      dot={{ r: 3 }}
                                      animationDuration={
                                        mutuMode.kind === "fallbackDemo" ? 1200 : 400
                                      }
                                      animationBegin={120}
                                    />
                                    <Line
                                      type="monotone"
                                      dataKey="TOI"
                                      name={
                                        mutuMode.kind === "fallbackDemo"
                                          ? "TOI demo"
                                          : "TOI"
                                      }
                                      stroke="#eab308"
                                      strokeWidth={2}
                                      dot={{ r: 3 }}
                                      animationDuration={
                                        mutuMode.kind === "fallbackDemo" ? 1200 : 400
                                      }
                                      animationBegin={280}
                                    />
                                    <Line
                                      type="monotone"
                                      dataKey="BTO"
                                      name={
                                        mutuMode.kind === "fallbackDemo"
                                          ? "BTO demo"
                                          : "BTO"
                                      }
                                      stroke="#34d399"
                                      strokeWidth={2}
                                      dot={{ r: 3 }}
                                      animationDuration={
                                        mutuMode.kind === "fallbackDemo" ? 1200 : 400
                                      }
                                      animationBegin={420}
                                    />
                                  </LineChart>
                                </ResponsiveContainer>
                              )}
                            </div>
                          </ChartPanel>
                        </div>
                        <p className="mt-3 px-1 text-[10px] text-white/85 dark:text-white/85">
                          BOR / TOI / BTO penuh membutuhkan denominator kapasitas TT — kolom tabel
                          mengikuti demo jika belum ada LOS terisi; NDR/GDR mengikuti definisi RS.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.section>

                {/* SECTION D — tabel kiri, grafik kanan */}
                <motion.section variants={sectionVariants} className="mb-2">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 rounded-lg border border-cyan-500/25 bg-cyan-500/5 px-3 py-2 text-left transition hover:bg-cyan-500/10"
                    onClick={() => toggle("d")}
                    aria-expanded={sectionsOpen.d}
                  >
                    <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-200 dark:text-white">
                      SECTION D — DIAGNOSA TERBANYAK
                    </span>
                    {sectionsOpen.d ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-cyan-300" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-cyan-300" />
                    )}
                  </button>
                  <AnimatePresence initial={false}>
                    {sectionsOpen.d && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 flex flex-col gap-4">
                          <RekapTableScroll>
                            <table className={cn(tableShell, "min-w-max")}>
                              <YearGridHead />
                              <tbody>
                                {diagKeysOrdered.map((dk, idx) => {
                                  const values = tableMonths.map((m) =>
                                    Number(m.section_d?.[dk] ?? 0),
                                  );
                                  return (
                                    <DataRowInt
                                      key={dk}
                                      no={String(idx + 1)}
                                      label={dk}
                                      values={values}
                                      highlight={
                                        dk === "NON CARDIO" ? "non-cardio" : undefined
                                      }
                                    />
                                  );
                                })}
                              </tbody>
                            </table>
                          </RekapTableScroll>
                          <ChartPanel>
                            <div className="h-[min(320px,42vh)] w-full min-h-[260px]">
                              {suppressChartsPendingFetch ? (
                                <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 bg-black/25 px-4 text-center text-[11px] text-white/85 dark:text-white">
                                  <Loader2
                                    className="h-5 w-5 shrink-0 animate-spin text-cyan-300"
                                    aria-hidden
                                  />
                                  Memuat grafik…
                                </div>
                              ) : reportHasNoCases ? (
                                <div className="flex h-full min-h-[200px] items-center justify-center rounded-lg border border-dashed border-white/15 bg-black/30 px-4 text-center text-[11px] leading-relaxed text-white/90 dark:text-white">
                                  Tidak ada diagnosis teragregasi pada tahun {year} — grafik kosong.
                                </div>
                              ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart
                                    data={diagChartData}
                                    layout="vertical"
                                    margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                                  >
                                    <CartesianGrid
                                      strokeDasharray="3 3"
                                      stroke="rgba(148,163,184,0.12)"
                                      horizontal={false}
                                    />
                                    <XAxis
                                      type="number"
                                      tick={{
                                        fill: "rgba(255,255,255,0.75)",
                                        fontSize: 10,
                                      }}
                                      stroke="rgba(148,163,184,0.35)"
                                    />
                                    <YAxis
                                      type="category"
                                      dataKey="name"
                                      width={100}
                                      tick={{
                                        fill: "rgba(255,255,255,0.88)",
                                        fontSize: 10,
                                      }}
                                      stroke="rgba(148,163,184,0.35)"
                                    />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Bar
                                      dataKey="total"
                                      name="Kasus"
                                      radius={[0, 6, 6, 0]}
                                      animationDuration={1000}
                                      animationBegin={80}
                                    >
                                      {diagChartData.map((entry, i) => (
                                        <Cell
                                          key={entry.name}
                                          fill={
                                            entry.name === "NON CARDIO"
                                              ? "rgba(52,211,153,0.85)"
                                              : PAY_COLORS[i % PAY_COLORS.length]
                                          }
                                        />
                                      ))}
                                    </Bar>
                                  </BarChart>
                                </ResponsiveContainer>
                              )}
                            </div>
                          </ChartPanel>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.section>
              </motion.div>

              <footer className="shrink-0 border-t border-white/10 bg-black/40 px-4 py-3 text-[10px] text-white/85 dark:text-white/85 sm:px-6">
                Endpoint:{" "}
                <code className="rounded bg-white/10 px-1 py-0.5 text-[9px] text-cyan-200 dark:text-white">
                  GET /api/iccu-register/rekap
                </code>
                . Tanggal acuan per baris sama dengan RPC Postgres (
                <span className="text-white dark:text-white">arsip → keluar → dibuat</span>
                ).
              </footer>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
