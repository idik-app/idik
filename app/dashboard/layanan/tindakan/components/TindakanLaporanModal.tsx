import { FileSpreadsheet, X, Search, Activity, Users, CheckCircle2, Stethoscope, ChevronLeft, ChevronRight } from "lucide-react";
import React, { useCallback, useDeferredValue, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { UI_LAYERS } from "@/lib/ui/layers";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { PasienOption } from "@/components/ui/pasien-combobox";
import type { TindakanJoinResult } from "../bridge/mapping.types";
import type { WireframeTabId } from "../bridge/wireframeDrawerTabs";
import ReportExportActionBar from "./ReportExportActionBar";
import {
  aggregateMonthlyCaraBayar,
  aggregateMonthlyJenisOperasi,
  aggregateMonthlyKategori,
  CARA_BAYAR_LABEL_BELUM_TERISI,
  weekdaySun0Wib,
  type MonthlyMatrixAgg,
} from "../lib/tindakanBulananMatrix";
import {
  buildPasienReportLookup,
  mergePasienMasterIntoRowForReport,
} from "../lib/displayTindakanRow";
import {
  buildBulananCaraBayarHtml,
  buildBulananJenisOperasiHtml,
  buildBulananMatrixWhatsAppText,
  buildAnalisisGabunganHtml,
  buildAnalisisGabunganWhatsAppText,
  downloadAnalisisGabunganExcel,
  downloadMonthlyMatrixExcel,
} from "../lib/tindakanReportTemplates";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../../../components/ui/popover";

// --- Components ---

/** Tampilan tabel mini untuk tab Analisis Gabungan — baris bisa diklik untuk buka drawer detail. */
const AnalisisTable = React.memo(
  ({
    rows,
    onOpenDetail,
  }: {
    rows: readonly TindakanJoinResult[];
    /** Tab awal drawer (default `klinis` agar diagnosa/autosave klinis langsung aktif). */
    onOpenDetail?: (
      row: TindakanJoinResult,
      initialTab?: WireframeTabId,
    ) => void;
  }) => {
    const openable = Boolean(onOpenDetail);
    return (
    <div className="flex flex-col">
      <table className="w-full border-collapse text-[11px]">
        <thead className="sticky top-0 z-[2] bg-slate-100 dark:bg-zinc-900">
          <tr>
            <th className="border border-slate-300/70 px-2 py-1.5 text-left font-bold dark:border-white/10">Tgl</th>
            <th className="border border-slate-300/70 px-2 py-1.5 text-left font-bold dark:border-white/10">Pasien & Klinis</th>
            <th className="border border-slate-300/70 px-2 py-1.5 text-left font-bold dark:border-white/10">Tindakan & Kategori</th>
            <th className="border border-slate-300/70 px-2 py-1.5 text-left font-bold dark:border-white/10">Tim Medis</th>
            <th className="border border-slate-300/70 px-2 py-1.5 text-left font-bold dark:border-white/10">Administrasi</th>
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows.map((r, idx) => (
              <tr
                key={r.id ? String(r.id) : idx}
                className={cn(
                  "hover:bg-slate-50 dark:hover:bg-white/5",
                  openable && r.id && "cursor-pointer",
                )}
                onClick={() => {
                  if (!onOpenDetail || !r.id) return;
                  onOpenDetail(r, "klinis");
                }}
              >
                <td className="border border-slate-300/70 px-2 py-1 dark:border-white/10">
                  <div className="text-[10px] font-medium text-slate-500 dark:text-white/40">
                    {r.tanggal ? new Intl.DateTimeFormat("id-ID", { weekday: 'long' }).format(new Date(r.tanggal)) : "-"}
                  </div>
                  <div className="font-bold">
                    {r.tanggal ? new Intl.DateTimeFormat("id-ID", { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(r.tanggal)) : "-"}
                  </div>
                </td>
                <td className="border border-slate-300/70 px-2 py-1 dark:border-white/10">
                  <div className="font-bold text-emerald-700 dark:text-emerald-400">{r.nama_pasien || "-"}</div>
                  <div className="text-[10px] opacity-70">RM: {r.no_rm || "-"}</div>
                  <div className="mt-1 border-t border-slate-100 pt-1 dark:border-white/5">
                    <span className="font-medium text-slate-500 dark:text-white/50">Diag: </span>
                    <span className="font-bold">{r.diagnosa || "-"}</span>
                    {r.faktor_risiko && (
                      <div className="text-[9px] text-slate-400 italic">FR: {r.faktor_risiko}</div>
                    )}
                  </div>
                </td>
                <td className="border border-slate-300/70 px-2 py-1 dark:border-white/10">
                  <div className="font-bold">{r.tindakan || "-"}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <span className="rounded bg-emerald-100 px-1 py-0.5 text-[9px] font-bold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                      {r.kategori || "TANPA KATEGORI"}
                    </span>
                    {r.severity_level && (
                      <span className="rounded bg-amber-100 px-1 py-0.5 text-[9px] font-bold text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                        Sev: {r.severity_level}
                      </span>
                    )}
                    {r.total_kontras && (
                      <span className="rounded bg-blue-100 px-1 py-0.5 text-[9px] font-bold text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                        Contrast: {r.total_kontras}ml
                      </span>
                    )}
                  </div>
                  {r.kesimpulan_laporan && (
                    <div className="mt-1.5 border-t border-slate-100 pt-1 text-[10px] leading-relaxed dark:border-white/5">
                      <div className="font-bold text-slate-500 uppercase text-[8px] tracking-wider dark:text-white/40">Kesimpulan:</div>
                      <div className="italic text-slate-600 dark:text-white/70 line-clamp-2">{r.kesimpulan_laporan}</div>
                    </div>
                  )}
                  {r.plan_medis && (
                    <div className="mt-1 text-[10px] leading-relaxed">
                      <div className="font-bold text-emerald-600 uppercase text-[8px] tracking-wider dark:text-emerald-400/60">Plan:</div>
                      <div className="text-emerald-700 dark:text-emerald-400 line-clamp-1">{r.plan_medis}</div>
                    </div>
                  )}
                </td>
                <td className="border border-slate-300/70 px-2 py-1 dark:border-white/10">
                  <div className="font-medium text-emerald-600 dark:text-emerald-400">Dr: {r.dokter || "-"}</div>
                  <div className="mt-1 text-[10px] leading-tight text-slate-500 dark:text-white/50">
                    {r.asisten && <div>As: {r.asisten}</div>}
                    {r.sirkuler && <div>Sir: {r.sirkuler}</div>}
                    {r.logger && <div>Log: {r.logger}</div>}
                  </div>
                </td>
                <td className="border border-slate-300/70 px-2 py-1 dark:border-white/10">
                  <div className="font-medium">{r.kelas_pembiayaan || r.pembiayaan || "-"}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <span className={cn(
                      "rounded px-1 py-0.5 text-[9px] font-bold",
                      r.status === "Selesai" 
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300" 
                        : "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300"
                    )}>
                      {r.status || "-"}
                    </span>
                    {r.ruangan && (
                      <span className="rounded bg-slate-100 px-1 py-0.5 text-[9px] font-bold text-slate-700 dark:bg-white/10 dark:text-white/70">
                        {r.ruangan} {r.cath && `(${r.cath})`}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="p-6 text-center italic opacity-50">
                Tidak ada data yang cocok dengan kriteria pencarian.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
    );
  },
);
AnalisisTable.displayName = "AnalisisTable";

const TableRow = React.memo(
  ({
    label,
    ri,
    activeMatrix,
    formatCell,
  }: {
    label: string;
    ri: number;
    activeMatrix: MonthlyMatrixAgg;
    formatCell: (n: number) => string;
  }) => {
    return (
      <tr>
        <th
          scope="row"
          className={cn(
            "sticky left-0 z-[1] border border-slate-300/70 bg-white px-1.5 py-0.5 text-left font-semibold dark:border-white/10 dark:bg-zinc-900",
          )}
        >
          {label}
        </th>
        {(activeMatrix.data[ri] ?? []).map((c: number, di: number) => {
          const day = di + 1;
          const wd = weekdaySun0Wib(
            activeMatrix.year,
            activeMatrix.month1to12,
            day,
          );
          const wkend = wd === 0 || wd === 6;

          // Detail Pasien untuk Popover (Point 4)
          const detailPasien = activeMatrix.details?.[ri]?.[di] ?? [];

          return (
            <td
              key={di}
              className={cn(
                "border px-0.5 py-0.5 text-center tabular-nums transition-colors",
                "border-slate-300/70 dark:border-white/10 dark:text-white/80",
                wkend ? "bg-amber-50/50 dark:bg-amber-950/20" : "",
                c > 0 ? "cursor-pointer hover:bg-emerald-500/10" : "",
              )}
            >
              {c > 0 ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="h-full w-full focus:outline-none">
                      {formatCell(c)}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    className={cn(
                      "w-64 p-2 text-[11px]",
                      UI_LAYERS.dialogNestedPopover,
                    )}
                  >
                    <div className="mb-1 border-b pb-1 font-bold text-emerald-600 dark:text-emerald-400">
                      {label} - Tgl {day}
                    </div>
                    <ul className="max-h-32 overflow-auto">
                      {detailPasien.length > 0 ? (
                        detailPasien.map((p, pi) => (
                          <li
                            key={pi}
                            className="border-b border-slate-100 py-1 last:border-0 dark:border-white/5"
                          >
                            <div className="font-semibold text-emerald-700 dark:text-emerald-400">
                              {p.nama} | {p.tindakan || "-"}
                            </div>
                            <div className="text-[10px] opacity-70 flex flex-wrap gap-x-2">
                              <span>RM: {p.no_rm}</span>
                              <span className="font-bold">Dr: {p.dokter}</span>
                            </div>
                            {(p.diagnosa || p.kategori) && (
                              <div className="mt-1 flex flex-wrap gap-1 text-[9px]">
                                {p.diagnosa && (
                                  <span className="rounded bg-slate-100 px-1 py-0.5 font-medium dark:bg-white/10 dark:text-white/70">
                                    {p.diagnosa}
                                  </span>
                                )}
                                {p.kategori && (
                                  <span className="rounded bg-emerald-100 px-1 py-0.5 font-bold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                                    {p.kategori}
                                  </span>
                                )}
                              </div>
                            )}
                          </li>
                        ))
                      ) : (
                        <li className="py-1 italic opacity-50">
                          Detail tidak tersedia
                        </li>
                      )}
                    </ul>
                  </PopoverContent>
                </Popover>
              ) : (
                formatCell(c)
              )}
            </td>
          );
        })}
        <td className="border border-slate-300/70 px-1 py-0.5 text-center font-extrabold tabular-nums dark:border-white/10 dark:text-white">
          {formatCell(activeMatrix.rowTotals[ri] ?? 0)}
        </td>
      </tr>
    );
  },
);
TableRow.displayName = "TableRow";

// --- Utils ---

function currentMonthWibYyyyMm(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .slice(0, 7);
}

function parseYyyyMm(s: string): { y: number; m: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const y = Number.parseInt(m[1]!, 10);
  const mo = Number.parseInt(m[2]!, 10);
  if (mo < 1 || mo > 12) return null;
  return { y, m: mo };
}

function formatCell(n: number): string {
  return n === 0 ? "" : String(n);
}

/** Ringkas RM / pasien untuk kasus baris BELUM TERISI (unik per RM atau per nama bila RM kosong). */
function buildBelumTerisiRmList(matrix: MonthlyMatrixAgg): {
  key: string;
  rmLabel: string;
  nama: string;
  kasus: number;
}[] {
  const idx = matrix.rowLabels.indexOf(CARA_BAYAR_LABEL_BELUM_TERISI);
  if (idx < 0) return [];
  const perDay = matrix.details?.[idx];
  if (!perDay) return [];

  const agg = new Map<
    string,
    { rmLabel: string; nama: string; kasus: number }
  >();

  for (const dayDetails of perDay) {
    for (const p of dayDetails) {
      const rawRm = String(p.no_rm ?? "").trim();
      const digits = rawRm.replace(/\D/g, "");
      const nama = String(p.nama ?? "").trim() || "—";
      const key =
        digits.length >= 3
          ? `rm:${digits}`
          : `nama:${nama.toLowerCase()}`;
      const rmLabel =
        digits.length >= 3
          ? rawRm && rawRm !== "-"
            ? rawRm
            : digits
          : "Tanpa RM";

      const cur = agg.get(key);
      if (cur) {
        cur.kasus += 1;
      } else {
        agg.set(key, { rmLabel, nama, kasus: 1 });
      }
    }
  }

  return [...agg.entries()]
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => {
      const da = a.rmLabel.replace(/\D/g, "");
      const db = b.rmLabel.replace(/\D/g, "");
      if (da.length >= 3 && db.length >= 3) {
        return da.localeCompare(db, undefined, { numeric: true });
      }
      if (da.length >= 3) return -1;
      if (db.length >= 3) return 1;
      return a.nama.localeCompare(b.nama, "id");
    });
}

type ReportTab = "jenis" | "kategori" | "cara" | "analisis";

export default function TindakanLaporanModal({
  open,
  onOpenChange,
  rows,
  loading,
  filterSummaryLines,
  pasienOptions = [],
  onOpenDetail,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: readonly TindakanJoinResult[];
  loading: boolean;
  filterSummaryLines: readonly string[];
  /** Master pasien (compact) — laporan cara bayar memakai jenis + kelas dari sini bila baris terhubung. */
  pasienOptions?: readonly PasienOption[];
  /** Buka drawer detail tindakan dari tabel Analisis (tab Klinis untuk isian diagnosa/dll). */
  onOpenDetail?: (
    row: TindakanJoinResult,
    initialTab?: WireframeTabId,
  ) => void;
}) {
  const [tab, setTab] = useState<ReportTab>("jenis");
  const [monthYyyyMm, setMonthYyyyMm] = useState(currentMonthWibYyyyMm);
  const [searchQuery, setSearchQuery] = useState("");
  const [analisisPage, setAnalisisPage] = useState(1);
  const ANALISIS_PAGE_SIZE = 20;

  const ym = useMemo(() => parseYyyyMm(monthYyyyMm), [monthYyyyMm]);

  /** Kurangi jank: hitung laporan dari snapshot pasien/baris yang sedikit tertunda saat data besar baru masuk. */
  const deferredRows = useDeferredValue(rows);
  const deferredPasien = useDeferredValue(pasienOptions);
  const reportRowsCatchUp =
    deferredRows !== rows || deferredPasien !== pasienOptions;

  const pasienLookup = useMemo(
    () => buildPasienReportLookup(deferredPasien),
    [deferredPasien],
  );

  /** Nama/RM mengikuti master pasien terbaru; indeks O(1) untuk master besar. */
  const reportRows = useMemo(
    () =>
      deferredRows.map((r) =>
        mergePasienMasterIntoRowForReport(r, deferredPasien, pasienLookup),
      ),
    [deferredRows, deferredPasien, pasienLookup],
  );

  const matrixPasienOpts = useMemo(
    () => ({
      pasienOptions: deferredPasien,
      pasienLookup,
    }),
    [deferredPasien, pasienLookup],
  );

  // Reset page saat pencarian atau tab berubah
  useMemo(() => {
    setAnalisisPage(1);
  }, [searchQuery, tab]);

  const matrixJenis = useMemo(() => {
    if (!ym) return null;
    return aggregateMonthlyJenisOperasi(
      reportRows,
      ym.y,
      ym.m,
      matrixPasienOpts,
    );
  }, [reportRows, ym, matrixPasienOpts]);

  const matrixCara = useMemo(() => {
    if (!ym) return null;
    return aggregateMonthlyCaraBayar(reportRows, ym.y, ym.m, matrixPasienOpts);
  }, [reportRows, ym, matrixPasienOpts]);

  const matrixKategori = useMemo(() => {
    if (!ym) return null;
    return aggregateMonthlyKategori(
      reportRows,
      ym.y,
      ym.m,
      matrixPasienOpts,
    );
  }, [reportRows, ym, matrixPasienOpts]);

  const laporanCaraBelumTerisi = useMemo(() => {
    if (!matrixCara) {
      return { count: 0, strong: false, rmList: [] as ReturnType<typeof buildBelumTerisiRmList> };
    }
    const idx = matrixCara.rowLabels.indexOf(CARA_BAYAR_LABEL_BELUM_TERISI);
    if (idx < 0) {
      return { count: 0, strong: false, rmList: [] as ReturnType<typeof buildBelumTerisiRmList> };
    }
    const count = matrixCara.rowTotals[idx] ?? 0;
    const gt = matrixCara.grandTotal;
    const strong = count > 0 && (count >= 5 || (gt > 0 && count / gt >= 0.15));
    const rmList = buildBelumTerisiRmList(matrixCara);
    return { count, strong, rmList };
  }, [matrixCara]);

  const rawMatrix =
    tab === "jenis"
      ? matrixJenis
      : tab === "kategori"
        ? matrixKategori
        : matrixCara;

  // Filter Matrix berdasarkan Search Query (Point 2)
  const activeMatrix = useMemo(() => {
    if (!rawMatrix || !searchQuery.trim()) return rawMatrix;

    const query = searchQuery.toLowerCase();
    
    // Logika Pencarian Cerdas: 
    // Cari di Label Baris (Kategori/Jenis) ATAU di dalam Detail Pasien (Nama Tindakan/Nama Pasien)
    const filteredIndices = rawMatrix.rowLabels
      .map((label, idx) => {
        const labelMatch = label.toLowerCase().includes(query);
        
        // Cek apakah ada detail pasien (nama tindakan, nama pasien, dokter) yang cocok
        const detailMatch = rawMatrix.details?.[idx]?.some(dayDetails => 
          dayDetails.some(p => 
            p.nama.toLowerCase().includes(query) || 
            (p as any).tindakan?.toLowerCase().includes(query) ||
            (p as any).diagnosa?.toLowerCase().includes(query) ||
            (p as any).kategori?.toLowerCase().includes(query) ||
            (p as any).kesimpulan_laporan?.toLowerCase().includes(query) ||
            (p as any).plan_medis?.toLowerCase().includes(query) ||
            p.dokter.toLowerCase().includes(query)
          )
        );

        return (labelMatch || detailMatch) ? idx : -1;
      })
      .filter((idx) => idx !== -1);

    if (filteredIndices.length === rawMatrix.rowLabels.length) return rawMatrix;

    return {
      ...rawMatrix,
      rowLabels: filteredIndices.map((i) => rawMatrix.rowLabels[i]),
      data: filteredIndices.map((i) => {
        // Jika pencarian spesifik (misal: "DCA"), kita hanya ingin menghitung yang cocok saja di sel tersebut
        return rawMatrix.data[i].map((count, di) => {
          const details = rawMatrix.details?.[i]?.[di] || [];
          if (rawMatrix.rowLabels[i].toLowerCase().includes(query)) return count;
          
          return details.filter(p => 
            p.nama.toLowerCase().includes(query) || 
            p.tindakan?.toLowerCase().includes(query) ||
            p.diagnosa?.toLowerCase().includes(query) ||
            p.kategori?.toLowerCase().includes(query) ||
            p.kesimpulan_laporan?.toLowerCase().includes(query) ||
            p.plan_medis?.toLowerCase().includes(query) ||
            p.dokter.toLowerCase().includes(query)
          ).length;
        });
      }),
      rowTotals: [], // Akan dihitung ulang di finalizeMatrix atau manual
      colTotals: [], // Akan dihitung ulang
      grandTotal: 0,
      details: filteredIndices.map((i) => {
        const rowDetails = rawMatrix.details?.[i] || [];
        return rowDetails.map(dayDetails => {
          if (rawMatrix.rowLabels[i].toLowerCase().includes(query)) return dayDetails;
          return dayDetails.filter(p => 
            p.nama.toLowerCase().includes(query) || 
            p.tindakan?.toLowerCase().includes(query) ||
            p.diagnosa?.toLowerCase().includes(query) ||
            p.kategori?.toLowerCase().includes(query) ||
            p.kesimpulan_laporan?.toLowerCase().includes(query) ||
            p.plan_medis?.toLowerCase().includes(query) ||
            p.dokter.toLowerCase().includes(query)
          );
        });
      }),
    } as MonthlyMatrixAgg;
  }, [rawMatrix, searchQuery]);

  // Re-calculate totals untuk filtered matrix
  const finalMatrix = useMemo(() => {
    if (!activeMatrix) return null;
    if (!searchQuery.trim()) return activeMatrix;
    
    const data = activeMatrix.data;
    const rowTotals = data.map(row => row.reduce((a, b) => a + b, 0));
    const colTotals = Array.from({ length: activeMatrix.daysInMonth }, (_, c) =>
      data.reduce((sum, row) => sum + (row[c] ?? 0), 0)
    );
    const grandTotal = rowTotals.reduce((a, b) => a + b, 0);

    return {
      ...activeMatrix,
      rowTotals,
      colTotals,
      grandTotal
    } as MonthlyMatrixAgg;
  }, [activeMatrix, searchQuery]);

  const filteredAnalisisRows = useMemo(() => {
    if (tab !== "analisis") return [];
    if (!ym) return [];
    
    // Filter berdasarkan bulan terpilih
    const monthRows = reportRows.filter((r) => {
      const s = String(r.tanggal ?? "").trim();
      if (s.length < 7) return false;
      const y = Number.parseInt(s.slice(0, 4), 10);
      const m = Number.parseInt(s.slice(5, 7), 10);
      return y === ym.y && m === ym.m;
    });

    if (!searchQuery.trim()) return monthRows;

    const query = searchQuery.toLowerCase();
    return monthRows.filter((r) => {
      const nama = String(r.nama_pasien || "").toLowerCase();
      const rm = String(r.no_rm || "").toLowerCase();
      const tindakan = String(r.tindakan || "").toLowerCase();
      const kategori = String(r.kategori || "").toLowerCase();
      const dokter = String(r.dokter || "").toLowerCase();
      
      // Field tambahan dari detail drawer (Radiologi, Klinis, Tim, dll)
      const diagnosa = String(r.diagnosa || "").toLowerCase();
      const asisten = String(r.asisten || "").toLowerCase();
      const sirkuler = String(r.sirkuler || "").toLowerCase();
      const logger = String(r.logger || "").toLowerCase();
      const ruangan = String(r.ruangan || "").toLowerCase();
      const cath = String(r.cath || "").toLowerCase();
      const severity = String(r.severity_level || "").toLowerCase();
      const pembiayaan = String(r.pembiayaan || "").toLowerCase();
      const kelas_pembiayaan = String(r.kelas_pembiayaan || "").toLowerCase();

      // Field baru dari Laporan
      const kesimpulan = String(r.kesimpulan_laporan || "").toLowerCase();
      const plan = String(r.plan_medis || "").toLowerCase();
      const faktor_risiko = String(r.faktor_risiko || "").toLowerCase();
      const temuan = String(r.temuan_pembuluh || "").toLowerCase();
      
      return (
        nama.includes(query) ||
        rm.includes(query) ||
        tindakan.includes(query) ||
        kategori.includes(query) ||
        dokter.includes(query) ||
        diagnosa.includes(query) ||
        asisten.includes(query) ||
        sirkuler.includes(query) ||
        logger.includes(query) ||
        ruangan.includes(query) ||
        cath.includes(query) ||
        severity.includes(query) ||
        pembiayaan.includes(query) ||
        kelas_pembiayaan.includes(query) ||
        kesimpulan.includes(query) ||
        plan.includes(query) ||
        faktor_risiko.includes(query) ||
        temuan.includes(query)
      );
    });
  }, [reportRows, ym, tab, searchQuery]);

  const paginatedAnalisisRows = useMemo(() => {
    const start = (analisisPage - 1) * ANALISIS_PAGE_SIZE;
    return filteredAnalisisRows.slice(start, start + ANALISIS_PAGE_SIZE);
  }, [filteredAnalisisRows, analisisPage]);

  const totalAnalisisPages = Math.ceil(filteredAnalisisRows.length / ANALISIS_PAGE_SIZE);

  const analisisStats = useMemo(() => {
    if (tab !== "analisis" || filteredAnalisisRows.length === 0) return null;
    
    const total = filteredAnalisisRows.length;
    const selesai = filteredAnalisisRows.filter(r => r.status === "Selesai").length;
    const successRate = Math.round((selesai / total) * 100);
    
    // Cari Top Dokter
    const doctorCounts: Record<string, number> = {};
    filteredAnalisisRows.forEach(r => {
      const d = r.dokter || "Tanpa Dokter";
      doctorCounts[d] = (doctorCounts[d] || 0) + 1;
    });
    const topDoctor = Object.entries(doctorCounts).sort((a, b) => b[1] - a[1])[0];

    return { total, selesai, successRate, topDoctor };
  }, [tab, filteredAnalisisRows]);

  const subtitleLines = useMemo(() => {
    const base = [...filterSummaryLines];
    base.push(`Baris tindakan (setelah filter tabel): ${rows.length}`);
    if (pasienOptions.length > 0) {
      base.push(
        "Cara bayar: klasifikasi memakai master pasien (jenis + kelas) bila kasus terhubung ke RM / pasien_id.",
      );
    }
    if (matrixCara) {
      const idx = matrixCara.rowLabels.indexOf(CARA_BAYAR_LABEL_BELUM_TERISI);
      const n = idx >= 0 ? (matrixCara.rowTotals[idx] ?? 0) : 0;
      if (n > 0) {
        base.push(
          `Cara bayar: ${n} kasus tanpa data biaya terklasifikasi → baris ${CARA_BAYAR_LABEL_BELUM_TERISI} (bukan UMUM).`,
        );
      }
    }
    return base;
  }, [filterSummaryLines, rows.length, pasienOptions.length, matrixCara]);

  const buildExportHtml = useCallback(() => {
    if (tab === "analisis") {
      return buildAnalisisGabunganHtml(filteredAnalisisRows, subtitleLines);
    }
    if (!activeMatrix) return "";
    if (tab === "jenis")
      return buildBulananJenisOperasiHtml(activeMatrix, subtitleLines);
    if (tab === "cara")
      return buildBulananCaraBayarHtml(activeMatrix, subtitleLines);
    // Fallback untuk kategori (bisa memakai template jenis operasi karena strukturnya sama)
    return buildBulananJenisOperasiHtml(activeMatrix, subtitleLines);
  }, [activeMatrix, tab, subtitleLines, filteredAnalisisRows]);

  const buildExportWhatsApp = useCallback(() => {
    if (tab === "analisis") {
      return buildAnalisisGabunganWhatsAppText(filteredAnalisisRows, subtitleLines);
    }
    if (!activeMatrix) return "";
    const title =
      tab === "jenis"
        ? "LAPORAN JENIS OPERASI / TINDAKAN CATHLAB"
        : tab === "cara"
          ? "LAPORAN CARA BAYAR CATHLAB"
          : "LAPORAN KATEGORI TINDAKAN CATHLAB";
    return buildBulananMatrixWhatsAppText(title, activeMatrix, subtitleLines);
  }, [activeMatrix, tab, subtitleLines, filteredAnalisisRows]);

  const exportFileBase = useMemo(() => {
    const safe = monthYyyyMm.replace(/[^\d-]/g, "") || "bulan";
    if (tab === "jenis") return `laporan-tindakan-jenis-${safe}`;
    if (tab === "kategori") return `laporan-tindakan-kategori-${safe}`;
    if (tab === "cara") return `laporan-tindakan-cara-bayar-${safe}`;
    if (tab === "analisis") return `laporan-analisis-gabungan-${safe}`;
    return `laporan-tindakan-kategori-${safe}`;
  }, [monthYyyyMm, tab]);

  const handleDownloadExcel = useCallback(() => {
    if (tab === "analisis") {
      downloadAnalisisGabunganExcel(filteredAnalisisRows, exportFileBase);
    } else if (activeMatrix) {
      const title =
        tab === "jenis"
          ? "LAPORAN JENIS OPERASI / TINDAKAN CATHLAB"
          : tab === "cara"
            ? "LAPORAN CARA BAYAR CATHLAB"
            : "LAPORAN KATEGORI TINDAKAN CATHLAB";
      downloadMonthlyMatrixExcel(activeMatrix, title, exportFileBase);
    }
  }, [activeMatrix, tab, filteredAnalisisRows, exportFileBase]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName={cn("bg-black/40 backdrop-blur-sm", UI_LAYERS.dialogOverlayTop)}
        className={cn(
          "max-h-[95vh] w-[min(100vw-1rem,96vw)] max-w-[min(96vw,92rem)] overflow-hidden p-0 flex flex-col",
          "border-slate-300/60 bg-white dark:border-white/10 dark:bg-zinc-950",
          UI_LAYERS.dialogContentTop
        )}
      >
        <DialogPrimitive.Close
          className={cn(
            "absolute right-4 top-4 rounded-full p-2 transition-all duration-200",
            "hover:bg-slate-100 active:scale-95 dark:hover:bg-white/5",
            "text-slate-400 hover:text-slate-600 dark:text-white/30 dark:hover:text-white/60",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50",
            "z-[51]", // Pastikan di atas tapi tidak menumpuk secara visual
          )}
        >
          <X size={20} strokeWidth={2.5} />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>

        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col gap-3 p-4 sm:p-6",
            "text-slate-900 dark:text-white",
          )}
        >
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between pr-8">
            <div className="min-w-0 space-y-1 text-left sm:pr-2">
              <DialogHeader className="space-y-1 text-left">
                <DialogTitle className="flex items-center gap-2 text-left font-bold tracking-wide">
                  <FileSpreadsheet
                    className="shrink-0 text-emerald-600 dark:text-emerald-300"
                    size={22}
                    strokeWidth={2.25}
                    aria-hidden
                  />
                  Laporan tindakan
                </DialogTitle>
              </DialogHeader>
              {reportRowsCatchUp && !loading ? (
                <p
                  role="status"
                  className="text-[10px] font-semibold text-slate-600 dark:text-white/70"
                >
                  Menyesuaikan laporan dengan data tindakan / master pasien terbaru…
                </p>
              ) : null}
            </div>
            <ReportExportActionBar
              className="shrink-0 sm:pt-0.5"
              disabled={loading || !ym}
              empty={!loading && (tab === "analisis" ? filteredAnalisisRows.length === 0 : !activeMatrix)}
              fileNameBase={exportFileBase}
              buildHtml={buildExportHtml}
              buildWhatsAppText={buildExportWhatsApp}
              onDownloadExcel={handleDownloadExcel}
            />
          </div>

          <div
            className={cn(
              "flex shrink-0 flex-wrap items-center gap-4 rounded-lg border p-2.5",
              "border-emerald-200/80 bg-emerald-50/50 dark:border-white/10 dark:bg-white/5",
            )}
          >
            <div className="flex rounded-lg border border-emerald-600/25 bg-white/90 p-0.5 dark:border-white/10 dark:bg-white/5">
              <button
                type="button"
                onClick={() => setTab("jenis")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-extrabold transition",
                  tab === "jenis"
                    ? "bg-emerald-600 text-white dark:bg-emerald-600/80 dark:text-white"
                    : "text-slate-700 hover:bg-emerald-50 dark:text-white/70 dark:hover:bg-white/10",
                )}
              >
                Prosedur (Detail)
              </button>
              <button
                type="button"
                onClick={() => setTab("kategori")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-extrabold transition",
                  tab === "kategori"
                    ? "bg-emerald-600 text-white dark:bg-emerald-600/80 dark:text-white"
                    : "text-slate-700 hover:bg-emerald-50 dark:text-white/70 dark:hover:bg-white/10",
                )}
              >
                Kategori (Grup)
              </button>
              <button
                type="button"
                onClick={() => setTab("cara")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-extrabold transition",
                  tab === "cara"
                    ? "bg-emerald-600 text-white dark:bg-emerald-600/80 dark:text-white"
                    : "text-slate-700 hover:bg-emerald-50 dark:text-white/70 dark:hover:bg-white/10",
                )}
              >
                Cara bayar
              </button>
              <button
                type="button"
                onClick={() => setTab("analisis")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-extrabold transition",
                  tab === "analisis"
                    ? "bg-emerald-600 text-white dark:bg-emerald-600/80 dark:text-white"
                    : "text-slate-700 hover:bg-emerald-50 dark:text-white/70 dark:hover:bg-white/10",
                )}
              >
                Analisis Gabungan
              </button>
            </div>

            <label className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-900 dark:text-white/60">
                Bulan laporan
              </span>
              <input
                type="month"
                value={monthYyyyMm}
                onChange={(e) => setMonthYyyyMm(e.target.value)}
                className={cn(
                  "rounded-md border px-2 py-1 text-[13px] font-semibold font-mono",
                  "border-emerald-300/80 bg-white text-slate-900 [color-scheme:light]",
                  "dark:border-white/10 dark:bg-white/5 dark:text-white dark:[color-scheme:dark]",
                )}
              />
            </label>

            {/* Search Bar (Point 2) */}
            <div className="flex flex-1 flex-col gap-0.5 min-w-[200px]">
              <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-900 dark:text-white/60">
                Cari Tindakan / Kategori
              </span>
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Ketik nama tindakan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn(
                    "w-full rounded-md border py-1 pl-8 pr-2 text-[13px] font-semibold",
                    "border-emerald-300/80 bg-white text-slate-900",
                    "dark:border-white/10 dark:bg-white/5 dark:text-white",
                  )}
                />
              </div>
            </div>
          </div>

          {tab === "cara" && laporanCaraBelumTerisi.count > 0 ? (
            <div
              role="status"
              className={cn(
                "shrink-0 rounded-lg border px-3 py-2 text-[11px] font-semibold leading-snug",
                laporanCaraBelumTerisi.strong
                  ? "border-amber-500/80 bg-amber-100/90 text-amber-950 dark:border-amber-400/60 dark:bg-amber-950/50 dark:text-white"
                  : "border-slate-300/80 bg-slate-100/80 text-slate-800 dark:border-white/20 dark:bg-white/10 dark:text-white",
              )}
            >
              {laporanCaraBelumTerisi.count} kasus dalam periode ini tidak punya
              jenis/kelas pembiayaan yang terbaca (kosong di tindakan dan tidak
              terisi di master pasien, atau tidak terhubung ke master). Mereka
              masuk baris{" "}
              <span className="font-extrabold">
                {CARA_BAYAR_LABEL_BELUM_TERISI}
              </span>
              , bukan UMUM. Lengkapi data pasien (jenis pembiayaan + kelas) atau
              hubungkan kasus ke RM / pasien_id agar laporan akurat.
              {laporanCaraBelumTerisi.strong ? (
                <span className="mt-1 block font-extrabold">
                  Proporsi besar — periksa master pasien dan tautan kasus.
                </span>
              ) : null}
              {laporanCaraBelumTerisi.rmList.length > 0 ? (
                <div className="mt-2 border-t border-current/15 pt-2 dark:border-white/15">
                  <div className="mb-1 text-[10px] font-extrabold uppercase tracking-wide opacity-90">
                    RM / pasien (data belum lengkap)
                  </div>
                  <ul
                    className={cn(
                      "max-h-32 space-y-1 overflow-y-auto pr-1 text-left",
                      "scrollbar-thin scrollbar-thumb-slate-400/50 dark:scrollbar-thumb-white/25",
                    )}
                  >
                    {laporanCaraBelumTerisi.rmList.map((item) => (
                      <li
                        key={item.key}
                        className="break-words tabular-nums text-[11px] font-semibold leading-snug"
                      >
                        <span className="font-mono text-emerald-800 dark:text-emerald-300">
                          {item.rmLabel}
                        </span>
                        <span className="text-slate-600 dark:text-white/80">
                          {" "}
                          · {item.nama}
                          {item.kasus > 1 ? (
                            <span className="opacity-80"> ({item.kasus} kasus)</span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          {filterSummaryLines.length > 0 ? (
            <ul
              className={cn(
                "shrink-0 list-inside list-disc text-[11px] font-semibold",
                "text-slate-600 dark:text-white/85",
              )}
            >
              {filterSummaryLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}

          <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200/80 dark:border-white/10">
            {loading ? (
              <div className="p-6 text-center text-sm font-semibold text-slate-600 dark:text-white/60">
                Memuat data…
              </div>
            ) : !ym || (tab !== "analisis" && !finalMatrix) ? (
              <div className="p-6 text-center text-sm font-semibold text-slate-600 dark:text-white/60">
                Pilih bulan yang valid.
              </div>
            ) : tab === "analisis" ? (
              <div className="flex flex-col gap-3">
                {analisisStats && (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="flex flex-col gap-1 rounded-lg border border-slate-200/60 bg-slate-50/50 p-2 dark:border-white/5 dark:bg-white/5">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/40">
                        <Users size={12} className="text-emerald-600 dark:text-emerald-400" />
                        Total Pasien
                      </div>
                      <div className="text-lg font-black tabular-nums text-slate-900 dark:text-white">
                        {analisisStats.total}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 rounded-lg border border-slate-200/60 bg-slate-50/50 p-2 dark:border-white/5 dark:bg-white/5">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/40">
                        <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400" />
                        Selesai
                      </div>
                      <div className="flex items-baseline gap-2">
                        <div className="text-lg font-black tabular-nums text-slate-900 dark:text-white">
                          {analisisStats.selesai}
                        </div>
                        <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          {analisisStats.successRate}%
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 rounded-lg border border-slate-200/60 bg-slate-50/50 p-2 dark:border-white/5 dark:bg-white/5">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/40">
                        <Stethoscope size={12} className="text-emerald-600 dark:text-emerald-400" />
                        Top Dokter
                      </div>
                      <div className="truncate text-[11px] font-black text-slate-900 dark:text-white" title={analisisStats.topDoctor?.[0]}>
                        {analisisStats.topDoctor?.[0] || "-"}
                      </div>
                      <div className="text-[10px] font-bold text-slate-400 dark:text-white/30">
                        {analisisStats.topDoctor?.[1] || 0} Kasus
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 rounded-lg border border-slate-200/60 bg-slate-50/50 p-2 dark:border-white/5 dark:bg-white/5">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/40">
                        <Activity size={12} className="text-emerald-600 dark:text-emerald-400" />
                        Insight
                      </div>
                      <div className="text-[10px] font-bold leading-tight text-slate-600 dark:text-white/60">
                        {searchQuery.trim() ? `Filter: "${searchQuery}"` : "Semua data bulan ini"}
                      </div>
                    </div>
                  </div>
                )}
                <AnalisisTable
                  rows={paginatedAnalisisRows}
                  onOpenDetail={onOpenDetail}
                />
                
                {totalAnalisisPages > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-200/60 p-2 dark:border-white/5">
                    <div className="text-[10px] font-medium text-slate-500 dark:text-white/40">
                      Menampilkan {((analisisPage - 1) * ANALISIS_PAGE_SIZE) + 1} - {Math.min(analisisPage * ANALISIS_PAGE_SIZE, filteredAnalisisRows.length)} dari {filteredAnalisisRows.length} data
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setAnalisisPage(p => Math.max(1, p - 1))}
                        disabled={analisisPage === 1}
                        className="rounded border border-slate-200 p-1 hover:bg-slate-100 disabled:opacity-30 dark:border-white/10 dark:hover:bg-white/5"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <div className="text-[11px] font-bold px-2">
                        {analisisPage} / {totalAnalisisPages}
                      </div>
                      <button
                        onClick={() => setAnalisisPage(p => Math.min(totalAnalisisPages, p + 1))}
                        disabled={analisisPage === totalAnalisisPages}
                        className="rounded border border-slate-200 p-1 hover:bg-slate-100 disabled:opacity-30 dark:border-white/10 dark:hover:bg-white/5"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : finalMatrix ? (
              <table className="w-max min-w-full border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-100/90 dark:bg-white/5">
                    <th
                      rowSpan={2}
                      className="sticky left-0 z-[1] border border-slate-300/70 px-1.5 py-1 text-left font-extrabold dark:border-white/10 dark:bg-zinc-900"
                    >
                      {tab === "jenis"
                        ? "PROSEDUR (DETAIL)"
                        : tab === "kategori"
                          ? "KATEGORI (GRUP)"
                          : "CARA BAYAR"}
                    </th>
                    <th
                      colSpan={finalMatrix.daysInMonth}
                      className="border border-slate-300/70 px-1 py-0.5 text-center font-extrabold dark:border-white/10"
                    >
                      TANGGAL
                    </th>
                    <th
                      rowSpan={2}
                      className="border border-slate-300/70 px-1.5 py-1 text-center font-extrabold dark:border-white/10"
                    >
                      JUMLAH
                    </th>
                  </tr>
                  <tr>
                    {Array.from(
                      { length: finalMatrix.daysInMonth },
                      (_, i) => {
                        const day = i + 1;
                        const wd = weekdaySun0Wib(
                          finalMatrix.year,
                          finalMatrix.month1to12,
                          day,
                        );
                        const wkend = wd === 0 || wd === 6;
                        return (
                          <th
                            key={day}
                            className={cn(
                              "border px-0.5 py-0.5 text-center font-bold tabular-nums",
                              "border-slate-300/70 dark:border-white/10",
                              wkend
                                ? "bg-amber-100/90 dark:bg-amber-950/30"
                                : "bg-slate-50/80 dark:bg-white/5",
                            )}
                          >
                            {day}
                          </th>
                        );
                      },
                    )}
                  </tr>
                </thead>
                <tbody>
                  {finalMatrix.rowLabels.map((label: string, ri: number) => (
                    <TableRow
                      key={label}
                      label={label}
                      ri={ri}
                      activeMatrix={finalMatrix}
                      formatCell={formatCell}
                    />
                  ))}
                  <tr className="bg-slate-100/90 font-extrabold dark:bg-white/5">
                    <th
                      scope="row"
                      className="sticky left-0 z-[1] border border-slate-300/70 px-1.5 py-0.5 text-left dark:border-white/10 dark:bg-zinc-900"
                    >
                      JUMLAH
                    </th>
                    {finalMatrix.colTotals.map((c: number, di: number) => {
                      const day = di + 1;
                      const wd = weekdaySun0Wib(
                        finalMatrix.year,
                        finalMatrix.month1to12,
                        day,
                      );
                      const wkend = wd === 0 || wd === 6;
                      return (
                        <td
                          key={di}
                          className={cn(
                            "border px-0.5 py-0.5 text-center tabular-nums dark:border-white/10",
                            wkend ? "bg-amber-100/80 dark:bg-amber-950/30" : "",
                          )}
                        >
                          {formatCell(c)}
                        </td>
                      );
                    })}
                    <td className="border border-slate-300/70 px-1 py-0.5 text-center dark:border-white/10">
                      {formatCell(finalMatrix.grandTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
