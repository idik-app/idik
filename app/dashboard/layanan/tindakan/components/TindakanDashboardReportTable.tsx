"use client";

import { useMemo } from "react";

import { cn } from "@/lib/utils";
import {
  displayNamaPasien,
  displayRm,
  formatJenisKelaminDisplay,
  resolveJenisKelaminFromRow,
} from "../lib/displayTindakanRow";
import type { TindakanJoinResult } from "../bridge/mapping.types";
import { rowTanggalToYmd } from "../lib/filterTindakanDashboardRows";

function formatTanggalDdMmYyyy(raw: string): string {
  const iso = rowTanggalToYmd(raw);
  if (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, mo, d] = iso.split("-");
    return `${d}/${mo}/${y}`;
  }
  const t = String(raw ?? "").trim();
  return t || "—";
}

function formatUmur(row: TindakanJoinResult): string {
  const u = row.umur;
  if (u != null && Number.isFinite(Number(u))) return `${Number(u)} TH`;
  return "—";
}

export default function TindakanDashboardReportTable({
  rows,
  isLight,
}: {
  rows: readonly TindakanJoinResult[];
  isLight: boolean;
}) {
  const prepared = useMemo(() => {
    return rows.map((row, idx) => {
      const raw = row as unknown as Record<string, unknown>;
      return {
        key: String(raw.id ?? idx),
        no: idx + 1,
        noRm: displayRm(raw),
        nama: displayNamaPasien(raw),
        jk: formatJenisKelaminDisplay(resolveJenisKelaminFromRow(raw, null)),
        umur: formatUmur(row),
        tanggal: formatTanggalDdMmYyyy(String(row.tanggal ?? "")),
        tindakan: String(row.tindakan ?? "").trim() || "—",
        dokter: String(row.dokter ?? "").trim() || "—",
        kategori: String(row.kategori ?? "").trim() || "—",
        diagnosa: String(row.diagnosa ?? "").trim() || "—",
      };
    });
  }, [rows]);

  const th = cn(
    "sticky top-0 z-[1] px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide whitespace-nowrap bg-rose-950 text-white",
    !isLight && "bg-rose-950/95",
  );

  const td = cn(
    "px-2 py-1.5 text-xs tabular-nums align-top",
    isLight ? "border-slate-200/90 text-slate-800" : "border-cyan-900/40 text-cyan-50/95",
  );

  const tableBorder = isLight ? "border-slate-200/80" : "border-cyan-800/40";

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border",
        tableBorder,
        isLight ? "bg-white/90" : "bg-black/35",
      )}
    >
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[880px] border-collapse">
          <thead>
            <tr>
              <th className={th}>No.</th>
              <th className={th}>No. RM</th>
              <th className={th}>Nama pasien</th>
              <th className={th}>Jenis kelamin</th>
              <th className={th}>Umur</th>
              <th className={th}>Tanggal tindakan</th>
              <th className={th}>Tindakan</th>
              <th className={th}>Dokter</th>
              <th className={th}>Kategori</th>
              <th className={th}>Diagnosa</th>
            </tr>
          </thead>
          <tbody>
            {prepared.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className={cn(
                    "px-3 py-8 text-center text-sm",
                    isLight ? "text-slate-500" : "text-cyan-200/60",
                  )}
                >
                  Tidak ada baris yang cocok dengan filter.
                </td>
              </tr>
            ) : (
              prepared.map((r) => (
                <tr
                  key={r.key}
                  className={cn(
                    "border-t",
                    tableBorder,
                    isLight ? "hover:bg-slate-50/90" : "hover:bg-cyan-950/30",
                  )}
                >
                  <td className={td}>{r.no}</td>
                  <td className={td}>{r.noRm}</td>
                  <td className={cn(td, "max-w-[14rem] font-medium")}>{r.nama}</td>
                  <td className={td}>{r.jk}</td>
                  <td className={td}>{r.umur}</td>
                  <td className={td}>{r.tanggal}</td>
                  <td className={cn(td, "max-w-[10rem]")}>{r.tindakan}</td>
                  <td className={cn(td, "max-w-[9rem]")}>{r.dokter}</td>
                  <td className={cn(td, "max-w-[8rem]")}>{r.kategori}</td>
                  <td className={cn(td, "max-w-[10rem]")}>{r.diagnosa}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div
        className={cn(
          "shrink-0 border-t px-3 py-2 text-[11px]",
          tableBorder,
          isLight ? "bg-slate-50 text-slate-600" : "bg-black/25 text-cyan-200/70",
        )}
      >
        Menampilkan {prepared.length} baris
      </div>
    </div>
  );
}
